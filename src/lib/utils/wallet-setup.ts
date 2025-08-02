// Wallet setup utilities for testing 1inch integration

export interface WalletConfig {
  address: string;
  network: 'SEPOLIA' | 'GOERLI' | 'MAINNET';
  rpcUrl: string;
  chainId: number;
  explorer: string;
}

// Default RPC URLs (you can replace these with your own)
export const DEFAULT_RPC_URLS = {
  SEPOLIA: {
    INFURA: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
    ALCHEMY: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    QUICKNODE: 'https://your-endpoint.quiknode.pro/YOUR_API_KEY/',
    PUBLIC: 'https://rpc.sepolia.org',
  },
  GOERLI: {
    INFURA: 'https://goerli.infura.io/v3/YOUR_PROJECT_ID',
    ALCHEMY: 'https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY',
    QUICKNODE: 'https://your-endpoint.quiknode.pro/YOUR_API_KEY/',
    PUBLIC: 'https://rpc.ankr.com/eth_goerli',
  },
  MAINNET: {
    INFURA: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    ALCHEMY: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    QUICKNODE: 'https://your-endpoint.quiknode.pro/YOUR_API_KEY/',
    PUBLIC: 'https://rpc.ankr.com/eth',
  }
} as const;

// Network configurations
export const NETWORK_CONFIGS = {
  SEPOLIA: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    currency: 'ETH',
    explorer: 'https://sepolia.etherscan.io',
    faucet: 'https://sepoliafaucet.com/',
  },
  GOERLI: {
    name: 'Goerli Testnet',
    chainId: 5,
    currency: 'ETH',
    explorer: 'https://goerli.etherscan.io',
    faucet: 'https://goerlifaucet.com/',
  },
  MAINNET: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    currency: 'ETH',
    explorer: 'https://etherscan.io',
    faucet: null,
  }
} as const;

// Get your wallet address from MetaMask
export async function getWalletAddress(): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask not installed');
    }

    const provider = (window as any).ethereum;
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
}

// Validate Ethereum address
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Format address for display
export function formatAddress(address: string): string {
  if (!isValidEthereumAddress(address)) {
    return 'Invalid Address';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Get network info from chain ID
export function getNetworkFromChainId(chainId: number): keyof typeof NETWORK_CONFIGS | null {
  for (const [network, config] of Object.entries(NETWORK_CONFIGS)) {
    if (config.chainId === chainId) {
      return network as keyof typeof NETWORK_CONFIGS;
    }
  }
  return null;
}

// Create custom RPC configuration
export function createCustomRPC(
  network: 'SEPOLIA' | 'GOERLI' | 'MAINNET',
  rpcUrl: string,
  walletAddress: string
): WalletConfig {
  const networkConfig = NETWORK_CONFIGS[network];
  
  return {
    address: walletAddress,
    network,
    rpcUrl,
    chainId: networkConfig.chainId,
    explorer: networkConfig.explorer,
  };
}

// Add network to MetaMask
export async function addNetworkToMetaMask(network: 'SEPOLIA' | 'GOERLI'): Promise<boolean> {
  try {
    const networkConfig = NETWORK_CONFIGS[network];
    const provider = (window as any).ethereum;
    
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${networkConfig.chainId.toString(16)}`,
        chainName: networkConfig.name,
        nativeCurrency: {
          name: networkConfig.currency,
          symbol: networkConfig.currency,
          decimals: 18
        },
        rpcUrls: [DEFAULT_RPC_URLS[network].PUBLIC],
        blockExplorerUrls: [networkConfig.explorer]
      }],
    });
    
    return true;
  } catch (error) {
    console.error('Error adding network to MetaMask:', error);
    return false;
  }
}

// Switch to network in MetaMask
export async function switchToNetwork(network: 'SEPOLIA' | 'GOERLI'): Promise<boolean> {
  try {
    const networkConfig = NETWORK_CONFIGS[network];
    const provider = (window as any).ethereum;
    
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${networkConfig.chainId.toString(16)}` }],
    });
    
    return true;
  } catch (error: any) {
    // If network doesn't exist, add it
    if (error.code === 4902) {
      return await addNetworkToMetaMask(network);
    }
    console.error('Error switching network:', error);
    return false;
  }
}

// Check wallet balance
export async function checkWalletBalance(
  address: string, 
  rpcUrl: string
): Promise<{ balance: string; error?: string }> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return { balance: '0', error: data.error.message };
    }

    const balanceWei = parseInt(data.result, 16);
    const balanceEth = (balanceWei / Math.pow(10, 18)).toString();
    
    return { balance: balanceEth };
  } catch (error) {
    return { balance: '0', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get transaction history
export async function getTransactionHistory(
  address: string,
  network: 'SEPOLIA' | 'GOERLI' | 'MAINNET'
): Promise<any[]> {
  try {
    const networkConfig = NETWORK_CONFIGS[network];
    const response = await fetch(
      `${networkConfig.explorer}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=YourApiKeyToken`
    );
    
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
} 