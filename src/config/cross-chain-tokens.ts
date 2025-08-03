// Cross-chain token addresses for 1inch Fusion+ quotes
export const CROSS_CHAIN_NETWORKS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    tokens: {
      ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      USDC: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    }
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    tokens: {
      MATIC: '0x0000000000000000000000000000000000001010',
      WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
    }
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    tokens: {
      ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    }
  },
  base: {
    chainId: 8453,
    name: 'Base',
    symbol: 'ETH',
    tokens: {
      ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      WBTC: '0x1fA3F25C7d9423B25B6C47FB12b19e8b532Dd2e2',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'
    }
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    tokens: {
      ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    }
  },
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    tokens: {
      BNB: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // Bitcoin BEP20
      USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      USDT: '0x55d398326f99059fF775485246999027B3197955'
    }
  }
} as const;

export type NetworkKey = keyof typeof CROSS_CHAIN_NETWORKS;

export interface CrossChainNetwork {
  chainId: number;
  name: string;
  symbol: string;
  tokens: Record<string, string>;
}

export function getNetworkByChainId(chainId: number): NetworkKey | undefined {
  return Object.keys(CROSS_CHAIN_NETWORKS).find(
    key => CROSS_CHAIN_NETWORKS[key as NetworkKey].chainId === chainId
  ) as NetworkKey | undefined;
}

export function getWBTCAddress(network: NetworkKey): string {
  const networkData = CROSS_CHAIN_NETWORKS[network];
  return networkData.tokens.WBTC || networkData.tokens.BTCB || '';
}

export function getNativeTokenAddress(network: NetworkKey): string {
  const networkData = CROSS_CHAIN_NETWORKS[network];
  return networkData.tokens.ETH || networkData.tokens.MATIC || networkData.tokens.BNB || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
}

export function getSupportedCrossChainPairs(): Array<{src: NetworkKey, dst: NetworkKey}> {
  return [
    { src: 'ethereum', dst: 'polygon' },
    { src: 'ethereum', dst: 'arbitrum' },
    { src: 'ethereum', dst: 'base' },
    { src: 'ethereum', dst: 'optimism' },
    { src: 'polygon', dst: 'ethereum' },
    { src: 'arbitrum', dst: 'ethereum' },
    { src: 'base', dst: 'ethereum' },
    { src: 'optimism', dst: 'ethereum' }
  ];
}