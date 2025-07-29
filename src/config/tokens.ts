import { Token, EthereumToken, BitcoinToken, SolanaToken, StarknetToken, StellarToken } from '@/types/bridge';

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
  address: '0x0000000000000000000000000000000000000000', //disabled mainnet for now
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

// Solana Tokens
export const SOL: SolanaToken = {
  id: 'sol-mainnet',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  logoUrl: '/images/tokens/sol.svg',
  coingeckoId: 'solana',
  network: 'solana',
  chainId: 'mainnet-beta',
  isNative: true,
  isWrapped: false,
  wrappedEquivalent: 'WSOL',
  
  // UX Metadata
  explorerUrl: 'https://solscan.io',
  verified: true,
  displayPrecision: 4,
  description: 'Native cryptocurrency of Solana blockchain',
  tags: ['native', 'gas-token', 'defi'],
};

export const WSOL: SolanaToken = {
  id: 'wsol-mainnet',
  symbol: 'WSOL',
  name: 'Wrapped Solana',
  decimals: 9,
  logoUrl: '/images/tokens/wsol.svg',
  coingeckoId: 'wrapped-solana',
  network: 'solana',
  chainId: 'testnet',
  address: 'AcXsCPgSPknuk8odssi1osVVT3NqAAQNctPfiWpu7uZN', // Updated Solana address
  isNative: false,
  isWrapped: true,
  nativeEquivalent: 'SOL',
  
  // UX Metadata
  explorerUrl: 'https://solscan.io/token/AcXsCPgSPknuk8odssi1osVVT3NqAAQNctPfiWpu7uZN', // Updated Solana address 
  wrappedSymbol: 'SOL',
  verified: true,
  displayPrecision: 4,
  description: 'SPL token version of Solana',
  tags: ['wrapped', 'spl', 'defi'],
};

export const SOL_DEVNET: SolanaToken = {
  ...SOL,
  id: 'sol-devnet',
  chainId: 'devnet',
  explorerUrl: 'https://solscan.io/?cluster=devnet',
  description: 'Solana devnet token for development',
  tags: ['native', 'testnet'],
  // Add test wallet for development
  // testWallet: 'AcXsCPgSPknuk8odssi1osVVT3NqAAQNctPfiWpu7uZN',
};

export const WSOL_DEVNET: SolanaToken = {
  ...WSOL,
  id: 'wsol-devnet',
  chainId: 'devnet',
  address: 'AcXsCPgSPknuk8odssi1osVVT3NqAAQNctPfiWpu7uZN',
  explorerUrl: 'https://solscan.io/token/AcXsCPgSPknuk8odssi1osVVT3NqAAQNctPfiWpu7uZN?cluster=devnet',
  description: 'Wrapped Solana devnet token',
  tags: ['wrapped', 'testnet'],
};

// Starknet Tokens
export const STARK: StarknetToken = {
  id: 'stark-mainnet',
  symbol: 'STARK',
  name: 'Starknet',
  decimals: 18,
  logoUrl: '/images/tokens/stark.svg',
  coingeckoId: 'starknet',
  network: 'starknet',
  chainId: 'mainnet',
  isNative: true,
  isWrapped: false,
  wrappedEquivalent: 'WSTARK',
  
  // UX Metadata
  explorerUrl: 'https://starkscan.co',
  verified: true,
  displayPrecision: 4,
  description: 'Native cryptocurrency of Starknet blockchain',
  tags: ['native', 'gas-token', 'defi'],
};

export const WSTARK: StarknetToken = {
  id: 'wstark-mainnet',
  symbol: 'WSTARK',
  name: 'Wrapped Starknet',
  decimals: 18,
  logoUrl: '/images/tokens/wstark.svg',
  coingeckoId: 'wrapped-starknet',
  network: 'starknet',
  chainId: 'mainnet',
  address: '0x070ed3c953df4131094cf7f5e1d25ad1f77c0c04f7ab36b743160c59dd292581', // Starknet address
  isNative: false,
  isWrapped: true,
  nativeEquivalent: 'STARK',
  
  // UX Metadata
  explorerUrl: 'https://starkscan.co',
  wrappedSymbol: 'STARK',
  verified: true,
  displayPrecision: 4,
  description: 'ERC-20 compatible version of Starknet',
  tags: ['wrapped', 'erc20', 'defi'],
};

export const STARK_GOERLI: StarknetToken = {
  ...STARK,
  id: 'stark-goerli',
  chainId: 'goerli',
  explorerUrl: 'https://testnet.starkscan.co',
  description: 'Starknet testnet token for development',
  tags: ['native', 'testnet'],
};

export const WSTARK_GOERLI: StarknetToken = {
  ...WSTARK,
  id: 'wstark-goerli',
  chainId: 'goerli',
  address: '0x070ed3c953df4131094cf7f5e1d25ad1f77c0c04f7ab36b743160c59dd292581', // Starknet address
  explorerUrl: 'https://testnet.starkscan.co',
  description: 'Wrapped Starknet testnet token',
  tags: ['wrapped', 'testnet'],
};

// Stellar Tokens
export const XLM: StellarToken = {
  id: 'xlm-public',
  symbol: 'XLM',
  name: 'Stellar Lumens',
  decimals: 7,
  logoUrl: '/images/tokens/xlm.svg',
  coingeckoId: 'stellar',
  network: 'stellar',
  chainId: 'public',
  isNative: true,
  isWrapped: false,
  wrappedEquivalent: 'WXLM',
  
  // UX Metadata
  explorerUrl: 'https://stellar.expert',
  verified: true,
  displayPrecision: 4,
  description: 'Native cryptocurrency of Stellar blockchain',
  tags: ['native', 'gas-token', 'defi'],
};

export const WXLM: StellarToken = {
  id: 'wxlm-public',
  symbol: 'WXLM',
  name: 'Wrapped Stellar Lumens',
  decimals: 7,
  logoUrl: '/images/tokens/wxlm.svg',
  coingeckoId: 'wrapped-stellar',
  network: 'stellar',
  chainId: 'public',
  isNative: false,
  isWrapped: true,
  nativeEquivalent: 'XLM',
  
  // UX Metadata
  explorerUrl: 'https://stellar.expert',
  wrappedSymbol: 'XLM',
  verified: true,
  displayPrecision: 4,
  description: 'ERC-20 compatible version of Stellar Lumens',
  tags: ['wrapped', 'erc20', 'defi'],
};

export const XLM_TESTNET: StellarToken = {
  ...XLM,
  id: 'xlm-testnet',
  chainId: 'testnet',
  explorerUrl: 'https://testnet.stellar.expert',
  description: 'Stellar testnet token for development',
  tags: ['native', 'testnet'],
};

export const WXLM_TESTNET: StellarToken = {
  ...WXLM,
  id: 'wxlm-testnet',
  chainId: 'testnet',
  explorerUrl: 'https://testnet.stellar.expert',
  description: 'Wrapped Stellar testnet token',
  tags: ['wrapped', 'testnet'],
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

export const SOLANA_TOKENS: Record<string, SolanaToken[]> = {
  'mainnet-beta': [SOL, WSOL],
  devnet: [SOL_DEVNET, WSOL_DEVNET],
  testnet: [],
};

export const STARKNET_TOKENS: Record<string, StarknetToken[]> = {
  mainnet: [STARK, WSTARK],
  goerli: [STARK_GOERLI, WSTARK_GOERLI],
  sepolia: [],
};

export const STELLAR_TOKENS: Record<string, StellarToken[]> = {
  public: [XLM, WXLM],
  testnet: [XLM_TESTNET, WXLM_TESTNET],
};

// All tokens for easy lookup
export const ALL_TOKENS: Token[] = [
  ETH, WETH, WBTC, BTC,
  ETH_GOERLI, WETH_GOERLI, WBTC_GOERLI, BTC_TESTNET,
  SOL, WSOL, SOL_DEVNET, WSOL_DEVNET,
  STARK, WSTARK, STARK_GOERLI, WSTARK_GOERLI,
  XLM, WXLM, XLM_TESTNET, WXLM_TESTNET,
];

// Helper to create unique token key
export function getTokenKey(token: Token): string {
  if (token.network === 'ethereum') {
    return `${token.symbol}_ethereum_${token.chainId}`;
  } else if (token.network === 'bitcoin') {
    return `${token.symbol}_bitcoin_${token.chainId}`;
  } else if (token.network === 'solana') {
    return `${token.symbol}_solana_${token.chainId}`;
  } else if (token.network === 'starknet') {
    return `${token.symbol}_starknet_${token.chainId}`;
  } else if (token.network === 'stellar') {
    return `${token.symbol}_stellar_${token.chainId}`;
  } else {
    return `${token.symbol}_${token.network}_${token.chainId}`;
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
export function getToken(symbol: string, chainId?: number | string, network?: 'ethereum' | 'bitcoin' | 'solana' | 'starknet' | 'stellar'): Token | undefined {
  // If we have all parameters, do a direct lookup
  if (chainId !== undefined && network !== undefined) {
    const key = network === 'ethereum' 
      ? `${symbol}_ethereum_${chainId}`
      : network === 'bitcoin'
      ? `${symbol}_bitcoin_${chainId}`
      : network === 'solana'
      ? `${symbol}_solana_${chainId}`
      : network === 'starknet'
      ? `${symbol}_starknet_${chainId}`
      : network === 'stellar'
      ? `${symbol}_stellar_${chainId}`
      : `${symbol}_${network}_${chainId}`;
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
    
    if (token.network === 'solana' && typeof chainId === 'string') {
      return (token as SolanaToken).chainId === chainId;
    }
    
    if (token.network === 'starknet' && typeof chainId === 'string') {
      return (token as StarknetToken).chainId === chainId;
    }
    
    if (token.network === 'stellar' && typeof chainId === 'string') {
      return (token as StellarToken).chainId === chainId;
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
      return [WBTC, ETH, SOL, STARK, XLM]; // BTC can go to WBTC, ETH, SOL, STARK, or XLM
    case 'WBTC':
      return [BTC, ETH, SOL, STARK, XLM]; // WBTC can go to BTC, ETH, SOL, STARK, or XLM
    case 'ETH':
      return [WETH, BTC, WBTC, SOL, STARK, XLM]; // ETH can go to WETH, BTC, WBTC, SOL, STARK, or XLM
    case 'WETH':
      return [ETH, BTC, WBTC, SOL, STARK, XLM]; // WETH can go to ETH, BTC, WBTC, SOL, STARK, or XLM
    case 'SOL':
      return [WSOL, ETH, BTC, WBTC, STARK, XLM]; // SOL can go to WSOL, ETH, BTC, WBTC, STARK, or XLM
    case 'WSOL':
      return [SOL, ETH, BTC, WBTC, STARK, XLM]; // WSOL can go to SOL, ETH, BTC, WBTC, STARK, or XLM
    case 'STARK':
      return [WSTARK, ETH, BTC, WBTC, SOL, XLM]; // STARK can go to WSTARK, ETH, BTC, WBTC, SOL, or XLM
    case 'WSTARK':
      return [STARK, ETH, BTC, WBTC, SOL, XLM]; // WSTARK can go to STARK, ETH, BTC, WBTC, SOL, or XLM
    case 'XLM':
      return [WXLM, ETH, BTC, WBTC, SOL, STARK]; // XLM can go to WXLM, ETH, BTC, WBTC, SOL, or STARK
    case 'WXLM':
      return [XLM, ETH, BTC, WBTC, SOL, STARK]; // WXLM can go to XLM, ETH, BTC, WBTC, SOL, or STARK
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
     (from.network === 'ethereum' && from.chainId === 1) ||
     (from.network === 'solana' && from.chainId === 'mainnet-beta') ||
     (from.network === 'starknet' && from.chainId === 'mainnet') ||
     (from.network === 'stellar' && from.chainId === 'public')) &&
    ((to.network === 'bitcoin' && to.chainId === 'mainnet') || 
     (to.network === 'ethereum' && to.chainId === 1) ||
     (to.network === 'solana' && to.chainId === 'mainnet-beta') ||
     (to.network === 'starknet' && to.chainId === 'mainnet') ||
     (to.network === 'stellar' && to.chainId === 'public'))
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
export const DEFAULT_TO_TOKEN = SOL;

// Popular token pairs for quick selection
export const POPULAR_PAIRS = [
  { from: ETH, to: SOL },
  { from: SOL, to: ETH },
  { from: ETH, to: BTC },
  { from: BTC, to: ETH },
  { from: ETH, to: STARK },
  { from: STARK, to: ETH },
  { from: ETH, to: XLM },
  { from: XLM, to: ETH },
  { from: SOL, to: BTC },
  { from: BTC, to: SOL },
  { from: SOL, to: STARK },
  { from: STARK, to: SOL },
  { from: SOL, to: XLM },
  { from: XLM, to: SOL },
] as const;