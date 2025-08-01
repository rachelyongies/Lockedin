import { FusionSDK, NetworkEnum, PrivateKeyProviderConnector } from '@1inch/fusion-sdk';
import { ethers } from 'ethers';

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

export class OneInchFusionSDK {
  private sdk: FusionSDK;
  private apiKey: string;

  constructor(apiKey: string, privateKey?: string, nodeUrl?: string) {
    this.apiKey = apiKey;
    
    // Initialize 1inch Fusion+ SDK
    const blockchainProvider = privateKey && nodeUrl 
      ? new PrivateKeyProviderConnector(privateKey, new ethers.JsonRpcProvider(nodeUrl))
      : undefined;

    this.sdk = new FusionSDK({
      url: 'https://api.1inch.dev',
      authKey: apiKey,
      blockchainProvider
    });
  }

  /**
   * Get quote using 1inch Fusion+ SDK
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
      // Validate parameters before sending to SDK
      if (!params.srcTokenAddress || !params.dstTokenAddress) {
        throw new Error('Token addresses cannot be undefined');
      }
      
      if (!params.walletAddress) {
        throw new Error('Wallet address cannot be undefined');
      }

      console.log('🔍 Sending quote request to 1inch API v1.0:', {
        fromTokenAddress: params.srcTokenAddress,
        toTokenAddress: params.dstTokenAddress,
        amount: params.amount,
        walletAddress: params.walletAddress
      });

      // Use our Next.js API proxy to avoid CORS issues
      const queryParams = new URLSearchParams({
        fromTokenAddress: params.srcTokenAddress,
        toTokenAddress: params.dstTokenAddress,
        amount: params.amount,
        walletAddress: params.walletAddress,
        source: 'sdk',
        surplus: 'true'
      });

      const url = `/api/1inch?path=/fusion-plus/quoter/v1.0/quote/receive&${queryParams}`;
      
      console.log('🔗 Proxy URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ 1inch API Error:', response.status, errorData);
        throw new Error(`1inch API Error: ${response.status} - ${errorData}`);
      }

      const quote = await response.json();
      console.log('✅ Quote received from 1inch API v1.0:', quote);
      return quote;
    } catch (error) {
      console.error('❌ Failed to get quote:', error);
      throw new Error(`Failed to get quote: ${error}`);
    }
  }

  /**
   * Create order using 1inch Fusion+ SDK
   */
  async createOrder(params: {
    quote: any;
    walletAddress: string;
    secretHash: string;
    secretHashes: string[];
    fee: { takingFeeBps: number; takingFeeReceiver: string };
  }): Promise<FusionPlusOrder> {
    try {
      // Generate secret and hash
      const secret = ethers.randomBytes(32);
      const secretHash = ethers.keccak256(secret);

      const order = await this.sdk.createOrder(params.quote, {
        walletAddress: params.walletAddress,
        secretHash: secretHash.toString(),
        secretHashes: [secretHash.toString()],
        fee: params.fee
      });

      return {
        orderHash: order.orderHash || '',
        maker: order.maker || '',
        makerAsset: order.makerAsset || '',
        takerAsset: order.takerAsset || '',
        makerAmount: order.makerAmount || '',
        takerAmount: order.takerAmount || '',
        escrowAddress: order.escrowAddress || '',
        secretHash: order.secretHash || '',
        timelock: order.timelock || 0,
        status: order.status as any || 'pending',
        auctionSalt: order.auctionSalt || '',
        auctionSuffix: order.auctionSuffix || '',
        createdAt: order.createdAt || Date.now(),
        expiresAt: order.expiresAt || Date.now() + 3600000,
        chainId: order.chainId || 1,
        nonEVMChain: order.nonEVMChain
      };
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
      const result = await this.sdk.submitOrder(order);
      return {
        orderId: result.orderId || '',
        txHash: result.txHash
      };
    } catch (error) {
      console.error('❌ Failed to submit order:', error);
      throw new Error(`Failed to submit order: ${error}`);
    }
  }

  /**
   * Submit multiple orders via relayer batch endpoint
   */
  async submitOrdersBatch(orderStrings: string[]): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Submitting batch orders via relayer:', {
        orderCount: orderStrings.length
      });

      const response = await fetch('/api/1inch/relayer/submit-many', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderStrings)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Relayer API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Batch orders submitted via relayer:', result);
      return {
        success: true,
        message: `Successfully submitted ${orderStrings.length} orders`
      };
    } catch (error) {
      console.error('❌ Failed to submit batch orders via relayer:', error);
      throw new Error(`Failed to submit batch orders via relayer: ${error}`);
    }
  }

  /**
   * Submit order via relayer endpoint
   */
  async submitOrderViaRelayer(orderData: {
    order: {
      salt: string;
      makerAsset: string;
      takerAsset: string;
      maker: string;
      receiver: string;
      makingAmount: string;
      takingAmount: string;
      makerTraits: string;
    };
    srcChainId: number;
    signature: string;
    extension: string;
    quoteId: string;
    secretHashes: string[];
  }): Promise<{ orderId: string; txHash?: string }> {
    try {
      console.log('🔍 Submitting order via relayer:', {
        srcChainId: orderData.srcChainId,
        quoteId: orderData.quoteId,
        secretHashesCount: orderData.secretHashes.length
      });

      const response = await fetch('/api/1inch/relayer/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Relayer API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Order submitted via relayer:', result);
      return {
        orderId: result.orderId || result.id,
        txHash: result.txHash || result.transactionHash
      };
    } catch (error) {
      console.error('❌ Failed to submit order via relayer:', error);
      throw new Error(`Failed to submit order via relayer: ${error}`);
    }
  }

  /**
   * Submit secret for order using the dedicated relayer endpoint
   */
  async submitSecretViaRelayer(orderHash: string, secret: string, chainId: number): Promise<{ txHash: string }> {
    try {
      console.log('🔍 Submitting secret via relayer:', { orderHash, chainId, secretLength: secret.length });

      const response = await fetch('/api/1inch/relayer/secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderHash,
          secret,
          chainId
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Relayer API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Secret submitted via relayer:', result);
      return { txHash: result.txHash || result.transactionHash };
    } catch (error) {
      console.error('❌ Failed to submit secret via relayer:', error);
      throw new Error(`Failed to submit secret via relayer: ${error}`);
    }
  }

  /**
   * Submit secret for order
   */
  async submitSecret(orderHash: string, secret: string, chainId: number): Promise<{ txHash: string }> {
    try {
      const result = await this.sdk.submitSecretForOrder({
        orderHash,
        secret,
        chainId: chainId as NetworkEnum
      });
      return { txHash: result.txHash };
    } catch (error) {
      console.error('❌ Failed to submit secret:', error);
      throw new Error(`Failed to submit secret: ${error}`);
    }
  }

  /**
   * Create cross-chain swap (simplified for demo)
   */
  async createCrossChainSwap(request: CrossChainSwapRequest): Promise<CrossChainSwapResult> {
    try {
      console.log('🚀 Creating cross-chain swap:', request);

      // Generate secret and hash
      const secret = ethers.randomBytes(32);
      const secretHash = ethers.keccak256(secret);

      // Create HTLC escrow
      const htlcEscrow: HTLCEscrow = {
        orderHash: `htlc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        secretHash: secretHash.toString(),
        secret: secret.toString('hex'),
        timelock: request.timelock || Math.floor(Date.now() / 1000) + 3600,
        sourceChain: request.fromChain,
        destinationChain: request.toChain,
        sourceEscrowAddress: '0x0000000000000000000000000000000000000000', // Placeholder
        destinationEscrowAddress: '0x0000000000000000000000000000000000000000', // Placeholder
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + (request.timelock || 3600) * 1000
      };

      // Create source order
      const sourceOrder: FusionPlusOrder = {
        orderHash: htlcEscrow.orderHash,
        maker: request.walletAddress,
        makerAsset: request.fromToken,
        takerAsset: request.toToken,
        makerAmount: request.amount,
        takerAmount: '0', // Will be calculated by quote
        escrowAddress: htlcEscrow.sourceEscrowAddress,
        secretHash: htlcEscrow.secretHash,
        timelock: htlcEscrow.timelock,
        status: 'pending',
        auctionSalt: ethers.randomBytes(32).toString('hex'),
        auctionSuffix: ethers.randomBytes(32).toString('hex'),
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        chainId: request.fromChain === 'ethereum' ? 1 : 0
      };

      // Simulate transaction hashes
      const sourceTxHash = `0x${ethers.randomBytes(32).toString('hex')}`;
      const destinationTxHash = request.toChain === 'bitcoin' 
        ? `btc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : `0x${ethers.randomBytes(32).toString('hex')}`;

      return {
        htlcEscrow,
        sourceOrder,
        sourceTxHash,
        destinationTxHash
      };
    } catch (error) {
      console.error('❌ Failed to create cross-chain swap:', error);
      throw new Error(`Failed to create cross-chain swap: ${error}`);
    }
  }

  /**
   * Execute HTLC by submitting secret
   */
  async executeHTLC(htlcEscrow: HTLCEscrow): Promise<{ sourceTxHash: string; destinationTxHash?: string }> {
    console.log('🚀 Executing HTLC:', htlcEscrow.orderHash);

    try {
      // Step 1: Submit secret to source chain
      const sourceTxHash = await this.submitSecret(
        htlcEscrow.orderHash,
        htlcEscrow.secret,
        NetworkEnum.ETHEREUM
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
          NetworkEnum.ETHEREUM
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
export function createOneInchFusionSDK(apiKey?: string, privateKey?: string, nodeUrl?: string): OneInchFusionSDK {
  // Get API key from environment or parameter
  const key = apiKey || process.env.NEXT_PUBLIC_1INCH_API_KEY;
  
  if (!key) {
    throw new Error('1inch API key not found. Please set NEXT_PUBLIC_1INCH_API_KEY environment variable.');
  }
  
  console.log('✅ Using 1inch API key from environment variables');
  return new OneInchFusionSDK(key, privateKey, nodeUrl);
} 