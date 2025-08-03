import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';

// 1inch Fusion+ API Configuration
const FUSION_PLUS_BASE = '/api/1inch'; // Use Next.js API proxy

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
  destinationOrderHash?: string;
  status: 'pending' | 'locked' | 'completed' | 'expired' | 'refunded';
  createdAt: number;
  expiresAt: number;
}

export interface CrossChainSwapResult {
  htlcEscrow: HTLCEscrow;
  sourceOrder: FusionPlusOrder;
  destinationOrder?: FusionPlusOrder;
  sourceTxHash: string;
  destinationTxHash?: string;
}

export class FusionPlusCrossChainSDK {
  private apiKey: string;
  private httpClient: AxiosInstance;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.httpClient = axios.create({
      baseURL: FUSION_PLUS_BASE,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

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

  /**
   * Get active orders using 1inch Fusion+ API
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/get-active-orders
   */
  async getActiveOrders(chainId: number, page: number = 1, limit: number = 10): Promise<FusionPlusOrder[]> {
    try {
      const response = await this.httpClient.get(`?path=/fusion-plus/orders/v1.0/order/active&chainId=${chainId}&page=${page}&limit=${limit}`);
      return response.data.orders || [];
    } catch (error) {
      console.error('❌ Failed to get active orders:', error);
      throw new Error(`Failed to get active orders: ${error}`);
    }
  }

  /**
   * Get orders by maker using 1inch Fusion+ API
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/get-orders-by-maker
   */
  async getOrdersByMaker(makerAddress: string, chainId: number, page: number = 1, limit: number = 10): Promise<FusionPlusOrder[]> {
    try {
      const response = await this.httpClient.get(`?path=/fusion-plus/orders/v1.0/order/by-maker&maker=${makerAddress}&chainId=${chainId}&page=${page}&limit=${limit}`);
      return response.data.orders || [];
    } catch (error) {
      console.error('❌ Failed to get orders by maker:', error);
      throw new Error(`Failed to get orders by maker: ${error}`);
    }
  }

  /**
   * Get quote for cross-chain swap using 1inch Fusion+ API
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/get-quote
   */
  async getQuote(params: {
    srcChainId: number;
    dstChainId: number;
    srcTokenAddress: string;
    dstTokenAddress: string;
    amount: string;
    walletAddress: string;
  }): Promise<any> {
    try {
      const response = await this.httpClient.post(`?path=/fusion-plus/quote`, params);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get quote:', error);
      throw new Error(`Failed to get quote: ${error}`);
    }
  }

  /**
   * Create order using 1inch Fusion+ API
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/create-order
   */
  async createOrder(params: {
    quote: any;
    walletAddress: string;
    secretHash: string;
    secretHashes: string[];
    fee: { takingFeeBps: number; takingFeeReceiver: string };
  }): Promise<FusionPlusOrder> {
    try {
      const response = await this.httpClient.post(`?path=/fusion-plus/orders/v1.0/order`, params);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create order:', error);
      throw new Error(`Failed to create order: ${error}`);
    }
  }

  /**
   * Submit order to relayer using 1inch Fusion+ API
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/submit-order
   */
  async submitOrder(order: FusionPlusOrder): Promise<{ orderId: string; txHash?: string }> {
    try {
      const response = await this.httpClient.post(`?path=/fusion-plus/orders/v1.0/order/submit`, order);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to submit order:', error);
      throw new Error(`Failed to submit order: ${error}`);
    }
  }

  /**
   * Submit secret for order using 1inch Fusion+ API
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/when-and-how-to-submit-secrets
   */
  async submitSecret(orderHash: string, secret: string, chainId: number): Promise<{ txHash: string }> {
    try {
      const response = await this.httpClient.post(`?path=/fusion-plus/orders/v1.0/order/submit-secret`, {
        orderHash,
        secret,
        chainId
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to submit secret:', error);
      throw new Error(`Failed to submit secret: ${error}`);
    }
  }

  /**
   * Get escrow factory address using 1inch Fusion+ API
   */
  async getEscrowFactoryAddress(chainId: number): Promise<string> {
    try {
      const response = await this.httpClient.get(`?path=/fusion-plus/orders/v1.0/order/escrow&chainId=${chainId}`);
      return response.data.address;
    } catch (error) {
      console.error('❌ Failed to get escrow factory address:', error);
      throw new Error(`Failed to get escrow factory address: ${error}`);
    }
  }

  /**
   * Create cross-chain HTLC swap following 1inch Fusion+ protocol
   * This implements the step-by-step process from the instructions
   */
  async createCrossChainSwap(request: CrossChainSwapRequest): Promise<CrossChainSwapResult> {
    console.log('🔄 Creating cross-chain swap:', request);

    // Step 1: Generate secret and hash for HTLC (as per instructions)
    const secret = ethers.randomBytes(32);
    const secretHash = ethers.keccak256(secret);

    // Step 2: Calculate timelock (default 1 hour)
    const timelock = Math.floor(Date.now() / 1000) + (request.timelock || 3600);

    // Step 3: Get quote for source chain
    const sourceChainId = request.fromChain === 'ethereum' ? 1 : 11155111;
    const quote = await this.getQuote({
      srcChainId: sourceChainId,
      dstChainId: request.toChain === 'ethereum' ? 1 : 0, // 0 for Bitcoin
      srcTokenAddress: request.fromToken,
      dstTokenAddress: request.toToken,
      amount: (parseFloat(request.amount) * 1e18).toString(),
      walletAddress: request.userAddress
    });

    // Step 4: Create order on source chain
    const sourceOrder = await this.createOrder({
      quote,
      walletAddress: request.userAddress,
      secretHash,
      secretHashes: [secretHash],
      fee: { takingFeeBps: 100, takingFeeReceiver: '0x0000000000000000000000000000000000000000' }
    });

    // Step 5: Submit order to relayer
    const submittedOrder = await this.submitOrder(sourceOrder);

    console.log('✅ Source order created and submitted:', submittedOrder);

    // Step 6: Create destination chain order if needed
    let destinationOrder: FusionPlusOrder | undefined;
    let destinationTxHash: string | undefined;

    if (request.toChain === 'bitcoin') {
      // For Bitcoin, we simulate the escrow creation
      // In a real implementation, this would interact with Bitcoin HTLC contracts
      destinationOrder = {
        ...sourceOrder,
        orderHash: `btc-${sourceOrder.orderHash}`,
        chainId: 0,
        nonEVMChain: 'bitcoin'
      };
      destinationTxHash = `btc-tx-${Date.now()}`;
    } else {
      // For Ethereum destination, create another order
      const destQuote = await this.getQuote({
        srcChainId: request.toChain === 'ethereum' ? 1 : 0,
        dstChainId: sourceChainId,
        srcTokenAddress: request.toToken,
        dstTokenAddress: request.fromToken,
        amount: '0', // Will be calculated by auction
        walletAddress: request.recipientAddress || request.userAddress
      });

      destinationOrder = await this.createOrder({
        quote: destQuote,
        walletAddress: request.recipientAddress || request.userAddress,
        secretHash,
        secretHashes: [secretHash],
        fee: { takingFeeBps: 100, takingFeeReceiver: '0x0000000000000000000000000000000000000000' }
      });

      const destSubmittedOrder = await this.submitOrder(destinationOrder);
      destinationTxHash = destSubmittedOrder.txHash;
    }

    // Step 7: Get escrow factory addresses
    const sourceEscrowAddress = await this.getEscrowFactoryAddress(sourceChainId);
    const destinationEscrowAddress = destinationOrder?.escrowAddress || 'bitcoin-escrow';

    // Step 8: Create HTLC escrow record
    const htlcEscrow: HTLCEscrow = {
      orderHash: sourceOrder.orderHash,
      secretHash,
      secret: secret.toString('hex'),
      timelock,
      sourceChain: request.fromChain,
      destinationChain: request.toChain,
      sourceEscrowAddress,
      destinationEscrowAddress,
      destinationOrderHash: destinationOrder?.orderHash,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: timelock * 1000
    };

    console.log('✅ Cross-chain HTLC escrow created:', htlcEscrow);

    return {
      htlcEscrow,
      sourceOrder,
      destinationOrder,
      sourceTxHash: submittedOrder.txHash || sourceOrder.orderHash,
      destinationTxHash
    };
  }

  /**
   * Execute HTLC by submitting secret (following 1inch instructions)
   */
  async executeHTLC(htlcEscrow: HTLCEscrow): Promise<{ sourceTxHash: string; destinationTxHash?: string }> {
    console.log('🚀 Executing HTLC:', htlcEscrow.orderHash);

    try {
      // Step 1: Submit secret to source chain
      const sourceTxHash = await this.submitSecret(
        htlcEscrow.orderHash,
        htlcEscrow.secret,
        1 // Ethereum mainnet
      );

      console.log('✅ Source HTLC executed:', sourceTxHash);

      // Step 2: Execute destination HTLC if it exists
      let destinationTxHash: string | undefined;

      if (htlcEscrow.destinationChain === 'bitcoin') {
        // For Bitcoin, simulate execution
        destinationTxHash = `btc-execute-${Date.now()}`;
        console.log('✅ Bitcoin HTLC executed (simulated):', destinationTxHash);
      } else if (htlcEscrow.destinationOrderHash) {
        // For Ethereum destination, submit secret
        const destTxHash = await this.submitSecret(
          htlcEscrow.destinationOrderHash,
          htlcEscrow.secret,
          1
        );
        destinationTxHash = destTxHash.txHash;
        console.log('✅ Destination HTLC executed:', destTxHash);
      }

      // Step 3: Update HTLC status
      htlcEscrow.status = 'completed';

      return {
        sourceTxHash: sourceTxHash.txHash,
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

  // Utility methods
  isHTLCExpired(htlcEscrow: HTLCEscrow): boolean {
    return Date.now() > htlcEscrow.expiresAt;
  }

  getTimeUntilExpiry(htlcEscrow: HTLCEscrow): number {
    return Math.max(0, (htlcEscrow.expiresAt - Date.now()) / 1000);
  }
}

// Factory function
export function createFusionPlusCrossChainSDK(apiKey?: string): FusionPlusCrossChainSDK {
  const key = apiKey || process.env.NEXT_PUBLIC_1INCH_API_KEY;
  
  if (!key) {
    throw new Error('1inch API key not found. Please set NEXT_PUBLIC_1INCH_API_KEY environment variable.');
  }
  
  return new FusionPlusCrossChainSDK(key);
} 