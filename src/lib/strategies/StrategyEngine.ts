import { StorageManager, StorageStrategy } from '@/lib/storage/storage-manager';
import { fusionAPI } from '@/lib/services/1inch-fusion';
import { ethers, JsonRpcProvider, formatUnits, parseEther, parseUnits } from 'ethers';
import { EthereumChainId, EthereumToken } from '@/types/bridge';

export interface MarketCondition {
  check: () => Promise<boolean>;
  description: string;
}

export interface StrategyExecution {
  strategyId: string;
  timestamp: number;
  success: boolean;
  error?: string;
  txHash?: string;
  details?: Record<string, unknown>;
}

export class StrategyEngine {
  private static instance: StrategyEngine;
  private storage: StorageManager;
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();
  private executionQueue: StrategyExecution[] = [];
  private provider: JsonRpcProvider | ethers.BrowserProvider | null = null;

  // Helper function to convert chainId to EthereumChainId
  private static getEthereumChainId(chainId: number): EthereumChainId {
    switch (chainId) {
      case 1: return 1;
      case 5: return 5;
      case 11155111: return 11155111;
      default: return 1; // Default to mainnet
    }
  }

  // Convert token info to proper Token object
  private static convertToToken(tokenInfo: { symbol: string; name: string; network: string; chainId: number; decimals: number; address?: string }): EthereumToken {
    return {
      id: `${tokenInfo.symbol}-${tokenInfo.chainId}`,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      decimals: tokenInfo.decimals,
      logoUrl: '',
      coingeckoId: tokenInfo.symbol.toLowerCase(),
      isWrapped: tokenInfo.symbol.startsWith('W'),
      verified: true,
      displayPrecision: 4,
      description: tokenInfo.name,
      tags: [],
      network: 'ethereum' as const,
      chainId: StrategyEngine.getEthereumChainId(tokenInfo.chainId),
      address: tokenInfo.address || '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
      isNative: tokenInfo.symbol === 'ETH'
    };
  }

  static getInstance(): StrategyEngine {
    if (!StrategyEngine.instance) {
      StrategyEngine.instance = new StrategyEngine();
    }
    return StrategyEngine.instance;
  }

  private constructor() {
    this.storage = StorageManager.getInstance();
    this.initializeProvider();
  }

  private async initializeProvider() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      // Fallback to public RPC endpoints
      const rpcUrls = [
        'https://eth-mainnet.g.alchemy.com/v2/5T9qLAi9iwXe4Ns34E5pg', // Your Alchemy key
        'https://ethereum-rpc.publicnode.com',
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com',
        'https://1rpc.io/eth'
      ];

      // Use environment variable if available
      const customRpcUrl = process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL;
      if (customRpcUrl) {
        try {
          this.provider = new JsonRpcProvider(customRpcUrl);
          return;
        } catch (error) {
          console.warn('Custom RPC URL failed, falling back to public endpoints:', error);
        }
      }

      // Try public endpoints
      this.provider = new JsonRpcProvider(rpcUrls[0]);
    }
  }

  // Start monitoring a strategy
  async startStrategy(strategyId: string) {
    const strategy = this.storage.getStrategies().find(s => s.id === strategyId);
    if (!strategy || !strategy.enabled) return;

    // Clear existing monitor if any
    this.stopStrategy(strategyId);

    // Set up monitoring based on strategy type
    const interval = this.getIntervalMs(strategy.conditions.time?.interval);
    
    const monitor = setInterval(async () => {
      await this.checkAndExecuteStrategy(strategy);
    }, interval);

    this.activeMonitors.set(strategyId, monitor);
    
    // Run immediate check
    await this.checkAndExecuteStrategy(strategy);
  }

  // Stop monitoring a strategy
  stopStrategy(strategyId: string) {
    const monitor = this.activeMonitors.get(strategyId);
    if (monitor) {
      clearInterval(monitor);
      this.activeMonitors.delete(strategyId);
    }
  }

  // Stop all strategies
  stopAll() {
    this.activeMonitors.forEach((monitor) => clearInterval(monitor));
    this.activeMonitors.clear();
  }

  // Check and execute strategy if conditions are met
  private async checkAndExecuteStrategy(strategy: StorageStrategy) {
    try {
      const conditionsMet = await this.checkConditions(strategy);
      
      if (conditionsMet) {
        await this.executeStrategy(strategy);
      }
    } catch (error) {
      console.error(`Strategy ${strategy.id} check failed:`, error);
      this.recordExecution(strategy.id, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Check if all strategy conditions are met
  private async checkConditions(strategy: StorageStrategy): Promise<boolean> {
    const conditions: MarketCondition[] = [];

    // Price condition
    if (strategy.conditions.price) {
      conditions.push({
        check: async () => {
          const price = await this.getTokenPrice(strategy.conditions.price!.token);
          if (strategy.conditions.price!.above && price < strategy.conditions.price!.above) {
            return false;
          }
          if (strategy.conditions.price!.below && price > strategy.conditions.price!.below) {
            return false;
          }
          return true;
        },
        description: `Price condition for ${strategy.conditions.price.token}`
      });
    }

    // Volume condition
    if (strategy.conditions.volume) {
      conditions.push({
        check: async () => {
          const volume = await this.getTokenVolume(strategy.conditions.volume!.token);
          return volume >= (strategy.conditions.volume!.above || 0);
        },
        description: `Volume condition for ${strategy.conditions.volume.token}`
      });
    }

    // Gas condition
    if (strategy.conditions.gas) {
      conditions.push({
        check: async () => {
          const gasPrice = await this.getGasPrice();
          return gasPrice <= (strategy.conditions.gas!.below || Infinity);
        },
        description: 'Gas price condition'
      });
    }

    // Check all conditions
    const results = await Promise.all(conditions.map(c => c.check()));
    return results.every(result => result);
  }

  // Execute strategy actions
  private async executeStrategy(strategy: StorageStrategy) {
    // Check if enough time has passed since last execution
    if (strategy.lastExecuted) {
      const timeSinceLastExecution = Date.now() - strategy.lastExecuted;
      const minInterval = this.getIntervalMs(strategy.conditions.time?.interval);
      if (timeSinceLastExecution < minInterval) {
        return;
      }
    }

    // Execute swap action
    if (strategy.actions.swap) {
      try {
        const { from, to, amount } = strategy.actions.swap;
        
        // Get quote from 1inch
        const fromToken = await this.getTokenInfo(from);
        const toToken = await this.getTokenInfo(to);
        const walletAddress = await this.getWalletAddress();
        
        if (!walletAddress) {
          throw new Error('No wallet connected');
        }

        const quote = await fusionAPI.getQuote(
          StrategyEngine.convertToToken(fromToken),
          StrategyEngine.convertToToken(toToken),
          parseEther(amount).toString(),
          walletAddress
        );

        // Execute swap through 1inch Fusion
        const order = await fusionAPI.createOrder(
          StrategyEngine.convertToToken(fromToken),
          StrategyEngine.convertToToken(toToken),
          parseEther(amount).toString(),
          walletAddress,
          quote.id
        );
        
        console.log('Swap order created:', {
          orderId: order.orderId,
          from,
          to,
          amount,
          status: order.orderStatus
        });

        // Update strategy
        strategy.lastExecuted = Date.now();
        strategy.executionCount++;
        this.storage.saveStrategy(strategy);

        // Record successful execution
        this.recordExecution(strategy.id, true, undefined, {
          action: 'swap',
          from,
          to,
          amount,
          quote
        });

        // Send notification
        if (strategy.actions.notify) {
          this.sendNotification(strategy.actions.notify.message);
        }
      } catch (error) {
        this.recordExecution(strategy.id, false, error instanceof Error ? error.message : 'Swap failed');
      }
    }
  }

  // Helper methods
  private async getTokenPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`/api/proxy/coingecko?endpoint=simple/price&ids=${symbol.toLowerCase()}&vs_currencies=usd`);
      const data = await response.json();
      return data[symbol.toLowerCase()]?.usd || 0;
    } catch (error) {
      console.error('Failed to get token price:', error);
      return 0;
    }
  }

  private async getTokenVolume(symbol: string): Promise<number> {
    try {
      const response = await fetch(`/api/proxy/coingecko?endpoint=coins/${symbol.toLowerCase()}`);
      const data = await response.json();
      return data.market_data?.total_volume?.usd || 0;
    } catch (error) {
      console.error('Failed to get token volume:', error);
      return 0;
    }
  }

  private async getGasPrice(): Promise<number> {
    try {
      if (!this.provider) return 0;
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      return parseFloat(formatUnits(gasPrice, 'gwei'));
    } catch (error) {
      console.error('Failed to get gas price:', error);
      return 0;
    }
  }

  private async getWalletAddress(): Promise<string | null> {
    try {
      if (!this.provider) return null;
      const signer = await this.provider.getSigner();
      return await signer.getAddress();
    } catch {
      return null;
    }
  }

  private async getTokenInfo(symbol: string): Promise<{ symbol: string; name: string; network: string; chainId: number; decimals: number; address?: string }> {
    // Mock token info - in production, fetch from token list or API
    const tokens: Record<string, { symbol: string; name: string; network: string; chainId: number; decimals: number; address?: string }> = {
      'ETH': {
        symbol: 'ETH',
        name: 'Ethereum',
        network: 'ethereum',
        chainId: 1,
        decimals: 18
      },
      'USDC': {
        symbol: 'USDC',
        name: 'USD Coin',
        network: 'ethereum',
        chainId: 1,
        decimals: 6,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      },
      'WBTC': {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        network: 'ethereum',
        chainId: 1,
        decimals: 8,
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
      }
    };

    return tokens[symbol] || {
      symbol,
      name: symbol,
      network: 'ethereum',
      chainId: 1,
      decimals: 18
    };
  }

  private getIntervalMs(interval?: 'hourly' | 'daily' | 'weekly'): number {
    switch (interval) {
      case 'hourly':
        return 60 * 60 * 1000; // 1 hour
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      default:
        return 5 * 60 * 1000; // 5 minutes default
    }
  }

  private recordExecution(
    strategyId: string, 
    success: boolean, 
    error?: string,
    details?: Record<string, unknown>
  ) {
    const execution: StrategyExecution = {
      strategyId,
      timestamp: Date.now(),
      success,
      error,
      details
    };

    this.executionQueue.push(execution);
    
    // Keep only last 100 executions in memory
    if (this.executionQueue.length > 100) {
      this.executionQueue = this.executionQueue.slice(-100);
    }
  }

  private sendNotification(message: string) {
    // Check if browser supports notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Strategy Executed', {
        body: message,
        icon: '/images/tokens/eth.svg'
      });
    }
    
    // Also show in-app notification
    console.log('Strategy notification:', message);
  }

  // Get execution history
  getExecutionHistory(strategyId?: string): StrategyExecution[] {
    if (strategyId) {
      return this.executionQueue.filter(e => e.strategyId === strategyId);
    }
    return this.executionQueue;
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}