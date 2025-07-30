import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode, BridgeRoute, createAmount, BridgeFees } from '@/types/bridge';
import { fusionAPI, FusionOrderResponse, FusionOrderStatusResponse } from './1inch-fusion';
import { aiSmartRouting, RouteAnalysis, MLPrediction } from './ai-smart-routing';
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
  private routeCache: Map<string, RouteAnalysis[]> = new Map();
  private cacheExpiryMs = 60000; // 1 minute cache

  static getInstance(): BridgeService {
    if (!BridgeService.instance) {
      BridgeService.instance = new BridgeService();
    }
    return BridgeService.instance;
  }

  // Get quote for token swap - PRIORITIZES ATOMIC SWAPS
  async getQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    try {
      // Validate inputs
      this.validateQuoteRequest(fromToken, toToken, amount, walletAddress);

      // 🔄 ATOMIC SWAP PRIORITY: Check if this should use native atomic swaps
      const requiresAtomicSwap = this.shouldUseAtomicSwap(fromToken, toToken);
      
      if (requiresAtomicSwap) {
        // Use HTLC-based atomic swap (native BTC, not WBTC)
        return await this.getAtomicSwapQuote(fromToken, toToken, amount, walletAddress);
      }

      // Fallback to 1inch Fusion for same-chain swaps
      const quote = await fusionAPI.getQuote(fromToken, toToken, amount, walletAddress);
      this.validateQuote(quote);
      return quote;
    } catch (error) {
      throw this.handleError(error, 'Failed to get quote');
    }
  }

  // 🚀 AI-ENHANCED: Get optimized routes with AI analysis
  async getAIOptimizedRoutes(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<RouteAnalysis[]> {
    try {
      const cacheKey = `${fromToken.symbol}-${toToken.symbol}-${amount}-${Date.now() / this.cacheExpiryMs | 0}`;
      
      // Check cache first
      if (this.routeCache.has(cacheKey)) {
        return this.routeCache.get(cacheKey)!;
      }

      // Get multiple route options (simulate getting different routes)
      const routes = await this.generateRouteOptions(fromToken, toToken, amount, walletAddress);
      
      // Apply AI optimization
      const optimizedRoutes = await aiSmartRouting.analyzeAndOptimizeRoutes(
        fromToken,
        toToken,
        parseFloat(amount),
        routes
      );

      // Cache results
      this.routeCache.set(cacheKey, optimizedRoutes);
      
      return optimizedRoutes;
    } catch (error) {
      throw this.handleError(error, 'Failed to get AI optimized routes');
    }
  }

  // Get ML predictions for optimal transaction parameters
  async getMLPredictions(
    fromToken: Token,
    toToken: Token,
    amount: string
  ): Promise<MLPrediction> {
    try {
      return await aiSmartRouting.predictOptimalParameters(
        fromToken,
        toToken,
        parseFloat(amount)
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to get ML predictions');
    }
  }

  // Get AI-powered insights for user
  getSmartInsights(routeAnalysis: RouteAnalysis[]): string[] {
    return aiSmartRouting.getSmartInsights(routeAnalysis);
  }

  // 🔄 ATOMIC SWAP: Determine if tokens should use atomic swap (native BTC)
  private shouldUseAtomicSwap(fromToken: Token, toToken: Token): boolean {
    // Use atomic swaps for any cross-chain involving Bitcoin
    const involvesBitcoin = fromToken.network === 'bitcoin' || toToken.network === 'bitcoin';
    const isCrossChain = fromToken.network !== toToken.network;
    
    // Also use atomic swaps for other cross-chain pairs
    const crossChainPairs = [
      'ethereum-solana', 'solana-ethereum',
      'ethereum-starknet', 'starknet-ethereum', 
      'ethereum-stellar', 'stellar-ethereum'
    ];
    
    const pairKey = `${fromToken.network}-${toToken.network}`;
    const isSupportedCrossChain = crossChainPairs.includes(pairKey);
    
    return (involvesBitcoin && isCrossChain) || isSupportedCrossChain;
  }

  // 🔄 ATOMIC SWAP: Get quote for native atomic swap
  private async getAtomicSwapQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    // Calculate atomic swap parameters
    const exchangeRate = await this.getAtomicSwapRate(fromToken, toToken);
    const fees = this.calculateAtomicSwapFees(fromToken, toToken, parseFloat(amount));
    const toAmount = (parseFloat(amount) * exchangeRate - fees.total).toString();
    
    return {
      id: `atomic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: toAmount,
      exchangeRate: exchangeRate.toString(),
      networkFee: fees.network.toString(),
      protocolFee: fees.protocol.toString(),
      totalFee: fees.total.toString(),
      estimatedTime: '10-30 minutes', // HTLC confirmation time
      minimumReceived: (parseFloat(toAmount) * 0.99).toString(), // 1% slippage buffer
      priceImpact: '0.0', // No price impact in atomic swaps
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
  }

  // 🔄 ATOMIC SWAP: Get exchange rate for atomic swap pairs
  private async getAtomicSwapRate(fromToken: Token, toToken: Token): Promise<number> {
    // In production, fetch from price feeds (CoinGecko, CoinMarketCap, etc.)
    const rates: Record<string, number> = {
      'BTC_ETH': 15.5,   // 1 BTC = 15.5 ETH (approximate)
      'ETH_BTC': 0.065,  // 1 ETH = 0.065 BTC  
      'BTC_SOL': 650,    // 1 BTC = 650 SOL
      'SOL_BTC': 0.0015, // 1 SOL = 0.0015 BTC
      'ETH_SOL': 42,     // 1 ETH = 42 SOL
      'SOL_ETH': 0.024,  // 1 SOL = 0.024 ETH
    };
    
    const key = `${fromToken.symbol}_${toToken.symbol}`;
    return rates[key] || 1;
  }

  // 🔄 ATOMIC SWAP: Calculate fees for atomic swaps
  private calculateAtomicSwapFees(fromToken: Token, toToken: Token, amount: number) {
    let networkFee = 0;
    let protocolFee = 0;

    // Bitcoin network fees (higher due to on-chain confirmation)
    if (fromToken.network === 'bitcoin') {
      networkFee = 0.0001; // ~$4 at $40k BTC
    }
    
    // Ethereum gas fees
    if (fromToken.network === 'ethereum' || toToken.network === 'ethereum') {
      networkFee += 0.005; // ~$12 at $2400 ETH
    }
    
    // Protocol fee (much lower than centralized exchanges)
    protocolFee = amount * 0.001; // 0.1%
    
    return {
      network: networkFee,
      protocol: protocolFee,
      total: networkFee + protocolFee
    };
  }

  // Helper function to create proper BridgeFees structure
  private createBridgeFees(networkFee: number, protocolFee: number, fromSymbol: string): BridgeFees {
    return {
      network: {
        amount: createAmount(networkFee.toString(), 18),
        amountUSD: networkFee
      },
      protocol: {
        amount: createAmount(protocolFee.toString(), 18),
        amountUSD: protocolFee,
        percent: 0.3
      },
      total: {
        amount: createAmount((networkFee + protocolFee).toString(), 18),
        amountUSD: networkFee + protocolFee
      }
    };
  }

  // Generate multiple route options for AI analysis
  private async generateRouteOptions(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<BridgeRoute[]> {
    // In a real implementation, this would query multiple DEXs and bridges
    // For demo purposes, we'll create simulated route options
    const baseQuote = await fusionAPI.getQuote(fromToken, toToken, amount, walletAddress);
    
    // Create variations with different parameters for AI to analyze
    const routes: BridgeRoute[] = [
      // Fast route (higher fees, lower time)
      {
        from: fromToken,
        to: toToken,
        limits: {
          min: createAmount('0.001', fromToken.decimals),
          max: createAmount('10', fromToken.decimals)
        },
        estimatedTime: { minutes: 3, blocks: 2 },
        fees: this.createBridgeFees(
          parseFloat(baseQuote.networkFee) * 1.5,
          parseFloat(baseQuote.protocolFee),
          fromToken.symbol
        ),
        exchangeRate: parseFloat(baseQuote.exchangeRate) * 0.98, // Slightly worse rate for speed
        inverseRate: 1 / (parseFloat(baseQuote.exchangeRate) * 0.98),
        priceImpact: 0.02,
        available: true,
        warnings: [],
        isWrapping: false,
        requiresApproval: true
      },
      // Balanced route (standard parameters)  
      {
        from: fromToken,
        to: toToken,
        limits: {
          min: createAmount('0.001', fromToken.decimals),
          max: createAmount('10', fromToken.decimals)
        },
        estimatedTime: { minutes: 8, blocks: 5 },
        fees: this.createBridgeFees(
          parseFloat(baseQuote.networkFee),
          parseFloat(baseQuote.protocolFee),
          fromToken.symbol
        ),
        exchangeRate: parseFloat(baseQuote.exchangeRate),
        inverseRate: 1 / parseFloat(baseQuote.exchangeRate),
        priceImpact: 0.015,
        available: true,
        warnings: [],
        isWrapping: false,
        requiresApproval: true
      },
      // Economic route (lower fees, longer time)
      {
        from: fromToken,
        to: toToken,
        limits: {
          min: createAmount('0.001', fromToken.decimals),
          max: createAmount('10', fromToken.decimals)
        },
        estimatedTime: { minutes: 15, blocks: 10 },
        fees: this.createBridgeFees(
          parseFloat(baseQuote.networkFee) * 0.7,
          parseFloat(baseQuote.protocolFee) * 0.8,
          fromToken.symbol
        ),
        exchangeRate: parseFloat(baseQuote.exchangeRate) * 1.02, // Better rate for waiting
        inverseRate: 1 / (parseFloat(baseQuote.exchangeRate) * 1.02),
        priceImpact: 0.01,
        available: true,
        warnings: ['Longer execution time'],
        isWrapping: false,
        requiresApproval: true
      }
    ];

    return routes;
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

  // 🚀 AI-ENHANCED: Execute bridge with AI optimization
  async executeAIOptimizedBridge(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    selectedRoute?: RouteAnalysis,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    const startTime = Date.now();
    let mlPredictions: MLPrediction | null = null;
    
    try {
      // Get AI predictions for optimal parameters
      onProgress?.('🧠 AI analyzing optimal parameters...');
      mlPredictions = await this.getMLPredictions(fromToken, toToken, amount);
      
      // Use AI-predicted slippage if no route selected
      let optimalSlippage = mlPredictions.optimalSlippage;
      let routeUsed = 'ai-optimized';

      if (selectedRoute) {
        // Use selected route's parameters
        optimalSlippage = 0.005; // Default for selected route
        routeUsed = 'user-selected';
        onProgress?.('🎯 Using selected optimized route...');
      } else {
        onProgress?.(`🤖 AI recommends ${(optimalSlippage * 100).toFixed(2)}% slippage...`);
      }

      // Validate inputs with AI-optimized parameters
      this.validateBridgeRequest(fromToken, toToken, amount, walletAddress, optimalSlippage);

      onProgress?.('📋 Creating AI-optimized order...');

      // Create order with optimized parameters
      const order = await fusionAPI.createOrder(fromToken, toToken, amount, walletAddress);

      onProgress?.('✅ Order created', { 
        orderId: order.orderId, 
        aiOptimized: true,
        predictedSuccess: mlPredictions.successProbability,
        estimatedTime: `${Math.round(mlPredictions.estimatedTime / 60)} minutes`
      });

      // Start monitoring with AI insights
      const transaction = await this.monitorOrderWithAI(
        order, 
        mlPredictions, 
        onProgress
      );

      // Record transaction result for ML learning
      const executionTime = Date.now() - startTime;
      const success = transaction.status === 'completed';
      
      aiSmartRouting.recordTransactionResult(
        fromToken,
        toToken,
        parseFloat(amount),
        mlPredictions.recommendedRoute,
        executionTime / 1000, // Convert to seconds
        0, // Gas cost would be calculated from transaction
        optimalSlippage,
        success
      );

      onProgress?.('🎓 AI learning from transaction results...');

      return transaction;
    } catch (error) {
      // Record failed transaction for learning
      if (mlPredictions) {
        const executionTime = Date.now() - startTime;
        aiSmartRouting.recordTransactionResult(
          fromToken,
          toToken,
          parseFloat(amount),
          mlPredictions.recommendedRoute,
          executionTime / 1000,
          0,
          mlPredictions.optimalSlippage,
          false // Failed
        );
      }
      
      throw this.handleError(error, 'Failed to execute AI-optimized bridge');
    }
  }

  // Enhanced order monitoring with AI insights
  private async monitorOrderWithAI(
    order: FusionOrderResponse,
    predictions: MLPrediction,
    onProgress?: (status: string, data?: unknown) => void
  ): Promise<BridgeTransaction> {
    const orderId = order.orderId;
    let attempts = 0;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const pollOrder = async () => {
        try {
          attempts++;
          const currentTime = Date.now();
          const elapsedSeconds = (currentTime - startTime) / 1000;
          
          if (attempts > BRIDGE_CONFIG.maxOrderPollingAttempts) {
            reject(new BridgeServiceError(
              'Order monitoring timeout',
              BridgeErrorCode.TIMEOUT
            ));
            return;
          }

          const status = await fusionAPI.getOrderStatus(orderId);
          
          // Enhanced progress reporting with AI insights
          const progress = Math.min(100, (elapsedSeconds / predictions.estimatedTime) * 100);
          const remainingTime = Math.max(0, predictions.estimatedTime - elapsedSeconds);
          
          onProgress?.(`🔄 Order status: ${status.orderStatus}`, {
            ...status,
            aiInsights: {
              progress: `${progress.toFixed(1)}%`,
              remainingTime: `${Math.round(remainingTime / 60)} minutes`,
              successProbability: `${(predictions.successProbability * 100).toFixed(1)}%`,
              route: predictions.recommendedRoute.join(' → ')
            }
          });

          switch (status.orderStatus) {
            case 'filled':
              const transaction = this.createBridgeTransaction(order, status);
              onProgress?.('🎉 Transaction completed successfully!');
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
              // Provide AI-powered updates
              if (elapsedSeconds > predictions.estimatedTime * 1.5) {
                onProgress?.('⚠️ Taking longer than AI predicted, but still processing...');
              } else if (progress > 50) {
                onProgress?.('⏳ More than halfway through predicted time...');
              }
              
              setTimeout(pollOrder, BRIDGE_CONFIG.orderPollingInterval);
              break;
              
            default:
              reject(new BridgeServiceError(
                `Unknown order status: ${status.orderStatus}`,
                BridgeErrorCode.UNKNOWN
              ));
          }
        } catch (error) {
          reject(this.handleError(error, 'Order monitoring failed'));
        }
      };

      pollOrder();
    });
  }

  // Monitor order status
  private async monitorOrder(
    order: FusionOrderResponse,
    onProgress?: (status: string, data?: unknown) => void
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