// Chain Support Configuration for 1inch APIs
// Defines which chains support which 1inch services

export interface ChainSupportInfo {
  chainId: number;
  name: string;
  symbol: string;
  fusionSupported: boolean;
  aggregationSupported: boolean;
  portfolioSupported: boolean;
  limitOrdersSupported: boolean;
  fallbackStrategy: 'aggregation-only' | 'bridge-required' | 'unsupported';
  alternativeProviders?: string[];
}

// 1inch Official Chain Support Matrix (as of 2024)
export const CHAIN_SUPPORT_CONFIG: Record<number, ChainSupportInfo> = {
  // Ethereum Mainnet - Full support
  1: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    fusionSupported: true,
    aggregationSupported: true,
    portfolioSupported: true,
    limitOrdersSupported: true,
    fallbackStrategy: 'aggregation-only',
    alternativeProviders: ['0x', 'Paraswap', 'Kyber']
  },

  // Binance Smart Chain - Full support
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    fusionSupported: true,
    aggregationSupported: true,
    portfolioSupported: true,
    limitOrdersSupported: true,
    fallbackStrategy: 'aggregation-only',
    alternativeProviders: ['PancakeSwap', 'Venus']
  },

  // Polygon - Full support
  137: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    fusionSupported: true,
    aggregationSupported: true,
    portfolioSupported: true,
    limitOrdersSupported: true,
    fallbackStrategy: 'aggregation-only',
    alternativeProviders: ['QuickSwap', 'Paraswap']
  },

  // Arbitrum One - Limited support (no Fusion)
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    fusionSupported: false, // ❌ Fusion not supported
    aggregationSupported: true,
    portfolioSupported: true,
    limitOrdersSupported: false,
    fallbackStrategy: 'aggregation-only',
    alternativeProviders: ['Uniswap V3', 'SushiSwap', 'Camelot']
  },

  // Optimism - Limited support (no Fusion)
  10: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    fusionSupported: false, // ❌ Fusion not supported
    aggregationSupported: true,
    portfolioSupported: true,
    limitOrdersSupported: false,
    fallbackStrategy: 'aggregation-only',
    alternativeProviders: ['Uniswap V3', 'Velodrome']
  },

  // Avalanche - Limited support
  43114: {
    chainId: 43114,
    name: 'Avalanche',
    symbol: 'AVAX',
    fusionSupported: false, // ❌ Fusion not supported
    aggregationSupported: true,
    portfolioSupported: false,
    limitOrdersSupported: false,
    fallbackStrategy: 'aggregation-only',
    alternativeProviders: ['Trader Joe', 'Pangolin']
  },

  // Fantom - Limited support
  250: {
    chainId: 250,
    name: 'Fantom',
    symbol: 'FTM',
    fusionSupported: false, // ❌ Fusion not supported
    aggregationSupported: true,
    portfolioSupported: false,
    limitOrdersSupported: false,
    fallbackStrategy: 'aggregation-only',
    alternativeProviders: ['SpookySwap', 'SpiritSwap']
  },

  // Gnosis Chain - No 1inch support
  100: {
    chainId: 100,
    name: 'Gnosis Chain',
    symbol: 'xDAI',
    fusionSupported: false,
    aggregationSupported: false,
    portfolioSupported: false,
    limitOrdersSupported: false,
    fallbackStrategy: 'bridge-required',
    alternativeProviders: ['HoneySwap', 'SushiSwap']
  }
};

export class ChainSupportService {
  static isFusionSupported(chainId: number): boolean {
    const config = CHAIN_SUPPORT_CONFIG[chainId];
    return config?.fusionSupported ?? false;
  }

  static isAggregationSupported(chainId: number): boolean {
    const config = CHAIN_SUPPORT_CONFIG[chainId];
    return config?.aggregationSupported ?? false;
  }

  static getChainConfig(chainId: number): ChainSupportInfo | null {
    return CHAIN_SUPPORT_CONFIG[chainId] || null;
  }

  static getFallbackStrategy(chainId: number): string {
    const config = CHAIN_SUPPORT_CONFIG[chainId];
    return config?.fallbackStrategy || 'unsupported';
  }

  static getAlternativeProviders(chainId: number): string[] {
    const config = CHAIN_SUPPORT_CONFIG[chainId];
    return config?.alternativeProviders || [];
  }

  static getSupportedChains(): ChainSupportInfo[] {
    return Object.values(CHAIN_SUPPORT_CONFIG);
  }

  static getFusionSupportedChains(): ChainSupportInfo[] {
    return Object.values(CHAIN_SUPPORT_CONFIG).filter(config => config.fusionSupported);
  }

  static getAggregationSupportedChains(): ChainSupportInfo[] {
    return Object.values(CHAIN_SUPPORT_CONFIG).filter(config => config.aggregationSupported);
  }

  // Generate user-friendly warning messages
  static getFusionWarningMessage(chainId: number): string | null {
    const config = CHAIN_SUPPORT_CONFIG[chainId];
    if (!config) {
      return `Chain ID ${chainId} is not supported by 1inch services.`;
    }
    
    if (!config.fusionSupported && config.aggregationSupported) {
      return `1inch Fusion is not available on ${config.name}. Using 1inch Aggregation instead for fast DEX routing.`;
    }
    
    if (!config.fusionSupported && !config.aggregationSupported) {
      return `1inch services are not available on ${config.name}. Consider bridging to ${this.getFusionSupportedChains()[0]?.name || 'Ethereum'} for optimal rates.`;
    }
    
    return null; // Fusion is supported
  }

  static getRouteRecommendation(chainId: number): {
    recommendation: 'fusion' | 'aggregation' | 'bridge' | 'alternative';
    reasoning: string;
    alternatives?: string[];
  } {
    const config = CHAIN_SUPPORT_CONFIG[chainId];
    
    if (!config) {
      return {
        recommendation: 'bridge',
        reasoning: 'Chain not supported by 1inch. Bridge to a supported chain first.',
        alternatives: ['Bridge to Ethereum', 'Bridge to Polygon', 'Bridge to BSC']
      };
    }

    if (config.fusionSupported) {
      return {
        recommendation: 'fusion',
        reasoning: '1inch Fusion available - best rates with MEV protection',
      };
    }

    if (config.aggregationSupported) {
      return {
        recommendation: 'aggregation',
        reasoning: '1inch Aggregation available - fast multi-DEX routing',
        alternatives: config.alternativeProviders
      };
    }

    return {
      recommendation: 'alternative',
      reasoning: `1inch not available on ${config.name}. Use native DEXs instead.`,
      alternatives: config.alternativeProviders
    };
  }
}

// Export supported chain IDs for easy checking
export const FUSION_SUPPORTED_CHAINS = [1, 56, 137]; // Ethereum, BSC, Polygon
export const AGGREGATION_SUPPORTED_CHAINS = [1, 56, 137, 42161, 10, 43114, 250]; // More chains support aggregation
export const ALL_SUPPORTED_CHAINS = Object.keys(CHAIN_SUPPORT_CONFIG).map(Number);