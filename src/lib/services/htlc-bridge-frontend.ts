import { ethers } from 'ethers';
import { getContractAddress, getNetworkConfig } from '@/config/contracts';

// HTLC Contract ABI (simplified for frontend)
const HTLC_ABI = [
  "function createHTLC(address fromToken, address toToken, uint256 amount, uint256 timelock, bytes32 secretHash) external payable returns (bytes32)",
  "function executeHTLC(bytes32 htlcId, bytes32 secret) external",
  "function refundHTLC(bytes32 htlcId) external",
  "function getHTLC(bytes32 htlcId) external view returns (address initiator, address resolver, bytes32 secretHash, uint256 timelock, bool executed, bool refunded)",
  "function owner() external view returns (address)",
  "event HTLCCreated(bytes32 indexed htlcId, address indexed initiator, address fromToken, address toToken, uint256 amount, uint256 timelock)",
  "event HTLCExecuted(bytes32 indexed htlcId, address indexed resolver, bytes32 secret)",
  "event HTLCRefunded(bytes32 indexed htlcId, address indexed initiator)"
];

export interface HTLCBridgeRequest {
  fromToken: string;
  toToken: string;
  amount: string;
  timelock?: number; // in seconds, default 1 hour
  fromNetwork: string;
  toNetwork: string;
}

export interface HTLCBridgeResult {
  htlcId: string;
  secret: string;
  secretHash: string;
  timelock: number;
  status: 'pending' | 'executed' | 'refunded' | 'expired';
  txHash: string;
}

export class HTLCBridgeFrontend {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contract: ethers.Contract;
  private network: string;

  constructor(network: string = 'sepolia') {
    this.network = network;
    this.provider = new ethers.JsonRpcProvider(getNetworkConfig(network).rpcUrl);
    this.contract = new ethers.Contract(
      getContractAddress(network),
      HTLC_ABI,
      this.provider
    );
  }

  // Connect wallet
  async connectWallet(): Promise<void> {
    if (typeof window !== 'undefined' && window.ethereum) {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.signer = new ethers.BrowserProvider(window.ethereum).getSigner();
      this.contract = this.contract.connect(this.signer);
    } else {
      throw new Error('MetaMask not found');
    }
  }

  // Create HTLC bridge
  async createBridge(request: HTLCBridgeRequest): Promise<HTLCBridgeResult> {
    if (!this.signer) {
      await this.connectWallet();
    }

    // Generate secret and hash
    const secret = ethers.randomBytes(32);
    const secretHash = ethers.keccak256(secret);
    
    // Set default timelock (1 hour)
    const timelock = request.timelock || Math.floor(Date.now() / 1000) + 3600;

    // Prepare transaction
    const amount = ethers.parseEther(request.amount);
    const tx = await this.contract.createHTLC(
      request.fromToken,
      request.toToken,
      amount,
      timelock,
      secretHash,
      { value: request.fromToken === ethers.ZeroAddress ? amount : 0 }
    );

    // Wait for transaction
    const receipt = await tx.wait();
    
    // Get HTLC ID from event
    const event = receipt.logs.find((log: any) => 
      log.fragment?.name === 'HTLCCreated'
    );
    
    const htlcId = event?.args?.htlcId || ethers.keccak256(
      ethers.solidityPackedKeccak256(
        ['address', 'address', 'uint256', 'uint256', 'bytes32'],
        [request.fromToken, request.toToken, amount, timelock, secretHash]
      )
    );

    return {
      htlcId: htlcId.toString(),
      secret: secret.toString('hex'),
      secretHash: secretHash.toString(),
      timelock,
      status: 'pending',
      txHash: receipt.hash
    };
  }

  // Execute HTLC
  async executeHTLC(htlcId: string, secret: string): Promise<string> {
    if (!this.signer) {
      await this.connectWallet();
    }

    const tx = await this.contract.executeHTLC(htlcId, secret);
    const receipt = await tx.wait();
    
    return receipt.hash;
  }

  // Refund HTLC
  async refundHTLC(htlcId: string): Promise<string> {
    if (!this.signer) {
      await this.connectWallet();
    }

    const tx = await this.contract.refundHTLC(htlcId);
    const receipt = await tx.wait();
    
    return receipt.hash;
  }

  // Get HTLC details
  async getHTLC(htlcId: string) {
    return await this.contract.getHTLC(htlcId);
  }

  // Check if HTLC is expired
  async isHTLCExpired(htlcId: string): Promise<boolean> {
    const htlc = await this.getHTLC(htlcId);
    return Date.now() / 1000 > htlc.timelock;
  }

  // Get contract owner
  async getOwner(): Promise<string> {
    return await this.contract.owner();
  }

  // Get user's HTLCs
  async getUserHTLCs(userAddress: string): Promise<string[]> {
    // This would require indexing events or using a subgraph
    // For now, return empty array
    return [];
  }

  // Format amount for display
  formatAmount(amount: string, decimals: number = 18): string {
    return ethers.formatUnits(amount, decimals);
  }

  // Parse amount for contract
  parseAmount(amount: string, decimals: number = 18): bigint {
    return ethers.parseUnits(amount, decimals);
  }
}

// Factory function
export function createHTLCBridge(network: string = 'sepolia'): HTLCBridgeFrontend {
  return new HTLCBridgeFrontend(network);
} 