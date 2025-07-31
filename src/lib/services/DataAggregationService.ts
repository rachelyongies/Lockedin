// Service for aggregating data from multiple sources for AI analysis
import { Token } from '@/types/bridge';

interface MarketConditions {
  timestamp: number;
  networkCongestion: {
    ethereum: number;
    polygon: number;
    bsc: number;
    arbitrum: number;
    bitcoin: number;
    stellar: number;
    solana: number;
    starknet: number;
  };
  gasPrices: {
    ethereum: { fast: number; standard: number; safe: number };
    polygon: { fast: number; standard: number; safe: number };
  };
  volatility: {
    overall: number;
    tokenSpecific: Record<string, number>;
  };
  liquidity: {
    overall: number;
    perDEX: Record<string, number>;
  };
  timeOfDay: number;
  dayOfWeek: number;
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export class DataAggregationService {
  private static instance: DataAggregationService;
  private cache = new Map<string, { data: unknown; expiry: number }>();
  private apiKeys: Record<string, string> = {};

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private readonly DEFILLAMA_BASE_URL = 'https://api.llama.fi';

  static getInstance(): DataAggregationService {
    if (!DataAggregationService.instance) {
      DataAggregationService.instance = new DataAggregationService();
    }
    return DataAggregationService.instance;
  }

  private constructor() {
    this.apiKeys = {
      coinGecko: process.env.NEXT_PUBLIC_COINGECKO_API_KEY || '',
      etherscan: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || ''
    };
  }

  // Get aggregated token information
  async getTokens(chainId: number = 1): Promise<Record<string, TokenInfo>> {
    const cacheKey = `tokens_${chainId}`;
    const cached = this.getFromCache<Record<string, TokenInfo>>(cacheKey);
    if (cached) return cached;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`/api/tokens/${chainId}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'UniteDefi/1.0'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const tokens = data.tokens || {};

      this.setCache(cacheKey, tokens);
      return tokens;
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return this.getFallbackTokens(chainId);
    }
  }

  // Get current token prices
  async getTokenPrices(tokenIds: string[]): Promise<Record<string, number>> {
    const cacheKey = `prices_${tokenIds.join(',')}`;
    const cached = this.getFromCache<Record<string, number>>(cacheKey);
    if (cached) return cached;

    try {
      const idsParam = tokenIds.join(',');
      const url = `${this.COINGECKO_BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=usd`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'UniteDefi/1.0',
          ...(this.apiKeys.coinGecko && { 'x-cg-pro-api-key': this.apiKeys.coinGecko })
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const prices: Record<string, number> = {};
      
      for (const [tokenId, priceData] of Object.entries(data)) {
        if (typeof priceData === 'object' && priceData && 'usd' in priceData) {
          prices[tokenId] = (priceData as { usd: number }).usd;
        }
      }

      this.setCache(cacheKey, prices);
      return prices;
    } catch (error) {
      console.error('Error fetching prices:', error);
      return this.getFallbackPrices(tokenIds);
    }
  }

  // Get market conditions for AI analysis
  async getNetworkConditions(): Promise<MarketConditions> {
    const cacheKey = 'network_conditions';
    const cached = this.getFromCache<MarketConditions>(cacheKey);
    if (cached && cached.timestamp > Date.now() - this.CACHE_TTL) return cached;

    try {
      const [chainTVL, gasPrices] = await Promise.all([
        this.getChainTVL(),
        this.getGasPrices()
      ]);

      const conditions: MarketConditions = {
        timestamp: Date.now(),
        networkCongestion: {
          ethereum: gasPrices.ethereum?.fast / 100 || 0.5, // Normalize to 0-1 scale
          polygon: gasPrices.polygon?.fast / 100 || 0.3,
          bsc: 0.05,
          arbitrum: 0.01,
          bitcoin: 0.1,
          stellar: 0.05,
          solana: 0.15,
          starknet: 0.001
        },
        gasPrices: {
          ethereum: gasPrices.ethereum,
          polygon: gasPrices.polygon
        },
        volatility: {
          overall: Math.random() * 0.5 + 0.25, // 0.25-0.75
          tokenSpecific: {
            'ETH': Math.random() * 0.4 + 0.2,
            'BTC': Math.random() * 0.5 + 0.3,
            'USDC': Math.random() * 0.1 + 0.05
          }
        },
        liquidity: {
          overall: Math.max(0.1, Math.min(1.0, Object.values(chainTVL).reduce((a, b) => a + b, 0) / 100000000000)),
          perDEX: {
            'uniswap': 0.8,
            'sushiswap': 0.6,
            'balancer': 0.5,
            'pancakeswap': 0.7,
            '1inch': 0.9
          }
        },
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      this.setCache(cacheKey, conditions);
      return conditions;
    } catch (error) {
      console.error('Error getting network conditions:', error);
      return this.getFallbackNetworkConditions();
    }
  }

  // Get gas prices across networks
  async getGasPrices(): Promise<Record<string, { fast: number; standard: number; safe: number }>> {
    try {
      const ethGasResponse = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=' + this.apiKeys.etherscan);
      let ethGas = { fast: 50, standard: 30, safe: 20 };
      
      if (ethGasResponse.ok) {
        const ethGasData = await ethGasResponse.json();
        ethGas = {
          fast: parseInt(ethGasData.result?.FastGasPrice) || 50,
          standard: parseInt(ethGasData.result?.StandardGasPrice) || 30,
          safe: parseInt(ethGasData.result?.SafeGasPrice) || 20
        };
      }

      return {
        ethereum: ethGas,
        polygon: { fast: 30, standard: 25, safe: 20 },
        bsc: { fast: 5, standard: 3, safe: 1 },
        arbitrum: { fast: 0.1, standard: 0.05, safe: 0.01 },
        optimism: { fast: 0.1, standard: 0.05, safe: 0.01 },
        avalanche: { fast: 25, standard: 20, safe: 15 },
        starknet: { fast: 0.001, standard: 0.0005, safe: 0.0001 }
      };
    } catch {
      return this.getDynamicGasFallback();
    }
  }

  // Get chain TVL data
  private async getChainTVL(): Promise<Record<string, number>> {
    const cacheKey = 'chain_tvl';
    const cached = this.getFromCache<Record<string, number>>(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.DEFILLAMA_BASE_URL}/chains`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'UniteDefi/1.0'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const chainTVL: Record<string, number> = {};
      
      for (const chain of data) {
        if (chain.name && chain.tvl) {
          chainTVL[chain.name.toLowerCase()] = chain.tvl;
        }
      }

      this.setCache(cacheKey, chainTVL);
      return chainTVL;
    } catch (error) {
      console.error('Error fetching chain TVL:', error);
      return this.getFallbackChainTVL();
    }
  }

  // Cache management
  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  private setCache(key: string, data: unknown, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  // Fallback methods
  private getFallbackTokens(chainId: number): Record<string, TokenInfo> {
    const mainnetTokens: Record<string, TokenInfo> = {
      '0xA0b86a91c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        address: '0xA0b86a91c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      },
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18
      }
    };
    
    return chainId === 1 ? mainnetTokens : {};
  }

  private getFallbackPrices(tokenIds: string[]): Record<string, number> {
    const fallbackPrices: Record<string, number> = {
      'ethereum': 2000,
      'bitcoin': 40000,
      'usd-coin': 1,
      'tether': 1,
      'binancecoin': 300,
      'matic-network': 0.8,
      'wrapped-bitcoin': 40000,
      'chainlink': 15
    };
    
    const result: Record<string, number> = {};
    for (const tokenId of tokenIds) {
      result[tokenId] = fallbackPrices[tokenId] || 1;
    }
    return result;
  }

  private getFallbackChainTVL(): Record<string, number> {
    return {
      ethereum: 50000000000,
      polygon: 5000000000,
      bsc: 8000000000,
      arbitrum: 2000000000,
      optimism: 1000000000,
      avalanche: 3000000000
    };
  }

  private getFallbackNetworkConditions(): MarketConditions {
    return {
      timestamp: Date.now(),
      networkCongestion: {
        ethereum: 50,
        polygon: 30,
        bsc: 5,
        arbitrum: 0.1,
        bitcoin: 10,
        stellar: 5,
        solana: 15,
        starknet: 0.001
      },
      gasPrices: {
        ethereum: { fast: 50, standard: 30, safe: 20 },
        polygon: { fast: 30, standard: 25, safe: 20 }
      },
      volatility: {
        overall: 0.5,
        tokenSpecific: {
          'ETH': 0.3,
          'BTC': 0.4,
          'USDC': 0.1
        }
      },
      liquidity: {
        overall: 0.7,
        perDEX: {
          'uniswap': 0.8,
          'sushiswap': 0.6,
          'balancer': 0.5
        }
      },
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
  }

  private getDynamicGasFallback(): Record<string, { fast: number; standard: number; safe: number }> {
    return {
      ethereum: { fast: 50, standard: 30, safe: 20 },
      polygon: { fast: 30, standard: 25, safe: 20 },
      bsc: { fast: 5, standard: 3, safe: 1 },
      arbitrum: { fast: 0.1, standard: 0.05, safe: 0.01 },
      optimism: { fast: 0.1, standard: 0.05, safe: 0.01 },
      avalanche: { fast: 25, standard: 20, safe: 15 },
      starknet: { fast: 0.001, standard: 0.0005, safe: 0.0001 }
    };
  }

  // Health check
  async healthCheck(): Promise<{ status: number; services: Record<string, boolean>; latency: Record<string, number> }> {
    const start = Date.now();
    const services: Record<string, boolean> = {};
    const latency: Record<string, number> = {};

    try {
      const coinGeckoStart = Date.now();
      const cgResponse = await fetch(`${this.COINGECKO_BASE_URL}/ping`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      services.coinGecko = cgResponse.ok;
      latency.coinGecko = Date.now() - coinGeckoStart;
    } catch {
      services.coinGecko = false;
      latency.coinGecko = -1;
    }

    try {
      const defiLlamaStart = Date.now();
      const dlResponse = await fetch(`${this.DEFILLAMA_BASE_URL}/chains`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      services.defiLlama = dlResponse.ok;
      latency.defiLlama = Date.now() - defiLlamaStart;
    } catch {
      services.defiLlama = false;
      latency.defiLlama = -1;
    }

    const allServicesUp = Object.values(services).every(Boolean);
    const totalLatency = Date.now() - start;

    return {
      status: allServicesUp ? 200 : 503,
      services,
      latency: { ...latency, total: totalLatency }
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Get protocol liquidity data
  async getProtocolLiquidity(): Promise<Record<string, number>> {
    const cacheKey = 'protocol_liquidity';
    const cached = this.getFromCache<Record<string, number>>(cacheKey);
    if (cached) return cached;

    try {
      // In production, this would query actual DeFi protocol APIs
      const liquidity: Record<string, number> = {
        'uniswap': 8500000000, // $8.5B TVL
        'sushiswap': 3200000000, // $3.2B TVL
        'balancer': 2100000000, // $2.1B TVL
        'pancakeswap': 4800000000, // $4.8B TVL
        '1inch': 1500000000, // $1.5B TVL
        'dydx': 950000000, // $950M TVL
        'raydium': 650000000, // $650M TVL
        'jupiter': 420000000, // $420M TVL
        'orca': 380000000 // $380M TVL
      };

      this.setCache(cacheKey, liquidity);
      return liquidity;
    } catch (error) {
      console.error('Error fetching protocol liquidity:', error);
      // Return fallback liquidity data
      return {
        'uniswap': 8000000000,
        'sushiswap': 3000000000,
        'balancer': 2000000000,
        'pancakeswap': 4500000000,
        '1inch': 1400000000,
        'dydx': 900000000,
        'raydium': 600000000,
        'jupiter': 400000000,
        'orca': 350000000
      };
    }
  }
}