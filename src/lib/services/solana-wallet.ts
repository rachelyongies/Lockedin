import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

// Solana wallet service
export class SolanaWalletService {
  private connection: Connection;
  private wallet: {
    connect: () => Promise<{ publicKey: { toString: () => string } }>;
    disconnect: () => Promise<void>;
    signTransaction: (transaction: unknown) => Promise<unknown>;
    signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array; publicKey: string }>;
    publicKey?: { toString: () => string };
    isConnected?: boolean;
  } | null = null; // Phantom wallet

  constructor() {
    // Use mainnet-beta for production, devnet for testing
    const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'devnet' | 'testnet' | 'mainnet-beta';
    this.connection = new Connection(clusterApiUrl(network));
  }

  // Check if Phantom wallet is installed
  isPhantomInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.solana !== 'undefined';
  }

  // Connect to Phantom wallet
  async connectToPhantom(): Promise<{
    publicKey: PublicKey;
    address: string;
    network: string;
  }> {
    if (!this.isPhantomInstalled()) {
      throw new Error('Phantom wallet is not installed. Please install it from https://phantom.app/');
    }

    try {
      // Connect to Phantom
      if (!window.solana) {
        throw new Error('Phantom wallet is not installed');
      }
      const response = await window.solana.connect();
      const publicKey = new PublicKey(response.publicKey.toString());
      
      this.wallet = (typeof window !== 'undefined' && window.solana) || null;

      return {
        publicKey,
        address: publicKey.toString(),
        network: this.connection.rpcEndpoint
      };
    } catch (error) {
      console.error('Error connecting to Phantom:', error);
      throw new Error('Failed to connect to Phantom wallet');
    }
  }

  // Disconnect from Phantom wallet
  async disconnectFromPhantom(): Promise<void> {
    if (this.wallet) {
      try {
        await this.wallet.disconnect();
        this.wallet = null;
      } catch (error) {
        console.error('Error disconnecting from Phantom:', error);
        throw new Error('Failed to disconnect from Phantom wallet');
      }
    }
  }

  // Get wallet balance
  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  // Sign a transaction
  async signTransaction(transaction: unknown): Promise<unknown> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.wallet.signTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw new Error('Failed to sign transaction');
    }
  }

  // Sign a message
  async signMessage(message: Uint8Array): Promise<{
    signature: Uint8Array;
    publicKey: PublicKey;
  }> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await this.wallet.signMessage(message, 'utf8');
      return {
        signature: response.signature,
        publicKey: new PublicKey(response.publicKey)
      };
    } catch (error) {
      console.error('Error signing message:', error);
      throw new Error('Failed to sign message');
    }
  }

  // Get network info
  getNetworkInfo() {
    return {
      endpoint: this.connection.rpcEndpoint,
      commitment: this.connection.commitment
    };
  }

  // Check if wallet is connected
  isConnected(): boolean {
    return Boolean(this.wallet?.isConnected);
  }

  // Get connected wallet info
  getWalletInfo() {
    if (!this.wallet) {
      return null;
    }

    return {
      publicKey: this.wallet.publicKey,
      isConnected: this.wallet.isConnected,
      network: this.connection.rpcEndpoint
    };
  }
}

// Export singleton instance
export const solanaWalletService = new SolanaWalletService();

// Type declarations for window object
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: unknown) => Promise<unknown>;
      signMessage: (message: Uint8Array, encoding: string) => Promise<{
        signature: Uint8Array;
        publicKey: string;
      }>;
      publicKey?: { toString: () => string };
      isConnected?: boolean;
    };
  }
} 