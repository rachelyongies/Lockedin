import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';

// 1inch Fusion+ API Configuration
const FUSION_PLUS_BASE = '/api/1inch'; // Use Next.js API proxy
const FUSION_SDK_BASE = '/api/1inch'; // Use Next.js API proxy

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

export interface CrossChainSwapRequest {
  fromChain: 'ethereum' | 'bitcoin';
  toChain: 'ethereum' | 'bitcoin';
  fromToken: string;
  toToken: string;
  amount: string;
  userAddress: string;
  recipientAddress?: string;
  timelock?: number; // in seconds, default 1 hour
}

export interface HTLCEscrow {
  orderHash: string;
  secretHash: string;
  secret: string;
  timelock: number;
  sourceChain: string;
  destinationChain: string;
  sourceEscrowAddress: string;
  destinationEscrowAddress: string;
  destinationOrderHash?: string; // Add missing property
  status: 'pending' | 'locked' | 'completed' | 'expired' | 'refunded';
  createdAt: number;
  expiresAt: number;
}

export interface CrossChainSwapResult {
  htlcEscrow: HTLCEscrow;
  sourceOrder: FusionPlusOrder;
  destinationOrder?: FusionPlusOrder; // For non-EVM chains
  sourceTxHash: string;
  destinationTxHash?: string;
}

export class FusionPlusCrossChainSDK {
  private apiKey: string;
  private httpClient: AxiosInstance;
  private wsConnection: WebSocket | null = null;
  private messageHandlers: Map<string, (message: any) => void> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.httpClient = axios.create({
      baseURL: FUSION_PLUS_BASE,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add request/response interceptors for logging
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        console.log(`🌐 1inch Fusion+ Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ 1inch Fusion+ Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        console.log(`✅ 1inch Fusion+ Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ 1inch Fusion+ Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // ===== CORE FUSION+ API ENDPOINTS =====

  /**
   * Generate auction salt using Fusion+ SDK
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/auction-salt
   */
  async generateAuctionSalt(request: AuctionSaltRequest): Promise<string> {
    try {
      const response = await axios.post(`${FUSION_SDK_BASE}?path=/fusion-plus/sdk/auction-salt`, request, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data.salt;
    } catch (error) {
      console.error('❌ Failed to generate auction salt:', error);
      throw new Error(`Failed to generate auction salt: ${error}`);
    }
  }

  /**
   * Generate auction suffix using Fusion+ SDK
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/auction-suffix
   */
  async generateAuctionSuffix(request: AuctionSuffixRequest): Promise<string> {
    try {
      const response = await axios.post(`${FUSION_SDK_BASE}?path=/fusion-plus/sdk/auction-suffix`, request, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data.suffix;
    } catch (error) {
      console.error('❌ Failed to generate auction suffix:', error);
      throw new Error(`Failed to generate auction suffix: ${error}`);
    }
  }

  /**
   * Calculate auction parameters using Fusion+ SDK
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-resolvers/auction-calculator
   */
  async calculateAuctionParameters(request: AuctionCalculatorRequest): Promise<AuctionCalculatorResponse> {
    try {
      const response = await axios.post(`${FUSION_SDK_BASE}?path=/fusion-plus/sdk/auction-calculator`, request, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to calculate auction parameters:', error);
      throw new Error(`Failed to calculate auction parameters: ${error}`);
    }
  }

  /**
   * Calculate current auction rate
   */
  async calculateAuctionRate(salt: string, suffix: string): Promise<string> {
    try {
      const response = await axios.post(`${FUSION_SDK_BASE}?path=/fusion-plus/sdk/auction-calculator/rate`, {
        salt,
        suffix,
        timestamp: Math.floor(Date.now() / 1000)
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data.currentRate;
    } catch (error) {
      console.error('❌ Failed to calculate auction rate:', error);
      throw new Error(`Failed to calculate auction rate: ${error}`);
    }
  }

  /**
   * Create resolver order (submit secret)
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/when-and-how-to-submit-secrets
   */
  async createResolverOrder(request: ResolverOrderRequest): Promise<ResolverOrderResponse> {
    try {
      const response = await axios.post(`${FUSION_SDK_BASE}?path=/fusion-plus/sdk/resolver-order`, request, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create resolver order:', error);
      throw new Error(`Failed to create resolver order: ${error}`);
    }
  }

  /**
   * Create HTLC order
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
    try {
      const response = await this.httpClient.post(`?path=/orders/v1.0/order`, {
        ...params,
        orderType: 'htlc',
        nonEVMChain: params.nonEVMChainId
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create HTLC order:', error);
      throw new Error(`Failed to create HTLC order: ${error}`);
    }
  }

  /**
   * Get order by hash
   */
  async getOrderByHash(orderHash: string, chainId: number): Promise<FusionPlusOrder | null> {
    try {
      const response = await this.httpClient.get(`?path=/orders/v1.0/order/${orderHash}&chainId=${chainId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('❌ Failed to get order by hash:', error);
      throw error;
    }
  }

  /**
   * Get escrow factory address
   */
  async getEscrowFactoryAddress(chainId: number): Promise<string> {
    try {
      const response = await this.httpClient.get(`?path=/orders/v1.0/escrow-factory&chainId=${chainId}`);
      return response.data.escrowFactoryAddress;
    } catch (error) {
      console.error('❌ Failed to get escrow factory address:', error);
      throw new Error(`Failed to get escrow factory address: ${error}`);
    }
  }

  /**
   * Get active escrow factory orders
   */
  async getEscrowFactoryOrders(chainId: number): Promise<FusionPlusOrder[]> {
    try {
      const response = await this.httpClient.get(`?path=/orders/v1.0/order/escrow&chainId=${chainId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get escrow factory orders:', error);
      throw new Error(`Failed to get escrow factory orders: ${error}`);
    }
  }

  // ===== CROSS-CHAIN ORCHESTRATION =====

  /**
   * Create cross-chain HTLC swap with escrows on both chains
   */
  async createCrossChainSwap(request: CrossChainSwapRequest): Promise<CrossChainSwapResult> {
    console.log('🔄 Creating cross-chain swap:', request);

    // Step 1: Generate secret and hash for HTLC
    const secret = ethers.randomBytes(32);
    const secretHash = ethers.keccak256(secret);

    // Step 2: Calculate timelock (default 1 hour)
    const timelock = Math.floor(Date.now() / 1000) + (request.timelock || 3600);

    // Step 3: Create source chain escrow (Ethereum)
    const sourceChainId = request.fromChain === 'ethereum' ? 1 : 11155111; // Mainnet for ETH, Sepolia for testing
    const sourceEscrowAddress = await this.getEscrowFactoryAddress(sourceChainId);

    // Generate auction data for source chain
    const sourceAuctionSalt = await this.generateAuctionSalt({
      maker: request.userAddress,
      makerAsset: request.fromToken,
      takerAsset: request.toToken,
      makerAmount: (parseFloat(request.amount) * 1e18).toString(),
      chainId: sourceChainId
    });

    const sourceAuctionSuffix = await this.generateAuctionSuffix({
      maker: request.userAddress,
      makerAsset: request.fromToken,
      takerAsset: request.toToken,
      makerAmount: (parseFloat(request.amount) * 1e18).toString(),
      chainId: sourceChainId,
      timelock
    });

    // Create source HTLC order
    const sourceOrder = await this.createHTLCOrder({
      maker: request.userAddress,
      makerAsset: request.fromToken,
      takerAsset: request.toToken,
      makerAmount: (parseFloat(request.amount) * 1e18).toString(),
      takerAmount: '0', // Will be calculated by auction
      secretHash,
      timelock,
      auctionSalt: sourceAuctionSalt,
      auctionSuffix: sourceAuctionSuffix,
      chainId: sourceChainId,
      nonEVMChainId: request.toChain
    });

    console.log('✅ Source HTLC order created:', sourceOrder.orderHash);

    // Step 4: Create destination chain escrow (Bitcoin or Ethereum)
    let destinationOrder: FusionPlusOrder | undefined;
    let destinationTxHash: string | undefined;

    if (request.toChain === 'bitcoin') {
      // For Bitcoin, we simulate the escrow creation
      // In a real implementation, this would interact with Bitcoin HTLC contracts
      destinationOrder = {
        ...sourceOrder,
        orderHash: `btc-${sourceOrder.orderHash}`,
        chainId: 0, // Bitcoin chain ID
        nonEVMChain: 'bitcoin'
      };
      destinationTxHash = `btc-tx-${Date.now()}`;
    } else {
      // For Ethereum destination, create another HTLC order
      const destChainId = 1; // Mainnet for ETH
      const destEscrowAddress = await this.getEscrowFactoryAddress(destChainId);

      const destAuctionSalt = await this.generateAuctionSalt({
        maker: request.recipientAddress || request.userAddress,
        makerAsset: request.toToken,
        takerAsset: request.fromToken,
        makerAmount: '0', // Will be calculated by auction
        chainId: destChainId
      });

      const destAuctionSuffix = await this.generateAuctionSuffix({
        maker: request.recipientAddress || request.userAddress,
        makerAsset: request.toToken,
        takerAsset: request.fromToken,
        makerAmount: '0', // Will be calculated by auction
        chainId: destChainId,
        timelock
      });

      destinationOrder = await this.createHTLCOrder({
        maker: request.recipientAddress || request.userAddress,
        makerAsset: request.toToken,
        takerAsset: request.fromToken,
        makerAmount: '0', // Will be calculated by auction
        takerAmount: (parseFloat(request.amount) * 1e18).toString(),
        secretHash,
        timelock,
        auctionSalt: destAuctionSalt,
        auctionSuffix: destAuctionSuffix,
        chainId: destChainId,
        nonEVMChainId: request.fromChain
      });

      destinationTxHash = destinationOrder.orderHash;
    }

    // Step 5: Create HTLC escrow record
    const htlcEscrow: HTLCEscrow = {
      orderHash: sourceOrder.orderHash,
      secretHash,
      secret: secret.toString('hex'),
      timelock,
      sourceChain: request.fromChain,
      destinationChain: request.toChain,
      sourceEscrowAddress: sourceEscrowAddress,
      destinationEscrowAddress: destinationOrder.escrowAddress || 'bitcoin-escrow',
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: timelock * 1000
    };

    console.log('✅ Cross-chain HTLC escrow created:', htlcEscrow);

    return {
      htlcEscrow,
      sourceOrder,
      destinationOrder,
      sourceTxHash: sourceOrder.orderHash,
      destinationTxHash
    };
  }

  /**
   * Execute HTLC by submitting secret
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/when-and-how-to-submit-secrets
   */
  async executeHTLC(htlcEscrow: HTLCEscrow): Promise<{ sourceTxHash: string; destinationTxHash?: string }> {
    console.log('🚀 Executing HTLC:', htlcEscrow.orderHash);

    try {
      // Step 1: Get source order details
      const sourceOrder = await this.getOrderByHash(htlcEscrow.orderHash, 1);
      if (!sourceOrder) {
        throw new Error('Source order not found');
      }

      // Step 2: Calculate current auction rate for source
      const sourceRate = await this.calculateAuctionRate(
        sourceOrder.auctionSalt,
        sourceOrder.auctionSuffix
      );

      // Step 3: Submit secret to source chain
      const sourceResolverOrder = await this.createResolverOrder({
        orderHash: htlcEscrow.orderHash,
        secret: htlcEscrow.secret,
        rate: sourceRate,
        chainId: sourceOrder.chainId
      });

      console.log('✅ Source HTLC executed:', sourceResolverOrder);

      // Step 4: Execute destination HTLC if it exists
      let destinationTxHash: string | undefined;

      if (htlcEscrow.destinationChain === 'bitcoin') {
        // For Bitcoin, simulate execution
        destinationTxHash = `btc-execute-${Date.now()}`;
        console.log('✅ Bitcoin HTLC executed (simulated):', destinationTxHash);
      } else if (htlcEscrow.destinationOrderHash) {
        // For Ethereum destination, execute the destination HTLC
        const destOrder = await this.getOrderByHash(htlcEscrow.destinationOrderHash, 1);
        if (destOrder) {
          const destRate = await this.calculateAuctionRate(
            destOrder.auctionSalt,
            destOrder.auctionSuffix
          );

          const destResolverOrder = await this.createResolverOrder({
            orderHash: htlcEscrow.destinationOrderHash,
            secret: htlcEscrow.secret,
            rate: destRate,
            chainId: destOrder.chainId
          });

          destinationTxHash = destResolverOrder.txHash || destResolverOrder.orderId;
          console.log('✅ Destination HTLC executed:', destResolverOrder);
        }
      }

      // Step 5: Update HTLC status
      htlcEscrow.status = 'completed';

      return {
        sourceTxHash: sourceResolverOrder.txHash || sourceResolverOrder.orderId,
        destinationTxHash
      };
    } catch (error) {
      console.error('❌ Failed to execute HTLC:', error);
      throw error;
    }
  }

  /**
   * Refund HTLC if expired
   */
  async refundHTLC(htlcEscrow: HTLCEscrow): Promise<{ sourceTxHash: string; destinationTxHash?: string }> {
    console.log('💸 Refunding HTLC:', htlcEscrow.orderHash);

    try {
      // Check if HTLC is expired
      if (Date.now() < htlcEscrow.expiresAt) {
        throw new Error('HTLC is not expired yet');
      }

      // For now, simulate refund
      // In a real implementation, this would call the refund function on the escrow contracts
      const sourceTxHash = `refund-${htlcEscrow.orderHash}`;
      const destinationTxHash = htlcEscrow.destinationChain === 'bitcoin' 
        ? `btc-refund-${Date.now()}` 
        : undefined;

      htlcEscrow.status = 'refunded';

      return { sourceTxHash, destinationTxHash };
    } catch (error) {
      console.error('❌ Failed to refund HTLC:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Get active orders
   */
  async getActiveOrders(chainId: number): Promise<FusionPlusOrder[]> {
    try {
      const response = await this.httpClient.get(`?path=/orders/v1.0/order/active&chainId=${chainId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get active orders:', error);
      throw new Error(`Failed to get active orders: ${error}`);
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(chainId: number, onMessage?: (message: any) => void): void {
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
        const message = JSON.parse(event.data);
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
  onMessage(type: string, handler: (message: any) => void): void {
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

  /**
   * Check if HTLC is expired
   */
  isHTLCExpired(htlcEscrow: HTLCEscrow): boolean {
    return Date.now() > htlcEscrow.expiresAt;
  }

  /**
   * Get time until HTLC expires (in seconds)
   */
  getTimeUntilExpiry(htlcEscrow: HTLCEscrow): number {
    return Math.max(0, (htlcEscrow.expiresAt - Date.now()) / 1000);
  }
}

// Factory function
export function createFusionPlusCrossChainSDK(apiKey?: string): FusionPlusCrossChainSDK {
  // Get API key from environment or use a valid test key
  const key = apiKey || process.env.NEXT_PUBLIC_1INCH_API_KEY || '2eVY4oCPnCaDCEBoqIcXd888V5G2CYgA';
  
  // Validate API key format
  if (!key || key === '2eVY4oCPnCaDCEBoqIcXd888V5G2CYgA') {
    console.warn('⚠️ Using default API key. Please set NEXT_PUBLIC_1INCH_API_KEY environment variable for production use.');
  }
  
  return new FusionPlusCrossChainSDK(key);
} 