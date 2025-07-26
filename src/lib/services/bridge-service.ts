import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';
import { fusionAPI, FusionOrderResponse, FusionOrderStatusResponse } from './1inch-fusion';
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

      // Get quote from 1inch Fusion
      const quote = await fusionAPI.getQuote(fromToken, toToken, amount, walletAddress);

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
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    try {
      // Validate inputs
      this.validateBridgeRequest(fromToken, toToken, amount, walletAddress, slippage);

      onProgress?.('Creating order...');

      // Create order with 1inch Fusion
      const order = await fusionAPI.createOrder(fromToken, toToken, amount, walletAddress);

      onProgress?.('Order created', { orderId: order.orderId });

      // Start monitoring the order
      const transaction = await this.monitorOrder(order, onProgress);

      return transaction;
    } catch (error) {
      throw this.handleError(error, 'Failed to execute bridge');
    }
  }

  // Monitor order status
  private async monitorOrder(
    order: FusionOrderResponse,
    onProgress?: (status: string, data?: any) => void
  ): Promise<BridgeTransaction> {
    const orderId = order.orderId;
    let attempts = 0;

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

          const status = await fusionAPI.getOrderStatus(orderId);
          
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
  private mapTokenFromFusion(fusionToken: any): Token {
    return {
      id: `${fusionToken.symbol.toLowerCase()}-ethereum-1`,
      symbol: fusionToken.symbol,
      name: fusionToken.name,
      decimals: fusionToken.decimals,
      logoUrl: fusionToken.logoURI,
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

    if (!amount || parseFloat(amount) <= 0) {
      throw new BridgeServiceError(
        'Invalid amount',
        BridgeErrorCode.AMOUNT_TOO_LOW
      );
    }

    if (!walletAddress || walletAddress.length !== 42) {
      throw new BridgeServiceError(
        'Invalid wallet address',
        BridgeErrorCode.WALLET_NOT_CONNECTED
      );
    }

    // Check if tokens are on the same network (for now, we only support Ethereum)
    if (fromToken.network !== 'ethereum' || toToken.network !== 'ethereum') {
      throw new BridgeServiceError(
        'Cross-chain bridging not yet supported',
        BridgeErrorCode.NO_ROUTE_FOUND
      );
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
  private handleError(error: any, defaultMessage: string): BridgeServiceError {
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
    // For now, return basic ETH pairs
    // In production, this would be fetched from the API
    return [
      { from: { symbol: 'ETH' } as Token, to: { symbol: 'WETH' } as Token },
      { from: { symbol: 'WETH' } as Token, to: { symbol: 'ETH' } as Token },
      { from: { symbol: 'ETH' } as Token, to: { symbol: 'WBTC' } as Token },
      { from: { symbol: 'WBTC' } as Token, to: { symbol: 'ETH' } as Token },
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