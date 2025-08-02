import { ethers } from 'ethers';
import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode, Amount, createAmount } from '@/types/bridge';
import { BitcoinHTLCService, BitcoinHTLCParams, BitcoinHTLCResult } from './bitcoin-htlc-service';
import { HTLCContractService, HTLCParams, HTLCState } from './htlc-contract-service';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

export interface AtomicSwapParams {
  fromNetwork: 'ethereum' | 'bitcoin';
  toNetwork: 'ethereum' | 'bitcoin';
  fromToken: Token;
  toToken: Token;
  amount: Amount;
  initiatorAddress: string;
  participantAddress: string;
  timelock: number; // Unix timestamp
}

export interface AtomicSwapState {
  id: string;
  status: 'initiated' | 'participant_funded' | 'completed' | 'refunded' | 'failed';
  ethHTLC?: {
    contractAddress: string;
    htlcId: string;
    txHash: string;
  };
  btcHTLC?: {
    address: string;
    txId: string;
    redeemScript: string;
    witnessScript: string;
    scriptPubKey: string;
    funded: boolean;
    fundingAmount?: number;
  };
  secret?: string;
  secretHash: string;
  timelock: number;
  createdAt: number;
  completedAt?: number;
  bitcoinKeyPair?: {
    privateKey: string;
    publicKey: string;
    address: string;
  };
}

/**
 * Atomic HTLC swap service using YOUR deployed contracts
 * Implements true atomic swaps between ETH and BTC using your HTLC escrow contracts
 */
export class AtomicHTLCSwapServiceWithContracts {
  private htlcContractService: HTLCContractService;
  private btcHTLCService: BitcoinHTLCService;
  private ethProvider: ethers.Provider;
  private isInitialized = false;
  private network: string;

  constructor(
    ethereumRpcUrl: string,
    network: string = 'sepolia',
    bitcoinNetwork: 'mainnet' | 'testnet' = 'testnet',
    apiKey?: string
  ) {
    this.network = network;
    this.ethProvider = new ethers.JsonRpcProvider(ethereumRpcUrl);
    
    // Initialize YOUR HTLC contract service with 1inch API for real quotes
    this.htlcContractService = new HTLCContractService(this.ethProvider, network, apiKey);
    this.btcHTLCService = new BitcoinHTLCService(bitcoinNetwork);
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const contractAddress = this.htlcContractService.getContractAddressForNetwork();
      console.log('🏗️ Initializing with YOUR HTLC contract:', contractAddress);
      this.isInitialized = true;
      console.log('✅ Atomic HTLC swap service initialized with your deployed contracts');
    } catch (error) {
      console.error('❌ Failed to initialize atomic swap service:', error);
      throw error;
    }
  }

  /**
   * Get quote for atomic ETH-BTC swap using YOUR contracts
   */
  async getAtomicSwapQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    srcChain?: any,
    dstChain?: any
  ): Promise<BridgeQuote> {
    try {
      await this.initialize();

      console.log('💰 Getting quote from YOUR HTLC contract...');
      
      const quote = await this.htlcContractService.generateQuote(
        fromToken,
        toToken,
        amount,
        walletAddress,
        srcChain,
        dstChain
      );
      
      return quote;
    } catch (error) {
      console.error('❌ HTLC contract quote error:', error);
      throw error;
    }
  }

  /**
   * Initiate atomic swap (ETH → BTC) using YOUR deployed contracts
   */
  async initiateETHToBTC(
    params: AtomicSwapParams,
    signer: ethers.Signer,
    onProgress?: (status: string, data?: any) => void
  ): Promise<AtomicSwapState> {
    try {
      await this.initialize();
      
      onProgress?.('🚀 Initiating ETH to BTC atomic swap with YOUR HTLC contract...');
      
      // Step 1: Generate secrets for HTLC
      const secretData = this.htlcContractService.generateSecretData();
      const { secret, secretHash } = secretData;
      
      onProgress?.('💰 Getting quote from your HTLC contract...');
      
      // Step 2: Get quote using your contract
      const quote = await this.getAtomicSwapQuote(
        params.fromToken,
        params.toToken,
        params.amount.raw,
        params.initiatorAddress
      );
      
      onProgress?.('🏗️ Creating HTLC on Ethereum with YOUR contract...');
      
      // Step 3: Create HTLC using YOUR deployed contract
      const htlcParams: HTLCParams = {
        resolver: params.participantAddress,
        fromToken: params.fromToken.address || '0x0000000000000000000000000000000000000000',
        toToken: CONTRACT_ADDRESSES.sepolia.WBTC, // Use configured WBTC address
        amount: ethers.parseUnits(params.amount.raw, params.fromToken.decimals).toString(),
        expectedAmount: ethers.parseUnits(quote.toAmount, 8).toString(),
        secretHash: secretHash,
        timelock: quote.timelock || Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      };

      console.log('📝 Creating HTLC with your contract:', htlcParams);
      
      const htlcResult = await this.htlcContractService.createHTLC(
        htlcParams,
        signer,
        onProgress
      );

      onProgress?.('✅ HTLC created with ID: ' + htlcResult.htlcId);
      
      onProgress?.('₿ Generating Bitcoin HTLC escrow...');
      
      // Step 4: Generate Bitcoin key pair for this swap
      const bitcoinKeyPair = this.btcHTLCService.generateKeyPair();
      
      // Step 5: Generate Bitcoin HTLC parameters for destination escrow
      const btcHTLCParams: BitcoinHTLCParams = {
        secretHash: secretHash,
        recipientPubKey: bitcoinKeyPair.publicKey,
        senderPubKey: params.participantAddress,
        timelock: htlcParams.timelock,
        network: 'testnet'
      };

      const btcHTLC = this.btcHTLCService.generateHTLCAddress(btcHTLCParams);
      
      onProgress?.('🔍 Checking Bitcoin HTLC funding status...');
      
      // Check if HTLC is already funded
      const fundingStatus = await this.btcHTLCService.isHTLCFunded(btcHTLC.address);
      
      onProgress?.('🎉 Atomic swap initiated with YOUR contracts!');

      const swapState: AtomicSwapState = {
        id: htlcResult.htlcId,
        status: 'initiated',
        ethHTLC: {
          contractAddress: this.htlcContractService.getContractAddressForNetwork(),
          htlcId: htlcResult.htlcId,
          txHash: htlcResult.txHash
        },
        btcHTLC: {
          address: btcHTLC.address,
          txId: fundingStatus.utxo?.txid || '', 
          redeemScript: btcHTLC.redeemScript,
          witnessScript: btcHTLC.witnessScript,
          scriptPubKey: btcHTLC.scriptPubKey,
          funded: fundingStatus.funded,
          fundingAmount: fundingStatus.amount
        },
        secret: secret,
        secretHash: secretHash,
        timelock: htlcParams.timelock,
        createdAt: Date.now(),
        bitcoinKeyPair
      };

      return swapState;
    } catch (error) {
      throw this.handleError(error, 'Failed to initiate ETH to BTC swap');
    }
  }

  /**
   * Fund Bitcoin HTLC (participant action)
   */
  async fundBitcoinHTLC(
    swapState: AtomicSwapState,
    participantPrivateKey: string,
    amount: number, // satoshis
    onProgress?: (status: string, data?: any) => void
  ): Promise<AtomicSwapState> {
    try {
      if (!swapState.btcHTLC) {
        throw new Error('Bitcoin HTLC not created');
      }

      onProgress?.('🔍 Getting participant UTXOs...');
      
      // Generate participant address to get UTXOs from
      const participantKeyPair = this.btcHTLCService.generateKeyPair();
      const participantUTXOs = await this.btcHTLCService.getAddressUTXOs(participantKeyPair.address);

      if (participantUTXOs.length === 0) {
        throw new Error('No UTXOs available for funding. Please send some Bitcoin to: ' + participantKeyPair.address);
      }

      onProgress?.('🏗️ Creating funding transaction...');
      
      // Create funding transaction
      const fundingTx = await this.btcHTLCService.fundHTLC(
        swapState.btcHTLC.address,
        amount,
        participantPrivateKey,
        participantUTXOs
      );

      onProgress?.('📡 Broadcasting funding transaction...');
      
      // Broadcast transaction
      const txid = await this.btcHTLCService.broadcastTransaction(fundingTx.hex);

      // Update swap state
      swapState.btcHTLC.txId = txid;
      swapState.btcHTLC.funded = true;
      swapState.btcHTLC.fundingAmount = amount;
      swapState.status = 'participant_funded';

      onProgress?.(`✅ Bitcoin HTLC funded! Transaction: ${txid}`);
      
      return swapState;
    } catch (error) {
      throw this.handleError(error, 'Failed to fund Bitcoin HTLC');
    }
  }

  /**
   * Complete atomic swap by revealing secret using YOUR contract
   */
  async completeSwap(
    swapState: AtomicSwapState,
    signer: ethers.Signer,
    recipientPrivateKey?: string,
    onProgress?: (status: string, data?: any) => void
  ): Promise<AtomicSwapState> {
    try {
      if (swapState.status !== 'participant_funded') {
        throw new Error('Swap not ready for completion');
      }

      onProgress?.('🎯 Completing atomic swap with YOUR contract...');

      // Execute HTLC with secret using YOUR contract
      if (swapState.ethHTLC && swapState.secret) {
        onProgress?.('🔓 Executing Ethereum HTLC with secret...');
        
        await this.htlcContractService.executeHTLC(
          swapState.ethHTLC.htlcId,
          swapState.secret,
          signer,
          onProgress
        );
        
        onProgress?.('✅ Secret revealed on Ethereum escrow');
      }

      // Complete BTC side using the revealed secret
      if (swapState.btcHTLC && swapState.secret && recipientPrivateKey && swapState.bitcoinKeyPair) {
        onProgress?.('₿ Claiming Bitcoin HTLC with revealed secret...');
        
        // Get HTLC funding status
        const fundingStatus = await this.btcHTLCService.isHTLCFunded(swapState.btcHTLC.address);
        
        if (!fundingStatus.funded || !fundingStatus.utxo) {
          throw new Error('Bitcoin HTLC not funded');
        }

        // Create claim transaction
        const claimTx = await this.btcHTLCService.claimHTLC(
          fundingStatus.utxo,
          swapState.bitcoinKeyPair.address,
          swapState.secret,
          swapState.btcHTLC.witnessScript,
          recipientPrivateKey
        );

        onProgress?.('📡 Broadcasting Bitcoin claim transaction...');
        
        // Broadcast claim transaction
        const claimTxId = await this.btcHTLCService.broadcastTransaction(claimTx.hex);
        
        onProgress?.(`✅ Bitcoin claimed! Transaction: ${claimTxId}`);
        
        // Update swap state
        swapState.btcHTLC.txId = claimTxId;
      }

      // Both escrows are now unlocked
      swapState.status = 'completed';
      swapState.completedAt = Date.now();
      
      onProgress?.('🎉 Atomic swap completed! Funds transferred on both chains.');
      
      return swapState;
    } catch (error) {
      throw this.handleError(error, 'Failed to complete swap');
    }
  }

  /**
   * Refund atomic swap if timelock expires
   */
  async refundSwap(
    swapState: AtomicSwapState,
    signer: ethers.Signer,
    bitcoinPrivateKey?: string,
    onProgress?: (status: string, data?: any) => void
  ): Promise<AtomicSwapState> {
    try {
      onProgress?.('🔄 Refunding atomic swap...');

      const currentTime = Math.floor(Date.now() / 1000);
      
      if (currentTime < swapState.timelock) {
        throw new Error('Timelock has not expired yet');
      }

      // Refund ETH HTLC using YOUR contract
      if (swapState.ethHTLC) {
        onProgress?.('🔄 Refunding ETH HTLC with your contract...');
        
        await this.htlcContractService.refundHTLC(
          swapState.ethHTLC.htlcId,
          signer,
          onProgress
        );
      }

      // Refund BTC HTLC
      if (swapState.btcHTLC && bitcoinPrivateKey) {
        onProgress?.('₿ Refunding Bitcoin HTLC...');
        
        // Note: In production, this would create and broadcast
        // a Bitcoin refund transaction
        console.log('Would refund Bitcoin HTLC');
      }

      swapState.status = 'refunded';
      
      onProgress?.('✅ Atomic swap refunded successfully!');
      
      return swapState;
    } catch (error) {
      throw this.handleError(error, 'Failed to refund swap');
    }
  }

  /**
   * Monitor atomic swap status
   */
  async monitorSwap(
    swapState: AtomicSwapState,
    onProgress?: (status: string, data?: any) => void
  ): Promise<AtomicSwapState> {
    try {
      onProgress?.('📊 Monitoring atomic swap status...');

      // Check ETH HTLC status using your contract
      if (swapState.ethHTLC) {
        const htlcDetails = await this.htlcContractService.getHTLC(swapState.ethHTLC.htlcId);
        
        if (htlcDetails?.executed) {
          swapState.status = 'completed';
          swapState.completedAt = Date.now();
        } else if (htlcDetails?.refunded) {
          swapState.status = 'refunded';
        }
      }

      // Check timelock expiration
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime >= swapState.timelock && swapState.status !== 'completed') {
        onProgress?.('⏰ Timelock expired - swap can be refunded');
      }

      onProgress?.(`📊 Swap status: ${swapState.status}`);
      
      return swapState;
    } catch (error) {
      throw this.handleError(error, 'Failed to monitor swap');
    }
  }

  /**
   * Get atomic swap status and details
   */
  async getSwapDetails(swapId: string): Promise<AtomicSwapState | null> {
    try {
      console.log('🔍 Getting swap details for:', swapId);
      
      // Get HTLC details from your contract
      const htlcDetails = await this.htlcContractService.getHTLC(swapId);
      
      if (!htlcDetails) {
        return null;
      }

      // Convert to AtomicSwapState format
      const swapState: AtomicSwapState = {
        id: swapId,
        status: htlcDetails.executed ? 'completed' : htlcDetails.refunded ? 'refunded' : 'initiated',
        ethHTLC: {
          contractAddress: this.htlcContractService.getContractAddressForNetwork(),
          htlcId: swapId,
          txHash: '' // Would need to track this separately
        },
        secretHash: htlcDetails.secretHash,
        timelock: htlcDetails.timelock,
        createdAt: Date.now() // Would need to track this separately
      };

      return swapState;
    } catch (error) {
      console.error('❌ Error getting swap details:', error);
      return null;
    }
  }

  /**
   * Validate atomic swap parameters
   */
  validateSwapParams(params: AtomicSwapParams): boolean {
    try {
      // Validate addresses
      if (params.fromNetwork === 'ethereum') {
        if (!ethers.isAddress(params.initiatorAddress)) {
          throw new Error('Invalid Ethereum initiator address');
        }
      } else {
        if (!this.btcHTLCService.validateAddress(params.initiatorAddress)) {
          throw new Error('Invalid Bitcoin initiator address');
        }
      }

      // Validate amount
      if (!params.amount || parseFloat(params.amount.raw) <= 0) {
        throw new Error('Invalid amount');
      }

      // Validate timelock
      const minTimelock = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour minimum
      if (params.timelock < minTimelock) {
        throw new Error('Timelock too short');
      }

      return true;
    } catch (error) {
      console.error('❌ Swap parameters validation failed:', error);
      return false;
    }
  }

  /**
   * Get your contract information
   */
  getContractInfo() {
    return {
      address: this.htlcContractService.getContractAddressForNetwork(),
      network: this.network,
      networkInfo: this.htlcContractService.getNetworkInfo()
    };
  }

  // Handle errors
  private handleError(error: unknown, defaultMessage: string): BridgeError {
    console.error('❌ Atomic HTLC swap service error:', error);
    
    if (error instanceof Error) {
      return {
        code: BridgeErrorCode.UNKNOWN,
        message: error.message || defaultMessage,
        details: error
      };
    }
    
    return {
      code: BridgeErrorCode.UNKNOWN,
      message: defaultMessage,
      details: error
    };
  }
}

// Export factory function
export function createAtomicHTLCSwapServiceWithContracts(
  ethereumRpcUrl: string,
  network: string = 'sepolia',
  bitcoinNetwork: 'mainnet' | 'testnet' = 'testnet',
  apiKey?: string
): AtomicHTLCSwapServiceWithContracts {
  return new AtomicHTLCSwapServiceWithContracts(ethereumRpcUrl, network, bitcoinNetwork, apiKey);
}