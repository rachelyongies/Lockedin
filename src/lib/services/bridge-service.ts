import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';
import { fusionAPI, FusionOrderResponse, FusionOrderStatusResponse } from './1inch-fusion';
import { mockFusionAPI } from './mock-fusion-testnet';
import { parseUnits, formatUnits } from 'ethers';

// Bridge Service Configuration
const BRIDGE_CONFIG = {
  // Quote settings
  quoteExpiryMs: 30000, // 30 seconds
  maxQuoteRetries: 3,
  
  // Order settings
  orderPollingInterval: 5000, // 5 seconds
  maxOrderPollingAttempts: 60, // 5 minutes max
  
  // Slippage settings
  defaultSlippage: 0.5, // 0.5%
  maxSlippage: 5.0, // 5%
  
  // Gas settings
  gasLimitBuffer: 1.2, // 20% buffer
} as const;

// Bridge Service Error
class BridgeServiceError extends Error {
  constructor(
    message: string,
    public code: BridgeErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BridgeServiceError';
  }
}

// Bridge Service Class
export class BridgeService {
  private static instance: BridgeService;
  private activeOrders: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): BridgeService {
    if (!BridgeService.instance) {
      BridgeService.instance = new BridgeService();
    }
    return BridgeService.instance;
  }

  // Get quote for token swap
  async getQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    try {
      // Validate inputs
      this.validateQuoteRequest(fromToken, toToken, amount, walletAddress);

      // Detect network and use appropriate service
      const isTestnet = process.env.NEXT_PUBLIC_ENABLE_TESTNET === 'true';
      const quoteService = isTestnet ? mockFusionAPI : fusionAPI;
      
      // Get quote from appropriate service
      const quote = await quoteService.getQuote(fromToken, toToken, amount, walletAddress);

      // Validate quote
      this.validateQuote(quote);

      return quote;
    } catch (error) {
      throw this.handleError(error, 'Failed to get quote');
    }
  }

  // Execute bridge transaction
  async executeBridge(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    slippage: number = BRIDGE_CONFIG.defaultSlippage,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    try {
      // Validate inputs
      this.validateBridgeRequest(fromToken, toToken, amount, walletAddress, slippage);

      onProgress?.('Creating order...');

      // Detect network and use appropriate service
      const isTestnet = process.env.NEXT_PUBLIC_ENABLE_TESTNET === 'true';
      const orderService = isTestnet ? mockFusionAPI : fusionAPI;
      
      // Create order with appropriate service
      const order = await orderService.createOrder(fromToken, toToken, amount, walletAddress);

      onProgress?.('Order created', { orderId: order.orderId });

      // Start monitoring the order
      const transaction = await this.monitorOrder(order, onProgress, isTestnet ? mockFusionAPI : fusionAPI);

      return transaction;
    } catch (error) {
      throw this.handleError(error, 'Failed to execute bridge');
    }
  }

  // Monitor order status
  private async monitorOrder(
    order: FusionOrderResponse,
    onProgress?: (status: string, data?: unknown) => void,
    statusService?: typeof fusionAPI | typeof mockFusionAPI
  ): Promise<BridgeTransaction> {
    const orderId = order.orderId;
    let attempts = 0;
    const service = statusService || fusionAPI;

    return new Promise((resolve, reject) => {
      const pollOrder = async () => {
        try {
          attempts++;
          
          if (attempts > BRIDGE_CONFIG.maxOrderPollingAttempts) {
            reject(new BridgeServiceError(
              'Order monitoring timeout',
              BridgeErrorCode.TIMEOUT
            ));
            return;
          }

          const status = await service.getOrderStatus(orderId);
          
          onProgress?.(`Order status: ${status.orderStatus}`, status);

          switch (status.orderStatus) {
            case 'filled':
              const transaction = this.createBridgeTransaction(order, status);
              resolve(transaction);
              break;
              
            case 'failed':
            case 'cancelled':
            case 'expired':
              reject(new BridgeServiceError(
                `Order ${status.orderStatus}`,
                BridgeErrorCode.TRANSACTION_FAILED,
                status.error
              ));
              break;
              
            case 'pending':
            case 'open':
              // Continue polling
              setTimeout(pollOrder, BRIDGE_CONFIG.orderPollingInterval);
              break;
              
            default:
              reject(new BridgeServiceError(
                `Unknown order status: ${status.orderStatus}`,
                BridgeErrorCode.UNKNOWN
              ));
          }
        } catch (error) {
          reject(this.handleError(error, 'Failed to monitor order'));
        }
      };

      // Start polling
      pollOrder();
    });
  }

  // Create bridge transaction from order
  private createBridgeTransaction(
    order: FusionOrderResponse,
    status: FusionOrderStatusResponse
  ): BridgeTransaction {
    return {
      id: order.orderId,
      from: this.mapTokenFromFusion(order.fromToken),
      to: this.mapTokenFromFusion(order.toToken),
      fromAmount: {
        raw: order.fromTokenAmount,
        bn: BigInt(order.fromTokenAmount),
        decimals: order.fromToken.decimals,
        formatted: formatUnits(BigInt(order.fromTokenAmount), order.fromToken.decimals)
      },
      toAmount: {
        raw: order.toTokenAmount,
        bn: BigInt(order.toTokenAmount),
        decimals: order.toToken.decimals,
        formatted: formatUnits(BigInt(order.toTokenAmount), order.toToken.decimals)
      },
      fromAddress: '', // Will be set by wallet
      toAddress: '', // Will be set by wallet
      status: this.mapOrderStatus(status.orderStatus),
      txIdentifier: {
        ethereum: status.txHash,
      },
      confirmations: status.blockNumber ? 1 : 0,
      requiredConfirmations: 1,
      isConfirmed: status.blockNumber !== undefined,
      timestamps: {
        created: order.createdAt,
        updated: status.updatedAt,
        completed: status.orderStatus === 'filled' ? status.updatedAt : undefined,
      },
      duration: status.orderStatus === 'filled' ? 
        status.updatedAt - order.createdAt : undefined,
      fees: {
        network: {
          amount: {
            raw: order.gasCost,
            bn: BigInt(order.gasCost),
            decimals: 18,
            formatted: formatUnits(BigInt(order.gasCost), 18)
          },
          amountUSD: parseFloat(order.gasCostUSD)
        },
        protocol: {
          amount: {
            raw: '0',
            bn: BigInt(0),
            decimals: 18,
            formatted: '0'
          },
          amountUSD: 0,
          percent: 0
        },
        total: {
          amount: {
            raw: order.gasCost,
            bn: BigInt(order.gasCost),
            decimals: 18,
            formatted: formatUnits(BigInt(order.gasCost), 18)
          },
          amountUSD: parseFloat(order.gasCostUSD)
        }
      },
      retryCount: 0,
    };
  }

  // Map Fusion token to our Token format
  private mapTokenFromFusion(fusionToken: { symbol: string; name: string; decimals: number; address: string; logoURI?: string; tags?: string[] }): Token {
    return {
      id: `${fusionToken.symbol.toLowerCase()}-ethereum-1`,
      symbol: fusionToken.symbol,
      name: fusionToken.name,
      decimals: fusionToken.decimals,
      logoUrl: fusionToken.logoURI || '',
      coingeckoId: fusionToken.symbol.toLowerCase(),
      network: 'ethereum',
      chainId: 1,
      address: fusionToken.address,
      isNative: fusionToken.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
      isWrapped: false,
      verified: true,
      displayPrecision: 4,
      description: fusionToken.name,
      tags: fusionToken.tags || [],
    };
  }

  // Map order status to transaction status
  private mapOrderStatus(orderStatus: string): BridgeTransaction['status'] {
    switch (orderStatus) {
      case 'pending':
        return 'pending';
      case 'open':
        return 'confirming';
      case 'filled':
        return 'completed';
      case 'failed':
      case 'cancelled':
      case 'expired':
        return 'failed';
      default:
        return 'pending';
    }
  }

  // Validation methods
  private validateQuoteRequest(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): void {
    if (!fromToken || !toToken) {
      throw new BridgeServiceError(
        'Invalid tokens',
        BridgeErrorCode.NO_ROUTE_FOUND
      );
    }

    if (!amount || amount.trim() === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw new BridgeServiceError(
        `Invalid amount: ${amount}. Amount must be a positive number.`,
        BridgeErrorCode.AMOUNT_TOO_LOW
      );
    }

    if (!walletAddress || walletAddress.length !== 42) {
      throw new BridgeServiceError(
        'Invalid wallet address',
        BridgeErrorCode.WALLET_NOT_CONNECTED
      );
    }

    // Allow cross-chain bridging for supported pairs (ETH-BTC atomic swaps)
    const isCrossChain = fromToken.network !== toToken.network;
    if (isCrossChain) {
      // Check if this cross-chain pair is supported
      if (!this.isPairSupported(fromToken, toToken)) {
        throw new BridgeServiceError(
          `Cross-chain pair ${fromToken.symbol}-${toToken.symbol} not supported`,
          BridgeErrorCode.NO_ROUTE_FOUND
        );
      }
    }
  }

  private validateBridgeRequest(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    slippage: number
  ): void {
    this.validateQuoteRequest(fromToken, toToken, amount, walletAddress);

    if (slippage < 0 || slippage > BRIDGE_CONFIG.maxSlippage) {
      throw new BridgeServiceError(
        `Slippage must be between 0 and ${BRIDGE_CONFIG.maxSlippage}%`,
        BridgeErrorCode.SLIPPAGE_EXCEEDED
      );
    }
  }

  private validateQuote(quote: BridgeQuote): void {
    if (!quote.toAmount || parseFloat(quote.toAmount) <= 0) {
      throw new BridgeServiceError(
        'Invalid quote received',
        BridgeErrorCode.NO_ROUTE_FOUND
      );
    }
  }

  // Error handling
  private handleError(error: unknown, defaultMessage: string): BridgeServiceError {
    if (error instanceof BridgeServiceError) {
      return error;
    }

    if (error instanceof Error) {
      return new BridgeServiceError(
        error.message || defaultMessage,
        BridgeErrorCode.UNKNOWN,
        error
      );
    }

    return new BridgeServiceError(
      defaultMessage,
      BridgeErrorCode.UNKNOWN,
      error
    );
  }

  // Cancel order monitoring
  cancelOrderMonitoring(orderId: string): void {
    const timeout = this.activeOrders.get(orderId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeOrders.delete(orderId);
    }
  }

  // Get supported token pairs
  getSupportedPairs(): Array<{ from: Token; to: Token }> {
    // Cross-chain atomic swap pairs for Fusion+ Bitcoin extension
    return [
      // Traditional Ethereum pairs
      { from: { symbol: 'ETH' } as Token, to: { symbol: 'WETH' } as Token },
      { from: { symbol: 'WETH' } as Token, to: { symbol: 'ETH' } as Token },
      { from: { symbol: 'ETH' } as Token, to: { symbol: 'WBTC' } as Token },
      { from: { symbol: 'WBTC' } as Token, to: { symbol: 'ETH' } as Token },
      
      // Cross-chain atomic swap pairs (bidirectional)
      { from: { symbol: 'ETH' } as Token, to: { symbol: 'BTC' } as Token },
      { from: { symbol: 'BTC' } as Token, to: { symbol: 'ETH' } as Token },
      
      // Additional supported cross-chain pairs
      { from: { symbol: 'WETH' } as Token, to: { symbol: 'BTC' } as Token },
      { from: { symbol: 'BTC' } as Token, to: { symbol: 'WETH' } as Token },
    ];
  }

  // Check if pair is supported
  isPairSupported(fromToken: Token, toToken: Token): boolean {
    const pairs = this.getSupportedPairs();
    return pairs.some(pair => 
      pair.from.symbol === fromToken.symbol && 
      pair.to.symbol === toToken.symbol
    );
  }
}

// Export singleton instance
export const bridgeService = BridgeService.getInstance(); 