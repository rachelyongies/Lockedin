import { ethers } from 'ethers';
import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';
import { BitcoinBridge__factory } from '../contracts/typechain-types';

// True cross-chain bridge service
export class TrueBridgeService {
  private ethereumProvider: ethers.Provider;
  private bridgeContract: any;
  private wbtcContract: any;
  private isInitialized = false;

  constructor(
    ethereumRpcUrl: string,
    bridgeContractAddress: string,
    wbtcContractAddress: string
  ) {
    this.ethereumProvider = new ethers.JsonRpcProvider(ethereumRpcUrl);
    this.bridgeContract = BitcoinBridge__factory.connect(
      bridgeContractAddress,
      this.ethereumProvider
    );
    this.wbtcContract = new ethers.Contract(
      wbtcContractAddress,
      [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function transferFrom(address from, address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ],
      this.ethereumProvider
    );
  }

  // Initialize the bridge service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Verify contract addresses
      const bridgeCode = await this.ethereumProvider.getCode(this.bridgeContract.target);
      if (bridgeCode === '0x') {
        throw new Error('Bridge contract not found at specified address');
      }

      const wbtcCode = await this.ethereumProvider.getCode(this.wbtcContract.target);
      if (wbtcCode === '0x') {
        throw new Error('WBTC contract not found at specified address');
      }

      this.isInitialized = true;
      console.log('True bridge service initialized');
    } catch (error) {
      console.error('Failed to initialize bridge service:', error);
      throw error;
    }
  }

  // Get quote for Bitcoin to Ethereum bridge
  async getBitcoinToEthereumQuote(
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    try {
      await this.initialize();

      const amountBN = ethers.parseUnits(amount, 8); // Bitcoin has 8 decimals
      
      // Calculate fees (this would be more sophisticated in production)
      const networkFee = ethers.parseUnits('0.0001', 8); // 0.0001 BTC fee
      const protocolFee = ethers.parseUnits('0.00005', 8); // 0.00005 BTC protocol fee
      const totalFee = networkFee + protocolFee;
      
      // Calculate WBTC amount (1 BTC = 1 WBTC)
      const wbtcAmount = amountBN - totalFee;
      
      // Mock exchange rate (in production, get from price feeds)
      const exchangeRate = 1; // 1 BTC = 1 WBTC
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        fromToken: {
          id: 'btc-mainnet',
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/btc.svg',
          coingeckoId: 'bitcoin',
          network: 'bitcoin',
          chainId: 'mainnet',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'The original cryptocurrency',
          tags: ['native', 'store-of-value'],
        },
        toToken: {
          id: 'wbtc-mainnet',
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/wbtc.svg',
          coingeckoId: 'wrapped-bitcoin',
          network: 'ethereum',
          chainId: 1,
          address: this.wbtcContract.target,
          isNative: false,
          isWrapped: true,
          verified: true,
          displayPrecision: 5,
          description: 'Bitcoin on Ethereum',
          tags: ['wrapped', 'erc20'],
        },
        fromAmount: amount,
        toAmount: ethers.formatUnits(wbtcAmount, 8),
        exchangeRate: exchangeRate.toString(),
        networkFee: ethers.formatUnits(networkFee, 8),
        protocolFee: ethers.formatUnits(protocolFee, 8),
        totalFee: ethers.formatUnits(totalFee, 8),
        estimatedTime: '10-30 minutes',
        minimumReceived: ethers.formatUnits(wbtcAmount, 8),
        priceImpact: '0.1',
        expiresAt: Date.now() + 300000, // 5 minutes
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get Bitcoin to Ethereum quote');
    }
  }

  // Get quote for Ethereum to Bitcoin bridge
  async getEthereumToBitcoinQuote(
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    try {
      await this.initialize();

      const amountBN = ethers.parseUnits(amount, 8); // WBTC has 8 decimals
      
      // Calculate fees
      const networkFee = ethers.parseUnits('0.0001', 8); // 0.0001 BTC fee
      const protocolFee = ethers.parseUnits('0.00005', 8); // 0.00005 BTC protocol fee
      const totalFee = networkFee + protocolFee;
      
      // Calculate BTC amount
      const btcAmount = amountBN - totalFee;
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        fromToken: {
          id: 'wbtc-mainnet',
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/wbtc.svg',
          coingeckoId: 'wrapped-bitcoin',
          network: 'ethereum',
          chainId: 1,
          address: this.wbtcContract.target,
          isNative: false,
          isWrapped: true,
          verified: true,
          displayPrecision: 5,
          description: 'Bitcoin on Ethereum',
          tags: ['wrapped', 'erc20'],
        },
        toToken: {
          id: 'btc-mainnet',
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/btc.svg',
          coingeckoId: 'bitcoin',
          network: 'bitcoin',
          chainId: 'mainnet',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'The original cryptocurrency',
          tags: ['native', 'store-of-value'],
        },
        fromAmount: amount,
        toAmount: ethers.formatUnits(btcAmount, 8),
        exchangeRate: '1',
        networkFee: ethers.formatUnits(networkFee, 8),
        protocolFee: ethers.formatUnits(protocolFee, 8),
        totalFee: ethers.formatUnits(totalFee, 8),
        estimatedTime: '10-30 minutes',
        minimumReceived: ethers.formatUnits(btcAmount, 8),
        priceImpact: '0.1',
        expiresAt: Date.now() + 300000, // 5 minutes
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get Ethereum to Bitcoin quote');
    }
  }

  // Execute Bitcoin to Ethereum bridge
  async executeBitcoinToEthereum(
    amount: string,
    bitcoinAddress: string,
    walletAddress: string,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    try {
      await this.initialize();

      onProgress?.('Initiating Bitcoin to Ethereum bridge...');

      const amountBN = ethers.parseUnits(amount, 8);
      
      // Check WBTC balance
      const wbtcBalance = await this.wbtcContract.balanceOf(walletAddress);
      if (wbtcBalance < amountBN) {
        throw new Error('Insufficient WBTC balance');
      }

      // Check allowance
      const allowance = await this.wbtcContract.allowance(walletAddress, this.bridgeContract.target);
      if (allowance < amountBN) {
        onProgress?.('Approving WBTC transfer...');
        // User needs to approve WBTC transfer
        throw new Error('WBTC approval required');
      }

      onProgress?.('Locking WBTC in bridge contract...');

      // Create transaction for locking WBTC
      const lockTx = await this.bridgeContract.lockBitcoin.populateTransaction(
        amountBN,
        bitcoinAddress
      );

      return {
        id: Math.random().toString(36).substr(2, 9),
        from: {
          id: 'wbtc-mainnet',
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/wbtc.svg',
          coingeckoId: 'wrapped-bitcoin',
          network: 'ethereum',
          chainId: 1,
          address: this.wbtcContract.target,
          isNative: false,
          isWrapped: true,
          verified: true,
          displayPrecision: 5,
          description: 'Bitcoin on Ethereum',
          tags: ['wrapped', 'erc20'],
        },
        to: {
          id: 'btc-mainnet',
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/btc.svg',
          coingeckoId: 'bitcoin',
          network: 'bitcoin',
          chainId: 'mainnet',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'The original cryptocurrency',
          tags: ['native', 'store-of-value'],
        },
        fromAmount: {
          raw: amount,
          bn: amountBN,
          decimals: 8,
          formatted: amount
        },
        toAmount: {
          raw: amount,
          bn: amountBN,
          decimals: 8,
          formatted: amount
        },
        fromAddress: walletAddress,
        toAddress: bitcoinAddress,
        status: 'pending',
        txIdentifier: {
          ethereum: lockTx.hash || 'pending'
        },
        confirmations: 0,
        requiredConfirmations: 1,
        isConfirmed: false,
        timestamps: {
          created: Date.now(),
          updated: Date.now()
        },
        fees: {
          network: {
            amount: {
              raw: '0.0001',
              bn: ethers.parseUnits('0.0001', 8),
              decimals: 8,
              formatted: '0.0001'
            },
            amountUSD: 0
          },
          protocol: {
            amount: {
              raw: '0.00005',
              bn: ethers.parseUnits('0.00005', 8),
              decimals: 8,
              formatted: '0.00005'
            },
            amountUSD: 0,
            percent: 0.005
          },
          total: {
            amount: {
              raw: '0.00015',
              bn: ethers.parseUnits('0.00015', 8),
              decimals: 8,
              formatted: '0.00015'
            },
            amountUSD: 0
          }
        },
        retryCount: 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to execute Bitcoin to Ethereum bridge');
    }
  }

  // Execute Ethereum to Bitcoin bridge
  async executeEthereumToBitcoin(
    amount: string,
    ethereumAddress: string,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    try {
      await this.initialize();

      onProgress?.('Initiating Ethereum to Bitcoin bridge...');

      // This would involve:
      // 1. User sends BTC to a bridge address
      // 2. Validators detect the transaction
      // 3. Validators unlock WBTC on Ethereum
      
      // For now, we'll create a mock transaction
      const amountBN = ethers.parseUnits(amount, 8);

      return {
        id: Math.random().toString(36).substr(2, 9),
        from: {
          id: 'btc-mainnet',
          symbol: 'BTC',
          name: 'Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/btc.svg',
          coingeckoId: 'bitcoin',
          network: 'bitcoin',
          chainId: 'mainnet',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 5,
          description: 'The original cryptocurrency',
          tags: ['native', 'store-of-value'],
        },
        to: {
          id: 'wbtc-mainnet',
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/wbtc.svg',
          coingeckoId: 'wrapped-bitcoin',
          network: 'ethereum',
          chainId: 1,
          address: this.wbtcContract.target,
          isNative: false,
          isWrapped: true,
          verified: true,
          displayPrecision: 5,
          description: 'Bitcoin on Ethereum',
          tags: ['wrapped', 'erc20'],
        },
        fromAmount: {
          raw: amount,
          bn: amountBN,
          decimals: 8,
          formatted: amount
        },
        toAmount: {
          raw: amount,
          bn: amountBN,
          decimals: 8,
          formatted: amount
        },
        fromAddress: 'bitcoin-address',
        toAddress: ethereumAddress,
        status: 'pending',
        txIdentifier: {
          bitcoin: 'pending-bitcoin-tx'
        },
        confirmations: 0,
        requiredConfirmations: 6,
        isConfirmed: false,
        timestamps: {
          created: Date.now(),
          updated: Date.now()
        },
        fees: {
          network: {
            amount: {
              raw: '0.0001',
              bn: ethers.parseUnits('0.0001', 8),
              decimals: 8,
              formatted: '0.0001'
            },
            amountUSD: 0
          },
          protocol: {
            amount: {
              raw: '0.00005',
              bn: ethers.parseUnits('0.00005', 8),
              decimals: 8,
              formatted: '0.00005'
            },
            amountUSD: 0,
            percent: 0.005
          },
          total: {
            amount: {
              raw: '0.00015',
              bn: ethers.parseUnits('0.00015', 8),
              decimals: 8,
              formatted: '0.00015'
            },
            amountUSD: 0
          }
        },
        retryCount: 0
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to execute Ethereum to Bitcoin bridge');
    }
  }

  // Get bridge statistics
  async getBridgeStats() {
    try {
      await this.initialize();

      const lockIdCounter = await this.bridgeContract.lockIdCounter();
      const unlockIdCounter = await this.bridgeContract.unlockIdCounter();
      const minConfirmations = await this.bridgeContract.minConfirmations();
      const validatorCount = await this.bridgeContract.validatorCount();

      return {
        totalLocks: Number(lockIdCounter),
        totalUnlocks: Number(unlockIdCounter),
        minConfirmations: Number(minConfirmations),
        validatorCount: Number(validatorCount),
        bridgeAddress: this.bridgeContract.target,
        wbtcAddress: this.wbtcContract.target
      };
    } catch (error) {
      console.error('Error getting bridge stats:', error);
      return null;
    }
  }

  // Get pending transactions
  async getPendingTransactions() {
    try {
      await this.initialize();

      const lockIdCounter = await this.bridgeContract.lockIdCounter();
      const unlockIdCounter = await this.bridgeContract.unlockIdCounter();
      
      const pendingLocks = [];
      const pendingUnlocks = [];

      // Get pending locks
      for (let i = 1; i <= Number(lockIdCounter); i++) {
        const lockRequest = await this.bridgeContract.getLockRequest(i);
        if (!lockRequest.processed) {
          pendingLocks.push({
            id: i,
            user: lockRequest.user,
            amount: lockRequest.amount,
            bitcoinAddress: lockRequest.bitcoinAddress,
            timestamp: lockRequest.timestamp,
            processed: lockRequest.processed
          });
        }
      }

      // Get pending unlocks
      for (let i = 1; i <= Number(unlockIdCounter); i++) {
        const unlockRequest = await this.bridgeContract.getUnlockRequest(i);
        if (!unlockRequest.executed) {
          pendingUnlocks.push({
            id: i,
            user: unlockRequest.user,
            amount: unlockRequest.amount,
            bitcoinTxHash: unlockRequest.bitcoinTxHash,
            bitcoinBlockHeight: unlockRequest.bitcoinBlockHeight,
            timestamp: unlockRequest.timestamp,
            validationCount: unlockRequest.validationCount,
            executed: unlockRequest.executed
          });
        }
      }

      return {
        pendingLocks,
        pendingUnlocks
      };
    } catch (error) {
      console.error('Error getting pending transactions:', error);
      return { pendingLocks: [], pendingUnlocks: [] };
    }
  }

  // Error handling
  private handleError(error: any, defaultMessage: string): BridgeError {
    if (error instanceof Error) {
      return {
        code: BridgeErrorCode.UNKNOWN,
        message: error.message || defaultMessage,
        details: error
      };
    }

    return {
      code: BridgeErrorCode.UNKNOWN,
      message: defaultMessage,
      details: error
    };
  }
}

// Export singleton instance
export let trueBridgeService: TrueBridgeService | null = null;

// Initialize the true bridge service
export function initializeTrueBridge(
  ethereumRpcUrl: string,
  bridgeContractAddress: string,
  wbtcContractAddress: string
) {
  trueBridgeService = new TrueBridgeService(
    ethereumRpcUrl,
    bridgeContractAddress,
    wbtcContractAddress
  );
  
  return trueBridgeService;
} 