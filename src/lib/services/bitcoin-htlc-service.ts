import * as bitcoin from 'bitcoinjs-lib';
import { bitcoinNetworkService, BitcoinNetwork, HTLCScript, TransactionResult } from './bitcoin-network-service';

// Security-focused HTLC service with proper key management
export interface SecureKeyProvider {
  // Never expose raw private keys - use signing delegation
  signPSBT(psbt: bitcoin.Psbt, inputIndex: number): Promise<bitcoin.Psbt>;
  getPublicKey(): Buffer;
  getAddress(): string;
  supportsHardwareWallet(): boolean;
}

export interface HTLCWatchtowerConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  alertWebhook?: string;
  autoRefund: boolean;
  autoRefundBuffer: number; // blocks before expiry to auto-refund
}

export interface HTLCRevocationConfig {
  enableRevocation: boolean;
  revocationKey?: Buffer; // Public key for revocation path
  revocationDelay: number; // blocks
}

export interface HTLCConfig {
  secretHash: Buffer;
  aliceKey: SecureKeyProvider;
  bobKey: SecureKeyProvider;
  timelock: number;
  amount: number;
  feeRate: number;
  enableRBF: boolean;
  watchtower?: HTLCWatchtowerConfig;
  revocation?: HTLCRevocationConfig;
  network: BitcoinNetwork;
}

export interface HTLCState {
  id: string;
  config: HTLCConfig;
  script: HTLCScript;
  fundingTxid?: string;
  status: 'created' | 'funded' | 'claimed' | 'refunded' | 'expired' | 'revoked';
  secret?: Buffer;
  claimTxid?: string;
  refundTxid?: string;
  createdAt: number;
  expiresAt: number;
  lastChecked: number;
}

export class BitcoinHTLCService {
  private static instance: BitcoinHTLCService;
  private activeHTLCs = new Map<string, HTLCState>();
  private watchtowerIntervals = new Map<string, NodeJS.Timeout>();
  private networkService = bitcoinNetworkService;

  static getInstance(): BitcoinHTLCService {
    if (!BitcoinHTLCService.instance) {
      BitcoinHTLCService.instance = new BitcoinHTLCService();
    }
    return BitcoinHTLCService.instance;
  }

  /**
   * Create a new HTLC with enhanced security features
   */
  async createHTLC(config: HTLCConfig): Promise<HTLCState> {
    this.validateHTLCConfig(config);

    const id = this.generateHTLCId();
    
    // Build enhanced HTLC script with optional revocation
    const script = this.buildEnhancedHTLCScript(config);
    
    const htlcState: HTLCState = {
      id,
      config,
      script,
      status: 'created',
      createdAt: Date.now(),
      expiresAt: Date.now() + (config.timelock * 10 * 60 * 1000), // Approximate block time
      lastChecked: Date.now(),
    };

    this.activeHTLCs.set(id, htlcState);

    // Start watchtower if enabled
    if (config.watchtower?.enabled) {
      this.startWatchtower(id);
    }

    return htlcState;
  }

  /**
   * Fund HTLC with secure key management
   */
  async fundHTLC(
    htlcId: string,
    utxos: Array<{ txid: string; vout: number; value: number; scriptPubKey: string; confirmations: number; address?: string }>,
    changeAddress: string
  ): Promise<{ htlcState: HTLCState; fundingTx: TransactionResult }> {
    const htlcState = this.getHTLCState(htlcId);
    
    if (htlcState.status !== 'created') {
      throw new Error(`HTLC ${htlcId} cannot be funded in status: ${htlcState.status}`);
    }

    const { psbt } = await this.networkService.createHTLCTransaction(
      utxos,
      htlcState.script.address,
      changeAddress,
      htlcState.config.amount,
      htlcState.config.feeRate,
      htlcState.config.enableRBF
    );

    // RBF is now enabled during input creation in networkService.createHTLCTransaction

    // Secure signing via key provider (no raw private key exposure)
    for (let i = 0; i < psbt.inputCount; i++) {
      await htlcState.config.aliceKey.signPSBT(psbt, i);
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();

    const broadcastResult = await this.networkService.broadcastTransaction(txHex, tx.getId());
    
    if (!broadcastResult.success) {
      throw new Error(`Failed to broadcast funding transaction: ${broadcastResult.error}`);
    }

    // Update HTLC state
    htlcState.fundingTxid = broadcastResult.txid;
    htlcState.status = 'funded';
    this.activeHTLCs.set(htlcId, htlcState);

    return {
      htlcState,
      fundingTx: {
        txid: broadcastResult.txid,
        hex: txHex,
        fee: 0, // Calculate from inputs/outputs
        size: tx.byteLength(),
        virtualSize: tx.virtualSize(),
        weight: tx.weight(),
      },
    };
  }

  /**
   * Claim HTLC with secret revelation
   */
  async claimHTLC(htlcId: string, secret: Buffer): Promise<{ htlcState: HTLCState; claimTx: TransactionResult }> {
    const htlcState = this.getHTLCState(htlcId);
    
    if (htlcState.status !== 'funded') {
      throw new Error(`HTLC ${htlcId} cannot be claimed in status: ${htlcState.status}`);
    }

    if (!htlcState.fundingTxid) {
      throw new Error(`HTLC ${htlcId} has no funding transaction`);
    }

    // Validate secret matches hash
    if (!this.networkService.validateSecretHash(secret, htlcState.config.secretHash)) {
      throw new Error('Invalid secret provided');
    }

    const claimTx = await this.networkService.buildAndBroadcastClaimTransaction(
      htlcState.fundingTxid,
      0, // Assume HTLC output is at index 0
      htlcState.config.amount,
      htlcState.script.script,
      secret,
      Buffer.alloc(32), // Placeholder - use secure key provider
      htlcState.config.bobKey.getAddress(),
      htlcState.config.timelock,
      htlcState.config.feeRate
    );

    // Update state
    htlcState.status = 'claimed';
    htlcState.secret = secret;
    htlcState.claimTxid = claimTx.txid;
    this.activeHTLCs.set(htlcId, htlcState);

    // Stop watchtower
    this.stopWatchtower(htlcId);

    return { htlcState, claimTx };
  }

  /**
   * Refund HTLC after timelock expiry with RBF support
   */
  async refundHTLC(
    htlcId: string,
    rbfFeeRate?: number
  ): Promise<{ htlcState: HTLCState; refundTx: TransactionResult }> {
    const htlcState = this.getHTLCState(htlcId);
    
    if (htlcState.status !== 'funded') {
      throw new Error(`HTLC ${htlcId} cannot be refunded in status: ${htlcState.status}`);
    }

    if (!htlcState.fundingTxid) {
      throw new Error(`HTLC ${htlcId} has no funding transaction`);
    }

    const currentHeight = await this.networkService.getCurrentBlockHeight();
    if (currentHeight < htlcState.config.timelock) {
      throw new Error(`HTLC ${htlcId} timelock not yet expired. Current: ${currentHeight}, Expires: ${htlcState.config.timelock}`);
    }

    const feeRate = rbfFeeRate || htlcState.config.feeRate;

    const refundTx = await this.networkService.buildAndBroadcastRefundTransaction(
      htlcState.fundingTxid,
      0,
      htlcState.config.amount,
      htlcState.script.script,
      Buffer.alloc(32), // Placeholder - use secure key provider
      htlcState.config.aliceKey.getAddress(),
      htlcState.config.timelock,
      feeRate
    );

    // Update state
    htlcState.status = 'refunded';
    htlcState.refundTxid = refundTx.txid;
    this.activeHTLCs.set(htlcId, htlcState);

    // Stop watchtower
    this.stopWatchtower(htlcId);

    return { htlcState, refundTx };
  }

  /**
   * Enhanced HTLC script with optional revocation support
   */
  private buildEnhancedHTLCScript(config: HTLCConfig): HTLCScript {
    if (config.revocation?.enableRevocation && config.revocation.revocationKey) {
      // Enhanced script with revocation path
      return this.buildRevocableHTLCScript(config);
    } else {
      // Standard HTLC script
      return this.networkService.buildHTLCScript(
        config.secretHash,
        config.aliceKey.getPublicKey(),
        config.bobKey.getPublicKey(),
        config.timelock,
        config.amount
      );
    }
  }

  /**
   * Revocable HTLC script (3-path: claim, refund, revoke)
   */
  private buildRevocableHTLCScript(config: HTLCConfig): HTLCScript {
    if (!config.revocation?.revocationKey) {
      throw new Error('Revocation key required for revocable HTLC');
    }

    const script = bitcoin.script.compile([
      bitcoin.opcodes.OP_IF,
        // Revocation path (immediate spend with revocation key)
        config.revocation.revocationKey,
        bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ELSE,
        bitcoin.opcodes.OP_IF,
          // Claim path (Bob with secret)
          bitcoin.opcodes.OP_SHA256,
          config.secretHash,
          bitcoin.opcodes.OP_EQUALVERIFY,
          config.bobKey.getPublicKey(),
          bitcoin.opcodes.OP_CHECKSIG,
        bitcoin.opcodes.OP_ELSE,
          // Refund path (Alice after timelock + revocation delay)
          bitcoin.script.number.encode(config.timelock + config.revocation.revocationDelay),
          bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
          bitcoin.opcodes.OP_DROP,
          config.aliceKey.getPublicKey(),
          bitcoin.opcodes.OP_CHECKSIG,
        bitcoin.opcodes.OP_ENDIF,
      bitcoin.opcodes.OP_ENDIF,
    ]);

    const payment = bitcoin.payments.p2wsh({
      redeem: { output: script },
      network: this.networkService.getNetworkInfo().chainParams,
    });

    if (!payment.address) {
      throw new Error('Failed to generate revocable HTLC address');
    }

    return {
      script,
      address: payment.address,
      redeemScript: script,
      isValid: true,
      bip21Uri: `bitcoin:${payment.address}?amount=${config.amount / 100000000}&label=Revocable%20HTLC`,
      qrData: JSON.stringify({
        type: 'revocable-htlc',
        address: payment.address,
        amount: config.amount,
        timelock: config.timelock,
        revocationDelay: config.revocation.revocationDelay,
      }),
      scriptHash: bitcoin.crypto.sha256(script).toString('hex'),
    };
  }

  /**
   * Watchtower service for automated monitoring and response
   */
  private startWatchtower(htlcId: string): void {
    const htlcState = this.getHTLCState(htlcId);
    const config = htlcState.config.watchtower!;

    const interval = setInterval(async () => {
      try {
        await this.watchtowerCheck(htlcId);
      } catch (error) {
        console.error(`Watchtower check failed for HTLC ${htlcId}:`, error);
        
        // Send alert if webhook configured
        if (config.alertWebhook) {
          this.sendWatchtowerAlert(htlcId, `Watchtower check failed: ${error}`);
        }
      }
    }, config.checkInterval);

    this.watchtowerIntervals.set(htlcId, interval);
  }

  private async watchtowerCheck(htlcId: string): Promise<void> {
    const htlcState = this.getHTLCState(htlcId);
    const config = htlcState.config.watchtower!;

    // Update last checked timestamp
    htlcState.lastChecked = Date.now();

    // Monitor HTLC status
    const monitorResult = await this.networkService.monitorHTLC(
      htlcState.script.address,
      htlcState.config.secretHash,
      htlcState.config.timelock
    );

    // Update state based on monitoring
    if (monitorResult.status === 'claimed' && htlcState.status === 'funded') {
      htlcState.status = 'claimed';
      htlcState.secret = monitorResult.secret;
      htlcState.claimTxid = monitorResult.txid;
      this.stopWatchtower(htlcId);
    } else if (monitorResult.status === 'refunded' && htlcState.status === 'funded') {
      htlcState.status = 'refunded';
      htlcState.refundTxid = monitorResult.txid;
      this.stopWatchtower(htlcId);
    } else if (monitorResult.status === 'expired' && config.autoRefund) {
      // Auto-refund if configured and within buffer
      const currentHeight = await this.networkService.getCurrentBlockHeight();
      const blocksUntilExpiry = htlcState.config.timelock - currentHeight;
      
      if (blocksUntilExpiry <= config.autoRefundBuffer) {
        console.log(`Auto-refunding HTLC ${htlcId} (${blocksUntilExpiry} blocks until expiry)`);
        
        try {
          await this.refundHTLC(htlcId);
          this.sendWatchtowerAlert(htlcId, 'Auto-refund executed successfully');
        } catch (error) {
          this.sendWatchtowerAlert(htlcId, `Auto-refund failed: ${error}`);
        }
      }
    }

    this.activeHTLCs.set(htlcId, htlcState);
  }

  private stopWatchtower(htlcId: string): void {
    const interval = this.watchtowerIntervals.get(htlcId);
    if (interval) {
      clearInterval(interval);
      this.watchtowerIntervals.delete(htlcId);
    }
  }

  private async sendWatchtowerAlert(htlcId: string, message: string): Promise<void> {
    const htlcState = this.getHTLCState(htlcId);
    const webhookUrl = htlcState.config.watchtower?.alertWebhook;

    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htlcId,
          message,
          timestamp: Date.now(),
          status: htlcState.status,
          timelock: htlcState.config.timelock,
        }),
      });
    } catch (error) {
      console.error('Failed to send watchtower alert:', error);
    }
  }

  /**
   * RBF (Replace-by-Fee) support for stuck transactions
   */
  async bumpTransactionFee(
    htlcId: string,
    transactionType: 'funding' | 'claim' | 'refund',
    newFeeRate: number
  ): Promise<TransactionResult> {
    const htlcState = this.getHTLCState(htlcId);

    if (!htlcState.config.enableRBF) {
      throw new Error(`RBF not enabled for HTLC ${htlcId}`);
    }

    switch (transactionType) {
      case 'refund':
        if (!htlcState.refundTxid) {
          throw new Error(`No refund transaction to replace for HTLC ${htlcId}`);
        }
        // Rebuild refund transaction with higher fee
        const { refundTx } = await this.refundHTLC(htlcId, newFeeRate);
        return refundTx;

      default:
        throw new Error(`RBF not supported for transaction type: ${transactionType}`);
    }
  }

  /**
   * Get all active HTLCs for monitoring dashboard
   */
  getAllHTLCs(): HTLCState[] {
    return Array.from(this.activeHTLCs.values());
  }

  /**
   * Get specific HTLC state
   */
  getHTLC(htlcId: string): HTLCState | undefined {
    return this.activeHTLCs.get(htlcId);
  }

  /**
   * Clean up expired HTLCs
   */
  async cleanupExpiredHTLCs(): Promise<void> {
    const now = Date.now();
    const expiredHTLCs = Array.from(this.activeHTLCs.values()).filter(
      htlc => htlc.expiresAt < now && (htlc.status === 'created' || htlc.status === 'funded')
    );

    for (const htlc of expiredHTLCs) {
      htlc.status = 'expired';
      this.stopWatchtower(htlc.id);
      this.activeHTLCs.set(htlc.id, htlc);
    }
  }

  private validateHTLCConfig(config: HTLCConfig): void {
    if (!config.secretHash || config.secretHash.length !== 32) {
      throw new Error('Invalid secret hash');
    }
    if (!config.aliceKey || !config.bobKey) {
      throw new Error('Both Alice and Bob key providers required');
    }
    if (config.amount <= 546) {
      throw new Error('Amount must be above dust limit');
    }
    if (config.timelock <= 0) {
      throw new Error('Invalid timelock');
    }
    if (config.feeRate <= 0) {
      throw new Error('Invalid fee rate');
    }
  }

  private getHTLCState(htlcId: string): HTLCState {
    const htlcState = this.activeHTLCs.get(htlcId);
    if (!htlcState) {
      throw new Error(`HTLC ${htlcId} not found`);
    }
    return htlcState;
  }

  private generateHTLCId(): string {
    return `htlc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Example implementation of a secure key provider for browser environments
 */
export class BrowserKeyProvider implements SecureKeyProvider {
  private publicKey: Buffer;
  private address: string;

  constructor(
    private walletAPI: { signPSBT: (psbt: string) => Promise<string>; isHardwareWallet?: boolean }, // Could be MetaMask, hardware wallet API, etc.
    publicKey: Buffer,
    address: string
  ) {
    this.publicKey = publicKey;
    this.address = address;
  }

  async signPSBT(psbt: bitcoin.Psbt, inputIndex: number): Promise<bitcoin.Psbt> {
    // Delegate signing to wallet/hardware device - never expose private key
    const signedPSBT = await this.walletAPI.signPSBT(psbt.toBase64());
    return bitcoin.Psbt.fromBase64(signedPSBT);
  }

  getPublicKey(): Buffer {
    return this.publicKey;
  }

  getAddress(): string {
    return this.address;
  }

  supportsHardwareWallet(): boolean {
    return this.walletAPI.isHardwareWallet || false;
  }
}

export const bitcoinHTLCService = BitcoinHTLCService.getInstance();