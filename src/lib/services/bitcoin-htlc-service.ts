import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

// Helper function to convert Uint8Array to Buffer
function toBuffer(uint8Array: Uint8Array): Buffer {
  return Buffer.from(uint8Array);
}

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

    // Convert hex strings to Buffer and validate public keys
    const secretHashBuffer = Buffer.from(secretHash.slice(2), 'hex'); // Remove '0x' prefix
    
    // Ensure public keys are valid 33-byte compressed format
    let recipientPubKeyBuffer: Buffer;
    let senderPubKeyBuffer: Buffer;
    
    try {
      // Validate input format
      if (!recipientPubKey || !senderPubKey) {
        throw new Error('Both recipient and sender public keys are required');
      }
      
      // Remove '0x' prefix if present
      const cleanRecipientPubKey = recipientPubKey.startsWith('0x') ? recipientPubKey.slice(2) : recipientPubKey;
      const cleanSenderPubKey = senderPubKey.startsWith('0x') ? senderPubKey.slice(2) : senderPubKey;
      
      console.log('Debug - Recipient pubkey (hex):', cleanRecipientPubKey);
      console.log('Debug - Sender pubkey (hex):', cleanSenderPubKey);
      
      recipientPubKeyBuffer = Buffer.from(cleanRecipientPubKey, 'hex');
      senderPubKeyBuffer = Buffer.from(cleanSenderPubKey, 'hex');
      
      console.log('Debug - Recipient pubkey buffer length:', recipientPubKeyBuffer.length);
      console.log('Debug - Sender pubkey buffer length:', senderPubKeyBuffer.length);
      
      // Validate public key lengths (should be 33 bytes for compressed)
      if (recipientPubKeyBuffer.length !== 33) {
        throw new Error(`Invalid recipient public key length: ${recipientPubKeyBuffer.length}, expected 33`);
      }
      if (senderPubKeyBuffer.length !== 33) {
        throw new Error(`Invalid sender public key length: ${senderPubKeyBuffer.length}, expected 33`);
      }
      
      // Validate that they are valid secp256k1 public keys using ECPair
      try {
        const recipientECPair = ECPair.fromPublicKey(recipientPubKeyBuffer);
        console.log('Debug - Recipient ECPair created successfully:', !!recipientECPair);
      } catch (eccError) {
        console.error('Debug - Recipient public key validation failed:', {
          pubkey: cleanRecipientPubKey,
          buffer: recipientPubKeyBuffer,
          length: recipientPubKeyBuffer.length,
          error: eccError
        });
        throw new Error(`Recipient public key validation failed: ${eccError instanceof Error ? eccError.message : 'Invalid secp256k1 point'}`);
      }
      
      try {
        const senderECPair = ECPair.fromPublicKey(senderPubKeyBuffer);
        console.log('Debug - Sender ECPair created successfully:', !!senderECPair);
      } catch (eccError) {
        console.error('Debug - Sender public key validation failed:', {
          pubkey: cleanSenderPubKey,
          buffer: senderPubKeyBuffer,
          length: senderPubKeyBuffer.length,
          error: eccError
        });
        throw new Error(`Sender public key validation failed: ${eccError instanceof Error ? eccError.message : 'Invalid secp256k1 point'}`);
      }
      
    } catch (error) {
      throw new Error(`Public key validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

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
      // Validate UTXO data
      if (!utxo.scriptPubKey || utxo.scriptPubKey.length === 0) {
        throw new Error(`Invalid UTXO: missing or empty scriptPubKey for txid ${utxo.txid}`);
      }
      
      const scriptBuffer = Buffer.from(utxo.scriptPubKey, 'hex');
      if (scriptBuffer.length === 0) {
        throw new Error(`Invalid UTXO: empty script buffer for txid ${utxo.txid}`);
      }
      
      // Check if this is a SegWit output (P2WPKH = 22 bytes starting with 0x00, P2WSH = 34 bytes starting with 0x00)
      const isSegWit = (scriptBuffer.length === 22 || scriptBuffer.length === 34) && scriptBuffer[0] === 0x00;
      
      console.log(`🔍 UTXO script: ${utxo.scriptPubKey} (${scriptBuffer.length} bytes, SegWit: ${isSegWit})`);
      
      if (isSegWit) {
        // SegWit output - use witnessUtxo
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: scriptBuffer,
            value: utxo.value
          }
        });
      } else {
        // Legacy output - we need the full transaction for nonWitnessUtxo
        console.log(`⚠️ Legacy UTXO detected, fetching full transaction data...`);
        try {
          const txData = await this.getTransaction(utxo.txid);
          if (txData && txData.hex) {
            psbt.addInput({
              hash: utxo.txid,
              index: utxo.vout,
              nonWitnessUtxo: Buffer.from(txData.hex, 'hex')
            });
          } else {
            throw new Error(`Could not fetch transaction ${utxo.txid} for legacy UTXO`);
          }
        } catch (error) {
          console.error(`Failed to get transaction ${utxo.txid}:`, error);
          throw new Error(`Legacy UTXO requires full transaction data. Please ensure UTXOs are SegWit outputs.`);
        }
      }
      
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
        pubkey: toBuffer(keyPair.publicKey), 
        network: this.network 
      }).address!;
      
      psbt.addOutput({
        address: senderAddress,
        value: change
      });
    }

    // Sign all inputs based on their type
    for (let i = 0; i < utxos.length; i++) {
      const scriptBuffer = Buffer.from(utxos[i].scriptPubKey, 'hex');
      const isSegWit = (scriptBuffer.length === 22 || scriptBuffer.length === 34) && scriptBuffer[0] === 0x00;
      
      if (isSegWit) {
        // SegWit signing
        psbt.signInput(i, {
          publicKey: toBuffer(keyPair.publicKey),
          sign: (hash: Buffer) => toBuffer(keyPair.sign(hash))
        });
      } else {
        // Legacy signing - set sighash type on the input
        psbt.data.inputs[i].sighashType = bitcoin.Transaction.SIGHASH_ALL;
        psbt.signInput(i, {
          publicKey: toBuffer(keyPair.publicKey),
          sign: (hash: Buffer) => toBuffer(keyPair.sign(hash))
        });
      }
    }

    try {
      psbt.finalizeAllInputs();
      const tx = psbt.extractTransaction();
      
      return {
        txid: tx.getId(),
        hex: tx.toHex(),
        size: tx.byteLength(),
        vsize: tx.virtualSize()
      };
    } catch (error) {
      console.error('❌ Failed to finalize or extract transaction:', error);
      console.error('PSBT data:', psbt.data);
      throw error;
    }
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
    const sighash = bitcoin.Transaction.SIGHASH_ALL;
    const transaction = psbt.extractTransaction(false);
    const hash = transaction.hashForWitnessV0(
      0,
      Buffer.from(witnessScript, 'hex'),
      utxo.value,
      sighash
    );
    
    const signature = bitcoin.script.signature.encode(toBuffer(keyPair.sign(hash)), sighash);
    
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
    const sighash = bitcoin.Transaction.SIGHASH_ALL;
    const refundTransaction = psbt.extractTransaction(false);
    const hash = refundTransaction.hashForWitnessV0(
      0,
      Buffer.from(witnessScript, 'hex'),
      utxo.value,
      sighash
    );
    
    const signature = bitcoin.script.signature.encode(toBuffer(keyPair.sign(hash)), sighash);
    
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
      
      // Filter out UTXOs without scriptPubKey and map the rest
      return utxos
        .filter((utxo: any) => utxo.scriptPubKey && utxo.scriptPubKey.length > 0)
        .map((utxo: any) => ({
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          scriptPubKey: utxo.scriptPubKey
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
    try {
      // Generate a compressed key pair by default
      const keyPair = ECPair.makeRandom({ 
        network: this.network,
        compressed: true  // Ensure compressed format
      });
      
      // Ensure private key is always available
      if (!keyPair.privateKey) {
        throw new Error('Failed to generate private key');
      }
      
      // ECPair.makeRandom with compressed: true should always give us 33-byte public key
      const publicKey = keyPair.publicKey;
      
      console.log('Debug - Generated public key length:', publicKey.length);
      console.log('Debug - Generated public key (hex):', Buffer.from(publicKey).toString('hex'));
      
      // Validate the public key before using it
      if (publicKey.length !== 33) {
        throw new Error(`Invalid public key length: ${publicKey.length}, expected 33 bytes`);
      }
      
      // Validate with ECPair to ensure it's a valid secp256k1 point
      try {
        ECPair.fromPublicKey(publicKey);
      } catch (eccError) {
        throw new Error(`Generated public key validation failed: ${eccError instanceof Error ? eccError.message : 'Invalid key'}`);
      }
      
      const address = bitcoin.payments.p2wpkh({ 
        pubkey: toBuffer(publicKey), 
        network: this.network 
      }).address!;
      
      return {
        privateKey: Buffer.from(keyPair.privateKey).toString('hex'),
        publicKey: Buffer.from(publicKey).toString('hex'),
        address
      };
    } catch (error) {
      console.error('Error generating Bitcoin key pair:', error);
      throw error;
    }
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