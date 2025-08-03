import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, getNetworkConfig } from '@/config/contracts';
import { Token, BridgeQuote, Amount, createAmount } from '@/types/bridge';
import { FusionPlusQuoterService } from './fusion-plus-quoter';
import { CROSS_CHAIN_NETWORKS, NetworkKey, getWBTCAddress, getNativeTokenAddress } from '@/config/cross-chain-tokens';

// Your HTLC1inchEscrow ABI (essential functions)
const HTLC_ABI = [
  "function createHTLC(address resolver, address fromToken, address toToken, uint256 amount, uint256 expectedAmount, bytes32 secretHash, uint256 timelock) external",
  "function executeHTLC(bytes32 htlcId, bytes32 secret) external",
  "function executeHTLCWithSwap(bytes32 htlcId, bytes32 secret, uint256 actualAmount) external",
  "function refundHTLC(bytes32 htlcId) external",
  "function submitOrder(bytes32 htlcId, string calldata orderId) external",
  "function getHTLC(bytes32 htlcId) external view returns (tuple(address initiator, address resolver, address fromToken, address toToken, uint256 amount, uint256 expectedAmount, bytes32 secretHash, uint256 timelock, bool executed, bool refunded, string orderId, bool orderSubmitted))",
  "function htlcExistsMap(bytes32) external view returns (bool)",
  "event HTLCCreated(bytes32 indexed htlcId, address indexed initiator, address indexed resolver, address fromToken, address toToken, uint256 amount, uint256 expectedAmount, bytes32 secretHash, uint256 timelock)",
  "event HTLCExecuted(bytes32 indexed htlcId, address indexed resolver, bytes32 secret, uint256 actualAmount)",
  "event HTLCRefunded(bytes32 indexed htlcId, address indexed initiator)"
];

export interface HTLCParams {
  resolver: string;
  fromToken: string;
  toToken: string;
  amount: string;
  expectedAmount: string;
  secretHash: string;
  timelock: number;
}

export interface HTLCState {
  htlcId: string;
  initiator: string;
  resolver: string;
  fromToken: string;
  toToken: string;
  amount: string;
  expectedAmount: string;
  secretHash: string;
  timelock: number;
  executed: boolean;
  refunded: boolean;
  orderId: string;
  orderSubmitted: boolean;
  secret?: string;
}

/**
 * Service for interacting with your deployed HTLC1inchEscrow contracts
 */
export class HTLCContractService {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private network: string;
  private fusionQuoter?: FusionPlusQuoterService;

  constructor(provider: ethers.Provider, network: string = 'sepolia', apiKey?: string) {
    this.provider = provider;
    this.network = network;
    
    const contractAddress = this.getContractAddress(network);
    this.contract = new ethers.Contract(contractAddress, HTLC_ABI, provider);
    
    // Initialize 1inch Fusion+ quoter if API key is available
    if (apiKey || process.env.NEXT_PUBLIC_1INCH_API_KEY) {
      this.fusionQuoter = new FusionPlusQuoterService(apiKey || process.env.NEXT_PUBLIC_1INCH_API_KEY!);
    }
  }

  private getContractAddress(network: string): string {
    const addresses = CONTRACT_ADDRESSES as any;
    const address = addresses[network]?.HTLC_ESCROW;
    
    if (!address) {
      throw new Error(`No HTLC contract deployed on ${network}`);
    }
    
    return address;
  }

  /**
   * Generate secret and hash for HTLC
   */
  generateSecretData(): { secret: string; secretHash: string } {
    const secret = ethers.hexlify(ethers.randomBytes(32));
    const secretHash = ethers.keccak256(secret);
    return { secret, secretHash };
  }

  /**
   * Create HTLC using your deployed contract
   */
  async createHTLC(
    params: HTLCParams,
    signer: ethers.Signer,
    onProgress?: (status: string) => void
  ): Promise<{ htlcId: string; txHash: string }> {
    try {
      onProgress?.('Creating HTLC with your contract...');
      
      const contractWithSigner = this.contract.connect(signer);
      
      // Create the HTLC transaction
      const tx = await contractWithSigner.createHTLC(
        params.resolver,
        params.fromToken,
        params.toToken,
        params.amount,
        params.expectedAmount,
        params.secretHash,
        params.timelock
      );

      onProgress?.('Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      
      // Extract HTLC ID from events
      const htlcCreatedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'HTLCCreated';
        } catch {
          return false;
        }
      });

      if (!htlcCreatedEvent) {
        throw new Error('HTLC creation event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(htlcCreatedEvent);
      const htlcId = parsedEvent?.args?.htlcId;

      onProgress?.(`HTLC created successfully! ID: ${htlcId}`);

      return {
        htlcId,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('Failed to create HTLC:', error);
      throw error;
    }
  }

  /**
   * Execute HTLC with secret
   */
  async executeHTLC(
    htlcId: string,
    secret: string,
    signer: ethers.Signer,
    onProgress?: (status: string) => void
  ): Promise<string> {
    try {
      onProgress?.('Executing HTLC with secret...');
      
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.executeHTLC(htlcId, secret);
      
      onProgress?.('Waiting for execution confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.('HTLC executed successfully!');
      return receipt.hash;
    } catch (error) {
      console.error('Failed to execute HTLC:', error);
      throw error;
    }
  }

  /**
   * Execute HTLC with 1inch swap completion
   */
  async executeHTLCWithSwap(
    htlcId: string,
    secret: string,
    actualAmount: string,
    signer: ethers.Signer,
    onProgress?: (status: string) => void
  ): Promise<string> {
    try {
      onProgress?.('Executing HTLC with swap completion...');
      
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.executeHTLCWithSwap(htlcId, secret, actualAmount);
      
      onProgress?.('Waiting for execution confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.('HTLC with swap executed successfully!');
      return receipt.hash;
    } catch (error) {
      console.error('Failed to execute HTLC with swap:', error);
      throw error;
    }
  }

  /**
   * Submit 1inch order ID for HTLC
   */
  async submitOrder(
    htlcId: string,
    orderId: string,
    signer: ethers.Signer,
    onProgress?: (status: string) => void
  ): Promise<string> {
    try {
      onProgress?.('Submitting 1inch order to HTLC...');
      
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.submitOrder(htlcId, orderId);
      
      onProgress?.('Waiting for order submission confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.('Order submitted successfully!');
      return receipt.hash;
    } catch (error) {
      console.error('Failed to submit order:', error);
      throw error;
    }
  }

  /**
   * Refund HTLC after timelock expiry
   */
  async refundHTLC(
    htlcId: string,
    signer: ethers.Signer,
    onProgress?: (status: string) => void
  ): Promise<string> {
    try {
      onProgress?.('Refunding HTLC...');
      
      const contractWithSigner = this.contract.connect(signer);
      const tx = await contractWithSigner.refundHTLC(htlcId);
      
      onProgress?.('Waiting for refund confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.('HTLC refunded successfully!');
      return receipt.hash;
    } catch (error) {
      console.error('Failed to refund HTLC:', error);
      throw error;
    }
  }

  /**
   * Get HTLC details
   */
  async getHTLC(htlcId: string): Promise<HTLCState | null> {
    try {
      const exists = await this.contract.htlcExistsMap(htlcId);
      if (!exists) {
        return null;
      }

      const htlcData = await this.contract.getHTLC(htlcId);
      
      return {
        htlcId,
        initiator: htlcData.initiator,
        resolver: htlcData.resolver,
        fromToken: htlcData.fromToken,
        toToken: htlcData.toToken,
        amount: htlcData.amount.toString(),
        expectedAmount: htlcData.expectedAmount.toString(),
        secretHash: htlcData.secretHash,
        timelock: Number(htlcData.timelock),
        executed: htlcData.executed,
        refunded: htlcData.refunded,
        orderId: htlcData.orderId,
        orderSubmitted: htlcData.orderSubmitted
      };
    } catch (error) {
      console.error('Failed to get HTLC:', error);
      return null;
    }
  }

  /**
   * Get contract address for current network
   */
  getContractAddressForNetwork(): string {
    return this.getContractAddress(this.network);
  }

  /**
   * Get network configuration
   */
  getNetworkInfo() {
    return getNetworkConfig(this.network);
  }

  /**
   * Check if HTLC exists
   */
  async htlcExists(htlcId: string): Promise<boolean> {
    try {
      return await this.contract.htlcExistsMap(htlcId);
    } catch (error) {
      console.error('Failed to check HTLC existence:', error);
      return false;
    }
  }

  /**
   * Generate quote for atomic swap using REAL 1inch Fusion+ API
   */
  async generateQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    srcChain?: NetworkKey,
    dstChain?: NetworkKey
  ): Promise<BridgeQuote> {
    const secretData = this.generateSecretData();
    const timelock = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
    
    try {
      if (this.fusionQuoter) {
        console.log('🔄 Getting REAL quote from 1inch Fusion+ API...');
        
        // Use selected chains or default to Ethereum → Polygon for cross-chain quotes
        const sourceChain = srcChain || 'ethereum';
        const destinationChain = dstChain || 'polygon';
        
        const srcChainId = CROSS_CHAIN_NETWORKS[sourceChain].chainId;
        const dstChainId = CROSS_CHAIN_NETWORKS[destinationChain].chainId;
        
        // Get native token address for source chain and WBTC for destination
        const srcTokenAddress = getNativeTokenAddress(sourceChain);
        const dstTokenAddress = getWBTCAddress(destinationChain);
        
        console.log(`🌉 Cross-chain quote: ${sourceChain} (${srcChainId}) → ${destinationChain} (${dstChainId})`);
        console.log(`📍 Tokens: ${srcTokenAddress} → ${dstTokenAddress}`);
        console.log(`💰 Amount: ${ethers.parseUnits(amount, fromToken.decimals).toString()} (${amount} ${fromToken.symbol})`);
        console.log(`👤 Wallet: ${walletAddress}`);
          
        const fusionQuote = await this.fusionQuoter.getQuote({
          srcChain: srcChainId,
          dstChain: dstChainId, // Real cross-chain quote
          srcTokenAddress,
          dstTokenAddress,
          amount: ethers.parseUnits(amount, fromToken.decimals).toString(),
          walletAddress,
          enableEstimate: true,
          // Remove fee parameter to avoid "cannot use fee without source" error
          isPermit2: false
        });

        // Convert WBTC amount to display amount
        const toAmount = ethers.formatUnits(fusionQuote.dstTokenAmount, 8); // WBTC has 8 decimals
        const exchangeRate = (parseFloat(toAmount) / parseFloat(amount)).toString();

        // Get recommended preset for timing estimates
        const recommendedPreset = fusionQuote.presets[fusionQuote.recommendedPreset];
        const estimatedTimeMinutes = Math.ceil(recommendedPreset.auctionDuration / 60);

        console.log('✅ Real 1inch quote received:', {
          fromAmount: amount,
          toAmount,
          exchangeRate,
          priceImpact: fusionQuote.priceImpactPercent,
          recommendedPreset: fusionQuote.recommendedPreset,
          estimatedTime: `${estimatedTimeMinutes} minutes`
        });

        return {
          id: fusionQuote.quoteId,
          fromToken,
          toToken,
          fromAmount: amount,
          toAmount,
          exchangeRate,
          networkFee: ethers.formatEther(recommendedPreset.gasCost.gasPriceEstimate || '21000'),
          protocolFee: '0.05', // 0.05% from your contract
          totalFee: ethers.formatUnits(recommendedPreset.costInDstToken, 8), // Cost in destination token
          estimatedTime: `${estimatedTimeMinutes} minutes`,
          minimumReceived: ethers.formatUnits(recommendedPreset.auctionEndAmount, 8), // Minimum at auction end
          priceImpact: fusionQuote.priceImpactPercent.toString(),
          expiresAt: Date.now() + 300000, // 5 minutes
          secretHash: secretData.secretHash,
          timelock,
          isAtomicSwap: true,
          contractAddress: this.getContractAddress(this.network),
          fusionQuoteId: fusionQuote.quoteId,
          // Additional 1inch Fusion+ specific data
          fusionPreset: fusionQuote.recommendedPreset,
          fusionData: {
            // Pass the complete raw response for detailed display
            srcTokenAmount: fusionQuote.srcTokenAmount,
            dstTokenAmount: fusionQuote.dstTokenAmount,
            presets: fusionQuote.presets,
            srcEscrowFactory: fusionQuote.srcEscrowFactory,
            dstEscrowFactory: fusionQuote.dstEscrowFactory,
            srcSafetyDeposit: fusionQuote.srcSafetyDeposit,
            dstSafetyDeposit: fusionQuote.dstSafetyDeposit,
            whitelist: fusionQuote.whitelist,
            timeLocks: fusionQuote.timeLocks,
            auctionDuration: recommendedPreset.auctionDuration,
            secretsCount: recommendedPreset.secretsCount,
            prices: fusionQuote.prices,
            volume: fusionQuote.volume,
            autoK: fusionQuote.autoK,
            k: fusionQuote.k,
            mxK: fusionQuote.mxK
          }
        };
      } else {
        console.log('⚠️ No 1inch API key - using fallback quote');
        throw new Error('No Fusion+ API available');
      }
    } catch (error) {
      console.error('❌ 1inch Fusion+ quote failed, using fallback:', error);
      
      // Fallback to simulated quote if API fails
      const rate = fromToken.symbol === 'ETH' && toToken.symbol === 'BTC' ? 0.000025 : 40000;
      const toAmount = fromToken.symbol === 'ETH' 
        ? (parseFloat(amount) * rate).toFixed(8)
        : (parseFloat(amount) / rate).toFixed(6);

      return {
        id: ethers.keccak256(ethers.toUtf8Bytes(`htlc-fallback-${Date.now()}`)),
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount,
        exchangeRate: rate.toString(),
        networkFee: '0.001',
        protocolFee: '0.05',
        totalFee: '0.001',
        estimatedTime: '15-30 minutes (simulated)',
        minimumReceived: toAmount,
        priceImpact: '0.1',
        expiresAt: Date.now() + 300000,
        secretHash: secretData.secretHash,
        timelock,
        isAtomicSwap: true,
        contractAddress: this.getContractAddress(this.network),
        isFallback: true
      };
    }
  }
}

// Factory function
export function createHTLCContractService(
  provider: ethers.Provider,
  network: string = 'sepolia',
  apiKey?: string
): HTLCContractService {
  return new HTLCContractService(provider, network, apiKey);
}