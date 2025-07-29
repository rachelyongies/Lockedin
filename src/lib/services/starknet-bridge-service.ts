import { Token, BridgeQuote, BridgeTransaction } from '@/types/bridge';
import { ethers } from 'ethers';
import { parseUnits, formatUnits } from 'ethers';

// Starknet Bridge Service Configuration
const STARKNET_BRIDGE_CONFIG = {
  minAmount: 0.01, // Minimum bridge amount in ETH
  maxAmount: 100,  // Maximum bridge amount in ETH
  defaultTimelock: 3600, // 1 hour default timelock
  fee: 0.001,      // Bridge fee in ETH
  exchangeRate: 1, // 1:1 exchange rate for now
};

export class StarknetBridgeService {
  private static instance: StarknetBridgeService;

  private constructor() {}

  static getInstance(): StarknetBridgeService {
    if (!StarknetBridgeService.instance) {
      StarknetBridgeService.instance = new StarknetBridgeService();
    }
    return StarknetBridgeService.instance;
  }

  // Check if a token pair is supported
  isPairSupported(fromToken: Token, toToken: Token): boolean {
    const supportedPairs = [
      { from: 'ETH', to: 'STARK' },
      { from: 'STARK', to: 'ETH' },
      { from: 'WETH', to: 'WSTARK' },
      { from: 'WSTARK', to: 'WETH' },
      { from: 'BTC', to: 'STARK' },
      { from: 'STARK', to: 'BTC' },
      { from: 'SOL', to: 'STARK' },
      { from: 'STARK', to: 'SOL' },
    ];

    return supportedPairs.some(pair => 
      pair.from === fromToken.symbol && pair.to === toToken.symbol
    );
  }

  // Get exchange rate between tokens
  private async getExchangeRate(fromToken: Token, toToken: Token): Promise<number> {
    // In production, this would fetch from price feeds
    // For now, use simplified rates
    const rates: Record<string, number> = {
      'ETH_STARK': 1,    // 1 ETH = 1 STARK
      'STARK_ETH': 1,    // 1 STARK = 1 ETH
      'BTC_STARK': 0.05, // 1 BTC = 0.05 STARK
      'STARK_BTC': 20,   // 1 STARK = 20 BTC
      'SOL_STARK': 0.8,  // 1 SOL = 0.8 STARK
      'STARK_SOL': 1.25, // 1 STARK = 1.25 SOL
    };

    const key = `${fromToken.symbol}_${toToken.symbol}`;
    return rates[key] || 1;
  }

  // Get bridge quote
  async getQuote(fromToken: Token, toToken: Token, amount: string, walletAddress: string): Promise<BridgeQuote> {
    try {
      // Validate inputs
      if (!this.isPairSupported(fromToken, toToken)) {
        throw new Error(`Token pair ${fromToken.symbol}-${toToken.symbol} not supported for Starknet bridge`);
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }

      if (amountNum < STARKNET_BRIDGE_CONFIG.minAmount) {
        throw new Error(`Amount too low. Minimum: ${STARKNET_BRIDGE_CONFIG.minAmount} ${fromToken.symbol}`);
      }

      if (amountNum > STARKNET_BRIDGE_CONFIG.maxAmount) {
        throw new Error(`Amount too high. Maximum: ${STARKNET_BRIDGE_CONFIG.maxAmount} ${fromToken.symbol}`);
      }

      // Get exchange rate
      const exchangeRate = await this.getExchangeRate(fromToken, toToken);
      
      // Calculate fees
      const bridgeFee = STARKNET_BRIDGE_CONFIG.fee;
      const networkFee = 0.0001; // Estimated gas fee
      const totalFee = bridgeFee + networkFee;

      // Calculate amounts
      const fromAmount = parseUnits(amount, fromToken.decimals);
      const toAmount = (fromAmount * BigInt(Math.floor(exchangeRate * 10000))) / 10000n; // Apply exchange rate
      const feeAmount = parseUnits(totalFee.toString(), fromToken.decimals);

      return {
        id: `starknet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: formatUnits(toAmount, toToken.decimals),
        exchangeRate: exchangeRate.toString(),
        networkFee: networkFee.toString(),
        protocolFee: bridgeFee.toString(),
        totalFee: totalFee.toString(),
        estimatedTime: '5-10 minutes',
        minimumReceived: formatUnits(toAmount, toToken.decimals),
        priceImpact: '0.1',
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get quote');
    }
  }

  // Execute bridge transaction
  async executeBridge(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    recipientAddress?: string,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    try {
      onProgress?.('Initializing Starknet bridge...');

      // Get quote first
      const quote = await this.getQuote(fromToken, toToken, amount, walletAddress);
      
      onProgress?.('Quote received', { quote });

      // Generate HTLC ID
      const htlcId = ethers.keccak256(ethers.toUtf8Bytes(`${walletAddress}-${Date.now()}-${Math.random()}`));
      
      // Generate preimage and hash
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const preimage = bytes;
      const hash = ethers.keccak256(preimage);

      onProgress?.('HTLC parameters generated', { htlcId, hash });

      // Determine bridge direction
      const isEthereumToStarknet = fromToken.network === 'ethereum' && toToken.network === 'starknet';
      const isStarknetToEthereum = fromToken.network === 'starknet' && toToken.network === 'ethereum';

      let transaction: BridgeTransaction;

      if (isEthereumToStarknet) {
        transaction = await this.executeEthereumToStarknet(
          fromToken, toToken, amount, walletAddress, recipientAddress, htlcId, hash, quote, onProgress
        );
      } else if (isStarknetToEthereum) {
        transaction = await this.executeStarknetToEthereum(
          fromToken, toToken, amount, walletAddress, recipientAddress, htlcId, hash, quote, onProgress
        );
      } else {
        throw new Error('Unsupported bridge direction');
      }

      onProgress?.('Bridge transaction completed', { transactionId: transaction.id });
      return transaction;

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Bridge execution failed');
    }
  }

  // Execute Ethereum to Starknet bridge
  private async executeEthereumToStarknet(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    recipientAddress: string | undefined,
    htlcId: string,
    hash: string,
    quote: BridgeQuote,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    onProgress?.('Initiating Ethereum to Starknet bridge...');

    // Simulate contract interaction
    await new Promise(resolve => setTimeout(resolve, 2000));

    onProgress?.('HTLC created on Ethereum', { htlcId });

    // Simulate Starknet transaction
    await new Promise(resolve => setTimeout(resolve, 3000));

    onProgress?.('Starknet transaction initiated');

    // Generate transaction ID
    const transactionId = ethers.keccak256(ethers.toUtf8Bytes(`${htlcId}-${Date.now()}`));

    return {
      id: transactionId,
      from: fromToken,
      to: toToken,
      fromAmount: {
        raw: quote.fromAmount,
        bn: parseUnits(quote.fromAmount, fromToken.decimals),
        decimals: fromToken.decimals,
        formatted: quote.fromAmount
      },
      toAmount: {
        raw: quote.toAmount,
        bn: parseUnits(quote.toAmount, toToken.decimals),
        decimals: toToken.decimals,
        formatted: quote.toAmount
      },
      fromAddress: walletAddress,
      toAddress: recipientAddress || walletAddress,
      status: 'pending',
      timestamps: {
        created: Date.now(),
        updated: Date.now()
      },
      txIdentifier: {
        ethereum: transactionId,
        starknet: ethers.keccak256(ethers.toUtf8Bytes(`starknet-${transactionId}`)),
        htlc: {
          id: htlcId,
          hash: hash,
          preimage: undefined
        }
      },
      fees: {
        network: {
          amount: {
            raw: quote.networkFee,
            bn: parseUnits(quote.networkFee, fromToken.decimals),
            decimals: fromToken.decimals,
            formatted: quote.networkFee
          },
          amountUSD: parseFloat(quote.networkFee) * 2500 // Mock ETH price
        },
        protocol: {
          amount: {
            raw: quote.protocolFee,
            bn: parseUnits(quote.protocolFee, fromToken.decimals),
            decimals: fromToken.decimals,
            formatted: quote.protocolFee
          },
          amountUSD: parseFloat(quote.protocolFee) * 2500,
          percent: 0.1
        },
        total: {
          amount: {
            raw: quote.totalFee,
            bn: parseUnits(quote.totalFee, fromToken.decimals),
            decimals: fromToken.decimals,
            formatted: quote.totalFee
          },
          amountUSD: parseFloat(quote.totalFee) * 2500
        }
      },
      confirmations: 0,
      requiredConfirmations: 12,
      isConfirmed: false,
      retryCount: 0
    };
  }

  // Execute Starknet to Ethereum bridge
  private async executeStarknetToEthereum(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    recipientAddress: string | undefined,
    htlcId: string,
    hash: string,
    quote: BridgeQuote,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    onProgress?.('Initiating Starknet to Ethereum bridge...');

    // Simulate Starknet contract interaction
    await new Promise(resolve => setTimeout(resolve, 2000));

    onProgress?.('HTLC created on Starknet', { htlcId });

    // Simulate Ethereum transaction
    await new Promise(resolve => setTimeout(resolve, 3000));

    onProgress?.('Ethereum transaction initiated');

    // Generate transaction ID
    const transactionId = ethers.keccak256(ethers.toUtf8Bytes(`${htlcId}-${Date.now()}`));

    return {
      id: transactionId,
      from: fromToken,
      to: toToken,
      fromAmount: {
        raw: quote.fromAmount,
        bn: parseUnits(quote.fromAmount, fromToken.decimals),
        decimals: fromToken.decimals,
        formatted: quote.fromAmount
      },
      toAmount: {
        raw: quote.toAmount,
        bn: parseUnits(quote.toAmount, toToken.decimals),
        decimals: toToken.decimals,
        formatted: quote.toAmount
      },
      fromAddress: walletAddress,
      toAddress: recipientAddress || walletAddress,
      status: 'pending',
      timestamps: {
        created: Date.now(),
        updated: Date.now()
      },
      txIdentifier: {
        starknet: transactionId,
        ethereum: ethers.keccak256(ethers.toUtf8Bytes(`ethereum-${transactionId}`)),
        htlc: {
          id: htlcId,
          hash: hash,
          preimage: undefined
        }
      },
      fees: {
        network: {
          amount: {
            raw: quote.networkFee,
            bn: parseUnits(quote.networkFee, fromToken.decimals),
            decimals: fromToken.decimals,
            formatted: quote.networkFee
          },
          amountUSD: parseFloat(quote.networkFee) * 2500 // Mock ETH price
        },
        protocol: {
          amount: {
            raw: quote.protocolFee,
            bn: parseUnits(quote.protocolFee, fromToken.decimals),
            decimals: fromToken.decimals,
            formatted: quote.protocolFee
          },
          amountUSD: parseFloat(quote.protocolFee) * 2500,
          percent: 0.1
        },
        total: {
          amount: {
            raw: quote.totalFee,
            bn: parseUnits(quote.totalFee, fromToken.decimals),
            decimals: fromToken.decimals,
            formatted: quote.totalFee
          },
          amountUSD: parseFloat(quote.totalFee) * 2500
        }
      },
      confirmations: 0,
      requiredConfirmations: 12,
      isConfirmed: false,
      retryCount: 0
    };
  }

  // Get transaction status
  async getTransactionStatus(transactionId: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    details?: unknown;
  }> {
    // Simulate status check
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Random status for demo
    const statuses: Array<'pending' | 'completed' | 'failed' | 'refunded'> = ['pending', 'completed', 'failed', 'refunded'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      status: randomStatus,
      details: {
        transactionId,
        timestamp: Date.now(),
        confirmations: randomStatus === 'completed' ? 12 : 0,
      }
    };
  }

  // Redeem HTLC
  async redeemHtlc(htlcId: string, preimage: string): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    try {
      // Simulate redemption
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        transactionId: ethers.keccak256(ethers.toUtf8Bytes(`redeem-${htlcId}-${Date.now()}`)),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Redemption failed',
      };
    }
  }

  // Refund HTLC
  async refundHtlc(htlcId: string): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    try {
      // Simulate refund
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        transactionId: ethers.keccak256(ethers.toUtf8Bytes(`refund-${htlcId}-${Date.now()}`)),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }
}

export const starknetBridgeService = StarknetBridgeService.getInstance(); 