import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

// WETH ABI - only the functions we need
const WETH_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "event Deposit(address indexed dst, uint256 wad)",
  "event Withdrawal(address indexed src, uint256 wad)"
];

export class WETHWrapper {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private network: string;

  constructor(provider: ethers.Provider, network: string = 'sepolia') {
    this.provider = provider;
    this.network = network;
    
    const wethAddress = this.getWETHAddress(network);
    this.contract = new ethers.Contract(wethAddress, WETH_ABI, provider);
  }

  private getWETHAddress(network: string): string {
    const addresses = CONTRACT_ADDRESSES as Record<string, Record<string, string>>;
    const address = addresses[network]?.WETH;
    
    if (!address) {
      throw new Error(`No WETH contract deployed on ${network}`);
    }
    
    return address;
  }

  /**
   * Wrap ETH to WETH
   */
  async wrapETH(
    amount: string, // Amount in ETH (e.g., "0.01")
    signer: ethers.Signer,
    onProgress?: (status: string) => void
  ): Promise<string> {
    try {
      onProgress?.('🔄 Wrapping ETH to WETH...');
      
      const contractWithSigner = this.contract.connect(signer);
      const amountWei = ethers.parseEther(amount);
      
      // Call deposit function with ETH value
      const tx = await contractWithSigner.deposit({ value: amountWei });
      
      onProgress?.('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.(`✅ Wrapped ${amount} ETH to WETH!`);
      
      return receipt.hash;
    } catch (error) {
      console.error('Failed to wrap ETH:', error);
      throw error;
    }
  }

  /**
   * Unwrap WETH to ETH
   */
  async unwrapWETH(
    amount: string, // Amount in WETH (e.g., "0.01")
    signer: ethers.Signer,
    onProgress?: (status: string) => void
  ): Promise<string> {
    try {
      onProgress?.('🔄 Unwrapping WETH to ETH...');
      
      const contractWithSigner = this.contract.connect(signer);
      const amountWei = ethers.parseEther(amount);
      
      // Call withdraw function
      const tx = await contractWithSigner.withdraw(amountWei);
      
      onProgress?.('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.(`✅ Unwrapped ${amount} WETH to ETH!`);
      
      return receipt.hash;
    } catch (error) {
      console.error('Failed to unwrap WETH:', error);
      throw error;
    }
  }

  /**
   * Approve WETH for spending by another contract
   */
  async approveWETH(
    spender: string, // Contract address to approve
    amount: string, // Amount in WETH (e.g., "0.01")
    signer: ethers.Signer,
    onProgress?: (status: string) => void
  ): Promise<string> {
    try {
      onProgress?.('🔄 Approving WETH spending...');
      
      const contractWithSigner = this.contract.connect(signer);
      const amountWei = ethers.parseEther(amount);
      
      // Call approve function
      const tx = await contractWithSigner.approve(spender, amountWei);
      
      onProgress?.('⏳ Waiting for approval confirmation...');
      const receipt = await tx.wait();
      
      onProgress?.(`✅ Approved ${amount} WETH for ${spender.slice(0, 6)}...${spender.slice(-4)}!`);
      
      return receipt.hash;
    } catch (error) {
      console.error('Failed to approve WETH:', error);
      throw error;
    }
  }

  /**
   * Check WETH balance
   */
  async getWETHBalance(address: string): Promise<string> {
    try {
      const balance = await this.contract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get WETH balance:', error);
      throw error;
    }
  }

  /**
   * Check WETH allowance
   */
  async getWETHAllowance(owner: string, spender: string): Promise<string> {
    try {
      const allowance = await this.contract.allowance(owner, spender);
      return ethers.formatEther(allowance);
    } catch (error) {
      console.error('Failed to get WETH allowance:', error);
      throw error;
    }
  }

  /**
   * Check if approval is needed
   */
  async needsApproval(
    owner: string,
    spender: string,
    amount: string
  ): Promise<boolean> {
    try {
      const allowance = await this.getWETHAllowance(owner, spender);
      return parseFloat(allowance) < parseFloat(amount);
    } catch (error) {
      console.error('Failed to check approval:', error);
      return true; // Assume approval is needed on error
    }
  }

  /**
   * Get WETH contract address for current network
   */
  getWETHAddressForNetwork(): string {
    return this.getWETHAddress(this.network);
  }
}

// Factory function
export function createWETHWrapper(
  provider: ethers.Provider,
  network: string = 'sepolia'
): WETHWrapper {
  return new WETHWrapper(provider, network);
}