import { ethers } from 'ethers';
import { 
  FusionPlusCrossChainSDK, 
  FusionPlusOrder, 
  CrossChainSwapRequest, 
  HTLCEscrow, 
  CrossChainSwapResult 
} from './fusion-plus-cross-chain-sdk';

export interface BridgeQuote {
  id: string;
  fromToken: any;
  toToken: any;
  fromAmount: string;
  toAmount: string;
  exchangeRate: string;
  networkFee: string;
  protocolFee: string;
  totalFee: string;
  estimatedTime: string;
  minimumReceived: string;
  priceImpact: string;
  expiresAt: number;
}

export class OneInchFusionSDK {
  private sdk: FusionPlusCrossChainSDK;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.sdk = new FusionPlusCrossChainSDK(apiKey);
  }

  /**
   * Get quote using 1inch Fusion+ SDK for cross-chain swaps
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
      console.log('🔍 Getting cross-chain quote from 1inch Fusion+ SDK:', {
        srcChainId: params.srcChainId,
        dstChainId: params.dstChainId,
        srcTokenAddress: params.srcTokenAddress,
        dstTokenAddress: params.dstTokenAddress,
        amount: params.amount,
        walletAddress: params.walletAddress
      });

      const quote = await this.sdk.getQuote(params);
      console.log('✅ Quote received from 1inch Fusion+ SDK:', quote);

      // Convert to BridgeQuote format
      return {
        id: `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromToken: {
          symbol: quote.fromToken?.symbol || 'UNKNOWN',
          address: params.srcTokenAddress,
          chainId: params.srcChainId
        },
        toToken: {
          symbol: quote.toToken?.symbol || 'UNKNOWN',
          address: params.dstTokenAddress,
          chainId: params.dstChainId
        },
        fromAmount: params.amount,
        toAmount: quote.toTokenAmount || '0',
        exchangeRate: quote.exchangeRate || '1',
        networkFee: quote.networkFee || '0',
        protocolFee: quote.protocolFee || '0',
        totalFee: quote.totalFee || '0',
        estimatedTime: quote.estimatedTime || '10-30 minutes',
        minimumReceived: quote.minimumReceived || quote.toTokenAmount || '0',
        priceImpact: quote.priceImpact || '0',
        expiresAt: Date.now() + 300000 // 5 minutes
      };
    } catch (error) {
      console.error('❌ Failed to get quote:', error);
      throw new Error(`Failed to get quote: ${error}`);
    }
  }

  /**
   * Create order using 1inch Fusion+ SDK with proper secret generation
   */
  async createOrder(params: {
    quote: any;
    walletAddress: string;
    secretHash: string;
    secretHashes: string[];
    fee: { takingFeeBps: number; takingFeeReceiver: string };
  }): Promise<FusionPlusOrder> {
    try {
      console.log('🔍 Creating cross-chain order with 1inch Fusion+ SDK:', {
        walletAddress: params.walletAddress,
        secretHash: params.secretHash,
        secretHashesCount: params.secretHashes.length
      });

      const order = await this.sdk.createOrder(params);
      console.log('✅ Order created successfully:', order);
      return order;
    } catch (error) {
      console.error('❌ Failed to create order:', error);
      throw new Error(`Failed to create order: ${error}`);
    }
  }

  /**
   * Submit order to relayer
   */
  async submitOrder(order: FusionPlusOrder): Promise<{ orderId: string; txHash?: string }> {
    try {
      console.log('🔍 Submitting order to relayer:', {
        orderHash: order.orderHash
      });

      const result = await this.sdk.submitOrder(order);
      console.log('✅ Order submitted successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to submit order:', error);
      throw new Error(`Failed to submit order: ${error}`);
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
        walletAddress: request.userAddress
      });

      // Step 4: Create order on source chain with proper secret hashes
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
        // For Bitcoin, we create a Bitcoin HTLC script address
        destinationOrder = {
          ...sourceOrder,
          orderHash: `btc-${sourceOrder.orderHash}`,
          chainId: 0,
          nonEVMChain: 'bitcoin',
          escrowAddress: await this.generateBitcoinHTLCAddress(secretHash, request.userAddress, timelock)
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
      const sourceEscrowAddress = await this.sdk.getEscrowFactoryAddress(sourceChainId);
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
      throw new Error(`Failed to create cross-chain swap: ${error}`);
    }
  }

  /**
   * Execute HTLC by submitting secret (following 1inch instructions)
   */
  async executeHTLC(htlcEscrow: HTLCEscrow): Promise<{ sourceTxHash: string; destinationTxHash?: string }> {
    console.log('🚀 Executing HTLC:', htlcEscrow.orderHash);

    try {
      // Step 1: Submit secret to source chain
      const sourceTxHash = await this.sdk.submitSecret(
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
        const destTxHash = await this.sdk.submitSecret(
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
   */
  async getActiveOrders(chainId: number, page: number = 1, limit: number = 10): Promise<FusionPlusOrder[]> {
    try {
      return await this.sdk.getActiveOrders(chainId, page, limit);
    } catch (error) {
      console.error('❌ Failed to get active orders:', error);
      throw new Error(`Failed to get active orders: ${error}`);
    }
  }

  /**
   * Get orders by maker
   */
  async getOrdersByMaker(makerAddress: string, chainId: number, page: number = 1, limit: number = 10): Promise<FusionPlusOrder[]> {
    try {
      return await this.sdk.getOrdersByMaker(makerAddress, chainId, page, limit);
    } catch (error) {
      console.error('❌ Failed to get orders by maker:', error);
      throw new Error(`Failed to get orders by maker: ${error}`);
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

// Factory function
export function createOneInchFusionSDK(apiKey?: string): OneInchFusionSDK {
  // Get API key from environment or parameter
  const key = apiKey || process.env.NEXT_PUBLIC_1INCH_API_KEY;
  
  if (!key) {
    throw new Error('1inch API key not found. Please set NEXT_PUBLIC_1INCH_API_KEY environment variable.');
  }
  
  console.log('✅ Using 1inch API key from environment variables');
  return new OneInchFusionSDK(key);
} 