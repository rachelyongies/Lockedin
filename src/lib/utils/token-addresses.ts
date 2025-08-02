// Token address utilities for 1inch API integration

export const TOKEN_ADDRESSES = {
  // Ethereum Mainnet
  MAINNET: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    USDC: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    CRV: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    COMP: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
  },
  
  // Ethereum Goerli Testnet
  GOERLI: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
    WETH: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    WBTC: '0x45AC1a6661fD0D4ec7Bf9aE58a9F63A7E2b51e73',
    USDC: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
    USDT: '0x110a13FC3efE6A245B50102D2d529B3d88A5F3c4',
  },
  
  // Ethereum Sepolia Testnet
  SEPOLIA: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  }
} as const;

// Network chain IDs
export const NETWORK_CHAIN_IDS = {
  MAINNET: 1,
  GOERLI: 5,
  SEPOLIA: 11155111,
} as const;

// Get token address for a specific network
export function getTokenAddress(symbol: string, chainId: number): string {
  const network = Object.entries(NETWORK_CHAIN_IDS).find(([_, id]) => id === chainId)?.[0];
  
  if (!network) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  const addresses = TOKEN_ADDRESSES[network as keyof typeof TOKEN_ADDRESSES];
  const address = addresses[symbol as keyof typeof addresses];
  
  if (!address) {
    throw new Error(`Token ${symbol} not found on network ${network}`);
  }
  
  return address;
}

// Get all available tokens for a network
export function getAvailableTokens(chainId: number): string[] {
  const network = Object.entries(NETWORK_CHAIN_IDS).find(([_, id]) => id === chainId)?.[0];
  
  if (!network) {
    return [];
  }
  
  const addresses = TOKEN_ADDRESSES[network as keyof typeof TOKEN_ADDRESSES];
  return Object.keys(addresses);
}

// Validate token address
export function isValidTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Get token symbol from address (reverse lookup)
export function getTokenSymbol(address: string, chainId: number): string | null {
  const network = Object.entries(NETWORK_CHAIN_IDS).find(([_, id]) => id === chainId)?.[0];
  
  if (!network) {
    return null;
  }
  
  const addresses = TOKEN_ADDRESSES[network as keyof typeof TOKEN_ADDRESSES];
  const entry = Object.entries(addresses).find(([_, addr]) => addr.toLowerCase() === address.toLowerCase());
  
  return entry ? entry[0] : null;
}

// Example usage functions
export function createQuoteRequest(
  fromSymbol: string,
  toSymbol: string,
  amount: string,
  walletAddress: string,
  chainId: number = NETWORK_CHAIN_IDS.MAINNET
) {
  return {
    fromTokenAddress: getTokenAddress(fromSymbol, chainId),
    toTokenAddress: getTokenAddress(toSymbol, chainId),
    amount: amount,
    walletAddress: walletAddress,
    source: 'chaincrossing-bridge',
    enableEstimate: true,
    complexityLevel: 'medium' as const,
    allowPartialFill: false,
  };
}

// Common swap pairs
export const COMMON_SWAP_PAIRS = {
  MAINNET: [
    { from: 'ETH', to: 'WBTC', name: 'ETH → WBTC' },
    { from: 'ETH', to: 'USDC', name: 'ETH → USDC' },
    { from: 'ETH', to: 'USDT', name: 'ETH → USDT' },
    { from: 'WBTC', to: 'ETH', name: 'WBTC → ETH' },
    { from: 'USDC', to: 'ETH', name: 'USDC → ETH' },
    { from: 'USDT', to: 'ETH', name: 'USDT → ETH' },
    { from: 'WETH', to: 'WBTC', name: 'WETH → WBTC' },
    { from: 'WBTC', to: 'WETH', name: 'WBTC → WETH' },
  ],
  GOERLI: [
    { from: 'ETH', to: 'USDC', name: 'ETH → USDC' },
    { from: 'USDC', to: 'ETH', name: 'USDC → ETH' },
    { from: 'WETH', to: 'USDC', name: 'WETH → USDC' },
    { from: 'USDC', to: 'WETH', name: 'USDC → WETH' },
  ],
  SEPOLIA: [
    { from: 'ETH', to: 'USDC', name: 'ETH → USDC' },
    { from: 'USDC', to: 'ETH', name: 'USDC → ETH' },
    { from: 'WETH', to: 'USDC', name: 'WETH → USDC' },
    { from: 'USDC', to: 'WETH', name: 'USDC → WETH' },
  ],
} as const; 