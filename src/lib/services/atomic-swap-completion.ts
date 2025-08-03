import { ethers } from 'ethers';
import { createBitcoinHTLCService } from './bitcoin-htlc-service';
import { AtomicSwapState } from './atomic-htlc-eth-btc-with-contracts';
import { HTLCContractService } from './htlc-contract-service';

export interface SwapCompletionParams {
  swapState: AtomicSwapState;
  recipientBitcoinAddress: string;
  recipientBitcoinPrivateKey: string;
  ethereumSigner: ethers.Signer;
}

export interface SwapCompletionResult {
  success: boolean;
  bitcoinTxId?: string;
  ethereumTxHash?: string;
  error?: string;
}

export class AtomicSwapCompletionService {
  private bitcoinService: ReturnType<typeof createBitcoinHTLCService>;
  private htlcContractService: HTLCContractService;

  constructor(bitcoinNetwork: 'mainnet' | 'testnet' = 'testnet') {
    this.bitcoinService = createBitcoinHTLCService(bitcoinNetwork);
    this.htlcContractService = new HTLCContractService();
  }

  /**
   * Complete the atomic swap by claiming Bitcoin and revealing secret
   */
  async completeSwap(params: SwapCompletionParams): Promise<SwapCompletionResult> {
    const { swapState, recipientBitcoinAddress, recipientBitcoinPrivateKey, ethereumSigner } = params;

    try {
      console.log('🔄 Starting atomic swap completion...');

      // Step 1: Claim Bitcoin funds using the secret
      const bitcoinResult = await this.claimBitcoinFunds(swapState, recipientBitcoinAddress, recipientBitcoinPrivateKey);
      
      if (!bitcoinResult.success) {
        return { success: false, error: bitcoinResult.error };
      }

      console.log(`✅ Bitcoin claimed! TX: ${bitcoinResult.txId}`);

      // Step 2: Reveal secret on Ethereum to complete the swap
      const ethereumResult = await this.revealSecretOnEthereum(swapState, ethereumSigner);
      
      if (!ethereumResult.success) {
        return { success: false, error: ethereumResult.error };
      }

      console.log(`✅ Ethereum swap completed! TX: ${ethereumResult.txHash}`);

      return {
        success: true,
        bitcoinTxId: bitcoinResult.txId,
        ethereumTxHash: ethereumResult.txHash
      };

    } catch (error) {
      console.error('❌ Swap completion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during swap completion'
      };
    }
  }

  /**
   * Claim Bitcoin funds from the HTLC using the secret
   */
  private async claimBitcoinFunds(
    swapState: AtomicSwapState, 
    recipientAddress: string, 
    recipientPrivateKey: string
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      if (!swapState.btcHTLC?.funded || !swapState.btcHTLC?.address) {
        throw new Error('Bitcoin HTLC not funded or address missing');
      }

      if (!swapState.secret) {
        throw new Error('Secret not available for claiming');
      }

      // Get the UTXO from the funded HTLC address
      const utxos = await this.bitcoinService.getAddressUTXOs(swapState.btcHTLC.address);
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs found in HTLC address');
      }

      const utxo = utxos[0]; // Use the first UTXO

      // Claim the HTLC using the secret
      const claimTx = await this.bitcoinService.claimHTLC(
        utxo,
        recipientAddress,
        swapState.secret,
        swapState.btcHTLC.witnessScript,
        recipientPrivateKey
      );

      // Broadcast the claim transaction
      const txId = await this.bitcoinService.broadcastTransaction(claimTx.hex);

      return { success: true, txId };

    } catch (error) {
      console.error('Bitcoin claim failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bitcoin claim failed' 
      };
    }
  }

  /**
   * Reveal the secret on Ethereum to complete the swap
   */
  private async revealSecretOnEthereum(
    swapState: AtomicSwapState, 
    signer: ethers.Signer
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      if (!swapState.secret || !swapState.ethHTLC?.htlcId) {
        throw new Error('Secret or HTLC ID missing');
      }

      // Get the HTLC contract
      const contract = this.htlcContractService.getContract(signer);
      
      // Call the withdraw function with the secret
      const secretBytes = swapState.secret.startsWith('0x') 
        ? swapState.secret 
        : '0x' + swapState.secret;

      const tx = await contract.withdraw(swapState.ethHTLC.htlcId, secretBytes);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();

      return { success: true, txHash: tx.hash };

    } catch (error) {
      console.error('Ethereum secret revelation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ethereum secret revelation failed' 
      };
    }
  }

  /**
   * Refund the swap if timelock has expired
   */
  async refundSwap(
    swapState: AtomicSwapState,
    ethereumSigner: ethers.Signer,
    bitcoinPrivateKey?: string
  ): Promise<SwapCompletionResult> {
    try {
      console.log('🔄 Starting swap refund...');

      const now = Math.floor(Date.now() / 1000);
      
      if (now < swapState.timelock) {
        throw new Error('Timelock has not expired yet');
      }

      let bitcoinTxId: string | undefined;
      let ethereumTxHash: string | undefined;

      // Refund Bitcoin if funded
      if (swapState.btcHTLC?.funded && bitcoinPrivateKey) {
        const utxos = await this.bitcoinService.getAddressUTXOs(swapState.btcHTLC.address);
        if (utxos.length > 0) {
          const refundTx = await this.bitcoinService.refundHTLC(
            utxos[0],
            swapState.btcHTLC.address,
            swapState.btcHTLC.witnessScript,
            bitcoinPrivateKey,
            swapState.timelock
          );
          bitcoinTxId = await this.bitcoinService.broadcastTransaction(refundTx.hex);
        }
      }

      // Refund Ethereum
      const contract = this.htlcContractService.getContract(ethereumSigner);
      const tx = await contract.refund(swapState.ethHTLC!.htlcId);
      const receipt = await tx.wait();
      ethereumTxHash = tx.hash;

      return {
        success: true,
        bitcoinTxId,
        ethereumTxHash
      };

    } catch (error) {
      console.error('Refund failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed'
      };
    }
  }

  /**
   * Check if swap can be completed
   */
  canCompleteSwap(swapState: AtomicSwapState): boolean {
    return (
      swapState.status === 'participant_funded' &&
      swapState.btcHTLC?.funded === true &&
      swapState.secret !== undefined &&
      swapState.ethHTLC?.htlcId !== undefined
    );
  }

  /**
   * Check if swap can be refunded
   */
  canRefundSwap(swapState: AtomicSwapState): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now >= swapState.timelock;
  }

  /**
   * Get swap status details
   */
  getSwapStatus(swapState: AtomicSwapState) {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = swapState.timelock - now;
    
    return {
      canComplete: this.canCompleteSwap(swapState),
      canRefund: this.canRefundSwap(swapState),
      timeLeft: Math.max(0, timeLeft),
      isExpired: timeLeft <= 0,
      status: swapState.status
    };
  }
}

// Factory function
export function createAtomicSwapCompletionService(bitcoinNetwork: 'mainnet' | 'testnet' = 'testnet'): AtomicSwapCompletionService {
  return new AtomicSwapCompletionService(bitcoinNetwork);
} 