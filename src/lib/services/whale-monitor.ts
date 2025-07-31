import { JsonRpcProvider, formatUnits, id as ethersId, parseUnits, toBigInt } from 'ethers';
import { IndexedDBHelper } from '@/lib/storage/indexeddb-helper';
import { EthereumChainId, EthereumToken } from '@/types/bridge';
import { fusionAPI } from './1inch-fusion';

export interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueUSD: number;
  token: string;
  method: string;
  timestamp: number;
  gasUsed: string;
  blockNumber: number;
}

export interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  volume24h: number;
  priceChangePercent: number;
  transactionCount: number;
  whaleActivity: number; // 0-100 score
}

export class WhaleMonitorService {
  private static instance: WhaleMonitorService;
  private provider: JsonRpcProvider;
  private indexedDB: IndexedDBHelper;
  private monitoringActive = false;
  private whaleThresholdUSD = 100000; // $100k minimum

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
      chainId: WhaleMonitorService.getEthereumChainId(tokenInfo.chainId),
      address: tokenInfo.address || '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
      isNative: tokenInfo.symbol === 'ETH'
    };
  }
  private listeners: Array<(whale: WhaleTransaction) => void> = [];

  // 1inch Router addresses on different chains
  private readonly ONEINCH_ROUTERS: Record<number, string> = {
    1: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Ethereum Mainnet
    56: '0x1111111254EEB25477B68fb85Ed929f73A960582', // BSC
    137: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Polygon
    42161: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Arbitrum
    10: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Optimism
  };

  static getInstance(): WhaleMonitorService {
    if (!WhaleMonitorService.instance) {
      WhaleMonitorService.instance = new WhaleMonitorService();
    }
    return WhaleMonitorService.instance;
  }

  private constructor() {
    this.provider = this.initializeProvider();
    this.indexedDB = IndexedDBHelper.getInstance();
    this.indexedDB.init();
  }

  private initializeProvider(): JsonRpcProvider {
    // For whale monitoring, always use mainnet where 1inch has real activity
    const mainnetRpcUrls = [
      'https://eth-mainnet.g.alchemy.com/v2/5T9qLAi9iwXe4Ns34E5pg', // Your Alchemy key
      'https://ethereum-rpc.publicnode.com',
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
      'https://1rpc.io/eth'
    ];

    // Try mainnet endpoints for whale monitoring
    try {
      return new JsonRpcProvider(mainnetRpcUrls[0]);
    } catch (error) {
      console.error('Failed to initialize mainnet RPC provider:', error);
      // Try fallback
      return new JsonRpcProvider(mainnetRpcUrls[1]);
    }
  }

  // Start monitoring whale transactions
  async startMonitoring(chainId: number = 1) {
    if (this.monitoringActive) {
      console.log('🐋 Whale monitoring already active');
      return;
    }

    // Always monitor mainnet (chain ID 1) for real whale activity
    const targetChainId = 1;
    const routerAddress = this.ONEINCH_ROUTERS[targetChainId];
    
    if (!routerAddress) {
      console.error('❌ No 1inch router address configured for mainnet');
      return;
    }

    this.monitoringActive = true;
    console.log(`🐋 Starting whale monitoring on Ethereum mainnet with router ${routerAddress}...`);

    try {
      // Test RPC connection first
      const network = await this.provider.getNetwork();
      const currentBlock = await this.provider.getBlockNumber();
      console.log(`✅ Connected to ${network.name} (Chain ID: ${network.chainId}), current block: ${currentBlock}`);
      
      // Use polling instead of persistent filters to avoid "filter not found" errors
      this.startPollingMonitor(targetChainId, routerAddress);
    } catch (error) {
      console.error('❌ Failed to start whale monitoring:', error);
      this.monitoringActive = false;
      throw error;
    }
  }

  private async startPollingMonitor(chainId: number, routerAddress: string) {
    let lastCheckedBlock = 0;
    console.log(`🔄 Starting polling monitor for chain ${chainId}`);

    const poll = async () => {
      if (!this.monitoringActive) {
        console.log('🛑 Polling stopped - monitoring inactive');
        return;
      }

      try {
        const currentBlock = await this.provider.getBlockNumber();
        console.log(`📊 Current block: ${currentBlock}, last checked: ${lastCheckedBlock}`);
        
        // First run - start from recent blocks
        if (lastCheckedBlock === 0) {
          lastCheckedBlock = Math.max(0, currentBlock - 10); // Check last 10 blocks
          console.log(`🔍 First run - starting from block ${lastCheckedBlock}`);
        }

        // Check for new blocks
        if (currentBlock > lastCheckedBlock) {
          console.log(`🔎 Checking blocks ${lastCheckedBlock + 1} to ${currentBlock} for whales`);
          await this.checkBlocksForWhales(lastCheckedBlock + 1, currentBlock, routerAddress);
          lastCheckedBlock = currentBlock;
        } else {
          console.log('⏳ No new blocks to check');
        }
      } catch (error) {
        console.warn('❌ Whale monitoring poll error:', error);
        // Continue polling despite errors
      }

      // Schedule next poll in 15 seconds
      if (this.monitoringActive) {
        console.log('⏰ Scheduling next poll in 15 seconds');
        setTimeout(poll, 15000);
      }
    };

    // Start polling
    console.log('🚀 Starting first poll');
    poll();
  }

  private async checkBlocksForWhales(fromBlock: number, toBlock: number, routerAddress: string) {
    try {
      console.log(`🔍 Searching for whale transactions from block ${fromBlock} to ${toBlock} on router ${routerAddress}`);
      const swapTopic = ethersId('Swap(address,address,address,uint256,uint256)');
      console.log(`📋 Using swap topic: ${swapTopic}`);
      
      const logs = await Promise.race([
        this.provider.getLogs({
          address: routerAddress,
          topics: [swapTopic],
          fromBlock,
          toBlock
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Logs query timeout')), 10000)
        )
      ]);

      console.log(`📝 Found ${logs.length} swap logs in blocks ${fromBlock}-${toBlock}`);

      if (logs.length === 0) {
        console.log('🤷‍♂️ No swap logs found - this might be normal if no swaps occurred');
        return;
      }

      for (const log of logs) {
        try {
          console.log('🔬 Processing log:', log);
          const transaction = await this.processWhaleTransaction(log);
          if (transaction) {
            console.log(`💰 Transaction value: $${transaction.valueUSD} (threshold: $${this.whaleThresholdUSD})`);
            if (transaction.valueUSD >= this.whaleThresholdUSD) {
              console.log('🐋 WHALE DETECTED!', transaction);
              await this.indexedDB.saveWhaleTransaction({
                id: transaction.hash,
                hash: transaction.hash,
                from: transaction.from,
                to: transaction.to,
                value: transaction.value,
                valueUSD: transaction.valueUSD,
                token: transaction.token,
                timestamp: transaction.timestamp,
                method: transaction.method,
                gasUsed: transaction.gasUsed,
                blockNumber: transaction.blockNumber
              });

              // Notify listeners
              console.log(`📢 Notifying ${this.listeners.length} listeners about whale`);
              this.listeners.forEach(listener => listener(transaction));
            } else {
              console.log('🐟 Small fish - below whale threshold');
            }
          } else {
            console.log('❌ Failed to process transaction');
          }
        } catch (error) {
          console.error('❌ Error processing whale transaction:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error checking blocks for whales:', error);
    }
  }

  // Stop monitoring
  stopMonitoring() {
    console.log('🛑 Stopping whale monitoring...');
    this.monitoringActive = false;
  }

  // Process and decode transaction
  private async processWhaleTransaction(log: unknown): Promise<WhaleTransaction | null> {
    try {
      // Type guard for log structure
      const logData = log as {
        transactionHash: string;
        blockNumber: number;
        data: string;
      };
      
      const tx = await this.provider.getTransaction(logData.transactionHash);
      const receipt = await this.provider.getTransactionReceipt(logData.transactionHash);
      const block = await this.provider.getBlock(logData.blockNumber);
      
      if (!tx || !receipt || !block) {
        return null;
      }

      // Decode swap amount (simplified - in production, use proper ABI decoding)
      const value = toBigInt(logData.data.slice(0, 66));
      const valueUSD = await this.estimateValueUSD(value, 'ETH');

      if (valueUSD < this.whaleThresholdUSD) {
        return null;
      }

      return {
        hash: logData.transactionHash,
        from: tx.from,
        to: tx.to || '',
        value: value.toString(),
        valueUSD,
        token: 'ETH', // Simplified - decode actual token from event
        method: 'swap',
        timestamp: block.timestamp * 1000,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: logData.blockNumber
      };
    } catch (error) {
      console.error('Error decoding transaction:', error);
      return null;
    }
  }

  // Get recent whale transactions
  async getRecentWhales(limit: number = 50): Promise<WhaleTransaction[]> {
    try {
      console.log(`🔍 Getting recent whales (limit: ${limit})`);
      // First try IndexedDB
      const cached = await this.indexedDB.getWhaleTransactions(this.whaleThresholdUSD);
      console.log(`💾 Found ${cached.length} cached whale transactions`);
      if (cached.length > 0) {
        console.log('✅ Returning cached whale transactions');
        return cached.slice(0, limit);
      }

      // Check if provider is available
      if (!this.provider) {
        console.warn('RPC provider not available, returning empty whale list');
        return [];
      }

      // Fallback to querying recent blocks with timeout
      const currentBlock = await Promise.race([
        this.provider.getBlockNumber(),
        new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error('RPC timeout')), 10000)
        )
      ]);
      
      const whales: WhaleTransaction[] = [];

      // Query last 50 blocks with error handling (reduced for better performance)
      console.log(`🔍 Scanning recent blocks for whale activity...`);
      const routerAddress = this.ONEINCH_ROUTERS[1]; // Mainnet router
      
      for (let i = 0; i < 50 && whales.length < limit; i++) {
        try {
          const blockNumber = currentBlock - i;
          const swapTopic = ethersId('Swap(address,address,address,uint256,uint256)');
          
          const logs = await Promise.race([
            this.provider.getLogs({
              address: routerAddress,
              topics: [swapTopic],
              fromBlock: blockNumber,
              toBlock: blockNumber
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Logs query timeout')), 5000)
            )
          ]);

          for (const log of logs) {
            const whale = await this.processWhaleTransaction(log);
            if (whale && whale.valueUSD >= this.whaleThresholdUSD) {
              whales.push(whale);
              if (whales.length >= limit) break;
            }
          }
        } catch (blockError) {
          console.warn(`Error querying block ${currentBlock - i}:`, blockError);
          // Continue to next block
          continue;
        }
      }
      
      console.log(`✅ Found ${whales.length} whale transactions from recent blocks`);
      
      // Save found whales to cache
      for (const whale of whales) {
        try {
          await this.indexedDB.saveWhaleTransaction({
            id: whale.hash,
            ...whale
          });
        } catch (error) {
          console.warn('Error caching whale transaction:', error);
        }
      }

      return whales;
    } catch (error) {
      console.error('Error fetching whale transactions:', error);
      return [];
    }
  }

  // Get trending tokens based on whale activity and market data
  async getTrendingTokens(): Promise<TrendingToken[]> {
    try {
      console.log('🔍 Getting trending tokens...');
      
      // Get recent whale transactions for whale activity scoring
      const whales = await this.getRecentWhales(100);
      console.log(`📊 Found ${whales.length} whale transactions for analysis`);
      
      // Aggregate whale activity by token
      const whaleActivity: Record<string, {
        count: number;
        volume: number;
        symbol: string;
      }> = {};

      whales.forEach(whale => {
        if (!whaleActivity[whale.token]) {
          whaleActivity[whale.token] = {
            count: 0,
            volume: 0,
            symbol: whale.token
          };
        }
        whaleActivity[whale.token].count++;
        whaleActivity[whale.token].volume += whale.valueUSD;
      });

      // Get trending tokens from market data API
      const marketTrending = await this.getMarketTrendingTokens();
      console.log(`📈 Found ${marketTrending.length} trending tokens from market data`);
      
      // Combine whale activity data with market trending data
      const trending: TrendingToken[] = marketTrending.map(token => {
        const whaleData = whaleActivity[token.symbol] || { count: 0, volume: 0, symbol: token.symbol };
        const whaleScore = Math.min(100, (whaleData.volume / 1000000) * 10); // Scale whale activity
        
        return {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          volume24h: token.volume24h,
          priceChangePercent: token.priceChangePercent,
          transactionCount: whaleData.count,
          whaleActivity: whaleScore
        };
      });

      // Sort by combination of price change and whale activity
      return trending.sort((a, b) => {
        const scoreA = Math.abs(a.priceChangePercent) + (a.whaleActivity * 0.5);
        const scoreB = Math.abs(b.priceChangePercent) + (b.whaleActivity * 0.5);
        return scoreB - scoreA;
      }).slice(0, 10);
    } catch (error) {
      console.error('Error getting trending tokens:', error);
      return [];
    }
  }

  // Get trending tokens from market data APIs
  private async getMarketTrendingTokens(): Promise<TrendingToken[]> {
    try {
      // Use CoinGecko API to get trending tokens
      const response = await fetch('/api/proxy/coingecko?endpoint=search/trending');
      const data = await response.json();
      
      if (data.coins && Array.isArray(data.coins)) {
        return data.coins.slice(0, 15).map((coinData: { item: { id: string; symbol: string; name: string } }) => {
          const coin = coinData.item;
          return {
            address: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            volume24h: Math.random() * 100000000 + 10000000, // Will be replaced with real API data
            priceChangePercent: (Math.random() - 0.5) * 30, // -15% to +15%
            transactionCount: 0,
            whaleActivity: 0
          };
        });
      }
    } catch (error) {
      console.warn('Failed to fetch trending tokens from API, using fallback data:', error);
    }

    // Return empty array if API fails
    return [];
  }

  // Subscribe to whale activity
  onWhaleActivity(callback: (whale: WhaleTransaction) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Copy trade functionality
  async copyTrade(whaleTransaction: WhaleTransaction, amount: string): Promise<{ success: boolean; txHash?: string; message: string; orderId?: string; error?: string }> {
    try {
      // Integration with 1inch Fusion API to execute the same trade
      const fusionAPI = (await import('./1inch-fusion')).fusionAPI;
      
      // Get token info
      const tokenInfo = await this.getTokenInfo(whaleTransaction.token);
      const toTokenInfo = await this.getTokenInfo('USDC'); // Default to USDC as target
      
      // Create order through 1inch
      const order = await fusionAPI.createOrder(
        WhaleMonitorService.convertToToken(tokenInfo),
        WhaleMonitorService.convertToToken(toTokenInfo),
        amount,
        whaleTransaction.from
      );
      
      return {
        success: true,
        txHash: order.txHash || order.orderId,
        message: `Copy trade executed: ${amount} ${whaleTransaction.token}`,
        orderId: order.orderId
      };
    } catch (error) {
      console.error('Copy trade failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Copy trade failed',
        message: `Failed to copy trade: ${amount} ${whaleTransaction.token}`
      };
    }
  }

  // Get token info helper
  private async getTokenInfo(symbol: string): Promise<{ symbol: string; name: string; network: string; chainId: number; decimals: number; address?: string }> {
    // Basic token mapping
    const tokens: Record<string, { symbol: string; name: string; network: string; chainId: number; decimals: number; address?: string }> = {
      'ETH': {
        symbol: 'ETH',
        name: 'Ethereum',
        network: 'ethereum',
        chainId: 1,
        decimals: 18
      },
      'WBTC': {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        network: 'ethereum',
        chainId: 1,
        decimals: 8,
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
      },
      'USDC': {
        symbol: 'USDC',
        name: 'USD Coin',
        network: 'ethereum',
        chainId: 1,
        decimals: 6,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      },
      'USDT': {
        symbol: 'USDT',
        name: 'Tether',
        network: 'ethereum',
        chainId: 1,
        decimals: 6,
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      }
    };
    
    return tokens[symbol] || tokens['ETH'];
  }

  // Utility function to estimate USD value
  private async estimateValueUSD(amount: bigint, token: string): Promise<number> {
    try {
      // Fetch price from CoinGecko
      const response = await fetch(`/api/proxy/coingecko?endpoint=simple/price&ids=${token.toLowerCase()}&vs_currencies=usd`);
      const data = await response.json();
      const price = data[token.toLowerCase()]?.usd || 0;
      
      // Convert amount to human readable and multiply by price
      const decimals = 18; // ETH decimals, adjust for other tokens
      const humanAmount = parseFloat(formatUnits(amount, decimals));
      
      return humanAmount * price;
    } catch (error) {
      console.error('Error estimating USD value:', error);
      return 0;
    }
  }

  // Get whale statistics
  async getWhaleStats(): Promise<{
    totalWhales24h: number;
    totalVolumeUSD: number;
    topToken: string;
    averageTradeSize: number;
  }> {
    const whales = await this.getRecentWhales(1000);
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recent = whales.filter(w => w.timestamp > last24h);

    const tokenVolumes: Record<string, number> = {};
    let totalVolume = 0;

    recent.forEach(whale => {
      totalVolume += whale.valueUSD;
      tokenVolumes[whale.token] = (tokenVolumes[whale.token] || 0) + whale.valueUSD;
    });

    const topToken = Object.entries(tokenVolumes)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'ETH';

    return {
      totalWhales24h: recent.length,
      totalVolumeUSD: totalVolume,
      topToken,
      averageTradeSize: recent.length > 0 ? totalVolume / recent.length : 0
    };
  }
}