import { ethers } from 'ethers';
import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';

// 1inch Fusion+ API Configuration
const FUSION_PLUS_CONFIG = {
  baseUrl: 'https://api.1inch.dev/fusion-plus',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// 1inch Fusion+ Types
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
  fromChain: 'ethereum' | 'bitcoin' | 'solana' | 'starknet' | 'stellar';
  toChain: 'ethereum' | 'bitcoin' | 'solana' | 'starknet' | 'stellar';
  fromToken: string;
  toToken: string;
  amount: string;
  walletAddress: string;
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

// Error handling
class TrueBridgeServiceError extends Error {
  constructor(
    message: string,
    public code: BridgeErrorCode,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TrueBridgeServiceError';
  }
}

// HTTP client with retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = FUSION_PLUS_CONFIG.retryAttempts
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${FUSION_PLUS_CONFIG.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(FUSION_PLUS_CONFIG.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TrueBridgeServiceError(
        errorData.message || `HTTP ${response.status}`,
        BridgeErrorCode.NETWORK_ERROR,
        response.status,
        errorData
      );
    }

    return response;
  } catch (error) {
    if (retries > 0 && (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError'))) {
      await new Promise(resolve => setTimeout(resolve, FUSION_PLUS_CONFIG.retryDelay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Main True Bridge Service implementing 1inch Fusion+ protocol
export class TrueBridgeService {
  private static instance: TrueBridgeService;

  static getInstance(): TrueBridgeService {
    if (!TrueBridgeService.instance) {
      TrueBridgeService.instance = new TrueBridgeService();
    }
    return TrueBridgeService.instance;
  }

  /**
   * Get quote using 1inch Fusion+ API for cross-chain swaps
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/get-quote
   */
  async getQuote(params: {
    srcChainId: number;
    dstChainId: number;
    srcTokenAddress: string;
    dstTokenAddress: string;
    amount: string;
    walletAddress: string;
  }): Promise<BridgeQuote> {
    try {
      console.log('🔍 Getting cross-chain quote from 1inch Fusion+ API:', params);

      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/quote`,
        {
          method: 'POST',
          body: JSON.stringify({
            srcChainId: params.srcChainId,
            dstChainId: params.dstChainId,
            srcTokenAddress: params.srcTokenAddress,
            dstTokenAddress: params.dstTokenAddress,
            amount: params.amount,
            walletAddress: params.walletAddress
          })
        }
      );

      const data = await response.json();
      console.log('✅ Quote received from 1inch Fusion+ API:', data);

      // Convert to BridgeQuote format
      return {
        id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromToken: {
          symbol: data.fromToken?.symbol || 'UNKNOWN',
          address: params.srcTokenAddress,
          chainId: params.srcChainId
        },
        toToken: {
          symbol: data.toToken?.symbol || 'UNKNOWN',
          address: params.dstTokenAddress,
          chainId: params.dstChainId
        },
        fromAmount: params.amount,
        toAmount: data.toTokenAmount || '0',
        exchangeRate: data.exchangeRate || '1',
        networkFee: data.networkFee || '0',
        protocolFee: data.protocolFee || '0',
        totalFee: data.totalFee || '0',
        estimatedTime: data.estimatedTime || '10-30 minutes',
        minimumReceived: data.minimumReceived || data.toTokenAmount || '0',
        priceImpact: data.priceImpact || '0',
        expiresAt: Date.now() + 300000 // 5 minutes
      };
    } catch (error) {
      console.error('❌ Failed to get quote:', error);
      throw new TrueBridgeServiceError(
        `Failed to get quote: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Create order using 1inch Fusion+ API with proper secret generation
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
      console.log('🔍 Creating cross-chain order with 1inch Fusion+ API:', {
        walletAddress: params.walletAddress,
        secretHash: params.secretHash,
        secretHashesCount: params.secretHashes.length
      });

      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order`,
        {
          method: 'POST',
          body: JSON.stringify(params)
        }
      );

      const order = await response.json();
      console.log('✅ Order created successfully:', order);
      return order;
    } catch (error) {
      console.error('❌ Failed to create order:', error);
      throw new TrueBridgeServiceError(
        `Failed to create order: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Submit order to relayer
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/submit-order
   */
  async submitOrder(order: FusionPlusOrder): Promise<{ orderId: string; txHash?: string }> {
    try {
      console.log('🔍 Submitting order to relayer:', {
        orderHash: order.orderHash
      });

      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/submit`,
        {
          method: 'POST',
          body: JSON.stringify(order)
        }
      );

      const result = await response.json();
      console.log('✅ Order submitted successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to submit order:', error);
      throw new TrueBridgeServiceError(
        `Failed to submit order: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Submit secret for order
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/when-and-how-to-submit-secrets
   */
  async submitSecret(orderHash: string, secret: string, chainId: number): Promise<{ txHash: string }> {
    try {
      console.log('🔍 Submitting secret for order:', { orderHash, chainId });

      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/submit-secret`,
        {
          method: 'POST',
          body: JSON.stringify({
            orderHash,
            secret,
            chainId
          })
        }
      );

      const result = await response.json();
      console.log('✅ Secret submitted successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to submit secret:', error);
      throw new TrueBridgeServiceError(
        `Failed to submit secret: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Get escrow factory address
   */
  async getEscrowFactoryAddress(chainId: number): Promise<string> {
    try {
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/escrow?chainId=${chainId}`,
        { method: 'GET' }
      );

      const data = await response.json();
      return data.address;
    } catch (error) {
      console.error('❌ Failed to get escrow factory address:', error);
      throw new TrueBridgeServiceError(
        `Failed to get escrow factory address: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Create cross-chain swap following 1inch Fusion+ protocol
   * This implements the actual step-by-step process from the instructions
   */
  async createCrossChainSwap(request: CrossChainSwapRequest): Promise<CrossChainSwapResult> {
    try {
      console.log('🚀 Creating cross-chain swap following 1inch Fusion+ protocol:', request);

      // Step 1: Generate secret and hash for HTLC (as per instructions)
      const secret = ethers.randomBytes(32);
      const secretHash = ethers.keccak256(secret);

      // Step 2: Calculate timelock (default 1 hour)
      const timelock = Math.floor(Date.now() / 1000) + (request.timelock || 3600);

      // Step 3: Get quote for source chain
      const sourceChainId = this.getChainId(request.fromChain);
      const destChainId = this.getChainId(request.toChain);
      
      const quote = await this.getQuote({
        srcChainId: sourceChainId,
        dstChainId: destChainId,
        srcTokenAddress: request.fromToken,
        dstTokenAddress: request.toToken,
        amount: request.amount,
        walletAddress: request.walletAddress
      });

      // Step 4: Create order on source chain with proper secret hashes
      const sourceOrder = await this.createOrder({
        quote,
        walletAddress: request.walletAddress,
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
        // For Bitcoin, we create a Bitcoin HTLC script address
        destinationOrder = {
          ...sourceOrder,
          orderHash: `btc-${sourceOrder.orderHash}`,
          chainId: 0,
          nonEVMChain: 'bitcoin',
          escrowAddress: await this.generateBitcoinHTLCAddress(secretHash, request.walletAddress, timelock)
        };
        destinationTxHash = `btc-tx-${Date.now()}`;
      } else {
        // For other EVM chains, create another order
        const destQuote = await this.getQuote({
          srcChainId: destChainId,
          dstChainId: sourceChainId,
          srcTokenAddress: request.toToken,
          dstTokenAddress: request.fromToken,
          amount: quote.toAmount,
          walletAddress: request.recipientAddress || request.walletAddress
        });

        destinationOrder = await this.createOrder({
          quote: destQuote,
          walletAddress: request.recipientAddress || request.walletAddress,
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
    } catch (error) {
      console.error('❌ Failed to create cross-chain swap:', error);
      throw new TrueBridgeServiceError(
        `Failed to create cross-chain swap: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
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
        this.getChainId(htlcEscrow.sourceChain as any)
      );

      console.log('✅ Source HTLC executed:', sourceTxHash);

      // Step 2: Execute destination HTLC if it exists
      let destinationTxHash: string | undefined;

      if (htlcEscrow.destinationChain === 'bitcoin') {
        // For Bitcoin, simulate execution (in production, this would call Bitcoin HTLC script)
        destinationTxHash = `btc-execute-${Date.now()}`;
        console.log('✅ Bitcoin HTLC executed (simulated):', destinationTxHash);
      } else if (htlcEscrow.destinationOrderHash) {
        // For other chains, submit secret
        const destTxHash = await this.submitSecret(
          htlcEscrow.destinationOrderHash,
          htlcEscrow.secret,
          this.getChainId(htlcEscrow.destinationChain as any)
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

  /**
   * Get active orders for monitoring
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/get-active-orders
   */
  async getActiveOrders(chainId: number, page: number = 1, limit: number = 10): Promise<FusionPlusOrder[]> {
    try {
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/active?chainId=${chainId}&page=${page}&limit=${limit}`,
        { method: 'GET' }
      );

      const data = await response.json();
      return data.orders || [];
    } catch (error) {
      console.error('❌ Failed to get active orders:', error);
      throw new TrueBridgeServiceError(
        `Failed to get active orders: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Get orders by maker
   * @see https://portal.1inch.dev/documentation/apis/swap/fusion-plus/fusion-plus-sdk/for-integrators/get-orders-by-maker
   */
  async getOrdersByMaker(makerAddress: string, chainId: number, page: number = 1, limit: number = 10): Promise<FusionPlusOrder[]> {
    try {
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/by-maker?maker=${makerAddress}&chainId=${chainId}&page=${page}&limit=${limit}`,
        { method: 'GET' }
      );

      const data = await response.json();
      return data.orders || [];
    } catch (error) {
      console.error('❌ Failed to get orders by maker:', error);
      throw new TrueBridgeServiceError(
        `Failed to get orders by maker: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  // Utility methods
  private getChainId(chain: string): number {
    const chainMap: Record<string, number> = {
      'ethereum': 1,
      'bitcoin': 0,
      'solana': 101,
      'starknet': 100,
      'stellar': 102
    };
    return chainMap[chain] || 1;
  }

  private async generateBitcoinHTLCAddress(secretHash: string, resolverAddress: string, timelock: number): Promise<string> {
    // In production, this would generate a real Bitcoin HTLC script address
    // For now, generate a deterministic address based on parameters
    const addressSeed = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'uint256'],
        [secretHash, resolverAddress, timelock]
      )
    );
    
    const addressBytes = ethers.getBytes(addressSeed).slice(0, 20);
    const checksum = ethers.keccak256(addressBytes).slice(0, 4);
    const fullAddress = ethers.concat([addressBytes, checksum]);
    
    const base32Address = ethers.encodeBase64(fullAddress).replace(/[+/=]/g, '').toLowerCase();
    return `tb1q${base32Address.slice(0, 39)}`;
  }

  isHTLCExpired(htlcEscrow: HTLCEscrow): boolean {
    return Date.now() > htlcEscrow.expiresAt;
  }

  getTimeUntilExpiry(htlcEscrow: HTLCEscrow): number {
    return Math.max(0, (htlcEscrow.expiresAt - Date.now()) / 1000);
  }
}

// Export singleton instance
export const trueBridgeService = TrueBridgeService.getInstance(); 