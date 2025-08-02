import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

// Initialize ECPair factory
const ECPair = ECPairFactory(ecc);

export interface BitcoinHTLCParams {
  secretHash: string;
  recipientPubKey: string;
  senderPubKey: string;
  timelock: number; // Unix timestamp
  network: 'mainnet' | 'testnet';
}

export interface BitcoinHTLCResult {
  address: string;
  script: string;
  redeemScript: string;
  witnessScript: string;
  scriptPubKey: string;
}

export interface BitcoinUTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
  scriptPubKey: string;
}

export interface BitcoinTransactionResult {
  txid: string;
  hex: string;
  size: number;
  vsize: number;
}

export class BitcoinHTLCService {
  private network: bitcoin.Network;
  private rpcUrl: string;
  private isTestnet: boolean;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    this.isTestnet = network === 'testnet';
    this.rpcUrl = this.isTestnet 
      ? 'https://mempool.space/testnet4/api'
      : 'https://mempool.space/api';
  }

  // Generate Bitcoin HTLC address
  generateHTLCAddress(params: BitcoinHTLCParams): BitcoinHTLCResult {
    const { secretHash, recipientPubKey, senderPubKey, timelock } = params;

    // Convert hex strings to Buffer
    const secretHashBuffer = Buffer.from(secretHash.slice(2), 'hex'); // Remove '0x' prefix
    const recipientPubKeyBuffer = Buffer.from(recipientPubKey, 'hex');
    const senderPubKeyBuffer = Buffer.from(senderPubKey, 'hex');

    // Create HTLC redeem script (witness script for P2WSH)
    const witnessScript = bitcoin.script.compile([
      bitcoin.opcodes.OP_IF,
      bitcoin.opcodes.OP_SHA256,
      secretHashBuffer,
      bitcoin.opcodes.OP_EQUALVERIFY,
      recipientPubKeyBuffer,
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ELSE,
      bitcoin.script.number.encode(timelock),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      senderPubKeyBuffer,
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ENDIF
    ]);

    // Create script hash for P2WSH
    const scriptHash = bitcoin.crypto.sha256(witnessScript);
    
    // Create P2WSH output script
    const scriptPubKey = bitcoin.script.compile([
      bitcoin.opcodes.OP_0,
      scriptHash
    ]);

    // Generate P2WSH address
    const address = bitcoin.address.fromOutputScript(scriptPubKey, this.network);

    return {
      address,
      script: witnessScript.toString('hex'),
      redeemScript: witnessScript.toString('hex'), // For compatibility
      witnessScript: witnessScript.toString('hex'),
      scriptPubKey: scriptPubKey.toString('hex')
    };
  }

  // Fund HTLC address by creating transaction to it
  async fundHTLC(
    htlcAddress: string,
    amount: number, // in satoshis
    senderPrivateKey: string,
    utxos: BitcoinUTXO[]
  ): Promise<BitcoinTransactionResult> {
    const keyPair = ECPair.fromPrivateKey(Buffer.from(senderPrivateKey, 'hex'));
    const psbt = new bitcoin.Psbt({ network: this.network });

    let totalInput = 0;
    
    // Add inputs from UTXOs
    for (const utxo of utxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: utxo.value
        }
      });
      totalInput += utxo.value;
    }

    // Add output to HTLC address
    psbt.addOutput({
      address: htlcAddress,
      value: amount
    });

    // Add change output if needed
    const fee = 1000; // 1000 sat fee
    const change = totalInput - amount - fee;
    if (change > 0) {
      const senderAddress = bitcoin.payments.p2wpkh({ 
        pubkey: keyPair.publicKey, 
        network: this.network 
      }).address!;
      
      psbt.addOutput({
        address: senderAddress,
        value: change
      });
    }

    // Sign all inputs
    for (let i = 0; i < utxos.length; i++) {
      psbt.signInput(i, keyPair);
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    
    return {
      txid: tx.getId(),
      hex: tx.toHex(),
      size: tx.byteLength(),
      vsize: tx.virtualSize()
    };
  }

  // Create HTLC spending transaction with secret (for recipient)
  async claimHTLC(
    utxo: BitcoinUTXO,
    recipientAddress: string,
    secret: string,
    witnessScript: string,
    recipientPrivateKey: string
  ): Promise<BitcoinTransactionResult> {
    const keyPair = ECPair.fromPrivateKey(Buffer.from(recipientPrivateKey, 'hex'));
    const psbt = new bitcoin.Psbt({ network: this.network });

    // Add HTLC input
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey, 'hex'),
        value: utxo.value
      },
      witnessScript: Buffer.from(witnessScript, 'hex')
    });

    // Add output to recipient
    const fee = 1000; // 1000 sat fee
    psbt.addOutput({
      address: recipientAddress,
      value: utxo.value - fee
    });

    // Custom signing for HTLC (secret path)
    const sighash = psbt.data.inputs[0].sighash || bitcoin.Transaction.SIGHASH_ALL;
    const transaction = psbt.extractTransaction(false);
    const hash = transaction.hashForWitnessV0(
      0,
      Buffer.from(witnessScript, 'hex'),
      utxo.value,
      sighash
    );
    
    const signature = bitcoin.script.signature.encode(keyPair.sign(hash), sighash);
    
    // Witness stack: [signature] [secret] [1] [witnessScript]
    const witness = [
      signature,
      Buffer.from(secret.slice(2), 'hex'), // Remove 0x prefix
      Buffer.from([0x01]), // OP_TRUE for IF path
      Buffer.from(witnessScript, 'hex')
    ];

    // Manually set witness for the transaction
    transaction.setWitness(0, witness);
    
    return {
      txid: transaction.getId(),
      hex: transaction.toHex(),
      size: transaction.byteLength(),
      vsize: transaction.virtualSize()
    };
  }

  // Create refund transaction (for sender after timelock)
  async refundHTLC(
    utxo: BitcoinUTXO,
    senderAddress: string,
    witnessScript: string,
    senderPrivateKey: string,
    timelock: number
  ): Promise<BitcoinTransactionResult> {
    const keyPair = ECPair.fromPrivateKey(Buffer.from(senderPrivateKey, 'hex'));
    const psbt = new bitcoin.Psbt({ network: this.network });

    // Set sequence to enable timelock
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      sequence: 0xfffffffe, // Enable RBF and timelock
      witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey, 'hex'),
        value: utxo.value
      },
      witnessScript: Buffer.from(witnessScript, 'hex')
    });

    // Set locktime
    psbt.setLocktime(timelock);

    // Add output to sender
    const fee = 1000; // 1000 sat fee
    psbt.addOutput({
      address: senderAddress,
      value: utxo.value - fee
    });

    // Custom signing for HTLC (timeout path)
    const sighash = psbt.data.inputs[0].sighash || bitcoin.Transaction.SIGHASH_ALL;
    const refundTransaction = psbt.extractTransaction(false);
    const hash = refundTransaction.hashForWitnessV0(
      0,
      Buffer.from(witnessScript, 'hex'),
      utxo.value,
      sighash
    );
    
    const signature = bitcoin.script.signature.encode(keyPair.sign(hash), sighash);
    
    // Witness stack: [signature] [0] [witnessScript] (ELSE path)
    const witness = [
      signature,
      Buffer.from([]), // OP_FALSE for ELSE path
      Buffer.from(witnessScript, 'hex')
    ];

    // Manually set witness for the refund transaction
    refundTransaction.setWitness(0, witness);
    
    return {
      txid: refundTransaction.getId(),
      hex: refundTransaction.toHex(),
      size: refundTransaction.byteLength(),
      vsize: refundTransaction.virtualSize()
    };
  }

  // Broadcast transaction to Bitcoin network
  async broadcastTransaction(txHex: string): Promise<string> {
    try {
      const response = await fetch(`${this.rpcUrl}/tx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: txHex
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to broadcast transaction: ${errorText}`);
      }

      const txid = await response.text();
      return txid;
    } catch (error) {
      console.error('Transaction broadcast failed:', error);
      throw error;
    }
  }

  // Get UTXOs for an address
  async getAddressUTXOs(address: string): Promise<BitcoinUTXO[]> {
    try {
      const response = await fetch(`${this.rpcUrl}/address/${address}/utxo`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
      }

      const utxos = await response.json();
      
      return utxos.map((utxo: any) => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        scriptPubKey: utxo.scriptPubKey || ''
      }));
    } catch (error) {
      console.error('Failed to get UTXOs:', error);
      throw error;
    }
  }

  // Get transaction details
  async getTransaction(txid: string): Promise<any> {
    try {
      const response = await fetch(`${this.rpcUrl}/tx/${txid}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get transaction:', error);
      throw error;
    }
  }

  // Check if HTLC has been funded
  async isHTLCFunded(address: string): Promise<{ funded: boolean; amount: number; utxo?: BitcoinUTXO }> {
    try {
      const utxos = await this.getAddressUTXOs(address);
      
      if (utxos.length === 0) {
        return { funded: false, amount: 0 };
      }

      // Return the first UTXO (in real implementation, you might want to handle multiple)
      const utxo = utxos[0];
      return {
        funded: true,
        amount: utxo.value,
        utxo
      };
    } catch (error) {
      console.error('Failed to check HTLC funding:', error);
      return { funded: false, amount: 0 };
    }
  }

  // Generate key pair for Bitcoin operations
  generateKeyPair() {
    const keyPair = ECPair.makeRandom({ network: this.network });
    const address = bitcoin.payments.p2wpkh({ 
      pubkey: keyPair.publicKey, 
      network: this.network 
    }).address!;
    
    return {
      privateKey: keyPair.privateKey?.toString('hex'),
      publicKey: keyPair.publicKey.toString('hex'),
      address
    };
  }

  // Validate Bitcoin address
  validateAddress(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address, this.network);
      return true;
    } catch {
      return false;
    }
  }

  // Get network info
  getNetworkInfo() {
    return {
      name: this.network === bitcoin.networks.bitcoin ? 'mainnet' : 'testnet',
      bech32: this.network.bech32,
      pubKeyHash: this.network.pubKeyHash,
      scriptHash: this.network.scriptHash
    };
  }
}

// Factory function
export function createBitcoinHTLCService(network: 'mainnet' | 'testnet' = 'testnet'): BitcoinHTLCService {
  return new BitcoinHTLCService(network);
}