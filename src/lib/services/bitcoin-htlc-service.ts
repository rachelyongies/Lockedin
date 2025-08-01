import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { TransactionBuilder } from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

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
}

export class BitcoinHTLCService {
  private network: bitcoin.Network;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  }

  // Generate Bitcoin HTLC address
  generateHTLCAddress(params: BitcoinHTLCParams): BitcoinHTLCResult {
    const { secretHash, recipientPubKey, senderPubKey, timelock } = params;

    // Convert hex strings to Buffer
    const secretHashBuffer = Buffer.from(secretHash.slice(2), 'hex'); // Remove '0x' prefix
    const recipientPubKeyBuffer = Buffer.from(recipientPubKey, 'hex');
    const senderPubKeyBuffer = Buffer.from(senderPubKey, 'hex');

    // Create HTLC redeem script
    const redeemScript = bitcoin.script.compile([
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

    // Create P2WSH address
    const scriptHash = bitcoin.crypto.sha256(redeemScript);
    const address = bitcoin.address.fromOutputScript(
      bitcoin.script.compile([
        bitcoin.opcodes.OP_0,
        scriptHash
      ]),
      this.network
    );

    return {
      address,
      script: redeemScript.toString('hex'),
      redeemScript: redeemScript.toString('hex'),
      witnessScript: redeemScript.toString('hex')
    };
  }

  // Create HTLC spending transaction (for recipient)
  createSpendTransaction(
    htlcAddress: string,
    amount: number, // in satoshis
    recipientAddress: string,
    secret: string,
    redeemScript: string
  ) {
    const txb = new bitcoin.TransactionBuilder(this.network);
    
    // Add input (HTLC output)
    txb.addInput(htlcAddress, 0); // You'll need the actual txid and vout
    
    // Add output to recipient
    txb.addOutput(recipientAddress, amount - 1000); // Subtract fee
    
    // Sign with witness
    const witnessStack = [
      Buffer.from(secret, 'hex'),
      Buffer.from(redeemScript, 'hex')
    ];
    
    return {
      transaction: txb.buildIncomplete(),
      witnessStack
    };
  }

  // Create refund transaction (for sender after timelock)
  createRefundTransaction(
    htlcAddress: string,
    amount: number,
    senderAddress: string,
    redeemScript: string,
    senderPrivateKey: string
  ) {
    const txb = new bitcoin.TransactionBuilder(this.network);
    
    // Add input (HTLC output)
    txb.addInput(htlcAddress, 0);
    
    // Add output to sender
    txb.addOutput(senderAddress, amount - 1000);
    
    // Sign with private key
    const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(senderPrivateKey, 'hex'));
    txb.sign(0, keyPair, redeemScript);
    
    return txb.build();
  }

  // Generate key pair for Bitcoin operations
  generateKeyPair() {
    const keyPair = bitcoin.ECPair.makeRandom({ network: this.network });
    return {
      privateKey: keyPair.privateKey?.toString('hex'),
      publicKey: keyPair.publicKey.toString('hex'),
      address: keyPair.address
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