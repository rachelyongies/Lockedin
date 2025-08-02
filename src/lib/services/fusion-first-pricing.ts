// 🔥 Fusion-First Pricing Service - Prioritize 1inch Fusion over CoinGecko for hackathon
// This service prioritizes 1inch ecosystem APIs over external providers

import { fusionAPI } from './1inch-fusion';
import { tokenValidationService } from './token-validation-service';
import { Token } from '@/types/bridge';

export interface PricingResult {
  prices: Record<string, number>;
  source: '1inch-fusion' | 'coingecko-fallback' | 'hybrid';
  timestamp: number;
  confidence: number;
}

export interface PricingOptions {
  preferFusion?: boolean;
  fallbackToCoinGecko?: boolean;
  cacheTime?: number;
}

class FusionFirstPricingService {
  private static instance: FusionFirstPricingService;
  private cache = new Map<string, { data: PricingResult; timestamp: number; ttl: number }>();
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds

  static getInstance(): FusionFirstPricingService {
    if (!FusionFirstPricingService.instance) {
      FusionFirstPricingService.instance = new FusionFirstPricingService();
    }
    return FusionFirstPricingService.instance;
  }

  // 🎯 Main pricing method - prioritizes 1inch Fusion
  async getTokenPrices(
    tokens: Token[] | string[],
    options: PricingOptions = {}
  ): Promise<PricingResult> {
    const {
      preferFusion = true, // Default to preferring Fusion for hackathon
      fallbackToCoinGecko = true,
      cacheTime = this.DEFAULT_CACHE_TTL
    } = options;

    console.log('🔥 Fusion-First Pricing - Starting price fetch for hackathon optimization');
    
    // Convert tokens to addresses for 1inch API
    const tokenAddresses = this.convertToAddresses(tokens);
    const cacheKey = `fusion-pricing-${tokenAddresses.join(',')}-${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Using cached pricing data');
      return cached;
    }

    let result: PricingResult;

    if (preferFusion) {
      console.log('🚀 Attempting 1inch Fusion pricing (hackathon priority)');
      result = await this.getFusionPricesWithFallback(tokenAddresses, fallbackToCoinGecko);
    } else {
      console.log('⚡ Using hybrid pricing approach');
      result = await this.getHybridPrices(tokenAddresses);
    }

    // Cache the result
    this.setCache(cacheKey, result, cacheTime);
    return result;
  }

  // 🔥 Primary method: Try 1inch Fusion first, fallback to CoinGecko if needed
  private async getFusionPricesWithFallback(
    tokenAddresses: string[],
    allowFallback: boolean
  ): Promise<PricingResult> {
    try {
      console.log('🎯 1inch Fusion API - Fetching token prices');
      const fusionPrices = await fusionAPI.getTokenPrices(tokenAddresses);
      
      if (Object.keys(fusionPrices).length > 0) {
        console.log('✅ 1inch Fusion pricing successful:', Object.keys(fusionPrices).length, 'prices');
        return {
          prices: fusionPrices,
          source: '1inch-fusion',
          timestamp: Date.now(),
          confidence: 0.95 // High confidence for 1inch data
        };
      }
      
      throw new Error('No prices returned from 1inch Fusion');
    } catch (error) {
      console.warn('⚠️ 1inch Fusion pricing failed:', error);
      
      if (!allowFallback) {
        throw error;
      }
      
      console.log('🔄 Falling back to CoinGecko for missing prices');
      return await this.getCoinGeckoPrices(tokenAddresses);
    }
  }

  // 🌟 Hybrid approach: Try both, merge results with 1inch taking priority
  private async getHybridPrices(tokenAddresses: string[]): Promise<PricingResult> {
    console.log('🔀 Hybrid pricing: Fetching from both 1inch Fusion and CoinGecko');
    
    const [fusionResult, coinGeckoResult] = await Promise.allSettled([
      this.getFusionPricesWithFallback(tokenAddresses, false).catch(() => ({ prices: {}, source: '1inch-fusion' as const, timestamp: Date.now(), confidence: 0 })),
      this.getCoinGeckoPrices(tokenAddresses).catch(() => ({ prices: {}, source: 'coingecko-fallback' as const, timestamp: Date.now(), confidence: 0 }))
    ]);

    const fusionPrices = fusionResult.status === 'fulfilled' ? fusionResult.value.prices : {};
    const coinGeckoPrices = coinGeckoResult.status === 'fulfilled' ? coinGeckoResult.value.prices : {};

    // Merge prices with 1inch Fusion taking priority
    const mergedPrices: Record<string, number> = { ...coinGeckoPrices };
    
    // Override with 1inch Fusion prices (higher priority for hackathon)
    for (const [token, price] of Object.entries(fusionPrices)) {
      if (typeof price === 'number' && price > 0) {
        mergedPrices[token] = price;
      }
    }

    const fusionCount = Object.keys(fusionPrices).length;
    const coinGeckoCount = Object.keys(coinGeckoPrices).length;
    const totalCount = Object.keys(mergedPrices).length;

    console.log('📊 Hybrid pricing results:', {
      fusionPrices: fusionCount,
      coinGeckoPrices: coinGeckoCount,
      totalPrices: totalCount,
      fusionPriority: fusionCount > 0
    });

    return {
      prices: mergedPrices,
      source: fusionCount > 0 ? 'hybrid' : 'coingecko-fallback',
      timestamp: Date.now(),
      confidence: fusionCount > 0 ? 0.9 : 0.7
    };
  }

  // 📉 Fallback CoinGecko pricing
  private async getCoinGeckoPrices(tokenAddresses: string[]): Promise<PricingResult> {
    console.log('🦎 CoinGecko fallback pricing');
    
    try {
      // Convert addresses to CoinGecko IDs
      const geckoIds = tokenAddresses.map(addr => this.getGeckoId(addr));
      
      const response = await fetch(`/api/coingecko/simple/price?ids=${geckoIds.join(',')}&vs_currencies=usd`);
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const prices: Record<string, number> = {};
      
      // Map back from geckoIds to addresses
      for (let i = 0; i < tokenAddresses.length; i++) {
        const address = tokenAddresses[i];
        const geckoId = geckoIds[i];
        const priceData = data[geckoId];
        
        if (priceData && priceData.usd) {
          prices[address] = priceData.usd;
        }
      }

      console.log('✅ CoinGecko pricing successful:', Object.keys(prices).length, 'prices');
      
      return {
        prices,
        source: 'coingecko-fallback',
        timestamp: Date.now(),
        confidence: 0.8
      };
    } catch (error) {
      console.error('❌ CoinGecko pricing failed:', error);
      
      // Return hardcoded fallback prices for common tokens
      return {
        prices: this.getHardcodedPrices(tokenAddresses),
        source: 'coingecko-fallback',
        timestamp: Date.now(),
        confidence: 0.5
      };
    }
  }

  // 🏷️ Convert tokens to addresses for 1inch API
  private convertToAddresses(tokens: Token[] | string[]): string[] {
    return tokens.map(token => {
      if (typeof token === 'string') {
        // If it's already an address, return it
        if (token.startsWith('0x') && token.length === 42) {
          return token.toLowerCase();
        }
        
        // Handle CoinGecko IDs passed from DataAggregationService
        const geckoToAddress = this.geckoIdToAddress(token);
        if (geckoToAddress) {
          return geckoToAddress;
        }
        
        // Just return the token as-is since it's a string (likely symbol or address)
        return token;
      } else {
        // It's a Token object
        return tokenValidationService.getTokenAddress(token) || 
               ('address' in token ? token.address || '' : '');
      }
    }).filter(addr => addr.length > 0);
  }

  // 🏷️ Convert CoinGecko IDs to token addresses (Only Ethereum-based tokens for 1inch)
  private geckoIdToAddress(geckoId: string): string | null {
    const geckoToAddressMap: Record<string, string> = {
      'ethereum': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH
      'wrapped-bitcoin': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
      'bitcoin': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // BTC -> WBTC (1inch doesn't support native BTC)
      'usd-coin': '0xA0b86a33E6441b8C4F27eAD9083C756Cc2', // USDC (correct address)
      'tether': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      'dai': '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
      'matic-network': '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // MATIC (wrapped on Ethereum)
      // Note: Removed BNB, SOL, AVAX as they're not natively supported on Ethereum by 1inch
      // These would need wrapped versions or cross-chain bridges
    };
    
    const address = geckoToAddressMap[geckoId.toLowerCase()];
    if (!address && geckoId !== 'ethereum' && geckoId !== 'bitcoin' && geckoId !== 'wrapped-bitcoin') {
      console.warn(`⚠️ 1inch doesn't support ${geckoId} - only Ethereum-based tokens are supported`);
    }
    
    return address || null;
  }

  // 🦎 Convert address/symbol to CoinGecko ID
  private getGeckoId(tokenIdentifier: string): string {
    const symbolToGecko: Record<string, string> = {
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'ethereum', // ETH
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'ethereum', // WETH
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'wrapped-bitcoin', // WBTC
      '0xA0b86a33E6441E3e3f4069b80b0c0ee29C5b7e09': 'usd-coin', // USDC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'tether', // USDT
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'dai', // DAI
      'ETH': 'ethereum',
      'WETH': 'ethereum',
      'BTC': 'bitcoin',
      'WBTC': 'wrapped-bitcoin',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'DAI': 'dai'
    };
    
    return symbolToGecko[tokenIdentifier.toLowerCase()] || 
           symbolToGecko[tokenIdentifier.toUpperCase()] || 
           tokenIdentifier.toLowerCase();
  }

  // 💰 Hardcoded fallback prices for common tokens (Ethereum-based only)
  private getHardcodedPrices(tokenAddresses: string[]): Record<string, number> {
    const fallbackPrices: Record<string, number> = {
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 2400, // ETH
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 2400, // WETH
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 43000, // WBTC
      '0xa0b86a33e6441b8c4f27ead9083c756cc2': 1, // USDC (corrected address)
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 1, // USDT
      '0x6b175474e89094c44da98b954eedeac495271d0f': 1, // DAI  
      '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 0.85, // MATIC (wrapped on Ethereum)
    };

    const result: Record<string, number> = {};
    for (const address of tokenAddresses) {
      const price = fallbackPrices[address.toLowerCase()];
      if (price) {
        result[address] = price;
      }
    }
    
    console.log('💰 Using hardcoded fallback prices for:', Object.keys(result).length, '/', tokenAddresses.length, 'tokens');
    return result;
  }

  // 🗂️ Cache management
  private getFromCache(key: string): PricingResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: PricingResult, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup old cache entries
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > v.ttl) {
          this.cache.delete(k);
        }
      }
    }
  }

  // 🧹 Utility methods
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // 🎯 Hackathon-optimized pricing specifically for 1inch ecosystem
  async getHackathonOptimizedPricing(tokens: Token[]): Promise<PricingResult> {
    console.log('🏆 Hackathon-optimized pricing: 1inch Fusion ONLY');
    
    return await this.getTokenPrices(tokens, {
      preferFusion: true,
      fallbackToCoinGecko: false, // Force 1inch only for hackathon
      cacheTime: 15000 // Shorter cache for more real-time data
    });
  }
}

export const fusionFirstPricing = FusionFirstPricingService.getInstance();