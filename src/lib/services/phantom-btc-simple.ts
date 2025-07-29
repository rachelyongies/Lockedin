// Ultra-lightweight Phantom BTC service - no heavy crypto imports
export interface PhantomBTCAccount {
  address: string;
  publicKey: string;
}

export interface BitcoinWalletState {
  connected: boolean;
  provider: 'phantom' | 'xverse' | 'manual' | null;
  address: string | null;
  publicKey: string | null;
  network: 'mainnet' | 'testnet';
}

type WalletStateListener = (state: BitcoinWalletState) => void;

class SimpleBitcoinWalletService {
  private static instance: SimpleBitcoinWalletService;
  private state: BitcoinWalletState = {
    connected: false,
    provider: null,
    address: null,
    publicKey: null,
    network: 'testnet'
  };
  
  private listeners: Set<WalletStateListener> = new Set();

  static getInstance(): SimpleBitcoinWalletService {
    if (!SimpleBitcoinWalletService.instance) {
      SimpleBitcoinWalletService.instance = new SimpleBitcoinWalletService();
    }
    return SimpleBitcoinWalletService.instance;
  }

  // Basic address validation - no crypto libraries needed
  private isValidBitcoinAddress(address: string, network: 'mainnet' | 'testnet'): boolean {
    if (!address || address.length < 26 || address.length > 62) return false;
    
    const mainnetPrefixes = ['bc1', '1', '3'];
    const testnetPrefixes = ['tb1', 'm', 'n', '2'];
    
    const prefixes = network === 'mainnet' ? mainnetPrefixes : testnetPrefixes;
    return prefixes.some(prefix => address.startsWith(prefix));
  }

  // Check if Phantom BTC is available
  private isPhantomBTCAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).phantom?.bitcoin;
  }

  // Check if Xverse is available
  private isXverseAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for different possible Xverse objects
    const hasWindowBtc = !!(window as any).btc;
    const hasXverseProviders = !!(window as any).XverseProviders;
    const hasBitcoinProvider = !!(window as any).BitcoinProvider;
    
    return hasWindowBtc || hasXverseProviders || hasBitcoinProvider;
  }

  // Connect to Phantom Bitcoin
  async connectPhantom(network: 'mainnet' | 'testnet' = 'testnet'): Promise<string> {
    if (!this.isPhantomBTCAvailable()) {
      throw new Error('Phantom BTC not found. Is the extension installed and Bitcoin support enabled?');
    }

    try {
      const phantom = (window as any).phantom.bitcoin;
      const accounts = await phantom.requestAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No BTC accounts found');
      }

      const account: PhantomBTCAccount = accounts[0];
      
      // Validate address matches expected network
      if (!this.isValidBitcoinAddress(account.address, network)) {
        throw new Error(`Address ${account.address} doesn't match ${network} network`);
      }

      this.state = {
        connected: true,
        provider: 'phantom',
        address: account.address,
        publicKey: account.publicKey,
        network
      };
      
      this.notifyListeners();
      return account.address;
    } catch (error) {
      console.error('Phantom BTC connection error:', error);
      throw error;
    }
  }

  // Connect to Xverse
  async connectXverse(network: 'mainnet' | 'testnet' = 'testnet'): Promise<string> {
    if (!this.isXverseAvailable()) {
      throw new Error('Xverse wallet not found. Please install Xverse.');
    }

    try {
      // Try BitcoinProvider first, then XverseProviders.BitcoinProvider
      const bitcoinProvider = (window as any).BitcoinProvider || (window as any).XverseProviders?.BitcoinProvider;
      
      // Debug: Log what's available on the provider object
      console.log('Xverse BitcoinProvider:', bitcoinProvider);
      if (bitcoinProvider) {
        console.log('Available methods:', Object.getOwnPropertyNames(bitcoinProvider));
        console.log('connect method:', bitcoinProvider.connect);
      }
      
      // Check if the API is available
      if (!bitcoinProvider) {
        throw new Error('Xverse BitcoinProvider not found. Please make sure Xverse is properly installed.');
      }
      
      if (typeof bitcoinProvider.connect !== 'function') {
        // List available methods for debugging
        const availableMethods = Object.getOwnPropertyNames(bitcoinProvider).filter(prop => typeof bitcoinProvider[prop] === 'function');
        throw new Error(`Xverse connect method not available. Available methods: ${availableMethods.join(', ')}.`);
      }

      // Try different Xverse connect methods
      console.log('Attempting Xverse connection...');
      let response;
      
      try {
        // Try the callback-based approach that Xverse might be using
        console.log('Trying callback-based getAddresses...');
        response = await new Promise((resolve, reject) => {
          try {
            bitcoinProvider.request('getAddresses', {
              purposes: ['payment'],
              message: 'Connect to Bitcoin wallet',
              network: {
                type: network === 'mainnet' ? 'Mainnet' : 'Testnet'
              },
              onFinish: resolve,
              onCancel: () => reject(new Error('User cancelled connection'))
            });
          } catch (error) {
            reject(error);
          }
        });
        console.log('Callback approach worked:', response);
      } catch (callbackError) {
        console.log('Callback approach failed:', callbackError);
        
        try {
          // Try using XverseProviders.BitcoinProvider instead
          console.log('Trying XverseProviders.BitcoinProvider...');
          const xverseProvider = (window as any).XverseProviders?.BitcoinProvider;
          if (xverseProvider && xverseProvider !== bitcoinProvider) {
            response = await xverseProvider.request('getAddresses', {
              purposes: ['payment'],
              message: 'Connect to Bitcoin wallet'
            });
            console.log('XverseProviders approach worked:', response);
          } else {
            throw new Error('XverseProviders.BitcoinProvider not available or same as BitcoinProvider');
          }
        } catch (xverseError) {
          console.log('XverseProviders approach failed:', xverseError);
          
          // Final fallback: disable Xverse for now
          throw new Error('Xverse integration temporarily disabled due to API compatibility issues. Please use Phantom or Manual input instead.');
        }
      }
      
      if (!response || !response.addresses || response.addresses.length === 0) {
        throw new Error('No Bitcoin addresses received from Xverse. Please make sure you have a Bitcoin wallet set up.');
      }

      // Find the payment address
      const paymentAddress = response.addresses.find((addr: any) => 
        addr.purpose === 'payment' || addr.type === 'p2wpkh' || addr.type === 'payment'
      ) || response.addresses[0]; // Fallback to first address

      if (!paymentAddress || !paymentAddress.address) {
        throw new Error('No valid Bitcoin address found in Xverse response.');
      }

      const address = paymentAddress.address;
      
      // Validate address matches expected network
      if (!this.isValidBitcoinAddress(address, network)) {
        throw new Error(`Address ${address} doesn't match ${network} network. Please switch to ${network} in Xverse settings.`);
      }

      this.state = {
        connected: true,
        provider: 'xverse',
        address,
        publicKey: paymentAddress.publicKey || null,
        network
      };
      
      this.notifyListeners();
      return address;
    } catch (error) {
      console.error('Xverse connection error:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('rejected') || error.message.includes('cancelled')) {
          throw new Error('Connection rejected. Please approve the connection in Xverse wallet.');
        }
        if (error.message.includes('not available') || error.message.includes('not found')) {
          throw new Error('Xverse API not available. Please make sure Xverse is installed and enabled for this site.');
        }
      }
      
      throw error;
    }
  }

  // Manual address input
  setManualAddress(address: string, network: 'mainnet' | 'testnet' = 'testnet'): void {
    if (!this.isValidBitcoinAddress(address, network)) {
      throw new Error(`Invalid ${network} Bitcoin address`);
    }
    
    this.state = {
      connected: true,
      provider: 'manual',
      address,
      publicKey: null,
      network
    };
    
    this.notifyListeners();
  }

  // Sign transaction with Phantom
  async signTransaction(psbtBase64: string): Promise<string> {
    if (this.state.provider === 'phantom' && this.isPhantomBTCAvailable()) {
      const phantom = (window as any).phantom.bitcoin;
      return await phantom.signTransaction(psbtBase64);
    }
    
    if (this.state.provider === 'xverse') {
      const xverse = (window as any).XverseProviders;
      return await xverse.signTransaction(psbtBase64);
    }
    
    throw new Error('No wallet connected or signing not supported');
  }

  // Sign message with Phantom
  async signMessage(message: string): Promise<string> {
    if (this.state.provider === 'phantom' && this.isPhantomBTCAvailable()) {
      const phantom = (window as any).phantom.bitcoin;
      return await phantom.signMessage(message);
    }
    
    if (this.state.provider === 'xverse') {
      const xverse = (window as any).XverseProviders;
      return await xverse.signMessage(message, this.state.address!);
    }
    
    throw new Error('No wallet connected or signing not supported');
  }

  // Disconnect
  async disconnect(): Promise<void> {
    this.state = {
      connected: false,
      provider: null,
      address: null,
      publicKey: null,
      network: 'testnet'
    };
    
    this.notifyListeners();
  }

  // Subscribe to state changes
  subscribe(listener: WalletStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        console.error('Error in wallet state listener:', error);
      }
    });
  }

  // Get current state
  getState(): BitcoinWalletState {
    return { ...this.state };
  }

  // Get current address
  getCurrentAddress(): string | null {
    return this.state.address;
  }

  // Check if connected
  isConnected(): boolean {
    return this.state.connected && this.state.address !== null;
  }

  // Validate address
  validateAddress(address: string, network: 'mainnet' | 'testnet' = 'testnet'): boolean {
    return this.isValidBitcoinAddress(address, network);
  }

  // Get supported wallets
  getSupportedWallets(): Array<{
    id: 'phantom' | 'xverse' | 'manual';
    name: string;
    available: boolean;
  }> {
    return [
      {
        id: 'phantom',
        name: 'Phantom',
        available: this.isPhantomBTCAvailable()
      },
      {
        id: 'xverse',
        name: 'Xverse',
        available: this.isXverseAvailable()
      },
      {
        id: 'manual',
        name: 'Manual Input',
        available: true
      }
    ];
  }
}

export const simpleBitcoinWallet = SimpleBitcoinWalletService.getInstance();