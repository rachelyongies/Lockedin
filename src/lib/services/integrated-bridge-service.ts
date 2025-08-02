import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';
import { BitcoinNetworkService, BitcoinNetwork } from './bitcoin-network-service';

// Initialize Bitcoin libraries
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

// 1inch Fusion+ API Configuration
const FUSION_PLUS_CONFIG = {
  baseUrl: 'https://api.1inch.dev/fusion-plus',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// Types for integrated bridge
export interface IntegratedHTLC {
  id: string;
  secret: Buffer;
  secretHash: Buffer;
  timelock: number;
  bitcoinAddress: string;
  bitcoinScript: Buffer;
  ethereumEscrowAddress: string;
  fusionOrderId?: string;
  status: 'pending' | 'funded' | 'claimed' | 'refunded' | 'expired';
  createdAt: number;
  expiresAt: number;
}

export interface BitcoinHTLCConfig {
  senderPublicKey: Buffer;
  receiverPublicKey: Buffer;
  hashlock: Buffer;
  locktime: number;
  network: bitcoin.Network;
  useSegwit: boolean;
}

export interface CrossChainSwapRequest {
  fromChain: 'ethereum' | 'bitcoin';
  toChain: 'ethereum' | 'bitcoin';
  fromToken: string;
  toToken: string;
  amount: string;
  walletAddress: string;
  recipientAddress?: string;
  timelock?: number;
}

export interface CrossChainSwapResult {
  htlc: IntegratedHTLC;
  bitcoinTxid?: string;
  ethereumTxHash?: string;
  fusionOrderId?: string;
}

// Error handling
class IntegratedBridgeError extends Error {
  constructor(
    message: string,
    public code: BridgeErrorCode,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'IntegratedBridgeError';
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
      throw new IntegratedBridgeError(
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

// Main Integrated Bridge Service
export class IntegratedBridgeService {
  private static instance: IntegratedBridgeService;
  private bitcoinService: BitcoinNetworkService;
  private ethereumProvider: ethers.Provider;
  private htlcStorage: Map<string, IntegratedHTLC> = new Map();

  private constructor() {
    this.bitcoinService = BitcoinNetworkService.getInstance(BitcoinNetwork.TESTNET);
    this.ethereumProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL);
  }

  static getInstance(): IntegratedBridgeService {
    if (!IntegratedBridgeService.instance) {
      IntegratedBridgeService.instance = new IntegratedBridgeService();
    }
    return IntegratedBridgeService.instance;
  }

  /**
   * Get quote from 1inch Fusion+ API
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
      console.log('🔍 Getting quote from 1inch Fusion+ API:', params);

      // Real 1inch Fusion+ quote API call
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/quoter/v1.0/quote/receive`,
        {
          method: 'POST',
          body: JSON.stringify({
            srcChain: params.srcChainId,
            dstChain: params.dstChainId,
            srcTokenAddress: params.srcTokenAddress,
            dstTokenAddress: params.dstTokenAddress,
            amount: params.amount
          })
        }
      );

      const data = await response.json();
      console.log('✅ Quote received from 1inch Fusion+:', data);

      // Map real 1inch Fusion+ response to BridgeQuote
      return {
        id: data.quoteId || `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromToken: {
          symbol: data.srcToken?.symbol || 'UNKNOWN',
          address: params.srcTokenAddress,
          chainId: params.srcChainId,
          decimals: data.srcToken?.decimals || 18
        },
        toToken: {
          symbol: data.dstToken?.symbol || 'UNKNOWN',
          address: params.dstTokenAddress,
          chainId: params.dstChainId,
          decimals: data.dstToken?.decimals || 18
        },
        fromAmount: params.amount,
        toAmount: data.dstTokenAmount || '0',
        exchangeRate: data.exchangeRate || '1',
        networkFee: data.networkFee || '0',
        protocolFee: data.protocolFee || '0',
        totalFee: data.totalFee || '0',
        estimatedTime: data.estimatedTime || '10-30 minutes',
        minimumReceived: data.minimumReceived || data.dstTokenAmount || '0',
        priceImpact: data.priceImpact || '0',
        expiresAt: Date.now() + (data.validUntil || 300000),
        // Real 1inch Fusion+ specific fields
        presets: data.presets || [],
        routes: data.routes || [],
        quoteId: data.quoteId
      };
    } catch (error) {
      console.error('❌ Failed to get quote from 1inch Fusion+:', error);
      throw new IntegratedBridgeError(
        `Failed to get quote from 1inch Fusion+: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Create Bitcoin HTLC script (following reference implementation)
   */
  private createBitcoinHTLCScript(config: BitcoinHTLCConfig): {
    address: string;
    redeemScript: Buffer;
    lockingScript: Buffer;
    scriptHash: Buffer;
    witnessScript?: Buffer;
  } {
    const { senderPublicKey, receiverPublicKey, hashlock, locktime, network, useSegwit } = config;
    
    // Create HTLC script: OP_IF OP_SHA256 <hashlock> OP_EQUALVERIFY <receiver_pubkey> OP_CHECKSIG OP_ELSE <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <sender_pubkey> OP_CHECKSIG OP_ENDIF
    const redeemScript = bitcoin.script.compile([
      bitcoin.opcodes.OP_IF,
        bitcoin.opcodes.OP_SHA256,
        hashlock,
        bitcoin.opcodes.OP_EQUALVERIFY,
        receiverPublicKey,
        bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ELSE,
        bitcoin.script.number.encode(locktime),
        bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
        bitcoin.opcodes.OP_DROP,
        senderPublicKey,
        bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ENDIF
    ]);

    if (useSegwit) {
      // P2WSH (SegWit)
      const witnessScript = redeemScript;
      const scriptHash = bitcoin.crypto.sha256(witnessScript);
      const lockingScript = bitcoin.script.compile([
        bitcoin.opcodes.OP_0,
        scriptHash
      ]);
      const address = bitcoin.address.fromOutputScript(lockingScript, network);
      
      return {
        address,
        redeemScript,
        lockingScript,
        scriptHash,
        witnessScript
      };
    } else {
      // P2SH (Legacy)
      const scriptHash = bitcoin.crypto.hash160(redeemScript);
      const lockingScript = bitcoin.script.compile([
        bitcoin.opcodes.OP_HASH160,
        scriptHash,
        bitcoin.opcodes.OP_EQUAL
      ]);
      const address = bitcoin.address.fromOutputScript(lockingScript, network);
      
      return {
        address,
        redeemScript,
        lockingScript,
        scriptHash
      };
    }
  }

  /**
   * Create cross-chain swap with real Bitcoin HTLCs and 1inch Fusion+ integration
   */
  async createCrossChainSwap(request: CrossChainSwapRequest): Promise<CrossChainSwapResult> {
    try {
      console.log('🚀 Creating integrated cross-chain swap:', request);

      // Step 1: Generate cryptographic secret and hash
      const secret = this.bitcoinService.generateSecret();
      const secretHash = secret.hash;
      const timelock = Math.floor(Date.now() / 1000) + (request.timelock || 3600);

      // Step 2: Get quote from 1inch Fusion+ if applicable
      let fusionOrderId: string | undefined;
      if (request.fromChain === 'ethereum' || request.toChain === 'ethereum') {
        console.log('🔍 Getting 1inch Fusion+ quote for cross-chain swap');
        
        const quote = await this.getQuote({
          srcChainId: this.getChainId(request.fromChain),
          dstChainId: this.getChainId(request.toChain),
          srcTokenAddress: request.fromToken,
          dstTokenAddress: request.toToken,
          amount: request.amount,
          walletAddress: request.walletAddress
        });

        console.log('✅ Quote received, creating 1inch Fusion+ order');
        
        // Create 1inch Fusion+ order with real secret hash
        fusionOrderId = await this.createFusionOrder(quote, secretHash.toString('hex'));
        
        console.log('✅ 1inch Fusion+ order created:', fusionOrderId);
      }

      // Step 3: Create Bitcoin HTLC if Bitcoin is involved
      let bitcoinAddress = '';
      let bitcoinScript = Buffer.alloc(0);

      if (request.fromChain === 'bitcoin' || request.toChain === 'bitcoin') {
        // Generate Bitcoin key pairs (in production, these would come from user wallets)
        const aliceKeyPair = ECPair.makeRandom();
        const bobKeyPair = ECPair.makeRandom();

        const htlcConfig: BitcoinHTLCConfig = {
          senderPublicKey: aliceKeyPair.publicKey,
          receiverPublicKey: bobKeyPair.publicKey,
          hashlock: secretHash,
          locktime: timelock,
          network: bitcoin.networks.testnet, // Use testnet for development
          useSegwit: true
        };

        const htlcOutput = this.createBitcoinHTLCScript(htlcConfig);
        bitcoinAddress = htlcOutput.address;
        bitcoinScript = htlcOutput.redeemScript;

        console.log('✅ Bitcoin HTLC created:', {
          address: bitcoinAddress,
          scriptLength: bitcoinScript.length,
          timelock: new Date(timelock * 1000).toISOString()
        });
      }

      // Step 4: Create integrated HTLC record
      const htlc: IntegratedHTLC = {
        id: ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'uint256'],
          [secretHash.toString('hex'), Date.now()]
        )),
        secret: secret.secret,
        secretHash: secretHash,
        timelock,
        bitcoinAddress,
        bitcoinScript,
        ethereumEscrowAddress: '', // Will be set when Ethereum escrow is created
        fusionOrderId,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: timelock * 1000
      };

      // Store HTLC
      this.htlcStorage.set(htlc.id, htlc);

      console.log('✅ Integrated HTLC created:', {
        id: htlc.id,
        bitcoinAddress,
        fusionOrderId,
        status: htlc.status
      });

      return {
        htlc,
        bitcoinTxid: undefined,
        ethereumTxHash: undefined,
        fusionOrderId
      };
    } catch (error) {
      console.error('❌ Failed to create cross-chain swap:', error);
      throw new IntegratedBridgeError(
        `Failed to create cross-chain swap: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Create 1inch Fusion+ order
   */
  private async createFusionOrder(quote: BridgeQuote, secretHash: string): Promise<string> {
    try {
      console.log('🚀 Creating 1inch Fusion+ order with secret hash:', secretHash);

      // Real 1inch Fusion+ order creation
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order`,
        {
          method: 'POST',
          body: JSON.stringify({
            quoteId: quote.quoteId,
            walletAddress: quote.fromToken.address,
            secretHash: secretHash,
            secretHashes: [secretHash],
            fee: { 
              takingFeeBps: 100, 
              takingFeeReceiver: '0x0000000000000000000000000000000000000000' 
            }
          })
        }
      );

      const data = await response.json();
      console.log('✅ 1inch Fusion+ order created:', data);

      if (!data.orderHash) {
        throw new Error('No order hash returned from 1inch Fusion+');
      }

      return data.orderHash;
    } catch (error) {
      console.error('❌ Failed to create 1inch Fusion+ order:', error);
      throw new IntegratedBridgeError(
        `Failed to create 1inch Fusion+ order: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Fund Bitcoin HTLC with actual Bitcoin transaction
   */
  async fundBitcoinHTLC(
    htlcId: string,
    amount: number,
    privateKeyHex: string,
    feeRate: number = 10
  ): Promise<{ txid: string; hex: string }> {
    try {
      const htlc = this.htlcStorage.get(htlcId);
      if (!htlc) {
        throw new Error('HTLC not found');
      }

      // Get UTXOs for the private key
      const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, 'hex'));
      const address = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.testnet
      }).address!;

      const utxos = await this.bitcoinService.getUTXOs(address);
      if (utxos.length === 0) {
        throw new Error('No UTXOs available for funding');
      }

      // Create funding transaction
      const { psbt, estimatedFee } = await this.bitcoinService.createHTLCTransaction(
        utxos,
        htlc.bitcoinAddress,
        address, // change address
        amount,
        feeRate
      );

      // Sign and broadcast
      psbt.signAllInputs(keyPair);
      psbt.finalizeAllInputs();

      const txHex = psbt.extractTransaction().toHex();
      const result = await this.bitcoinService.broadcastTransaction(txHex);

      if (result.success) {
        htlc.status = 'funded';
        this.htlcStorage.set(htlcId, htlc);

        console.log('✅ Bitcoin HTLC funded:', {
          txid: result.txid,
          amount,
          fee: estimatedFee
        });

        return { txid: result.txid, hex: txHex };
      } else {
        throw new Error(`Failed to broadcast transaction: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Failed to fund Bitcoin HTLC:', error);
      throw new IntegratedBridgeError(
        `Failed to fund Bitcoin HTLC: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Claim Bitcoin HTLC using secret
   */
  async claimBitcoinHTLC(
    htlcId: string,
    destinationAddress: string,
    privateKeyHex: string,
    feeRate: number = 10
  ): Promise<{ txid: string; hex: string }> {
    try {
      const htlc = this.htlcStorage.get(htlcId);
      if (!htlc) {
        throw new Error('HTLC not found');
      }

      if (htlc.status !== 'funded') {
        throw new Error('HTLC not funded');
      }

      // Get the funding transaction
      const fundingTx = await this.bitcoinService.getTransaction(htlc.bitcoinAddress);
      if (!fundingTx) {
        throw new Error('Funding transaction not found');
      }

      // Create claim transaction
      const result = await this.bitcoinService.buildAndBroadcastClaimTransaction(
        fundingTx.txid,
        0, // vout
        fundingTx.outputs[0].value,
        htlc.bitcoinScript,
        htlc.secret,
        Buffer.from(privateKeyHex, 'hex'),
        destinationAddress,
        htlc.timelock,
        feeRate
      );

      htlc.status = 'claimed';
      this.htlcStorage.set(htlcId, htlc);

      console.log('✅ Bitcoin HTLC claimed:', {
        txid: result.txid,
        secret: htlc.secret.toString('hex')
      });

      return { txid: result.txid, hex: result.hex };
    } catch (error) {
      console.error('❌ Failed to claim Bitcoin HTLC:', error);
      throw new IntegratedBridgeError(
        `Failed to claim Bitcoin HTLC: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Refund Bitcoin HTLC if expired
   */
  async refundBitcoinHTLC(
    htlcId: string,
    destinationAddress: string,
    privateKeyHex: string,
    feeRate: number = 10
  ): Promise<{ txid: string; hex: string }> {
    try {
      const htlc = this.htlcStorage.get(htlcId);
      if (!htlc) {
        throw new Error('HTLC not found');
      }

      if (Date.now() < htlc.expiresAt) {
        throw new Error('HTLC not expired yet');
      }

      // Get the funding transaction
      const fundingTx = await this.bitcoinService.getTransaction(htlc.bitcoinAddress);
      if (!fundingTx) {
        throw new Error('Funding transaction not found');
      }

      // Create refund transaction
      const result = await this.bitcoinService.buildAndBroadcastRefundTransaction(
        fundingTx.txid,
        0, // vout
        fundingTx.outputs[0].value,
        htlc.bitcoinScript,
        Buffer.from(privateKeyHex, 'hex'),
        destinationAddress,
        htlc.timelock,
        feeRate
      );

      htlc.status = 'refunded';
      this.htlcStorage.set(htlcId, htlc);

      console.log('✅ Bitcoin HTLC refunded:', {
        txid: result.txid
      });

      return { txid: result.txid, hex: result.hex };
    } catch (error) {
      console.error('❌ Failed to refund Bitcoin HTLC:', error);
      throw new IntegratedBridgeError(
        `Failed to refund Bitcoin HTLC: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Get active orders from 1inch Fusion+
   */
  async getActiveOrders(srcChain?: number, dstChain?: number, page: number = 1, limit: number = 100): Promise<any[]> {
    try {
      console.log('🔍 Getting active orders from 1inch Fusion+');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (srcChain) params.append('srcChain', srcChain.toString());
      if (dstChain) params.append('dstChain', dstChain.toString());
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/active?${params.toString()}`,
        { method: 'GET' }
      );

      const data = await response.json();
      console.log('✅ Active orders received:', data.orders?.length || 0);
      return data.orders || [];
    } catch (error) {
      console.error('❌ Failed to get active orders from 1inch Fusion+:', error);
      throw new IntegratedBridgeError(
        `Failed to get active orders from 1inch Fusion+: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Get orders by maker from 1inch Fusion+
   */
  async getOrdersByMaker(makerAddress: string, page: number = 1, limit: number = 100): Promise<any[]> {
    try {
      console.log('🔍 Getting orders by maker from 1inch Fusion+:', makerAddress);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/maker/${makerAddress}?${params.toString()}`,
        { method: 'GET' }
      );

      const data = await response.json();
      console.log('✅ Orders by maker received:', data.orders?.length || 0);
      return data.orders || [];
    } catch (error) {
      console.error('❌ Failed to get orders by maker from 1inch Fusion+:', error);
      throw new IntegratedBridgeError(
        `Failed to get orders by maker from 1inch Fusion+: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Submit order to 1inch Fusion+ relayer
   */
  async submitOrderToRelayer(orderData: {
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
  }): Promise<{ txHash?: string; orderHash?: string }> {
    try {
      console.log('🚀 Submitting order to 1inch Fusion+ relayer:', orderData.quoteId);
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/relayer/v1.0/submit`,
        {
          method: 'POST',
          body: JSON.stringify(orderData)
        }
      );

      const data = await response.json();
      console.log('✅ Order submitted to 1inch Fusion+ relayer:', data);
      return { 
        txHash: data.txHash,
        orderHash: data.orderHash 
      };
    } catch (error) {
      console.error('❌ Failed to submit order to 1inch Fusion+ relayer:', error);
      throw new IntegratedBridgeError(
        `Failed to submit order to 1inch Fusion+ relayer: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Submit secret to 1inch Fusion+ relayer for HTLC execution
   */
  async submitSecretToRelayer(orderHash: string, secret: string): Promise<{ txHash: string }> {
    try {
      console.log('🔓 Submitting secret to 1inch Fusion+ relayer for order:', orderHash);
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/relayer/v1.0/submit/secret`,
        {
          method: 'POST',
          body: JSON.stringify({
            secret: secret,
            orderHash: orderHash
          })
        }
      );

      const data = await response.json();
      console.log('✅ Secret submitted to 1inch Fusion+ relayer:', data);
      return { txHash: data.txHash };
    } catch (error) {
      console.error('❌ Failed to submit secret to 1inch Fusion+ relayer:', error);
      throw new IntegratedBridgeError(
        `Failed to submit secret to 1inch Fusion+ relayer: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Submit secret using confirmed 1inch Fusion+ endpoints
   */
  async submitSecretSimple(orderHash: string, secret: string): Promise<{
    success: boolean;
    txHash?: string;
    status: string;
    details: any;
  }> {
    try {
      console.log('🚀 Submitting secret for order:', orderHash);

      // Step 1: Check current order status
      console.log('📋 Step 1: Checking current order status...');
      const orderStatus = await this.getOrderStatus(orderHash);
      console.log('✅ Current order status:', orderStatus.status);

      // Step 2: Submit secret to relayer
      console.log('📋 Step 2: Submitting secret to relayer...');
      const submitResult = await this.submitSecretToRelayer(orderHash, secret);
      
      console.log('✅ Secret submitted successfully:', submitResult.txHash);

      // Step 3: Verify submission by checking order status again
      console.log('📋 Step 3: Verifying submission...');
      const updatedOrderStatus = await this.getOrderStatus(orderHash);
      
      console.log('✅ Updated order status:', updatedOrderStatus.status);

      return {
        success: true,
        txHash: submitResult.txHash,
        status: 'secret_submitted_successfully',
        details: {
          previousStatus: orderStatus.status,
          currentStatus: updatedOrderStatus.status,
          submittedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Secret submission failed:', error);
      throw new IntegratedBridgeError(
        `Secret submission failed: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Submit order to 1inch Fusion+ (legacy method for backward compatibility)
   */
  async submitOrder(orderHash: string, chainId: number): Promise<{ txHash?: string }> {
    try {
      console.log('🚀 Submitting order to 1inch Fusion+ (legacy):', orderHash);
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            orderHash,
            chainId
          })
        }
      );

      const data = await response.json();
      console.log('✅ Order submitted to 1inch Fusion+ (legacy):', data);
      return { txHash: data.txHash };
    } catch (error) {
      console.error('❌ Failed to submit order to 1inch Fusion+ (legacy):', error);
      throw new IntegratedBridgeError(
        `Failed to submit order to 1inch Fusion+ (legacy): ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Submit secret to 1inch Fusion+ (legacy method for backward compatibility)
   */
  async submitSecret(orderHash: string, secret: string, chainId: number): Promise<{ txHash: string }> {
    try {
      console.log('🔓 Submitting secret to 1inch Fusion+ (legacy):', orderHash);
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/submit-secret`,
        {
          method: 'POST',
          body: JSON.stringify({
            orderHash,
            secret,
            chainId
          })
        }
      );

      const data = await response.json();
      console.log('✅ Secret submitted to 1inch Fusion+ (legacy):', data);
      return { txHash: data.txHash };
    } catch (error) {
      console.error('❌ Failed to submit secret to 1inch Fusion+ (legacy):', error);
      throw new IntegratedBridgeError(
        `Failed to submit secret to 1inch Fusion+ (legacy): ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Get escrow factory address for a chain
   */
  async getEscrowFactoryAddress(chainId: number): Promise<string> {
    try {
      console.log('🔍 Getting escrow factory address for chain:', chainId);
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/escrow?chainId=${chainId}`,
        { method: 'GET' }
      );

      const data = await response.json();
      console.log('✅ Escrow factory address received:', data.address);
      return data.address;
    } catch (error) {
      console.error('❌ Failed to get escrow factory address:', error);
      throw new IntegratedBridgeError(
        `Failed to get escrow factory address: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Get order secrets for withdrawal and cancellation
   */
  async getOrderSecrets(orderHash: string): Promise<any> {
    try {
      console.log('🔍 Getting order secrets for order:', orderHash);
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/secrets/${orderHash}`,
        { method: 'GET' }
      );

      const data = await response.json();
      console.log('✅ Order secrets received for withdrawal and cancellation');
      return data;
    } catch (error) {
      console.error('❌ Failed to get order secrets from 1inch Fusion+:', error);
      throw new IntegratedBridgeError(
        `Failed to get order secrets from 1inch Fusion+: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Get order status by hash
   */
  async getOrderStatus(orderHash: string): Promise<any> {
    try {
      console.log('🔍 Getting order status for order:', orderHash);
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/status/${orderHash}`,
        { method: 'GET' }
      );

      const data = await response.json();
      console.log('✅ Order status received:', data.status || 'unknown');
      return data;
    } catch (error) {
      console.error('❌ Failed to get order status from 1inch Fusion+:', error);
      throw new IntegratedBridgeError(
        `Failed to get order status from 1inch Fusion+: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }



  /**
   * Get multiple order statuses by hashes
   */
  async getOrderStatuses(orderHashes: string[]): Promise<any[]> {
    try {
      console.log('🔍 Getting order statuses for multiple orders:', orderHashes.length);
      
      const response = await fetchWithRetry(
        `${FUSION_PLUS_CONFIG.baseUrl}/orders/v1.0/order/status`,
        {
          method: 'POST',
          body: JSON.stringify({
            orderHashes: orderHashes
          })
        }
      );

      const data = await response.json();
      console.log('✅ Order statuses received for', data.orders?.length || 0, 'orders');
      return data.orders || [];
    } catch (error) {
      console.error('❌ Failed to get order statuses from 1inch Fusion+:', error);
      throw new IntegratedBridgeError(
        `Failed to get order statuses from 1inch Fusion+: ${error}`,
        BridgeErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Monitor HTLC status
   */
  async monitorHTLC(htlcId: string): Promise<IntegratedHTLC | null> {
    return this.htlcStorage.get(htlcId) || null;
  }

  /**
   * Get all HTLCs
   */
  async getAllHTLCs(): Promise<IntegratedHTLC[]> {
    return Array.from(this.htlcStorage.values());
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

  /**
   * Generate Bitcoin key pair for testing
   */
  generateBitcoinKeyPair(): { privateKey: string; publicKey: string; address: string } {
    const keyPair = ECPair.makeRandom();
    const address = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.testnet
    }).address!;

    return {
      privateKey: keyPair.privateKey!.toString('hex'),
      publicKey: keyPair.publicKey.toString('hex'),
      address
    };
  }
}

// Export singleton instance
export const integratedBridgeService = IntegratedBridgeService.getInstance(); 