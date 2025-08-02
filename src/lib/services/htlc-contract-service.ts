import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, getNetworkConfig } from '@/config/contracts';
import { Token, BridgeQuote, Amount, createAmount } from '@/types/bridge';

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

  constructor(provider: ethers.Provider, network: string = 'sepolia') {
    this.provider = provider;
    this.network = network;
    
    const contractAddress = this.getContractAddress(network);
    this.contract = new ethers.Contract(contractAddress, HTLC_ABI, provider);
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
   * Generate quote for atomic swap using your contracts
   */
  async generateQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    // For your contracts, we'll create a simple quote
    // In production, you could integrate with price oracles
    
    const secretData = this.generateSecretData();
    const timelock = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
    
    // Simple rate calculation (you can enhance this)
    const rate = fromToken.symbol === 'ETH' && toToken.symbol === 'BTC' ? 0.000025 : 40000;
    const toAmount = fromToken.symbol === 'ETH' 
      ? (parseFloat(amount) * rate).toFixed(8)
      : (parseFloat(amount) / rate).toFixed(6);

    return {
      id: ethers.keccak256(ethers.toUtf8Bytes(`htlc-${Date.now()}`)),
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount,
      exchangeRate: rate.toString(),
      networkFee: '0.001',
      protocolFee: '0.05', // 0.05% from your contract
      totalFee: '0.001',
      estimatedTime: '15-30 minutes',
      minimumReceived: toAmount,
      priceImpact: '0.1',
      expiresAt: Date.now() + 300000, // 5 minutes
      secretHash: secretData.secretHash,
      timelock,
      isAtomicSwap: true,
      contractAddress: this.getContractAddress(this.network)
    };
  }
}

// Factory function
export function createHTLCContractService(
  provider: ethers.Provider,
  network: string = 'sepolia'
): HTLCContractService {
  return new HTLCContractService(provider, network);
}