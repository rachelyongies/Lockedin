// Lightweight Bitcoin wallet service without heavy crypto imports
export interface BitcoinWalletProvider {
  name: 'phantom' | 'xverse' | 'unisat' | 'leather';
  connect: () => Promise<string>;
  getAddress: () => Promise<string>;
  signTransaction: (psbt: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  disconnect: () => Promise<void>;
}

export interface BitcoinWalletState {
  connected: boolean;
  provider: 'phantom' | 'xverse' | 'derived' | 'manual' | null;
  address: string | null;
  publicKey: string | null;
  network: 'mainnet' | 'testnet';
}

type WalletStateListener = (state: BitcoinWalletState) => void;

export class BitcoinWalletServiceLite {
  private static instance: BitcoinWalletServiceLite;
  private state: BitcoinWalletState = {
    connected: false,
    provider: null,
    address: null,
    publicKey: null,
    network: 'testnet'
  };
  
  private connectedProvider: BitcoinWalletProvider | null = null;
  private listeners: Set<WalletStateListener> = new Set();

  static getInstance(): BitcoinWalletServiceLite {
    if (!BitcoinWalletServiceLite.instance) {
      BitcoinWalletServiceLite.instance = new BitcoinWalletServiceLite();
    }
    return BitcoinWalletServiceLite.instance;
  }

  /**
   * Basic address validation without heavy crypto
   */
  private validateBasicAddress(address: string, network: 'mainnet' | 'testnet'): void {
    const mainnetPrefixes = ['bc1', '1', '3'];
    const testnetPrefixes = ['tb1', 'm', 'n', '2'];
    
    const isMainnetAddress = mainnetPrefixes.some(prefix => address.startsWith(prefix));
    const isTestnetAddress = testnetPrefixes.some(prefix => address.startsWith(prefix));
    
    if (network === 'mainnet' && !isMainnetAddress) {
      throw new Error(`Expected mainnet address but got ${address}`);
    }
    
    if (network === 'testnet' && !isTestnetAddress) {
      throw new Error(`Expected testnet address but got ${address}`);
    }
  }

  /**
   * Connect to Phantom wallet (Bitcoin support)
   */
  private async connectPhantom(): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).phantom?.bitcoin) {
      throw new Error('Phantom wallet not found. Please install Phantom.');
    }

    try {
      const phantom = (window as any).phantom.bitcoin;
      
      const accounts = await phantom.requestAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No Bitcoin accounts found in Phantom');
      }

      const address = accounts[0].address;
      const publicKey = accounts[0].publicKey;

      this.validateBasicAddress(address, this.state.network);

      this.connectedProvider = {
        name: 'phantom',
        connect: async () => address,
        getAddress: async () => address,
        signTransaction: async (psbtBase64: string) => {
          const signedPsbt = await phantom.signTransaction(psbtBase64);
          return signedPsbt;
        },
        signMessage: async (message: string) => {
          const signature = await phantom.signMessage(message);
          return signature;
        },
        disconnect: async () => {
          this.clearConnection();
        }
      };

      this.state = {
        connected: true,
        provider: 'phantom',
        address,
        publicKey: publicKey || null,
        network: this.state.network
      };
      this.notifyListeners();

      return address;
    } catch (error) {
      console.error('Phantom connection error:', error);
      throw error;
    }
  }

  /**
   * Connect to Xverse wallet
   */
  private async connectXverse(): Promise<string> {
    if (typeof window === 'undefined' || !(window as any).XverseProviders) {
      throw new Error('Xverse wallet not found. Please install Xverse.');
    }

    try {
      const xverse = (window as any).XverseProviders;
      
      const response = await xverse.connect({
        network: this.state.network,
        purposes: ['payment', 'ordinals']
      });
      
      if (!response?.addresses || response.addresses.length === 0) {
        throw new Error('No addresses found in Xverse');
      }

      const paymentAddress = response.addresses.find((addr: any) => addr.purpose === 'payment');
      if (!paymentAddress) {
        throw new Error('No payment address found in Xverse');
      }

      const address = paymentAddress.address;
      const publicKey = paymentAddress.publicKey;

      this.validateBasicAddress(address, this.state.network);

      this.connectedProvider = {
        name: 'xverse',
        connect: async () => address,
        getAddress: async () => address,
        signTransaction: async (psbtHex: string) => {
          const signedTx = await xverse.signTransaction(psbtHex);
          return signedTx;
        },
        signMessage: async (message: string) => {
          const signature = await xverse.signMessage(message, address);
          return signature;
        },
        disconnect: async () => {
          await xverse.disconnect();
          this.clearConnection();
        }
      };

      this.state = {
        connected: true,
        provider: 'xverse',
        address,
        publicKey: publicKey || null,
        network: this.state.network
      };
      this.notifyListeners();

      return address;
    } catch (error) {
      console.error('Xverse connection error:', error);
      throw error;
    }
  }

  /**
   * Connect to a Bitcoin wallet provider
   */
  async connectWallet(provider: 'phantom' | 'xverse' | 'manual', network: 'mainnet' | 'testnet' = 'testnet'): Promise<string> {
    this.state.network = network;
    
    switch (provider) {
      case 'phantom':
        return this.connectPhantom();
      case 'xverse':
        return this.connectXverse();
      case 'manual':
        this.state.provider = 'manual';
        this.state.connected = true;
        return 'manual';
      default:
        throw new Error(`Unsupported wallet: ${provider}`);
    }
  }

  /**
   * Set manual Bitcoin address
   */
  setManualAddress(address: string): void {
    this.validateBasicAddress(address, this.state.network);
    
    this.state.address = address;
    this.state.provider = 'manual';
    this.state.connected = true;
    this.notifyListeners();
  }

  /**
   * Derive from seed phrase (loads heavy crypto dynamically)
   */
  async deriveFromSeedPhrase(mnemonic: string, network: 'mainnet' | 'testnet' = 'testnet'): Promise<string> {
    // Dynamic import of crypto loader
    const { loadBitcoinCrypto } = await import('./bitcoin-crypto-loader');
    const crypto = await loadBitcoinCrypto();

    let seed: Buffer | null = null;
    let root: any = null;
    
    try {
      if (!crypto.bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
      }

      seed = await crypto.bip39.mnemonicToSeed(mnemonic);
      root = crypto.bip32.fromSeed(seed);
      
      const path = network === 'mainnet' 
        ? "m/84'/0'/0'/0/0"
        : "m/84'/1'/0'/0/0";
      
      const child = root.derivePath(path);
      const btcNetwork = network === 'mainnet' 
        ? crypto.bitcoin.networks.bitcoin 
        : crypto.bitcoin.networks.testnet;
      
      const { address } = crypto.bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: btcNetwork
      });
      
      if (!address) {
        throw new Error('Failed to generate Bitcoin address');
      }

      this.validateBasicAddress(address, network);

      this.state = {
        connected: true,
        provider: 'derived',
        address,
        publicKey: child.publicKey.toString('hex'),
        network
      };
      this.notifyListeners();
      
      return address;
    } finally {
      if (seed) seed.fill(0);
      if (root && root.privateKey) root.privateKey.fill(0);
    }
  }

  /**
   * Basic address validation without crypto
   */
  validateAddress(address: string, network: 'mainnet' | 'testnet' = 'testnet'): boolean {
    try {
      this.validateBasicAddress(address, network);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Subscribe to wallet state changes
   */
  subscribe(listener: WalletStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        console.error('Error in wallet state listener:', error);
      }
    });
  }

  /**
   * Get current Bitcoin address
   */
  getCurrentAddress(): string | null {
    return this.state.address;
  }

  /**
   * Get wallet connection state
   */
  getState(): BitcoinWalletState {
    return { ...this.state };
  }

  /**
   * Disconnect current wallet provider
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connectedProvider?.disconnect) {
        await this.connectedProvider.disconnect();
      }
    } catch (error) {
      console.error('Error disconnecting wallet provider:', error);
      throw new Error('Failed to disconnect wallet');
    } finally {
      this.clearConnection();
    }
  }

  /**
   * Clear connection and sensitive data
   */
  clearConnection(): void {
    this.state = {
      connected: false,
      provider: null,
      address: null,
      publicKey: null,
      network: 'testnet'
    };
    
    this.connectedProvider = null;
    this.notifyListeners();
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.state.connected && this.state.address !== null;
  }

  /**
   * Get supported wallet providers
   */
  getSupportedWallets(): Array<{
    id: 'phantom' | 'xverse' | 'manual' | 'derived';
    name: string;
    available: boolean;
  }> {
    return [
      {
        id: 'phantom',
        name: 'Phantom',
        available: typeof window !== 'undefined' && !!(window as any).phantom?.bitcoin
      },
      {
        id: 'xverse',
        name: 'Xverse',
        available: typeof window !== 'undefined' && !!(window as any).XverseProviders
      },
      {
        id: 'manual',
        name: 'Manual Input',
        available: true
      },
      {
        id: 'derived',
        name: 'Derive from Seed',
        available: true
      }
    ];
  }
}

export const bitcoinWalletServiceLite = BitcoinWalletServiceLite.getInstance();