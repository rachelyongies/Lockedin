// Intelligent Router Token Configuration - Multi-Network Support
// This file is separate from main bridge tokens to allow advanced multi-network features
// without affecting the stable main bridge functionality

// Extended Network Types for Intelligent Router
export type IntelligentRouterNetwork = 'ethereum' | 'polygon' | 'arbitrum' | 'bsc';
export type IntelligentRouterChainId = 1 | 137 | 42161 | 56;

// Base Interface for Intelligent Router Tokens
export interface IntelligentRouterToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
  network: IntelligentRouterNetwork;
  chainId: IntelligentRouterChainId;
  address: string;
  coingeckoId?: string;
  explorerUrl?: string;
  isNative?: boolean;
  isWrapped?: boolean;
  wrappedEquivalent?: string;
  nativeEquivalent?: string;
  verified: boolean;
  displayPrecision: number;
  description: string;
  tags: string[];
}

// Network Configuration
export const INTELLIGENT_ROUTER_NETWORKS = {
  1: { name: 'Ethereum', symbol: 'ETH', color: '#627EEA', logo: '/images/networks/ethereum.svg' },
  137: { name: 'Polygon', symbol: 'MATIC', color: '#8247E5', logo: '/images/networks/polygon.svg' },
  42161: { name: 'Arbitrum', symbol: 'ARB', color: '#28A0F0', logo: '/images/networks/arbitrum.svg' },
  56: { name: 'BSC', symbol: 'BNB', color: '#F3BA2F', logo: '/images/networks/bsc.svg' }
} as const;

// Ethereum Tokens for Intelligent Router
export const ETHEREUM_IR_TOKENS: IntelligentRouterToken[] = [
  {
    id: 'eth-ethereum-ir',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoUrl: '/images/tokens/eth.svg',
    network: 'ethereum',
    chainId: 1,
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    coingeckoId: 'ethereum',
    explorerUrl: 'https://etherscan.io',
    isNative: true,
    wrappedEquivalent: 'WETH',
    verified: true,
    displayPrecision: 4,
    description: 'Native cryptocurrency of Ethereum blockchain',
    tags: ['native', 'gas-token', 'defi']
  },
  {
    id: 'weth-ethereum-ir',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoUrl: '/images/tokens/weth.svg',
    network: 'ethereum',
    chainId: 1,
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    coingeckoId: 'weth',
    explorerUrl: 'https://etherscan.io/token/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    isWrapped: true,
    nativeEquivalent: 'ETH',
    verified: true,
    displayPrecision: 4,
    description: 'ERC-20 compatible version of Ethereum',
    tags: ['wrapped', 'erc20', 'defi']
  },
  {
    id: 'wbtc-ethereum-ir',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    logoUrl: '/images/tokens/wbtc.svg',
    network: 'ethereum',
    chainId: 1,
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    coingeckoId: 'wrapped-bitcoin',
    explorerUrl: 'https://etherscan.io/token/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    isWrapped: true,
    nativeEquivalent: 'BTC',
    verified: true,
    displayPrecision: 5,
    description: 'Bitcoin on Ethereum - fully backed by Bitcoin',
    tags: ['wrapped', 'erc20', 'bitcoin']
  },
  {
    id: 'usdt-ethereum-ir',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoUrl: '/images/tokens/usdt.svg',
    network: 'ethereum',
    chainId: 1,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    coingeckoId: 'tether',
    explorerUrl: 'https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7',
    verified: true,
    displayPrecision: 2,
    description: 'USD Tether stablecoin',
    tags: ['stablecoin', 'erc20']
  },
  {
    id: 'usdc-ethereum-ir',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUrl: '/images/tokens/usdc.svg',
    network: 'ethereum',
    chainId: 1,
    address: '0xA0b86a33E6441b8C4F27eAD9083C756Cc2',
    coingeckoId: 'usd-coin',
    explorerUrl: 'https://etherscan.io/token/0xA0b86a33E6441b8C4F27eAD9083C756Cc2',
    verified: true,
    displayPrecision: 2,
    description: 'USD Coin stablecoin',
    tags: ['stablecoin', 'erc20']
  },
  {
    id: 'dai-ethereum-ir',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoUrl: '/images/tokens/dai.svg',
    network: 'ethereum',
    chainId: 1,
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    coingeckoId: 'dai',
    explorerUrl: 'https://etherscan.io/token/0x6B175474E89094C44Da98b954EedeAC495271d0F',
    verified: true,
    displayPrecision: 2,
    description: 'Decentralized stablecoin',
    tags: ['stablecoin', 'erc20', 'defi']
  }
];

// Polygon Tokens for Intelligent Router
export const POLYGON_IR_TOKENS: IntelligentRouterToken[] = [
  {
    id: 'matic-polygon-ir',
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
    logoUrl: '/images/tokens/matic.svg',
    network: 'polygon',
    chainId: 137,
    address: '0x0000000000000000000000000000000000001010',
    coingeckoId: 'matic-network',
    explorerUrl: 'https://polygonscan.com',
    isNative: true,
    wrappedEquivalent: 'WMATIC',
    verified: true,
    displayPrecision: 4,
    description: 'Native cryptocurrency of Polygon network',
    tags: ['native', 'gas-token', 'defi']
  },
  {
    id: 'wmatic-polygon-ir',
    symbol: 'WMATIC',
    name: 'Wrapped Matic',
    decimals: 18,
    logoUrl: '/images/tokens/wmatic.svg',
    network: 'polygon',
    chainId: 137,
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    coingeckoId: 'wmatic',
    explorerUrl: 'https://polygonscan.com/token/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    isWrapped: true,
    nativeEquivalent: 'MATIC',
    verified: true,
    displayPrecision: 4,
    description: 'ERC-20 compatible version of MATIC',
    tags: ['wrapped', 'erc20', 'defi']
  },
  {
    id: 'weth-polygon-ir',
    symbol: 'WETH',
    name: 'Wrapped Ether (Polygon)',
    decimals: 18,
    logoUrl: '/images/tokens/weth.svg',
    network: 'polygon',
    chainId: 137,
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    coingeckoId: 'weth',
    explorerUrl: 'https://polygonscan.com/token/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    verified: true,
    displayPrecision: 4,
    description: 'Ethereum on Polygon',
    tags: ['bridged', 'erc20', 'ethereum']
  },
  {
    id: 'wbtc-polygon-ir',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin (Polygon)',
    decimals: 8,
    logoUrl: '/images/tokens/wbtc.svg',
    network: 'polygon',
    chainId: 137,
    address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    coingeckoId: 'wrapped-bitcoin',
    explorerUrl: 'https://polygonscan.com/token/0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    verified: true,
    displayPrecision: 5,
    description: 'Bitcoin on Polygon',
    tags: ['bridged', 'erc20', 'bitcoin']
  },
  {
    id: 'usdt-polygon-ir',
    symbol: 'USDT',
    name: 'Tether USD (Polygon)',
    decimals: 6,
    logoUrl: '/images/tokens/usdt.svg',
    network: 'polygon',
    chainId: 137,
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    coingeckoId: 'tether',
    explorerUrl: 'https://polygonscan.com/token/0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    verified: true,
    displayPrecision: 2,
    description: 'USD Tether on Polygon',
    tags: ['stablecoin', 'bridged', 'erc20']
  },
  {
    id: 'usdc-polygon-ir',
    symbol: 'USDC',
    name: 'USD Coin (Polygon)',
    decimals: 6,
    logoUrl: '/images/tokens/usdc.svg',
    network: 'polygon',
    chainId: 137,
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    coingeckoId: 'usd-coin',
    explorerUrl: 'https://polygonscan.com/token/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    verified: true,
    displayPrecision: 2,
    description: 'USD Coin on Polygon',
    tags: ['stablecoin', 'bridged', 'erc20']
  }
];

// Arbitrum Tokens for Intelligent Router
export const ARBITRUM_IR_TOKENS: IntelligentRouterToken[] = [
  {
    id: 'eth-arbitrum-ir',
    symbol: 'ETH',
    name: 'Ethereum (Arbitrum)',
    decimals: 18,
    logoUrl: '/images/tokens/eth.svg',
    network: 'arbitrum',
    chainId: 42161,
    address: '0x0000000000000000000000000000000000000000',
    coingeckoId: 'ethereum',
    explorerUrl: 'https://arbiscan.io',
    isNative: true,
    wrappedEquivalent: 'WETH',
    verified: true,
    displayPrecision: 4,
    description: 'Native ETH on Arbitrum',
    tags: ['native', 'gas-token', 'ethereum']
  },
  {
    id: 'weth-arbitrum-ir',
    symbol: 'WETH',
    name: 'Wrapped Ether (Arbitrum)',
    decimals: 18,
    logoUrl: '/images/tokens/weth.svg',
    network: 'arbitrum',
    chainId: 42161,
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    coingeckoId: 'weth',
    explorerUrl: 'https://arbiscan.io/token/0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    isWrapped: true,
    nativeEquivalent: 'ETH',
    verified: true,
    displayPrecision: 4,
    description: 'Wrapped ETH on Arbitrum',
    tags: ['wrapped', 'erc20', 'ethereum']
  },
  {
    id: 'arb-arbitrum-ir',
    symbol: 'ARB',
    name: 'Arbitrum',
    decimals: 18,
    logoUrl: '/images/tokens/arb.svg',
    network: 'arbitrum',
    chainId: 42161,
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    coingeckoId: 'arbitrum',
    explorerUrl: 'https://arbiscan.io/token/0x912CE59144191C1204E64559FE8253a0e49E6548',
    verified: true,
    displayPrecision: 4,
    description: 'Arbitrum governance token',
    tags: ['governance', 'erc20', 'arbitrum']
  },
  {
    id: 'wbtc-arbitrum-ir',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin (Arbitrum)',
    decimals: 8,
    logoUrl: '/images/tokens/wbtc.svg',
    network: 'arbitrum',
    chainId: 42161,
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    coingeckoId: 'wrapped-bitcoin',
    explorerUrl: 'https://arbiscan.io/token/0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    verified: true,
    displayPrecision: 5,
    description: 'Bitcoin on Arbitrum',
    tags: ['bridged', 'erc20', 'bitcoin']
  },
  {
    id: 'usdt-arbitrum-ir',
    symbol: 'USDT',
    name: 'Tether USD (Arbitrum)',
    decimals: 6,
    logoUrl: '/images/tokens/usdt.svg',
    network: 'arbitrum',
    chainId: 42161,
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    coingeckoId: 'tether',
    explorerUrl: 'https://arbiscan.io/token/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    verified: true,
    displayPrecision: 2,
    description: 'USD Tether on Arbitrum',
    tags: ['stablecoin', 'bridged', 'erc20']
  },
  {
    id: 'usdc-arbitrum-ir',
    symbol: 'USDC',
    name: 'USD Coin (Arbitrum)',
    decimals: 6,
    logoUrl: '/images/tokens/usdc.svg',
    network: 'arbitrum',
    chainId: 42161,
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    coingeckoId: 'usd-coin',
    explorerUrl: 'https://arbiscan.io/token/0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    verified: true,
    displayPrecision: 2,
    description: 'USD Coin on Arbitrum',
    tags: ['stablecoin', 'bridged', 'erc20']
  }
];

// BSC Tokens for Intelligent Router
export const BSC_IR_TOKENS: IntelligentRouterToken[] = [
  {
    id: 'bnb-bsc-ir',
    symbol: 'BNB',
    name: 'BNB',
    decimals: 18,
    logoUrl: '/images/tokens/bnb.svg',
    network: 'bsc',
    chainId: 56,
    address: '0x0000000000000000000000000000000000000000',
    coingeckoId: 'binancecoin',
    explorerUrl: 'https://bscscan.com',
    isNative: true,
    wrappedEquivalent: 'WBNB',
    verified: true,
    displayPrecision: 4,
    description: 'Native cryptocurrency of BSC',
    tags: ['native', 'gas-token', 'bsc']
  },
  {
    id: 'wbnb-bsc-ir',
    symbol: 'WBNB',
    name: 'Wrapped BNB',
    decimals: 18,
    logoUrl: '/images/tokens/wbnb.svg',
    network: 'bsc',
    chainId: 56,
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    coingeckoId: 'wbnb',
    explorerUrl: 'https://bscscan.com/token/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    isWrapped: true,
    nativeEquivalent: 'BNB',
    verified: true,
    displayPrecision: 4,
    description: 'Wrapped BNB',
    tags: ['wrapped', 'bep20', 'bsc']
  },
  {
    id: 'btcb-bsc-ir',
    symbol: 'BTCB',
    name: 'Bitcoin BEP20',
    decimals: 18,
    logoUrl: '/images/tokens/btcb.svg',
    network: 'bsc',
    chainId: 56,
    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    coingeckoId: 'bitcoin-bep20',
    explorerUrl: 'https://bscscan.com/token/0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    verified: true,
    displayPrecision: 5,
    description: 'Bitcoin on BSC',
    tags: ['bridged', 'bep20', 'bitcoin']
  },
  {
    id: 'usdt-bsc-ir',
    symbol: 'USDT',
    name: 'Tether USD (BSC)',
    decimals: 18,
    logoUrl: '/images/tokens/usdt.svg',
    network: 'bsc',
    chainId: 56,
    address: '0x55d398326f99059fF775485246999027B3197955',
    coingeckoId: 'tether',
    explorerUrl: 'https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955',
    verified: true,
    displayPrecision: 2,
    description: 'USD Tether on BSC',
    tags: ['stablecoin', 'bridged', 'bep20']
  },
  {
    id: 'usdc-bsc-ir',
    symbol: 'USDC',
    name: 'USD Coin (BSC)',
    decimals: 18,
    logoUrl: '/images/tokens/usdc.svg',
    network: 'bsc',
    chainId: 56,
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    coingeckoId: 'usd-coin',
    explorerUrl: 'https://bscscan.com/token/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    verified: true,
    displayPrecision: 2,
    description: 'USD Coin on BSC',
    tags: ['stablecoin', 'bridged', 'bep20']
  },
  {
    id: 'busd-bsc-ir',
    symbol: 'BUSD',
    name: 'Binance USD',
    decimals: 18,
    logoUrl: '/images/tokens/busd.svg',
    network: 'bsc',
    chainId: 56,
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    coingeckoId: 'binance-usd',
    explorerUrl: 'https://bscscan.com/token/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    verified: true,
    displayPrecision: 2,
    description: 'Binance USD stablecoin',
    tags: ['stablecoin', 'bep20', 'binance']
  }
];

// All Intelligent Router Tokens
export const ALL_INTELLIGENT_ROUTER_TOKENS: IntelligentRouterToken[] = [
  ...ETHEREUM_IR_TOKENS,
  ...POLYGON_IR_TOKENS,
  ...ARBITRUM_IR_TOKENS,
  ...BSC_IR_TOKENS
];

// Token Registry by Network
export const INTELLIGENT_ROUTER_TOKENS_BY_NETWORK = {
  1: ETHEREUM_IR_TOKENS,
  137: POLYGON_IR_TOKENS,
  42161: ARBITRUM_IR_TOKENS,
  56: BSC_IR_TOKENS
} as const;

// High-liquidity trading pairs for optimal routing
export const INTELLIGENT_ROUTER_RECOMMENDED_PAIRS = {
  1: [ // Ethereum
    ['WBTC', 'ETH'], ['WBTC', 'USDT'], ['WBTC', 'USDC'], ['WBTC', 'DAI'],
    ['ETH', 'USDT'], ['ETH', 'USDC'], ['ETH', 'DAI'],
    ['USDT', 'USDC'], ['USDT', 'DAI'], ['USDC', 'DAI'],
    ['WETH', 'USDT'], ['WETH', 'USDC'], ['WETH', 'DAI']
  ],
  137: [ // Polygon  
    ['MATIC', 'WETH'], ['MATIC', 'USDT'], ['MATIC', 'USDC'],
    ['WMATIC', 'WETH'], ['WMATIC', 'USDT'], ['WMATIC', 'USDC'],
    ['WETH', 'USDT'], ['WETH', 'USDC'], ['WETH', 'WBTC'],
    ['USDT', 'USDC'], ['WBTC', 'USDT'], ['WBTC', 'USDC']
  ],
  42161: [ // Arbitrum
    ['ETH', 'USDT'], ['ETH', 'USDC'], ['ETH', 'ARB'],
    ['WETH', 'USDT'], ['WETH', 'USDC'], ['WETH', 'ARB'],
    ['ARB', 'USDT'], ['ARB', 'USDC'], ['USDT', 'USDC'],
    ['WBTC', 'ETH'], ['WBTC', 'USDT'], ['WBTC', 'USDC']
  ],
  56: [ // BSC
    ['BNB', 'USDT'], ['BNB', 'USDC'], ['BNB', 'BUSD'],
    ['WBNB', 'USDT'], ['WBNB', 'USDC'], ['WBNB', 'BUSD'],
    ['BTCB', 'USDT'], ['BTCB', 'USDC'], ['BTCB', 'BUSD'],
    ['USDT', 'USDC'], ['USDT', 'BUSD'], ['USDC', 'BUSD']
  ]
} as const;

// Utility Functions for Intelligent Router
export function getIntelligentRouterTokens(chainId?: IntelligentRouterChainId): IntelligentRouterToken[] {
  if (chainId) {
    return INTELLIGENT_ROUTER_TOKENS_BY_NETWORK[chainId] || [];
  }
  return ALL_INTELLIGENT_ROUTER_TOKENS;
}

export function getIntelligentRouterToken(symbol: string, chainId: IntelligentRouterChainId): IntelligentRouterToken | undefined {
  const networkTokens = INTELLIGENT_ROUTER_TOKENS_BY_NETWORK[chainId] || [];
  return networkTokens.find(token => token.symbol === symbol);
}

export function getIntelligentRouterNetworkInfo(chainId: IntelligentRouterChainId) {
  return INTELLIGENT_ROUTER_NETWORKS[chainId];
}

export function isIntelligentRouterPairRecommended(fromSymbol: string, toSymbol: string, chainId: IntelligentRouterChainId): boolean {
  const networkPairs = INTELLIGENT_ROUTER_RECOMMENDED_PAIRS[chainId] || [];
  return networkPairs.some(pair => 
    (pair[0] === fromSymbol && pair[1] === toSymbol) ||
    (pair[0] === toSymbol && pair[1] === fromSymbol)
  );
}

export function getIntelligentRouterTokenAddress(token: IntelligentRouterToken): string {
  return token.address;
}

export function formatIntelligentRouterTokenAmount(amount: string, token: IntelligentRouterToken): string {
  const precision = token.displayPrecision || 4;
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  
  if (num < Math.pow(10, -precision)) {
    return `< ${Math.pow(10, -precision)}`;
  }
  
  return num.toFixed(precision);
}

// Export count for validation
export const INTELLIGENT_ROUTER_TOKEN_COUNT = {
  total: ALL_INTELLIGENT_ROUTER_TOKENS.length,
  ethereum: ETHEREUM_IR_TOKENS.length,
  polygon: POLYGON_IR_TOKENS.length,
  arbitrum: ARBITRUM_IR_TOKENS.length,
  bsc: BSC_IR_TOKENS.length
};