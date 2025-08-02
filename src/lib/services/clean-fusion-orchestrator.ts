import { ethers } from 'ethers';
import { 
  createOneInchFusionPlusSDK, 
  FusionPlusOrder,
  QuoteRequest,
  QuoteResponse 
} from './1inch-fusion-plus-sdk';

export interface CrossChainSwapRequest {
  fromChain: 'evm' | 'bitcoin';
  toChain: 'evm' | 'bitcoin';
  fromToken: string;
  toToken: string;
  amount: string;
  userAddress: string;
  recipientAddress?: string;
  slippage?: number;
}

export interface HTLCExecutionResult {
  htlcId: string;
  fusionOrder: FusionPlusOrder;
  secret: string;
  secretHash: string;
  timelock: number;
  quote?: QuoteResponse;
}

export class CleanFusionOrchestrator {
  private fusionSDK: ReturnType<typeof createOneInchFusionPlusSDK>;
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider, oneInchApiKey?: string) {
    this.provider = provider;
    this.fusionSDK = createOneInchFusionPlusSDK(oneInchApiKey);
  }

  /**
   * Get quote for token swap
   */
  async getQuote(request: {
    fromToken: string;
    toToken: string;
    amount: string;
    chainId: number;
    walletAddress?: string;
  }): Promise<QuoteResponse> {
    const quoteRequest: QuoteRequest = {
      fromTokenAddress: request.fromToken,
      toTokenAddress: request.toToken,
      amount: (parseFloat(request.amount) * 1e18).toString(),
      chainId: request.chainId,
      walletAddress: request.walletAddress
    };

    return await this.fusionSDK.getQuote(quoteRequest);
  }

  /**
   * Create a complete cross-chain HTLC swap using Fusion+ SDK
   */
  async createCrossChainSwap(request: CrossChainSwapRequest): Promise<HTLCExecutionResult> {
    console.log('🔄 Creating cross-chain swap:', request);

    const chainId = request.fromChain === 'evm' ? 1 : 11155111;

    // Step 1: Get quote for better pricing
    let quote: QuoteResponse | undefined;
    try {
      quote = await this.getQuote({
        fromToken: request.fromToken,
        toToken: request.toToken,
        amount: request.amount,
        chainId,
        walletAddress: request.userAddress
      });
      console.log('✅ Got quote:', quote);
    } catch (error) {
      console.warn('⚠️ Failed to get quote, proceeding with default pricing:', error);
    }

    // Step 2: Generate secret and hash
    const secret = ethers.randomBytes(32);
    const secretHash = ethers.keccak256(secret);

    // Step 3: Calculate timelock (1 hour from now)
    const timelock = Math.floor(Date.now() / 1000) + 3600;

    // Step 4: Generate auction data using Fusion+ SDK
    const auctionSalt = await this.fusionSDK.generateAuctionSalt({
      maker: request.userAddress,
      makerAsset: request.fromToken,
      takerAsset: request.toToken,
      makerAmount: (parseFloat(request.amount) * 1e18).toString(),
      chainId
    });

    const auctionSuffix = await this.fusionSDK.generateAuctionSuffix({
      maker: request.userAddress,
      makerAsset: request.fromToken,
      takerAsset: request.toToken,
      makerAmount: (parseFloat(request.amount) * 1e18).toString(),
      chainId,
      timelock
    });

    // Step 5: Create HTLC order using Fusion+ SDK
    const fusionOrder = await this.fusionSDK.createHTLCOrder({
      maker: request.userAddress,
      makerAsset: request.fromToken,
      takerAsset: request.toToken,
      makerAmount: (parseFloat(request.amount) * 1e18).toString(),
      takerAmount: quote?.toTokenAmount || '0', // Use quote if available
      secretHash,
      timelock,
      auctionSalt,
      auctionSuffix,
      chainId,
      nonEVMChainId: request.toChain
    });

    console.log('✅ Fusion+ HTLC order created:', fusionOrder.orderHash);

    return {
      htlcId: fusionOrder.orderHash,
      fusionOrder,
      secret: secret.toString('hex'),
      secretHash,
      timelock,
      quote
    };
  }

  /**
   * Execute HTLC using Fusion+ resolver
   */
  async executeHTLC(orderHash: string, secret: string): Promise<string> {
    console.log('🚀 Executing HTLC:', orderHash);

    try {
      // Step 1: Get order details
      const order = await this.fusionSDK.getOrderByHash(orderHash, 1);
      if (!order) {
        throw new Error('Order not found');
      }

      // Step 2: Calculate current auction rate
      const currentRate = await this.fusionSDK.calculateAuctionRate(
        order.auctionSalt,
        order.auctionSuffix
      );

      // Step 3: Create resolver order using Fusion+ SDK
      const resolverOrder = await this.fusionSDK.createResolverOrder({
        orderHash,
        secret,
        rate: currentRate,
        chainId: order.chainId
      });

      console.log('✅ Resolver order created:', resolverOrder);
      return resolverOrder.txHash || resolverOrder.orderId;
    } catch (error) {
      console.error('❌ Failed to execute HTLC:', error);
      throw error;
    }
  }

  /**
   * Get escrow factory address
   */
  async getEscrowFactoryAddress(chainId: number = 1): Promise<string> {
    return await this.fusionSDK.getEscrowFactoryAddress(chainId);
  }

  /**
   * Get active escrow factory orders
   */
  async getEscrowFactoryOrders(chainId: number = 1): Promise<FusionPlusOrder[]> {
    return await this.fusionSDK.getEscrowFactoryOrders(chainId);
  }

  /**
   * Get order by hash
   */
  async getOrderByHash(orderHash: string, chainId: number = 1): Promise<FusionPlusOrder | null> {
    return await this.fusionSDK.getOrderByHash(orderHash, chainId);
  }

  /**
   * Get active orders
   */
  async getActiveOrders(chainId: number = 1): Promise<FusionPlusOrder[]> {
    return await this.fusionSDK.getActiveOrders(chainId);
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderHash: string, chainId: number = 1): Promise<any> {
    return await this.fusionSDK.getOrderStatus(orderHash, chainId);
  }

  /**
   * Calculate auction rate for an order
   */
  async calculateAuctionRate(orderHash: string, chainId: number = 1): Promise<string> {
    const order = await this.fusionSDK.getOrderByHash(orderHash, chainId);
    if (!order) {
      throw new Error('Order not found');
    }

    return await this.fusionSDK.calculateAuctionRate(
      order.auctionSalt,
      order.auctionSuffix
    );
  }

  /**
   * Get supported tokens for a chain
   */
  async getSupportedTokens(chainId: number): Promise<any[]> {
    return await this.fusionSDK.getSupportedTokens(chainId);
  }

  /**
   * Get token prices
   */
  async getTokenPrices(tokens: string[], chainId: number): Promise<Record<string, string>> {
    return await this.fusionSDK.getTokenPrices(tokens, chainId);
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(chainId: number, onMessage?: (message: any) => void): void {
    this.fusionSDK.connectWebSocket(chainId, onMessage);
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    this.fusionSDK.disconnectWebSocket();
  }

  /**
   * Register WebSocket message handler
   */
  onWebSocketMessage(type: string, handler: (message: any) => void): void {
    this.fusionSDK.onMessage(type, handler);
  }

  /**
   * Get SDK instance for direct access
   */
  getSDK(): ReturnType<typeof createOneInchFusionPlusSDK> {
    return this.fusionSDK;
  }
}

// Factory function
export function createCleanFusionOrchestrator(
  provider: ethers.Provider,
  oneInchApiKey?: string
): CleanFusionOrchestrator {
  return new CleanFusionOrchestrator(provider, oneInchApiKey);
} 