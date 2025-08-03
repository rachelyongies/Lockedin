import axios from 'axios';
import { ethers } from 'ethers';
import { createBitcoinHTLCService, BitcoinUTXO } from './bitcoin-htlc-service';
import { AtomicSwapState } from './atomic-htlc-eth-btc-with-contracts';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';

export interface ResolverConfig {
  ethereumRpcUrl: string;
  bitcoinNetwork: 'mainnet' | 'testnet';
  oneInchApiKey: string;
  resolverPrivateKey: string; // Bitcoin private key for funding
  fundingAmount: number; // Amount in satoshis to fund
  // Token addresses for 1inch relayer
  ethTokenAddress?: string; // Default: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  wbtcTokenAddress?: string; // Default: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
  chainId?: number; // Default: 11155111 (Sepolia)
}

export interface ResolverOrder {
  salt: string;
  makerAsset: string;
  takerAsset: string;
  maker: string;
  receiver: string;
  makingAmount: string;
  takingAmount: string;
  makerTraits: string;
}

export class HTLCResolverService {
  private config: ResolverConfig;
  private bitcoinService: ReturnType<typeof createBitcoinHTLCService>;
  private ethereumProvider: ethers.Provider;
  private isRunning: boolean = false;
  private activeSwaps: Map<string, AtomicSwapState> = new Map();

  constructor(config: ResolverConfig) {
    this.config = config;
    this.bitcoinService = createBitcoinHTLCService(config.bitcoinNetwork);
    this.ethereumProvider = new ethers.JsonRpcProvider(config.ethereumRpcUrl);
  }

  /**
   * Start the resolver service
   */
  async startResolver() {
    if (this.isRunning) {
      console.log('Resolver already running');
      return;
    }

    console.log('🚀 Starting HTLC resolver service...');
    this.isRunning = true;

    // Start monitoring loop
    this.monitorEthereumHTLCs();
  }

  /**
   * Stop the resolver service
   */
  stopResolver() {
    console.log('🛑 Stopping HTLC resolver service...');
    this.isRunning = false;
  }

  /**
   * Monitor Ethereum HTLCs and auto-fund Bitcoin HTLCs
   */
  private async monitorEthereumHTLCs() {
    while (this.isRunning) {
      try {
        await this.checkForNewHTLCs();
        await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds
      } catch (error) {
        console.error('Error in resolver monitoring loop:', error);
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait longer on error
      }
    }
  }

  /**
   * Check for new HTLCs that need funding
   */
  private async checkForNewHTLCs() {
    console.log(`🔍 Resolver checking for swaps to fund...`);
    console.log(`📊 Total registered swaps: ${this.activeSwaps.size}`);
    
    // Only work with real swaps that have been registered
    for (const [swapId, swapState] of this.activeSwaps) {
      console.log(`🔍 Checking swap ${swapId}:`);
      console.log(`   Status: ${swapState.status}`);
      console.log(`   BTC HTLC funded: ${swapState.btcHTLC?.funded}`);
      console.log(`   BTC HTLC address: ${swapState.btcHTLC?.address}`);
      
      // Only process swaps that are initiated and not yet funded
      if (swapState.status === 'initiated' && !swapState.btcHTLC?.funded) {
        console.log(`✅ Found swap ${swapId} ready for funding!`);
        await this.autoFundBitcoinHTLC(swapState);
      } else {
        console.log(`⏭️  Skipping swap ${swapId} - not ready for funding`);
      }
    }
  }

  /**
   * Automatically fund Bitcoin HTLC when Ethereum HTLC is detected
   */
  async autoFundBitcoinHTLC(swapState: AtomicSwapState, mockFunding: boolean = false): Promise<boolean> {
    try {
      console.log(`💰 Auto-funding Bitcoin HTLC for swap ${swapState.id}...`);
      
      if (!swapState.btcHTLC?.address) {
        throw new Error('Bitcoin HTLC address not found');
      }

      // Handle mock funding
      if (mockFunding) {
        console.log(`🎭 Mock funding Bitcoin HTLC for swap ${swapState.id}...`);
        
        // Simulate funding the Bitcoin HTLC
        const mockTxId = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const mockFundingAmount = this.config.fundingAmount || 10000; // Default 10,000 satoshis
        
        // Update the swap state to mark as funded
        swapState.btcHTLC.funded = true;
        swapState.btcHTLC.txId = mockTxId;
        swapState.btcHTLC.fundingAmount = mockFundingAmount;
        swapState.status = 'participant_funded';
        
        // Update in our active swaps map
        this.activeSwaps.set(swapState.id, swapState);
        
        console.log(`✅ Mock funding complete!`);
        console.log(`   TX ID: ${mockTxId}`);
        console.log(`   Amount: ${mockFundingAmount} satoshis`);
        console.log(`   Status: ${swapState.status}`);
        
        return true;
      }

      // Use the actual Bitcoin private key from config
      if (!this.config.resolverPrivateKey) {
        console.log('⚠️ No resolver private key configured. Cannot auto-fund.');
        return false;
      }

      // Convert WIF private key to hex format and derive address first
      console.log(`🔑 Converting WIF private key to hex format...`);
      
      let privateKeyHex = '';
      let resolverAddress = '';
      let utxos: BitcoinUTXO[] = [];
      let finalUtxos: BitcoinUTXO[] = [];
      
      try {
        if (!this.config.resolverPrivateKey) {
          throw new Error('No resolver private key configured in environment variables');
        }
        
        console.log(`📝 Using WIF private key from environment: ${this.config.resolverPrivateKey.slice(0, 10)}...`);
        
        // Convert WIF private key to hex format using ECPairFactory
        const ECPair = ECPairFactory(ecc);
        let keyPair;
        
        try {
          // Try to parse the WIF key directly with the correct network
          const network = this.config.bitcoinNetwork === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
          keyPair = ECPair.fromWIF(this.config.resolverPrivateKey, network);
          privateKeyHex = keyPair.privateKey!.toString('hex');
          console.log(`✅ Successfully converted WIF to hex format`);
        } catch (wifError) {
          console.error('❌ Failed to convert WIF private key:', wifError);
          throw new Error('WIF private key conversion failed. Please check your NEXT_PUBLIC_RESOLVER_BITCOIN_PRIVATE_KEY environment variable contains a valid WIF private key.');
        }
        
        console.log(`📝 Extracted private key length: ${keyPair.privateKey!.length} bytes`);
        console.log(`📝 Is compressed: ${keyPair.compressed}`);
        
        // Derive the resolver address from the private key
        const network = this.config.bitcoinNetwork === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
        
        // Try P2WPKH (SegWit) first
        const p2wpkhAddress = bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(keyPair.publicKey),
          network: network
        }).address!;
        
        // Also try P2PKH (Legacy) as backup
        const p2pkhAddress = bitcoin.payments.p2pkh({
          pubkey: Buffer.from(keyPair.publicKey),
          network: network
        }).address!;
        
        console.log(`📍 P2WPKH (SegWit) address: ${p2wpkhAddress}`);
        console.log(`📍 P2PKH (Legacy) address: ${p2pkhAddress}`);
        
        // Use SegWit address for now
        resolverAddress = p2wpkhAddress;
        
        console.log(`✅ Successfully converted WIF to hex format`);
        console.log(`📍 Derived resolver address: ${resolverAddress}`);
        
        // Get UTXOs for funding from the resolver address
        let utxos = await this.bitcoinService.getAddressUTXOs(resolverAddress);
        
        // If no UTXOs in SegWit address, try legacy address
        if (utxos.length === 0) {
          const p2pkhAddress = bitcoin.payments.p2pkh({
            pubkey: Buffer.from(keyPair.publicKey),
            network: this.config.bitcoinNetwork === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet
          }).address!;
          
          console.log(`🔍 No UTXOs in SegWit address, trying legacy address: ${p2pkhAddress}`);
          utxos = await this.bitcoinService.getAddressUTXOs(p2pkhAddress);
          
          if (utxos.length > 0) {
            console.log(`✅ Found ${utxos.length} UTXOs in legacy address`);
            resolverAddress = p2pkhAddress; // Use legacy address for UTXOs
          }
        }
        
        if (utxos.length === 0) {
          console.log('⚠️ No UTXOs available for auto-funding. Resolver needs Bitcoin.');
          return false;
        }

        // Debug UTXO types and filter out invalid ones
        console.log(`🔍 Found ${utxos.length} UTXOs for funding:`);
        const validUtxos = utxos.filter((utxo, index) => {
          if (!utxo.scriptPubKey || utxo.scriptPubKey.length === 0) {
            console.log(`  ❌ UTXO ${index}: ${utxo.value} sats - INVALID (no scriptPubKey)`);
            return false;
          }
          
          const scriptBuffer = Buffer.from(utxo.scriptPubKey, 'hex');
          if (scriptBuffer.length === 0) {
            console.log(`  ❌ UTXO ${index}: ${utxo.value} sats - INVALID (empty script buffer)`);
            return false;
          }
          
          const isSegWit = (scriptBuffer.length === 22 || scriptBuffer.length === 34) && scriptBuffer[0] === 0x00;
          console.log(`  ✅ UTXO ${index}: ${utxo.value} sats, ${isSegWit ? 'SegWit' : 'Legacy'} script (${scriptBuffer.length} bytes)`);
          return true;
        });
        
        // Use only valid UTXOs
        finalUtxos = validUtxos;

        // Calculate total available balance
        const totalBalance = finalUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
        console.log(`💰 Total available balance: ${totalBalance} satoshis`);

        // Check if we have enough funds
        if (totalBalance < this.config.fundingAmount) {
          console.log(`⚠️ Insufficient funds. Need ${this.config.fundingAmount} satoshis, have ${totalBalance} satoshis`);
          return false;
        }
        
      } catch (error) {
        console.error('❌ Failed to convert private key:', error);
        return false;
      }
      
      if (utxos.length === 0) {
        console.log('⚠️ No UTXOs available for auto-funding. Resolver needs Bitcoin.');
        return false;
      }

      // Debug UTXO types
      console.log(`🔍 Found ${utxos.length} UTXOs for funding:`);
      utxos.forEach((utxo, index) => {
        const scriptBuffer = Buffer.from(utxo.scriptPubKey, 'hex');
        const isSegWit = (scriptBuffer.length === 22 || scriptBuffer.length === 34) && scriptBuffer[0] === 0x00;
        console.log(`  UTXO ${index}: ${utxo.value} sats, ${isSegWit ? 'SegWit' : 'Legacy'} script (${scriptBuffer.length} bytes)`);
      });

      // Calculate total available balance
      const totalBalance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
      console.log(`💰 Total available balance: ${totalBalance} satoshis`);

      // Check if we have enough funds
      if (totalBalance < this.config.fundingAmount) {
        console.log(`⚠️ Insufficient funds. Need ${this.config.fundingAmount} satoshis, have ${totalBalance} satoshis`);
        return false;
      }

      
      console.log(`🚀 Creating REAL Bitcoin transaction to fund HTLC...`);
      
              // Fund the Bitcoin HTLC with REAL transaction
        const fundingTx = await this.bitcoinService.fundHTLC(
          swapState.btcHTLC.address,
          this.config.fundingAmount,
          privateKeyHex,
          finalUtxos
        );

      // Broadcast the REAL funding transaction
      console.log(`📡 Broadcasting REAL transaction to Bitcoin testnet...`);
      const txid = await this.bitcoinService.broadcastTransaction(fundingTx.hex);
      
      console.log(`✅ Bitcoin HTLC funded with REAL transaction! TX: ${txid}`);

      // Update swap state with REAL values
      swapState.btcHTLC.txId = txid;
      swapState.btcHTLC.funded = true;
      swapState.btcHTLC.fundingAmount = this.config.fundingAmount;
      swapState.status = 'participant_funded';

      // Submit to 1inch Fusion+ relayer with real transaction data
      // Commented out due to CORS issues in development
      // await this.submitTo1inchRelayer(swapState, txid);

      console.log(`🎉 REAL atomic swap HTLC funding completed!`);
      console.log(`📊 Swap status updated to: ${swapState.status}`);
      console.log(`💰 Bitcoin HTLC funded with: ${this.config.fundingAmount} satoshis (REAL transaction)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to auto-fund Bitcoin HTLC:', error);
      return false;
    }
  }

  /**
   * Submit swap to 1inch Fusion+ relayer for cross-chain coordination
   */
  private async submitTo1inchRelayer(swapState: AtomicSwapState, bitcoinTxId: string) {
    try {
      console.log('🔄 Submitting to 1inch Fusion+ relayer...');
      
      // Use real swap state data for the order with configurable token addresses
      const order: ResolverOrder = {
        salt: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        makerAsset: this.config.ethTokenAddress || "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH from config or default
        takerAsset: this.config.wbtcTokenAddress || "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC from config or default
        maker: swapState.ethHTLC?.contractAddress || ethers.ZeroAddress,
        receiver: swapState.ethHTLC?.contractAddress || ethers.ZeroAddress,
        makingAmount: ethers.parseEther((swapState.btcHTLC?.fundingAmount || 0).toString()).toString(),
        takingAmount: ethers.parseEther((swapState.btcHTLC?.fundingAmount || 0).toString()).toString(),
        makerTraits: "0",
      };

      const body = {
        order,
        srcChainId: this.config.chainId || 11155111, // Chain ID from config or default to Sepolia
        signature: "0x", // Would be generated from resolver's Ethereum key
        extension: "0x",
        quoteId: swapState.id,
        secretHashes: [swapState.secretHash],
        bitcoinTxId, // Add Bitcoin transaction ID for cross-chain verification
      };

      console.log('📤 Submitting order to 1inch relayer:', {
        quoteId: swapState.id,
        makingAmount: order.makingAmount,
        takingAmount: order.takingAmount,
        bitcoinTxId: bitcoinTxId,
        secretHash: swapState.secretHash
      });

      const response = await axios.post(
        'https://api.1inch.dev/fusion-plus/relayer/v1.0/submit',
        body,
        {
          headers: {
            Authorization: `Bearer ${this.config.oneInchApiKey}`,
          },
          params: {},
          paramsSerializer: {
            indexes: null,
          },
        }
      );

      console.log('✅ Successfully submitted to 1inch relayer:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to submit to 1inch relayer:', error);
      throw error;
    }
  }

  /**
   * Register a new swap for monitoring
   */
  registerSwap(swapState: AtomicSwapState) {
    console.log(`📝 Registering swap ${swapState.id} for auto-funding:`);
    console.log(`   Status: ${swapState.status}`);
    console.log(`   BTC HTLC funded: ${swapState.btcHTLC?.funded}`);
    console.log(`   BTC HTLC address: ${swapState.btcHTLC?.address}`);
    
    this.activeSwaps.set(swapState.id, swapState);
    console.log(`✅ Swap ${swapState.id} registered successfully!`);
    console.log(`📊 Total active swaps: ${this.activeSwaps.size}`);
  }

  /**
   * Remove completed or expired swaps
   */
  private cleanupExpiredSwaps() {
    const now = Date.now();
    for (const [swapId, swapState] of this.activeSwaps) {
      // Remove swaps that are completed, failed, or expired
      if (
        swapState.status === 'completed' ||
        swapState.status === 'failed' ||
        swapState.status === 'refunded' ||
        now > swapState.timelock * 1000
      ) {
        this.activeSwaps.delete(swapId);
        console.log(`🧹 Cleaned up swap ${swapId}`);
      }
    }
  }

  /**
   * Get resolver status
   */
  getStatus() {
    let resolverAddress = '';
    
          // Try to derive the resolver address from the private key
      try {
        if (this.config.resolverPrivateKey) {
          // Convert WIF private key to derive resolver address
          try {
            const ECPair = ECPairFactory(ecc);
            const network = this.config.bitcoinNetwork === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
            const keyPair = ECPair.fromWIF(this.config.resolverPrivateKey, network);
            
            resolverAddress = bitcoin.payments.p2wpkh({
              pubkey: Buffer.from(keyPair.publicKey),
              network: network
            }).address!;
          } catch (wifError) {
            console.log('Could not derive resolver address from WIF key:', wifError);
          }
        }
      } catch (error) {
        console.log('Could not derive resolver address:', error);
      }
    
    return {
      isRunning: this.isRunning,
      activeSwaps: this.activeSwaps.size,
      bitcoinNetwork: this.config.bitcoinNetwork,
      fundingAmount: this.config.fundingAmount,
      resolverAddress,
    };
  }

  /**
   * Get active swaps
   */
  getActiveSwaps(): AtomicSwapState[] {
    return Array.from(this.activeSwaps.values());
  }
}

// Factory function
export function createHTLCResolverService(config: ResolverConfig): HTLCResolverService {
  return new HTLCResolverService(config);
} 