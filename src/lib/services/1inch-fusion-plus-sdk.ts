import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// 1inch Fusion+ API Configuration
const FUSION_PLUS_BASE = 'https://api.1inch.dev/fusion-plus';
const FUSION_SDK_BASE = 'https://api.1inch.dev/fusion-plus/sdk';

// Types based on 1inch Fusion+ documentation
export interface FusionPlusOrder {
  orderHash: string;
  maker: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  takerAmount: string;
  escrowAddress: string;
  secretHash: string;
  timelock: number;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  auctionSalt: string;
  auctionSuffix: string;
  createdAt: number;
  expiresAt: number;
  chainId: number;
  nonEVMChain?: string;
}

export interface AuctionSaltRequest {
  maker: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  chainId: number;
}

export interface AuctionSuffixRequest {
  maker: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  chainId: number;
  timelock: number;
}

export interface AuctionCalculatorRequest {
  maker: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  salt: string;
  suffix: string;
  chainId: number;
}

export interface AuctionCalculatorResponse {
  currentRate: string;
  startTime: number;
  endTime: number;
  initialRate: string;
  finalRate: string;
}

export interface ResolverOrderRequest {
  orderHash: string;
  secret: string;
  rate: string;
  chainId: number;
}

export interface ResolverOrderResponse {
  orderId: string;
  txHash?: string;
  status: string;
}

export interface CreateOrderRequest {
  maker: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  takerAmount: string;
  secretHash: string;
  timelock: number;
  auctionSalt: string;
  auctionSuffix: string;
  chainId: number;
  nonEVMChain?: string;
  orderType?: 'htlc' | 'regular';
}

export interface EscrowFactoryResponse {
  escrowFactoryAddress: string;
  chainId: number;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  tags?: string[];
}

export interface QuoteRequest {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  chainId: number;
  walletAddress?: string;
  fee?: number;
  source?: string;
}

export interface QuoteResponse {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  toTokenAmount: string;
  fromTokenAmount: string;
  protocols: any[];
  estimatedGas: number;
}

export interface OrderStatus {
  orderHash: string;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  maker: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  takerAmount: string;
  escrowAddress: string;
  createdAt: number;
  expiresAt: number;
}

export interface WebSocketMessage {
  type: 'order_update' | 'auction_update' | 'execution_update';
  data: any;
}

export class OneInchFusionPlusSDK {
  private apiKey: string;
  private httpClient: AxiosInstance;
  private wsConnection: WebSocket | null = null;
  private messageHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.httpClient = axios.create({
      baseURL: FUSION_PLUS_BASE,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        console.log(`🌐 1inch API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ 1inch API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        console.log(`✅ 1inch API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ 1inch API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // ===== CORE FUSION+ API ENDPOINTS =====

  /**
   * Get quote for token swap
   * @see https://portal.1inch.dev/documentation/fusion-plus/swap-api/quote
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const response = await this.httpClient.get('/swap/v5.2/quote', {
      params: request
    });
    return response.data;
  }

  /**
   * Create a new order
   * @see https://portal.1inch.dev/documentation/fusion-plus/swap-api/order
   */
  async createOrder(request: CreateOrderRequest): Promise<FusionPlusOrder> {
    const response = await this.httpClient.post('/orders/v1.0/order', request);
    return response.data;
  }

  /**
   * Get order by hash
   * @see https://portal.1inch.dev/documentation/fusion-plus/swap-api/order-by-hash
   */
  async getOrderByHash(orderHash: string, chainId: number): Promise<FusionPlusOrder | null> {
    try {
      const response = await this.httpClient.get(`/orders/v1.0/order/${orderHash}`, {
        params: { chainId }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get active orders
   * @see https://portal.1inch.dev/documentation/fusion-plus/swap-api/active-orders
   */
  async getActiveOrders(chainId: number): Promise<FusionPlusOrder[]> {
    const response = await this.httpClient.get('/orders/v1.0/order/active', {
      params: { chainId }
    });
    return response.data;
  }

  /**
   * Get escrow factory address
   * @see https://portal.1inch.dev/documentation/fusion-plus/swap-api/escrow-factory
   */
  async getEscrowFactoryAddress(chainId: number): Promise<string> {
    const response = await this.httpClient.get('/orders/v1.0/escrow-factory', {
      params: { chainId }
    });
    return response.data.escrowFactoryAddress;
  }

  /**
   * Get escrow factory orders
   * @see https://portal.1inch.dev/documentation/fusion-plus/swap-api/escrow-factory-orders
   */
  async getEscrowFactoryOrders(chainId: number): Promise<FusionPlusOrder[]> {
    const response = await this.httpClient.get('/orders/v1.0/order/escrow', {
      params: { chainId },
      paramsSerializer: { indexes: null }
    });
    return response.data;
  }

  // ===== FUSION+ SDK ENDPOINTS =====

  /**
   * Generate auction salt
   * @see https://portal.1inch.dev/documentation/fusion-plus/fusion-plus-sdk/for-integrators/auction-salt
   */
  async generateAuctionSalt(request: AuctionSaltRequest): Promise<string> {
    const response = await axios.post(`${FUSION_SDK_BASE}/auction-salt`, request, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.salt;
  }

  /**
   * Generate auction suffix
   * @see https://portal.1inch.dev/documentation/fusion-plus/fusion-plus-sdk/for-integrators/auction-suffix
   */
  async generateAuctionSuffix(request: AuctionSuffixRequest): Promise<string> {
    const response = await axios.post(`${FUSION_SDK_BASE}/auction-suffix`, request, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.suffix;
  }

  /**
   * Calculate auction parameters
   * @see https://portal.1inch.dev/documentation/fusion-plus/fusion-plus-sdk/for-resolvers/auction-calculator
   */
  async calculateAuctionParameters(request: AuctionCalculatorRequest): Promise<AuctionCalculatorResponse> {
    const response = await axios.post(`${FUSION_SDK_BASE}/auction-calculator`, request, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  /**
   * Calculate current auction rate
   * @see https://portal.1inch.dev/documentation/fusion-plus/fusion-plus-sdk/for-resolvers/auction-calculator
   */
  async calculateAuctionRate(salt: string, suffix: string): Promise<string> {
    const response = await axios.post(`${FUSION_SDK_BASE}/auction-calculator/rate`, {
      salt,
      suffix,
      timestamp: Math.floor(Date.now() / 1000)
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.currentRate;
  }

  /**
   * Create resolver order
   * @see https://portal.1inch.dev/documentation/fusion-plus/fusion-plus-sdk/for-resolvers/resolver-order
   */
  async createResolverOrder(request: ResolverOrderRequest): Promise<ResolverOrderResponse> {
    const response = await axios.post(`${FUSION_SDK_BASE}/resolver-order`, request, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  // ===== UTILITY METHODS =====

  /**
   * Create HTLC order with simplified interface
   */
  async createHTLCOrder(params: {
    maker: string;
    makerAsset: string;
    takerAsset: string;
    makerAmount: string;
    takerAmount: string;
    secretHash: string;
    timelock: number;
    auctionSalt: string;
    auctionSuffix: string;
    chainId: number;
    nonEVMChainId?: string;
  }): Promise<FusionPlusOrder> {
    return this.createOrder({
      ...params,
      orderType: 'htlc',
      nonEVMChain: params.nonEVMChainId
    });
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderHash: string, chainId: number): Promise<OrderStatus | null> {
    const order = await this.getOrderByHash(orderHash, chainId);
    if (!order) return null;

    return {
      orderHash: order.orderHash,
      status: order.status,
      maker: order.maker,
      makerAsset: order.makerAsset,
      takerAsset: order.takerAsset,
      makerAmount: order.makerAmount,
      takerAmount: order.takerAmount,
      escrowAddress: order.escrowAddress,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt
    };
  }

  /**
   * Get supported tokens for a chain
   */
  async getSupportedTokens(chainId: number): Promise<TokenInfo[]> {
    const response = await this.httpClient.get(`/swap/v5.2/tokens/${chainId}`);
    return response.data.tokens;
  }

  /**
   * Get token prices
   */
  async getTokenPrices(tokens: string[], chainId: number): Promise<Record<string, string>> {
    const response = await this.httpClient.get('/swap/v5.2/prices', {
      params: {
        tokens: tokens.join(','),
        chainId
      }
    });
    return response.data;
  }

  // ===== WEBSOCKET CONNECTION =====

  /**
   * Connect to WebSocket for real-time updates
   * @see https://portal.1inch.dev/documentation/fusion-plus/fusion-plus-sdk/for-resolvers/web-socket-api
   */
  connectWebSocket(chainId: number, onMessage?: (message: WebSocketMessage) => void): void {
    if (this.wsConnection) {
      this.wsConnection.close();
    }

    const wsUrl = `wss://api.1inch.dev/fusion-plus/ws?chainId=${chainId}`;
    this.wsConnection = new WebSocket(wsUrl);

    this.wsConnection.onopen = () => {
      console.log('🔌 Connected to 1inch Fusion+ WebSocket');
      
      // Send authentication
      this.wsConnection?.send(JSON.stringify({
        type: 'auth',
        apiKey: this.apiKey
      }));
    };

    this.wsConnection.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('📨 WebSocket message:', message);
        
        if (onMessage) {
          onMessage(message);
        }
        
        // Call registered handlers
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
          handler(message);
        }
      } catch (error) {
        console.error('❌ Failed to parse WebSocket message:', error);
      }
    };

    this.wsConnection.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    this.wsConnection.onclose = () => {
      console.log('🔌 Disconnected from 1inch Fusion+ WebSocket');
    };
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: (message: WebSocketMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.messageHandlers.clear();
  }

  // ===== HELPER METHODS =====

  /**
   * Check if order is expired
   */
  isOrderExpired(order: FusionPlusOrder): boolean {
    return Date.now() / 1000 > order.expiresAt;
  }

  /**
   * Get time until order expires (in seconds)
   */
  getTimeUntilExpiry(order: FusionPlusOrder): number {
    return Math.max(0, order.expiresAt - Date.now() / 1000);
  }

  /**
   * Format order for display
   */
  formatOrder(order: FusionPlusOrder): any {
    return {
      ...order,
      isExpired: this.isOrderExpired(order),
      timeUntilExpiry: this.getTimeUntilExpiry(order),
      formattedExpiry: new Date(order.expiresAt * 1000).toLocaleString()
    };
  }
}

// Factory function
export function createOneInchFusionPlusSDK(apiKey?: string): OneInchFusionPlusSDK {
  const key = apiKey || process.env.NEXT_PUBLIC_1INCH_API_KEY || '2eVY4oCPnCaDCEBoqIcXd888V5G2CYgA';
  return new OneInchFusionPlusSDK(key);
}

// Export types for external use
export type {
  FusionPlusOrder,
  AuctionSaltRequest,
  AuctionSuffixRequest,
  AuctionCalculatorRequest,
  AuctionCalculatorResponse,
  ResolverOrderRequest,
  ResolverOrderResponse,
  CreateOrderRequest,
  EscrowFactoryResponse,
  TokenInfo,
  QuoteRequest,
  QuoteResponse,
  OrderStatus,
  WebSocketMessage
}; 