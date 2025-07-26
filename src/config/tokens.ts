import { Token, EthereumToken, BitcoinToken } from '@/types/bridge';

// Ethereum Tokens
export const ETH: EthereumToken = {
  id: 'eth-mainnet',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  logoUrl: '/images/tokens/eth.svg',
  coingeckoId: 'ethereum',
  network: 'ethereum',
  chainId: 1,
  address: '0x0000000000000000000000000000000000000000',
  isNative: true,
  isWrapped: false,
  wrappedEquivalent: 'WETH',
  
  // UX Metadata
  explorerUrl: 'https://etherscan.io',
  verified: true,
  displayPrecision: 4,
  description: 'Native cryptocurrency of Ethereum blockchain',
  tags: ['native', 'gas-token', 'defi'],
};

export const WETH: EthereumToken = {
  id: 'weth-mainnet',
  symbol: 'WETH',
  name: 'Wrapped Ether',
  decimals: 18,
  logoUrl: '/images/tokens/weth.svg',
  coingeckoId: 'weth',
  network: 'ethereum',
  chainId: 1,
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  isNative: false,
  isWrapped: true,
  nativeEquivalent: 'ETH',
  
  // UX Metadata
  explorerUrl: 'https://etherscan.io/token/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  wrappedSymbol: 'ETH',
  verified: true,
  displayPrecision: 4,
  description: 'ERC-20 compatible version of Ethereum',
  tags: ['wrapped', 'erc20', 'defi'],
};

export const WBTC: EthereumToken = {
  id: 'wbtc-mainnet',
  symbol: 'WBTC',
  name: 'Wrapped Bitcoin',
  decimals: 8,
  logoUrl: '/images/tokens/wbtc.svg',
  coingeckoId: 'wrapped-bitcoin',
  network: 'ethereum',
  chainId: 1,
  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  isNative: false,
  isWrapped: true,
  nativeEquivalent: 'BTC',
  
  // UX Metadata
  explorerUrl: 'https://etherscan.io/token/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  wrappedSymbol: 'BTC',
  verified: true,
  displayPrecision: 5,
  description: 'Bitcoin on Ethereum - fully backed by Bitcoin',
  tags: ['wrapped', 'erc20', 'bitcoin'],
};

// Bitcoin Token
export const BTC: BitcoinToken = {
  id: 'btc-mainnet',
  symbol: 'BTC',
  name: 'Bitcoin',
  decimals: 8,
  logoUrl: '/images/tokens/btc.svg',
  coingeckoId: 'bitcoin',
  network: 'bitcoin',
  chainId: 'mainnet',
  isNative: true,
  isWrapped: false,
  wrappedEquivalent: 'WBTC',
  
  // UX Metadata
  explorerUrl: 'https://blockchair.com/bitcoin',
  verified: true,
  displayPrecision: 5,
  description: 'The original cryptocurrency and store of value',
  tags: ['native', 'store-of-value', 'digital-gold'],
};

// Testnet tokens
export const ETH_GOERLI: EthereumToken = {
  ...ETH,
  id: 'eth-goerli',
  chainId: 5,
  explorerUrl: 'https://goerli.etherscan.io',
  description: 'Ethereum testnet token for development',
  tags: ['native', 'testnet'],
};

export const WETH_GOERLI: EthereumToken = {
  ...WETH,
  id: 'weth-goerli',
  chainId: 5,
  address: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  explorerUrl: 'https://goerli.etherscan.io/token/0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  description: 'Wrapped Ethereum testnet token',
  tags: ['wrapped', 'testnet'],
};

export const WBTC_GOERLI: EthereumToken = {
  ...WBTC,
  id: 'wbtc-goerli',
  chainId: 5,
  address: '0x45AC1a6661fD0D4ec7Bf9aE58a9F63A7E2b51e73',
  explorerUrl: 'https://goerli.etherscan.io/token/0x45AC1a6661fD0D4ec7Bf9aE58a9F63A7E2b51e73',
  description: 'Wrapped Bitcoin testnet token',
  tags: ['wrapped', 'testnet'],
};

export const BTC_TESTNET: BitcoinToken = {
  ...BTC,
  id: 'btc-testnet',
  chainId: 'testnet',
  explorerUrl: 'https://blockchair.com/bitcoin/testnet',
  description: 'Bitcoin testnet for development',
  tags: ['native', 'testnet'],
};

// Token lists by network
export const ETHEREUM_TOKENS: Record<number, EthereumToken[]> = {
  1: [ETH, WETH, WBTC], // Mainnet
  5: [ETH_GOERLI, WETH_GOERLI, WBTC_GOERLI], // Goerli
  11155111: [], // Sepolia - add tokens when needed
};

export const BITCOIN_TOKENS: Record<string, BitcoinToken[]> = {
  mainnet: [BTC],
  testnet: [BTC_TESTNET],
  regtest: [],
};

// All tokens for easy lookup
export const ALL_TOKENS: Token[] = [
  ETH, WETH, WBTC, BTC,
  ETH_GOERLI, WETH_GOERLI, WBTC_GOERLI, BTC_TESTNET,
];

// Helper to create unique token key
export function getTokenKey(token: Token): string {
  if (token.network === 'ethereum') {
    return `${token.symbol}_ethereum_${token.chainId}`;
  } else {
    return `${token.symbol}_bitcoin_${token.chainId}`;
  }
}

// Token lookup by symbol and chain - properly handles duplicates
export const TOKEN_BY_KEY: Record<string, Token> = ALL_TOKENS.reduce(
  (acc, token) => {
    const key = getTokenKey(token);
    return { ...acc, [key]: token };
  },
  {}
);

// Get token by symbol and chain
export function getToken(symbol: string, chainId?: number | string, network?: 'ethereum' | 'bitcoin'): Token | undefined {
  // If we have all parameters, do a direct lookup
  if (chainId !== undefined && network !== undefined) {
    const key = network === 'ethereum' 
      ? `${symbol}_ethereum_${chainId}`
      : `${symbol}_bitcoin_${chainId}`;
    return TOKEN_BY_KEY[key];
  }
  
  // Otherwise, find the first matching token
  return ALL_TOKENS.find(token => {
    if (token.symbol !== symbol) return false;
    
    if (chainId === undefined) return true;
    
    if (token.network === 'ethereum' && typeof chainId === 'number') {
      return (token as EthereumToken).chainId === chainId;
    }
    
    if (token.network === 'bitcoin' && typeof chainId === 'string') {
      return (token as BitcoinToken).chainId === chainId;
    }
    
    return false;
  });
}

// Get tokens by symbol (returns all chains)
export function getTokensBySymbol(symbol: string): Token[] {
  return ALL_TOKENS.filter(token => token.symbol === symbol);
}

// Get available destination tokens for a source token
export function getDestinationTokens(sourceToken: Token): Token[] {
  // For now, we only support mainnet bridging
  // In production, you'd filter by matching networks
  switch (sourceToken.symbol) {
    case 'BTC':
      return [WBTC, ETH]; // BTC can go to WBTC or ETH
    case 'WBTC':
      return [BTC, ETH]; // WBTC can go to BTC or ETH
    case 'ETH':
      return [WETH, BTC, WBTC]; // ETH can go to WETH, BTC, or WBTC
    case 'WETH':
      return [ETH, BTC, WBTC]; // WETH can go to ETH, BTC, or WBTC
    default:
      return [];
  }
}

// Check if a token pair is supported
export function isSupportedPair(from: Token, to: Token): boolean {
  const destinations = getDestinationTokens(from);
  return destinations.some(dest => 
    dest.symbol === to.symbol && 
    // For cross-chain, we need matching networks (mainnet to mainnet)
    ((from.network === 'bitcoin' && from.chainId === 'mainnet') || 
     (from.network === 'ethereum' && from.chainId === 1)) &&
    ((to.network === 'bitcoin' && to.chainId === 'mainnet') || 
     (to.network === 'ethereum' && to.chainId === 1))
  );
}

// Utility functions for token display
export function getDisplaySymbol(token: Token): string {
  return token.wrappedSymbol || token.symbol;
}

export function formatTokenAmount(amount: string, token: Token): string {
  const precision = token.displayPrecision || 4;
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  
  // Handle very small amounts
  if (num < Math.pow(10, -precision)) {
    return `< ${Math.pow(10, -precision)}`;
  }
  
  return num.toFixed(precision);
}

export function getTokenExplorerLink(token: Token, txHash?: string): string | undefined {
  if (!token.explorerUrl) return undefined;
  
  if (token.network === 'ethereum' && txHash) {
    return `${token.explorerUrl}/tx/${txHash}`;
  } else if (token.network === 'bitcoin' && txHash) {
    return `${token.explorerUrl}/transaction/${txHash}`;
  } else if (token.network === 'ethereum' && !token.isNative) {
    return `${token.explorerUrl}/token/${token.address}`;
  }
  
  return token.explorerUrl;
}

// Default token pairs for the bridge
export const DEFAULT_FROM_TOKEN = ETH;
export const DEFAULT_TO_TOKEN = BTC;

// Popular token pairs for quick selection
export const POPULAR_PAIRS = [
  { from: ETH, to: BTC },
  { from: BTC, to: ETH },
  { from: ETH, to: WBTC },
  { from: WBTC, to: BTC },
] as const;