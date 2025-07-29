import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';
import { solanaWalletService } from './solana-wallet';
import { ethers } from 'ethers';
import { parseUnits, formatUnits } from 'ethers';
import { SOLANA_TEST_CONFIG, getTestBalance, getExchangeRate } from '@/config/solana-test';

// Solana Bridge Service Configuration
const SOLANA_BRIDGE_CONFIG = {
  // Quote settings
  quoteExpiryMs: 30000, // 30 seconds
  maxQuoteRetries: 3,
  
  // HTLC settings
  defaultTimelock: 3600, // 1 hour
  minTimelock: 1800, // 30 minutes
  maxTimelock: 7200, // 2 hours
  
  // Bridge fees
  bridgeFee: 0.001, // 0.001 ETH
  minBridgeAmount: 0.01, // 0.01 ETH
  maxBridgeAmount: 100, // 100 ETH
  
  // Gas settings
  gasLimitBuffer: 1.2, // 20% buffer
} as const;

// Solana Bridge Service Error
class SolanaBridgeServiceError extends Error {
  constructor(
    message: string,
    public code: BridgeErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SolanaBridgeServiceError';
  }
}

// HTLC Helper Functions
function generateHTLCId(): string {
  return ethers.randomBytes(32).toString('hex');
}

function generatePreimage(): string {
  return ethers.randomBytes(32).toString('hex');
}

function hashPreimage(preimage: string): string {
  return ethers.sha256(ethers.toUtf8Bytes(preimage));
}

// Solana Bridge Service Class
export class SolanaBridgeService {
  private static instance: SolanaBridgeService;
  private activeTransactions: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): SolanaBridgeService {
    if (!SolanaBridgeService.instance) {
      SolanaBridgeService.instance = new SolanaBridgeService();
    }
    return SolanaBridgeService.instance;
  }

  // Get quote for Solana bridge
  async getQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    try {
      // Validate inputs
      this.validateQuoteRequest(fromToken, toToken, amount, walletAddress);

      // Calculate exchange rate (simplified - in production, fetch from price feeds)
      const exchangeRate = await this.getExchangeRate(fromToken, toToken);
      const fromAmount = parseFloat(amount);
      const toAmount = fromAmount * exchangeRate;

      // Calculate fees
      const networkFee = this.calculateNetworkFee(fromToken);
      const protocolFee = this.calculateProtocolFee(fromAmount);
      const totalFee = networkFee + protocolFee;

      // Calculate minimum received
      const minimumReceived = toAmount * 0.995; // 0.5% slippage

      // Calculate price impact (simplified)
      const priceImpact = 0.1; // 0.1%

      const quote: BridgeQuote = {
        id: generateHTLCId(),
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: toAmount.toFixed(6),
        exchangeRate: exchangeRate.toFixed(6),
        networkFee: networkFee.toFixed(6),
        protocolFee: protocolFee.toFixed(6),
        totalFee: totalFee.toFixed(6),
        estimatedTime: '5-10 minutes',
        minimumReceived: minimumReceived.toFixed(6),
        priceImpact: priceImpact.toFixed(2),
        expiresAt: Date.now() + SOLANA_BRIDGE_CONFIG.quoteExpiryMs,
      };

      return quote;
    } catch (error) {
      throw this.handleError(error, 'Failed to get quote');
    }
  }

  // Execute Solana bridge transaction
  async executeBridge(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    recipientAddress?: string,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    try {
      // Validate inputs
      this.validateBridgeRequest(fromToken, toToken, amount, walletAddress);

      onProgress?.('Initializing bridge transaction...');

      // Generate HTLC parameters
      const htlcId = generateHTLCId();
      const preimage = generatePreimage();
      const hash = hashPreimage(preimage);
      const timelock = SOLANA_BRIDGE_CONFIG.defaultTimelock;

      onProgress?.('HTLC parameters generated', { htlcId });

      // Create bridge transaction
      const transaction = await this.createBridgeTransaction(
        fromToken,
        toToken,
        amount,
        walletAddress,
        recipientAddress,
        htlcId,
        hash,
        timelock,
        onProgress
      );

      // Store preimage for redemption (in production, this would be handled securely)
      this.storePreimage(htlcId, preimage);

      return transaction;
    } catch (error) {
      throw this.handleError(error, 'Failed to execute bridge');
    }
  }

  // Create bridge transaction
  private async createBridgeTransaction(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    recipientAddress: string | undefined,
    htlcId: string,
    hash: string,
    timelock: number,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    const fromAmount = parseFloat(amount);
    const exchangeRate = await this.getExchangeRate(fromToken, toToken);
    const toAmount = fromAmount * exchangeRate;

    // Determine bridge direction
    const isEthereumToSolana = fromToken.network === 'ethereum' && toToken.network === 'solana';
    const isSolanaToEthereum = fromToken.network === 'solana' && toToken.network === 'ethereum';

    if (isEthereumToSolana) {
      return await this.executeEthereumToSolana(
        fromToken,
        toToken,
        amount,
        walletAddress,
        recipientAddress,
        htlcId,
        hash,
        timelock,
        onProgress
      );
    } else if (isSolanaToEthereum) {
      return await this.executeSolanaToEthereum(
        fromToken,
        toToken,
        amount,
        walletAddress,
        recipientAddress,
        htlcId,
        hash,
        timelock,
        onProgress
      );
    } else {
      throw new SolanaBridgeServiceError(
        'Unsupported bridge direction',
        BridgeErrorCode.NO_ROUTE_FOUND
      );
    }
  }

  // Execute Ethereum to Solana bridge
  private async executeEthereumToSolana(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    recipientAddress: string | undefined,
    htlcId: string,
    hash: string,
    timelock: number,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    onProgress?.('Initiating Ethereum to Solana bridge...');

    // In production, this would interact with the SolanaBridge contract
    // For now, we'll simulate the transaction
    const txHash = await this.simulateEthereumTransaction(htlcId, amount, hash, timelock);
    
    onProgress?.('Ethereum transaction confirmed', { txHash });

    // Create transaction object
    const transaction: BridgeTransaction = {
      id: htlcId,
      from: fromToken,
      to: toToken,
      fromAmount: {
        raw: amount,
        bn: parseUnits(amount, fromToken.decimals),
        decimals: fromToken.decimals,
        formatted: amount
      },
      toAmount: {
        raw: (parseFloat(amount) * 0.995).toString(), // Apply slippage
        bn: parseUnits((parseFloat(amount) * 0.995).toString(), toToken.decimals),
        decimals: toToken.decimals,
        formatted: (parseFloat(amount) * 0.995).toString()
      },
      fromAddress: walletAddress,
      toAddress: recipientAddress || walletAddress,
      status: 'pending',
      txIdentifier: {
        ethereum: txHash,
      },
      confirmations: 0,
      requiredConfirmations: 12, // Ethereum confirmations
      isConfirmed: false,
      timestamps: {
        created: Date.now(),
        updated: Date.now(),
      },
      fees: {
        network: {
          amount: {
            raw: '0.001',
            bn: parseUnits('0.001', 18),
            decimals: 18,
            formatted: '0.001'
          },
          amountUSD: 2.5
        },
        protocol: {
          amount: {
            raw: '0.0005',
            bn: parseUnits('0.0005', 18),
            decimals: 18,
            formatted: '0.0005'
          },
          amountUSD: 1.25,
          percent: 0.1
        },
        total: {
          amount: {
            raw: '0.0015',
            bn: parseUnits('0.0015', 18),
            decimals: 18,
            formatted: '0.0015'
          },
          amountUSD: 3.75
        }
      },
      retryCount: 0,
    };

    // Start monitoring the transaction
    this.monitorTransaction(transaction, onProgress);

    return transaction;
  }

  // Execute Solana to Ethereum bridge
  private async executeSolanaToEthereum(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    recipientAddress: string | undefined,
    htlcId: string,
    hash: string,
    timelock: number,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    onProgress?.('Initiating Solana to Ethereum bridge...');

    // Check if Phantom wallet is connected
    if (!solanaWalletService.isConnected()) {
      throw new SolanaBridgeServiceError(
        'Phantom wallet not connected',
        BridgeErrorCode.WALLET_NOT_CONNECTED
      );
    }

    // In production, this would interact with the Solana program
    // For now, we'll simulate the transaction
    const txSignature = await this.simulateSolanaTransaction(htlcId, amount, hash, timelock);
    
    onProgress?.('Solana transaction confirmed', { txSignature });

    // Create transaction object
    const transaction: BridgeTransaction = {
      id: htlcId,
      from: fromToken,
      to: toToken,
      fromAmount: {
        raw: amount,
        bn: parseUnits(amount, fromToken.decimals),
        decimals: fromToken.decimals,
        formatted: amount
      },
      toAmount: {
        raw: (parseFloat(amount) * 0.995).toString(), // Apply slippage
        bn: parseUnits((parseFloat(amount) * 0.995).toString(), toToken.decimals),
        decimals: toToken.decimals,
        formatted: (parseFloat(amount) * 0.995).toString()
      },
      fromAddress: walletAddress,
      toAddress: recipientAddress || walletAddress,
      status: 'pending',
      txIdentifier: {
        solana: txSignature,
      },
      confirmations: 0,
      requiredConfirmations: 32, // Solana confirmations
      isConfirmed: false,
      timestamps: {
        created: Date.now(),
        updated: Date.now(),
      },
      fees: {
        network: {
          amount: {
            raw: '0.000005',
            bn: parseUnits('0.000005', 9),
            decimals: 9,
            formatted: '0.000005'
          },
          amountUSD: 0.01
        },
        protocol: {
          amount: {
            raw: '0.000001',
            bn: parseUnits('0.000001', 9),
            decimals: 9,
            formatted: '0.000001'
          },
          amountUSD: 0.002,
          percent: 0.1
        },
        total: {
          amount: {
            raw: '0.000006',
            bn: parseUnits('0.000006', 9),
            decimals: 9,
            formatted: '0.000006'
          },
          amountUSD: 0.012
        }
      },
      retryCount: 0,
    };

    // Start monitoring the transaction
    this.monitorTransaction(transaction, onProgress);

    return transaction;
  }

  // Monitor transaction status
  private monitorTransaction(
    transaction: BridgeTransaction,
    onProgress?: (status: string, data?: any) => void
  ): void {
    const pollInterval = 5000; // 5 seconds
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes

    const poll = async () => {
      try {
        attempts++;
        
        if (attempts > maxAttempts) {
          onProgress?.('Transaction monitoring timeout', { transactionId: transaction.id });
          return;
        }

        // Check transaction status
        const status = await this.getTransactionStatus(transaction);
        
        onProgress?.(`Transaction status: ${status}`, { transactionId: transaction.id, status });

        if (status === 'completed') {
          transaction.status = 'completed';
          transaction.isConfirmed = true;
          transaction.timestamps.completed = Date.now();
          transaction.duration = Date.now() - transaction.timestamps.created;
          onProgress?.('Bridge transaction completed!', { transactionId: transaction.id });
        } else if (status === 'failed') {
          transaction.status = 'failed';
          onProgress?.('Bridge transaction failed', { transactionId: transaction.id });
        } else {
          // Continue polling
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        console.error('Error monitoring transaction:', error);
        setTimeout(poll, pollInterval);
      }
    };

    // Start polling
    poll();
  }

  // Get transaction status
  private async getTransactionStatus(transaction: BridgeTransaction): Promise<string> {
    // In production, this would check the actual blockchain
    // For now, simulate status progression
    const elapsed = Date.now() - transaction.timestamps.created;
    
    if (elapsed < 30000) { // 30 seconds
      return 'pending';
    } else if (elapsed < 60000) { // 1 minute
      return 'confirming';
    } else {
      return 'completed';
    }
  }

  // Get exchange rate between tokens
  private async getExchangeRate(fromToken: Token, toToken: Token): Promise<number> {
    // Use test configuration for development
    return getExchangeRate(fromToken.symbol, toToken.symbol);
  }

  // Calculate network fee
  private calculateNetworkFee(token: Token): number {
    if (token.network === 'ethereum') {
      return 0.001; // 0.001 ETH
    } else if (token.network === 'solana') {
      return 0.000005; // 0.000005 SOL
    }
    return 0;
  }

  // Calculate protocol fee
  private calculateProtocolFee(amount: number): number {
    return amount * 0.001; // 0.1%
  }

  // Simulate Ethereum transaction
  private async simulateEthereumTransaction(
    htlcId: string,
    amount: string,
    hash: string,
    timelock: number
  ): Promise<string> {
    // In production, this would interact with the actual contract
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    return `0x${ethers.randomBytes(32).toString('hex')}`;
  }

  // Simulate Solana transaction
  private async simulateSolanaTransaction(
    htlcId: string,
    amount: string,
    hash: string,
    timelock: number
  ): Promise<string> {
    // In production, this would interact with the actual Solana program
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    return ethers.randomBytes(64).toString('base64');
  }

  // Store preimage (in production, this would be handled securely)
  private storePreimage(htlcId: string, preimage: string): void {
    // In production, this would be stored securely (e.g., encrypted in localStorage)
    console.log(`Stored preimage for HTLC ${htlcId}: ${preimage}`);
  }

  // Validation methods
  private validateQuoteRequest(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): void {
    if (!fromToken || !toToken) {
      throw new SolanaBridgeServiceError(
        'Invalid tokens',
        BridgeErrorCode.NO_ROUTE_FOUND
      );
    }

    if (!amount || parseFloat(amount) <= 0) {
      throw new SolanaBridgeServiceError(
        'Invalid amount',
        BridgeErrorCode.AMOUNT_TOO_LOW
      );
    }

    if (!walletAddress) {
      throw new SolanaBridgeServiceError(
        'Invalid wallet address',
        BridgeErrorCode.WALLET_NOT_CONNECTED
      );
    }

    // Check if tokens are on different networks
    if (fromToken.network === toToken.network) {
      throw new SolanaBridgeServiceError(
        'Tokens must be on different networks for bridging',
        BridgeErrorCode.NO_ROUTE_FOUND
      );
    }

    // Check if one of the tokens is Solana
    if (fromToken.network !== 'solana' && toToken.network !== 'solana') {
      throw new SolanaBridgeServiceError(
        'At least one token must be Solana for Solana bridge',
        BridgeErrorCode.NO_ROUTE_FOUND
      );
    }
  }

  private validateBridgeRequest(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): void {
    this.validateQuoteRequest(fromToken, toToken, amount, walletAddress);

    const amountNum = parseFloat(amount);
    if (amountNum < SOLANA_BRIDGE_CONFIG.minBridgeAmount) {
      throw new SolanaBridgeServiceError(
        `Amount must be at least ${SOLANA_BRIDGE_CONFIG.minBridgeAmount}`,
        BridgeErrorCode.AMOUNT_TOO_LOW
      );
    }

    if (amountNum > SOLANA_BRIDGE_CONFIG.maxBridgeAmount) {
      throw new SolanaBridgeServiceError(
        `Amount must be at most ${SOLANA_BRIDGE_CONFIG.maxBridgeAmount}`,
        BridgeErrorCode.AMOUNT_TOO_HIGH
      );
    }
  }

  // Error handling
  private handleError(error: any, defaultMessage: string): SolanaBridgeServiceError {
    if (error instanceof SolanaBridgeServiceError) {
      return error;
    }

    if (error instanceof Error) {
      return new SolanaBridgeServiceError(
        error.message || defaultMessage,
        BridgeErrorCode.UNKNOWN,
        error
      );
    }

    return new SolanaBridgeServiceError(
      defaultMessage,
      BridgeErrorCode.UNKNOWN,
      error
    );
  }

  // Cancel transaction monitoring
  cancelTransactionMonitoring(transactionId: string): void {
    const timeout = this.activeTransactions.get(transactionId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTransactions.delete(transactionId);
    }
  }

  // Get supported token pairs
  getSupportedPairs(): Array<{ from: Token; to: Token }> {
    // Return Solana bridge pairs
    return [
      { from: { symbol: 'ETH', network: 'ethereum' } as Token, to: { symbol: 'SOL', network: 'solana' } as Token },
      { from: { symbol: 'SOL', network: 'solana' } as Token, to: { symbol: 'ETH', network: 'ethereum' } as Token },
      { from: { symbol: 'BTC', network: 'bitcoin' } as Token, to: { symbol: 'SOL', network: 'solana' } as Token },
      { from: { symbol: 'SOL', network: 'solana' } as Token, to: { symbol: 'BTC', network: 'bitcoin' } as Token },
    ];
  }

  // Check if pair is supported
  isPairSupported(fromToken: Token, toToken: Token): boolean {
    const pairs = this.getSupportedPairs();
    return pairs.some(pair => 
      pair.from.symbol === fromToken.symbol && 
      pair.to.symbol === toToken.symbol &&
      pair.from.network === fromToken.network &&
      pair.to.network === toToken.network
    );
  }
}

// Export singleton instance
export const solanaBridgeService = SolanaBridgeService.getInstance(); 