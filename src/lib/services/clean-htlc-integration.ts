import { ethers } from 'ethers';
import { HTLC1inchEscrow__factory } from '../../typechain-types';
import { 
  CleanFusionOrchestrator, 
  CrossChainSwapRequest, 
  HTLCExecutionResult 
} from './clean-fusion-orchestrator';

export interface HTLCIntegrationResult {
  contractHTLCId: string;
  fusionOrderHash: string;
  secret: string;
  secretHash: string;
  timelock: number;
  contractTxHash: string;
  fusionOrder: any;
}

export class CleanHTLCIntegration {
  private contract: HTLC1inchEscrow__factory;
  private fusionOrchestrator: CleanFusionOrchestrator;
  private contractAddress: string;

  constructor(
    contractAddress: string,
    provider: ethers.Provider,
    signer?: ethers.Signer,
    oneInchApiKey?: string
  ) {
    this.contractAddress = contractAddress;
    this.contract = HTLC1inchEscrow__factory.connect(contractAddress, signer || provider);
    this.fusionOrchestrator = new CleanFusionOrchestrator(provider, oneInchApiKey);
  }

  /**
   * Create complete HTLC: Fusion+ order + Contract HTLC
   */
  async createCompleteHTLC(request: CrossChainSwapRequest): Promise<HTLCIntegrationResult> {
    console.log('🔄 Creating complete HTLC integration:', request);

    // Step 1: Create Fusion+ order using SDK
    const fusionResult = await this.fusionOrchestrator.createCrossChainSwap(request);

    // Step 2: Create HTLC on your contract
    const contractResult = await this.createContractHTLC({
      resolver: request.recipientAddress || request.userAddress,
      fromToken: request.fromToken,
      toToken: request.toToken,
      amount: (parseFloat(request.amount) * 1e18).toString(),
      expectedAmount: fusionResult.fusionOrder.takerAmount,
      secretHash: fusionResult.secretHash,
      timelock: fusionResult.timelock
    });

    // Step 3: Link Fusion+ order to contract
    await this.submitOrderToContract(contractResult.htlcId, fusionResult.fusionOrder.orderHash);

    return {
      contractHTLCId: contractResult.htlcId,
      fusionOrderHash: fusionResult.fusionOrder.orderHash,
      secret: fusionResult.secret,
      secretHash: fusionResult.secretHash,
      timelock: fusionResult.timelock,
      contractTxHash: contractResult.txHash,
      fusionOrder: fusionResult.fusionOrder
    };
  }

  /**
   * Create HTLC on your smart contract
   */
  private async createContractHTLC(params: {
    resolver: string;
    fromToken: string;
    toToken: string;
    amount: string;
    expectedAmount: string;
    secretHash: string;
    timelock: number;
  }): Promise<{ htlcId: string; txHash: string }> {
    console.log('📝 Creating HTLC on contract:', params);

    const signer = this.contract.runner as ethers.Signer;
    if (!signer) {
      throw new Error('Signer required for contract interactions');
    }

    try {
      // Approve tokens if needed
      if (params.fromToken !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe') {
        await this.approveTokens(params.fromToken, params.amount);
      }

      // Create HTLC transaction
      const tx = await this.contract.createHTLC(
        params.resolver,
        params.fromToken,
        params.toToken,
        params.amount,
        params.expectedAmount,
        params.secretHash,
        params.timelock,
        { 
          value: params.fromToken === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe' ? params.amount : 0 
        }
      );

      const receipt = await tx.wait();
      console.log('✅ HTLC created on contract:', receipt.hash);

      // Extract HTLC ID from event
      const htlcId = this.extractHTLCIdFromEvent(receipt);

      return {
        htlcId,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ Failed to create HTLC on contract:', error);
      throw error;
    }
  }

  /**
   * Submit Fusion+ order ID to contract
   */
  private async submitOrderToContract(htlcId: string, orderId: string): Promise<string> {
    console.log('📋 Submitting order to contract:', { htlcId, orderId });

    const signer = this.contract.runner as ethers.Signer;
    if (!signer) {
      throw new Error('Signer required for contract interactions');
    }

    try {
      const tx = await this.contract.submitOrder(htlcId, orderId);
      const receipt = await tx.wait();
      
      console.log('✅ Order submitted to contract:', receipt.hash);
      return receipt.hash;
    } catch (error) {
      console.error('❌ Failed to submit order to contract:', error);
      throw error;
    }
  }

  /**
   * Execute HTLC with secret
   */
  async executeHTLC(htlcId: string, secret: string, actualAmount?: string): Promise<string> {
    console.log('🚀 Executing HTLC:', { htlcId, secret, actualAmount });

    const signer = this.contract.runner as ethers.Signer;
    if (!signer) {
      throw new Error('Signer required for contract interactions');
    }

    try {
      let tx;
      
      if (actualAmount) {
        // Execute with swap (includes actual amount from 1inch)
        tx = await this.contract.executeHTLCWithSwap(htlcId, secret, actualAmount);
      } else {
        // Execute without swap (direct transfer)
        tx = await this.contract.executeHTLC(htlcId, secret);
      }

      const receipt = await tx.wait();
      console.log('✅ HTLC executed:', receipt.hash);
      return receipt.hash;
    } catch (error) {
      console.error('❌ Failed to execute HTLC:', error);
      throw error;
    }
  }

  /**
   * Refund HTLC if expired
   */
  async refundHTLC(htlcId: string): Promise<string> {
    console.log('💸 Refunding HTLC:', htlcId);

    const signer = this.contract.runner as ethers.Signer;
    if (!signer) {
      throw new Error('Signer required for contract interactions');
    }

    try {
      const tx = await this.contract.refundHTLC(htlcId);
      const receipt = await tx.wait();
      
      console.log('✅ HTLC refunded:', receipt.hash);
      return receipt.hash;
    } catch (error) {
      console.error('❌ Failed to refund HTLC:', error);
      throw error;
    }
  }

  /**
   * Get HTLC details from contract
   */
  async getHTLC(htlcId: string): Promise<any> {
    console.log('📖 Getting HTLC details:', htlcId);

    try {
      const htlc = await this.contract.getHTLC(htlcId);
      console.log('✅ HTLC details:', htlc);
      return htlc;
    } catch (error) {
      console.error('❌ Failed to get HTLC:', error);
      throw error;
    }
  }

  /**
   * Check if HTLC exists
   */
  async htlcExists(htlcId: string): Promise<boolean> {
    try {
      return await this.contract.htlcExistsMap(htlcId);
    } catch {
      return false;
    }
  }

  /**
   * Execute Fusion+ HTLC (off-chain)
   */
  async executeFusionHTLC(orderHash: string, secret: string): Promise<string> {
    return await this.fusionOrchestrator.executeHTLC(orderHash, secret);
  }

  /**
   * Get Fusion+ orders
   */
  async getFusionOrders(chainId: number = 1): Promise<any[]> {
    return await this.fusionOrchestrator.getEscrowFactoryOrders(chainId);
  }

  /**
   * Get Fusion+ order by hash
   */
  async getFusionOrder(orderHash: string, chainId: number = 1): Promise<any> {
    return await this.fusionOrchestrator.getOrderByHash(orderHash, chainId);
  }

  /**
   * Get escrow factory address
   */
  async getEscrowFactoryAddress(chainId: number = 1): Promise<string> {
    return await this.fusionOrchestrator.getEscrowFactoryAddress(chainId);
  }

  /**
   * Extract HTLC ID from transaction receipt
   */
  private extractHTLCIdFromEvent(receipt: ethers.ContractTransactionReceipt): string {
    const htlcCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed.name === 'HTLCCreated';
      } catch {
        return false;
      }
    });

    if (!htlcCreatedEvent) {
      throw new Error('HTLCCreated event not found');
    }

    const parsedEvent = this.contract.interface.parseLog(htlcCreatedEvent);
    return parsedEvent.args[0]; // First argument is htlcId
  }

  /**
   * Approve tokens for contract
   */
  private async approveTokens(tokenAddress: string, amount: string): Promise<void> {
    console.log('✅ Approving tokens:', { tokenAddress, amount });

    const signer = this.contract.runner as ethers.Signer;
    if (!signer) {
      throw new Error('Signer required for token approval');
    }

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function approve(address spender, uint256 amount) external returns (bool)'],
        signer
      );

      const tx = await tokenContract.approve(this.contractAddress, amount);
      await tx.wait();
      
      console.log('✅ Tokens approved');
    } catch (error) {
      console.error('❌ Failed to approve tokens:', error);
      throw error;
    }
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Get contract instance
   */
  getContract(): HTLC1inchEscrow__factory {
    return this.contract;
  }

  /**
   * Get Fusion+ orchestrator
   */
  getFusionOrchestrator(): CleanFusionOrchestrator {
    return this.fusionOrchestrator;
  }
}

// Factory function
export function createCleanHTLCIntegration(
  contractAddress: string,
  provider: ethers.Provider,
  signer?: ethers.Signer,
  oneInchApiKey?: string
): CleanHTLCIntegration {
  return new CleanHTLCIntegration(contractAddress, provider, signer, oneInchApiKey);
} 