import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import { ECPairFactory } from 'ecpair';

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: string;
  confirmations: number;
  address?: string;
}

export interface BitcoinTransaction {
  txid: string;
  hex: string;
  confirmations: number;
  blockHash?: string;
  blockTime?: number;
  inputs: Array<{
    txid: string;
    vout: number;
    scriptSig: string;
    sequence: number;
    witness?: string[];
  }>;
  outputs: Array<{
    value: number;
    scriptPubKey: string;
    address?: string;
  }>;
}

export interface HTLCScript {
  script: Buffer;
  address: string;
  redeemScript: Buffer;
  isValid: boolean;
  p2shAddress?: string;
  bip21Uri: string;
  qrData: string;
  scriptHash: string; // For replay detection
}

export interface HTLCMonitorResult {
  status: 'pending' | 'claimed' | 'refunded' | 'expired';
  txid?: string;
  blockHeight?: number;
  secret?: Buffer;
  spendingTx?: BitcoinTransaction;
}

export interface FeeEstimates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface TransactionResult {
  txid: string;
  hex: string;
  fee: number;
  size: number;
  virtualSize: number;
  weight: number;
}

export interface BroadcastResult {
  txid: string;
  success: boolean;
  alreadyBroadcast: boolean;
  error?: string;
}

export enum BitcoinNetwork {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  REGTEST = 'regtest'
}

export class BitcoinNetworkService {
  private static instance: BitcoinNetworkService;
  private network: bitcoin.Network;
  private networkType: BitcoinNetwork;
  private apiUrls: string[];
  private currentApiIndex = 0;
  private retryAttempts = 3;
  private retryDelay = 1000;
  private usedScriptHashes = new Set<string>(); // Replay protection
  private redeemedScriptHashes = new Set<string>(); // Enforce single use after redemption

  constructor(networkType: BitcoinNetwork = BitcoinNetwork.TESTNET) {
    this.networkType = networkType;
    this.network = this.getNetworkConfig(networkType);
    this.apiUrls = this.getApiUrls(networkType);
  }

  static getInstance(networkType?: BitcoinNetwork): BitcoinNetworkService {
    if (!BitcoinNetworkService.instance) {
      BitcoinNetworkService.instance = new BitcoinNetworkService(networkType);
    }
    return BitcoinNetworkService.instance;
  }

  private getNetworkConfig(networkType: BitcoinNetwork): bitcoin.Network {
    switch (networkType) {
      case BitcoinNetwork.MAINNET:
        return bitcoin.networks.bitcoin;
      case BitcoinNetwork.TESTNET:
        return bitcoin.networks.testnet;
      case BitcoinNetwork.REGTEST:
        return bitcoin.networks.regtest;
      default:
        return bitcoin.networks.testnet;
    }
  }

  private getApiUrls(networkType: BitcoinNetwork): string[] {
    switch (networkType) {
      case BitcoinNetwork.MAINNET:
        return [
          'https://blockstream.info/api',
          'https://mempool.space/api',
          'https://api.blockcypher.com/v1/btc/main'
        ];
      case BitcoinNetwork.TESTNET:
        return [
          'https://blockstream.info/testnet/api',
          'https://mempool.space/testnet/api',
          'https://api.blockcypher.com/v1/btc/test3'
        ];
      default:
        return ['https://blockstream.info/testnet/api'];
    }
  }

  private generateBIP21URI(address: string, amount?: number, label?: string, message?: string): string {
    let uri = `bitcoin:${address}`;
    const params = new URLSearchParams();

    if (amount) {
      params.append('amount', (amount / 100000000).toString()); // Convert satoshi to BTC
    }
    if (label) {
      params.append('label', label);
    }
    if (message) {
      params.append('message', message);
    }

    const paramString = params.toString();
    if (paramString) {
      uri += `?${paramString}`;
    }

    return uri;
  }

  private async makeApiRequestWithFallback(endpoint: string, options?: RequestInit): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      for (let apiIndex = 0; apiIndex < this.apiUrls.length; apiIndex++) {
        try {
          const currentIndex = (this.currentApiIndex + apiIndex) % this.apiUrls.length;
          const url = `${this.apiUrls[currentIndex]}${endpoint}`;
          
          const response = await fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options?.headers,
            },
            signal: AbortSignal.timeout(10000),
          });

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }

          this.currentApiIndex = currentIndex;
          return await response.json();
        } catch (error) {
          lastError = error as Error;
          console.warn(`API request failed (attempt ${attempt + 1}, API ${apiIndex + 1}):`, error);
        }
      }

      if (attempt < this.retryAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
      }
    }

    throw new Error(`All API endpoints failed. Last error: ${lastError?.message}`);
  }

  generateKeyPair(mnemonic?: string): { privateKey: Buffer; publicKey: Buffer; address: string; mnemonic: string } {
    let actualMnemonic: string;
    let seed: Buffer;
    
    if (mnemonic) {
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }
      actualMnemonic = mnemonic;
      seed = bip39.mnemonicToSeedSync(mnemonic);
    } else {
      actualMnemonic = bip39.generateMnemonic();
      seed = bip39.mnemonicToSeedSync(actualMnemonic);
    }

    const root = bip32.fromSeed(seed, this.network);
    const path = this.networkType === BitcoinNetwork.MAINNET ? "m/84'/0'/0'/0/0" : "m/84'/1'/0'/0/0";
    const child = root.derivePath(path);

    if (!child.privateKey || !child.publicKey) {
      throw new Error('Failed to generate key pair');
    }

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: this.network,
    });

    if (!address) {
      throw new Error('Failed to generate address');
    }

    return {
      privateKey: child.privateKey,
      publicKey: child.publicKey,
      address,
      mnemonic: actualMnemonic,
    };
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    try {
      const utxos = await this.makeApiRequestWithFallback(`/address/${address}/utxo`);
      
      return utxos.map((utxo: any) => {
        const scriptPubKey = this.getScriptPubKeyFromAddress(address);
        
        return {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          scriptPubKey: scriptPubKey || utxo.scriptpubkey || utxo.script,
          confirmations: utxo.status?.confirmed ? (utxo.status.block_height || 1) : 0,
          address,
        };
      });
    } catch (error) {
      console.error('Failed to fetch UTXOs:', error);
      return [];
    }
  }

  private getScriptPubKeyFromAddress(address: string): string {
    try {
      const script = bitcoin.address.toOutputScript(address, this.network);
      return script.toString('hex');
    } catch (error) {
      console.error('Failed to reconstruct scriptPubKey:', error);
      return '';
    }
  }

  async getTransaction(txid: string): Promise<BitcoinTransaction | null> {
    try {
      const tx = await this.makeApiRequestWithFallback(`/tx/${txid}`);
      
      return {
        txid: tx.txid,
        hex: tx.hex || '',
        confirmations: tx.status?.confirmed ? (tx.status.block_height || 1) : 0,
        blockHash: tx.status?.block_hash,
        blockTime: tx.status?.block_time,
        inputs: tx.vin?.map((input: any) => ({
          txid: input.txid,
          vout: input.vout,
          scriptSig: input.scriptsig || '',
          sequence: input.sequence || 0xffffffff,
          witness: input.witness || [],
        })) || [],
        outputs: tx.vout?.map((output: any) => ({
          value: output.value,
          scriptPubKey: output.scriptpubkey || '',
          address: output.scriptpubkey_address,
        })) || [],
      };
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
      return null;
    }
  }

  async broadcastTransaction(txHex: string, expectedTxid?: string): Promise<BroadcastResult> {
    let lastError: Error | null = null;

    // Validate transaction before broadcasting
    try {
      const tx = bitcoin.Transaction.fromHex(txHex);
      const actualTxid = tx.getId();
      
      if (expectedTxid && actualTxid !== expectedTxid) {
        throw new Error(`Transaction ID mismatch. Expected: ${expectedTxid}, Got: ${actualTxid}`);
      }
    } catch (error) {
      return {
        txid: '',
        success: false,
        alreadyBroadcast: false,
        error: `Invalid transaction hex: ${error}`,
      };
    }

    for (const apiUrl of this.apiUrls) {
      try {
        const response = await fetch(`${apiUrl}/tx`, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: txHex,
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          const txid = await response.text();
          return {
            txid: txid.trim(),
            success: true,
            alreadyBroadcast: false,
          };
        } else if (response.status === 409) {
          // Transaction already in mempool/blockchain
          const errorText = await response.text();
          const tx = bitcoin.Transaction.fromHex(txHex);
          const txid = tx.getId();
          
          return {
            txid,
            success: true,
            alreadyBroadcast: true,
            error: errorText,
          };
        } else {
          const errorText = await response.text();
          throw new Error(`Transaction broadcast failed: ${response.status} ${errorText}`);
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Broadcast failed on ${apiUrl}:`, error);
      }
    }

    return {
      txid: '',
      success: false,
      alreadyBroadcast: false,
      error: `Transaction broadcast failed on all APIs. Last error: ${lastError?.message}`,
    };
  }

  buildHTLCScript(
    secretHash: Buffer,
    alicePubkey: Buffer,
    bobPubkey: Buffer,
    timelock: number,
    amount?: number,
    useP2SH: boolean = false
  ): HTLCScript {
    // Validate inputs
    if (secretHash.length !== 32) {
      throw new Error('Secret hash must be 32 bytes');
    }
    if (alicePubkey.length !== 33 && alicePubkey.length !== 65) {
      throw new Error('Invalid Alice public key length');
    }
    if (bobPubkey.length !== 33 && bobPubkey.length !== 65) {
      throw new Error('Invalid Bob public key length');
    }
    if (timelock <= 0 || timelock > 0xffffffff) {
      throw new Error('Invalid timelock value');
    }

    // Ensure compressed public keys
    const compressedAlice = alicePubkey.length === 65 ? 
      Buffer.from(ECPair.fromPublicKey(alicePubkey).publicKey) : alicePubkey;
    const compressedBob = bobPubkey.length === 65 ? 
      Buffer.from(ECPair.fromPublicKey(bobPubkey).publicKey) : bobPubkey;

    const script = bitcoin.script.compile([
      bitcoin.opcodes.OP_IF,
        bitcoin.opcodes.OP_SHA256,
        secretHash,
        bitcoin.opcodes.OP_EQUALVERIFY,
        compressedBob,
        bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ELSE,
        bitcoin.script.number.encode(timelock),
        bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
        bitcoin.opcodes.OP_DROP,
        compressedAlice,
        bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ENDIF,
    ]);

    // Generate script hash for replay protection
    const scriptHash = bitcoin.crypto.sha256(script).toString('hex');
    
    // Check for replay attacks
    if (this.redeemedScriptHashes.has(scriptHash)) {
      throw new Error('🚨 SECURITY ERROR: Attempted reuse of already-redeemed HTLC script! This is not allowed.');
    }
    
    if (this.usedScriptHashes.has(scriptHash)) {
      console.warn('⚠️ SECURITY WARNING: HTLC script reuse detected! Scripts must be single-use or UTXO must be watched post-redeem.');
    }
    this.usedScriptHashes.add(scriptHash);

    let isValid = false;
    let address = '';
    let p2shAddress: string | undefined;

    try {
      if (useP2SH) {
        const p2sh = bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2wsh({
            redeem: { output: script },
            network: this.network,
          }),
          network: this.network,
        });
        
        if (p2sh.address) {
          p2shAddress = p2sh.address;
          address = p2sh.address;
          isValid = true;
        }
      } else {
        const payment = bitcoin.payments.p2wsh({
          redeem: { output: script },
          network: this.network,
        });

        if (payment.address) {
          address = payment.address;
          isValid = true;
        }
      }
    } catch (error) {
      console.error('Invalid HTLC script:', error);
    }

    // Generate BIP21 URI and QR data
    const bip21Uri = this.generateBIP21URI(
      address,
      amount,
      'HTLC Deposit',
      `Hash Time-Locked Contract - Timelock: ${timelock}`
    );

    const qrData = JSON.stringify({
      type: 'bitcoin-htlc',
      address,
      amount,
      timelock,
      secretHash: secretHash.toString('hex'),
      uri: bip21Uri,
    });

    return {
      script,
      address,
      redeemScript: script,
      isValid,
      p2shAddress,
      bip21Uri,
      qrData,
      scriptHash,
    };
  }

  async createHTLCTransaction(
    utxos: UTXO[],
    htlcAddress: string,
    changeAddress: string,
    amount: number,
    feeRate: number = 10
  ): Promise<{ psbt: bitcoin.Psbt; estimatedFee: number; actualFee: number }> {
    if (!this.validateAddress(htlcAddress)) {
      throw new Error('Invalid HTLC address');
    }
    if (!this.validateAddress(changeAddress)) {
      throw new Error('Invalid change address');
    }
    if (amount <= 546) {
      throw new Error('Amount below dust limit (546 sats)');
    }

    const psbt = new bitcoin.Psbt({ network: this.network });
    
    let totalInput = 0;
    for (const utxo of utxos) {
      const tx = await this.getTransaction(utxo.txid);
      if (!tx) {
        throw new Error(`Failed to fetch transaction ${utxo.txid}`);
      }

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: utxo.value,
        },
      });

      totalInput += utxo.value;
    }

    const estimatedSize = await this.estimateTransactionSize(utxos.length, 2);
    const estimatedFee = Math.ceil(estimatedSize * feeRate);

    if (totalInput < amount + estimatedFee) {
      throw new Error(`Insufficient funds. Need: ${amount + estimatedFee}, Have: ${totalInput}`);
    }

    psbt.addOutput({
      address: htlcAddress,
      value: amount,
    });

    const change = totalInput - amount - estimatedFee;
    if (change > 546) {
      psbt.addOutput({
        address: changeAddress,
        value: change,
      });
    }

    const actualFee = totalInput - amount - (change > 546 ? change : 0);

    return { psbt, estimatedFee, actualFee };
  }

  private validatePSBTBeforeBroadcast(psbt: bitcoin.Psbt): void {
    try {
      // Validate all signatures with ecc library
      const isValid = psbt.validateSignaturesOfAllInputs(ecc.verify);
      if (!isValid) {
        throw new Error('Invalid signatures detected');
      }

      // Additional validation
      const tx = psbt.extractTransaction();
      
      // Check for reasonable fee
      let totalInput = 0;
      let totalOutput = 0;
      
      for (let i = 0; i < psbt.inputCount; i++) {
        const input = psbt.data.inputs[i];
        if (input.witnessUtxo) {
          totalInput += input.witnessUtxo.value;
        }
      }
      
      for (const output of tx.outs) {
        totalOutput += output.value;
      }
      
      const fee = totalInput - totalOutput;
      const feeRate = fee / tx.virtualSize();
      
      if (feeRate > 1000) { // More than 1000 sat/vB seems excessive
        throw new Error(`Fee rate too high: ${feeRate.toFixed(2)} sat/vB`);
      }
      
      if (fee < 0) {
        throw new Error('Negative fee detected');
      }
      
    } catch (error) {
      throw new Error(`PSBT validation failed: ${error}`);
    }
  }

  private async estimateDynamicFee(psbt: bitcoin.Psbt, feeRate: number): Promise<number> {
    try {
      // Create a copy for size estimation
      const testPsbt = psbt.clone();
      
      // Sign with dummy signatures to estimate size
      for (let i = 0; i < testPsbt.inputCount; i++) {
        try {
          // Add dummy signature for size estimation
          const dummySig = Buffer.alloc(72, 0x01); // Max signature size
          testPsbt.updateInput(i, {
            partialSig: [{
              pubkey: Buffer.alloc(33, 0x02),
              signature: dummySig,
            }],
          });
        } catch {
          // Ignore errors in dummy signing
        }
      }
      
      // Estimate final transaction size
      const estimatedSize = testPsbt.extractTransaction().virtualSize();
      
      // Get current mempool conditions for dynamic adjustment
      const mempoolStats = await this.getMempoolStats();
      const adjustedFeeRate = Math.ceil(feeRate * mempoolStats.congestionMultiplier);
      
      return Math.ceil(estimatedSize * adjustedFeeRate);
    } catch {
      // Fallback to static estimation with some buffer
      const mempoolStats = await this.getMempoolStats().catch(() => ({ congestionMultiplier: 1.0, vsize: 0 }));
      return Math.ceil(150 * feeRate * mempoolStats.congestionMultiplier);
    }
  }

  async buildAndBroadcastClaimTransaction(
    htlcTxid: string,
    htlcVout: number,
    htlcValue: number,
    htlcScript: Buffer,
    secret: Buffer,
    bobPrivateKey: Buffer,
    bobAddress: string,
    timelock: number,
    feeRate: number = 10
  ): Promise<TransactionResult> {
    // Validate timelock hasn't expired
    const currentHeight = await this.getCurrentBlockHeight();
    if (currentHeight >= timelock) {
      throw new Error('HTLC timelock has expired, cannot claim');
    }

    if (secret.length !== 32) {
      throw new Error('Secret must be 32 bytes');
    }

    const psbt = new bitcoin.Psbt({ network: this.network });

    psbt.addInput({
      hash: htlcTxid,
      index: htlcVout,
      witnessUtxo: {
        script: bitcoin.payments.p2wsh({
          redeem: { output: htlcScript },
          network: this.network,
        }).output!,
        value: htlcValue,
      },
      witnessScript: htlcScript,
    });

    // Dynamic fee estimation
    const estimatedFee = await this.estimateDynamicFee(psbt, feeRate);
    const outputValue = htlcValue - estimatedFee;

    if (outputValue <= 546) {
      throw new Error('Output value too low (dust limit)');
    }

    psbt.addOutput({
      address: bobAddress,
      value: outputValue,
    });

    const keyPair = ECPair.fromPrivateKey(bobPrivateKey, { network: this.network });
    // Convert ECPair to proper Signer interface
    const signer = {
      publicKey: Buffer.from(keyPair.publicKey),
      sign: (hash: Buffer) => Buffer.from(keyPair.sign(hash))
    };
    psbt.signInput(0, signer, [bitcoin.Transaction.SIGHASH_ALL]);

    // Validate before finalizing
    this.validatePSBTBeforeBroadcast(psbt);

    psbt.finalizeInput(0, (_inputIndex: number, input: any) => {
      const signature = input.partialSig?.[0]?.signature;
      if (!signature) {
        throw new Error('Missing signature');
      }

      return {
        finalScriptWitness: bitcoin.script.compile([
          signature,
          secret,
          Buffer.from([0x01]), // OP_TRUE - select claim path in HTLC script
          htlcScript,
        ]),
      };
    });

    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    const broadcastResult = await this.broadcastTransaction(txHex, tx.getId());

    if (!broadcastResult.success) {
      throw new Error(`Broadcast failed: ${broadcastResult.error}`);
    }

    // Mark script as redeemed to prevent reuse
    const scriptHash = bitcoin.crypto.sha256(htlcScript).toString('hex');
    this.redeemedScriptHashes.add(scriptHash);

    return {
      txid: broadcastResult.txid,
      hex: txHex,
      fee: estimatedFee,
      size: tx.byteLength(),
      virtualSize: tx.virtualSize(),
      weight: tx.weight(),
    };
  }

  async buildAndBroadcastRefundTransaction(
    htlcTxid: string,
    htlcVout: number,
    htlcValue: number,
    htlcScript: Buffer,
    alicePrivateKey: Buffer,
    aliceAddress: string,
    timelock: number,
    feeRate: number = 10
  ): Promise<TransactionResult> {
    const currentHeight = await this.getCurrentBlockHeight();
    if (currentHeight < timelock) {
      throw new Error(`HTLC timelock not yet expired. Current: ${currentHeight}, Timelock: ${timelock}`);
    }

    const psbt = new bitcoin.Psbt({ network: this.network });

    psbt.addInput({
      hash: htlcTxid,
      index: htlcVout,
      // sequence: 0xfffffffe is required for CHECKLOCKTIMEVERIFY
      // This enables relative time locks and is best practice for refund transactions
      // 0xfffffffe = 4294967294, which signals RBF is disabled but CSV is enabled
      sequence: 0xfffffffe,
      witnessUtxo: {
        script: bitcoin.payments.p2wsh({
          redeem: { output: htlcScript },
          network: this.network,
        }).output!,
        value: htlcValue,
      },
      witnessScript: htlcScript,
    });

    const estimatedFee = await this.estimateDynamicFee(psbt, feeRate);
    const outputValue = htlcValue - estimatedFee;

    if (outputValue <= 546) {
      throw new Error('Output value too low (dust limit)');
    }

    psbt.addOutput({
      address: aliceAddress,
      value: outputValue,
    });

    const keyPair = ECPair.fromPrivateKey(alicePrivateKey, { network: this.network });
    // Convert ECPair to proper Signer interface
    const signer = {
      publicKey: Buffer.from(keyPair.publicKey),
      sign: (hash: Buffer) => Buffer.from(keyPair.sign(hash))
    };
    psbt.signInput(0, signer, [bitcoin.Transaction.SIGHASH_ALL]);

    this.validatePSBTBeforeBroadcast(psbt);

    psbt.finalizeInput(0, (_inputIndex: number, input: any) => {
      const signature = input.partialSig?.[0]?.signature;
      if (!signature) {
        throw new Error('Missing signature');
      }

      return {
        finalScriptWitness: bitcoin.script.compile([
          signature,
          Buffer.from([0x00]), // OP_FALSE - select refund path in HTLC script
          htlcScript,
        ]),
      };
    });

    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    const broadcastResult = await this.broadcastTransaction(txHex, tx.getId());

    if (!broadcastResult.success) {
      throw new Error(`Broadcast failed: ${broadcastResult.error}`);
    }

    // Mark script as redeemed to prevent reuse
    const scriptHash = bitcoin.crypto.sha256(htlcScript).toString('hex');
    this.redeemedScriptHashes.add(scriptHash);

    return {
      txid: broadcastResult.txid,
      hex: txHex,
      fee: estimatedFee,
      size: tx.byteLength(),
      virtualSize: tx.virtualSize(),
      weight: tx.weight(),
    };
  }

  async monitorHTLC(
    htlcAddress: string,
    secretHash: Buffer,
    timelock: number
  ): Promise<HTLCMonitorResult> {
    try {
      const utxos = await this.getUTXOs(htlcAddress);
      const currentHeight = await this.getCurrentBlockHeight();

      if (utxos.length === 0) {
        const spendingTx = await this.findSpendingTransaction(htlcAddress);
        
        if (spendingTx) {
          const secret = this.extractSecretFromTransaction(spendingTx, secretHash);
          
          if (secret) {
            return {
              status: 'claimed',
              txid: spendingTx.txid,
              blockHeight: spendingTx.confirmations,
              secret,
              spendingTx,
            };
          } else {
            return {
              status: 'refunded',
              txid: spendingTx.txid,
              blockHeight: spendingTx.confirmations,
              spendingTx,
            };
          }
        }
      }

      if (currentHeight >= timelock) {
        return { status: 'expired' };
      }

      return { status: 'pending' };
    } catch (error) {
      console.error('Failed to monitor HTLC:', error);
      return { status: 'pending' };
    }
  }

  private async findSpendingTransaction(address: string): Promise<BitcoinTransaction | null> {
    try {
      const addressInfo = await this.makeApiRequestWithFallback(`/address/${address}`);
      
      if (addressInfo.chain_stats?.spent_txo_count > 0) {
        const txs = await this.makeApiRequestWithFallback(`/address/${address}/txs`);
        
        for (const tx of txs) {
          for (const input of tx.vin || []) {
            const prevOut = await this.getTransaction(input.txid);
            if (prevOut?.outputs[input.vout]?.address === address) {
              return await this.getTransaction(tx.txid);
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to find spending transaction:', error);
      return null;
    }
  }

  private extractSecretFromTransaction(tx: BitcoinTransaction, expectedSecretHash: Buffer): Buffer | null {
    try {
      for (const input of tx.inputs) {
        if (input.witness && input.witness.length > 0) {
          if (input.witness.length >= 2) {
            const potentialSecret = Buffer.from(input.witness[1], 'hex');
            
            if (potentialSecret.length === 32) {
              const hash = bitcoin.crypto.sha256(potentialSecret);
              if (hash.equals(expectedSecretHash)) {
                return potentialSecret;
              }
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to extract secret:', error);
      return null;
    }
  }

  async getCurrentBlockHeight(): Promise<number> {
    let lastError: Error | null = null;
    
    // Retry block height fetching with extra attempts due to security criticality
    for (let attempt = 0; attempt < this.retryAttempts + 2; attempt++) {
      try {
        const blockTip = await this.makeApiRequestWithFallback('/blocks/tip/height');
        const height = typeof blockTip === 'number' ? blockTip : parseInt(blockTip);
        
        if (isNaN(height) || height <= 0) {
          throw new Error(`Invalid block height received: ${blockTip}`);
        }
        
        return height;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Block height fetch attempt ${attempt + 1} failed:`, error);
        
        if (attempt < this.retryAttempts + 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }
    
    // Critical: Don't return 0, throw error instead to prevent accidental unlocks
    throw new Error(`🚨 CRITICAL: Failed to get block height after ${this.retryAttempts + 2} attempts. Last error: ${lastError?.message}. Cannot proceed with timelock operations.`);
  }

  async getFeeEstimate(): Promise<FeeEstimates> {
    try {
      // Try multiple fee estimation methods for better accuracy
      const [fees, mempoolStats] = await Promise.allSettled([
        this.makeApiRequestWithFallback('/fee-estimates'),
        this.getMempoolStats(),
      ]);
      
      let baseFees = {
        fastestFee: 20,
        halfHourFee: 15,
        hourFee: 10,
        economyFee: 5,
        minimumFee: 1,
      };
      
      // Parse fee estimates
      if (fees.status === 'fulfilled') {
        baseFees = {
          fastestFee: fees.value['1'] || 20,
          halfHourFee: fees.value['3'] || 15,
          hourFee: fees.value['6'] || 10,
          economyFee: fees.value['144'] || 5,
          minimumFee: 1,
        };
      }
      
      // Apply mempool pressure adjustments
      if (mempoolStats.status === 'fulfilled') {
        const { congestionMultiplier } = mempoolStats.value;
        baseFees.fastestFee = Math.ceil(baseFees.fastestFee * congestionMultiplier);
        baseFees.halfHourFee = Math.ceil(baseFees.halfHourFee * congestionMultiplier);
        baseFees.hourFee = Math.ceil(baseFees.hourFee * congestionMultiplier);
      }
      
      return baseFees;
    } catch (error) {
      console.error('Failed to get fee estimates:', error);
      return {
        fastestFee: 20,
        halfHourFee: 15,
        hourFee: 10,
        economyFee: 5,
        minimumFee: 1,
      };
    }
  }

  private async getMempoolStats(): Promise<{ congestionMultiplier: number; vsize: number }> {
    try {
      const mempool = await this.makeApiRequestWithFallback('/mempool');
      const vsize = mempool.vsize || 0;
      
      // Calculate congestion multiplier based on mempool size
      // Normal mempool: ~50MB, Congested: >100MB, Very congested: >200MB
      let congestionMultiplier = 1.0;
      
      if (vsize > 200000000) { // >200MB
        congestionMultiplier = 2.0;
      } else if (vsize > 100000000) { // >100MB
        congestionMultiplier = 1.5;
      } else if (vsize > 50000000) { // >50MB
        congestionMultiplier = 1.2;
      }
      
      return { congestionMultiplier, vsize };
    } catch (error) {
      console.warn('Failed to get mempool stats:', error);
      return { congestionMultiplier: 1.0, vsize: 0 };
    }
  }

  generateSecret(): { secret: Buffer; hash: Buffer } {
    const secret = Buffer.allocUnsafe(32);
    require('crypto').randomFillSync(secret);
    
    const hash = bitcoin.crypto.sha256(secret);
    
    return { secret, hash };
  }

  validateSecretHash(secret: Buffer, expectedHash: Buffer): boolean {
    if (secret.length !== 32 || expectedHash.length !== 32) {
      return false;
    }
    
    const actualHash = bitcoin.crypto.sha256(secret);
    return actualHash.equals(expectedHash);
  }

  validateAddress(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address, this.network);
      return true;
    } catch {
      return false;
    }
  }

  async estimateTransactionSize(inputCount: number, outputCount: number): Promise<number> {
    const baseSize = 10;
    const inputSize = inputCount * 68;
    const outputSize = outputCount * 31;
    const witnessSize = inputCount * 107;
    
    return baseSize + inputSize + outputSize + Math.ceil(witnessSize / 4);
  }

  getNetworkInfo(): { network: BitcoinNetwork; isTestnet: boolean; chainParams: bitcoin.Network } {
    return {
      network: this.networkType,
      isTestnet: this.networkType !== BitcoinNetwork.MAINNET,
      chainParams: this.network,
    };
  }
}

export const bitcoinNetworkService = BitcoinNetworkService.getInstance();