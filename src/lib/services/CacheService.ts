// Smart Caching Service for Performance Optimization
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Maximum cache entries
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Get cached data if valid
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Set cached data with TTL
  set<T>(key: string, data: T, ttlMs: number): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Delete specific key
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [_, entry] of this.cache) {
      if (now - entry.timestamp <= entry.ttl) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.maxSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }

  // Performance tracking
  private hitCount = 0;
  private missCount = 0;

  // Enhanced get with hit/miss tracking
  getWithStats<T>(key: string): T | null {
    const result = this.get<T>(key);
    if (result !== null) {
      this.hitCount++;
    } else {
      this.missCount++;
    }
    return result;
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  // Destroy the cache service
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Cache key generators for different data types
export const CacheKeys = {
  coingeckoScore: (protocol: string) => `coingecko:score:${protocol}`,
  defiLlamaPool: (protocol: string, chainId: number) => `defillama:pool:${protocol}:${chainId}`,
  riskAssessment: (fromToken: string, toToken: string) => `risk:${fromToken}:${toToken}`,
  marketConditions: (chainId: number) => `market:conditions:${chainId}`,
  tokenPrice: (tokenId: string) => `price:${tokenId}`,
  tvlHistory: (protocol: string) => `tvl:history:${protocol}`
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  COINGECKO_SCORE: 5 * 60 * 1000,      // 5 minutes
  POOL_DATA: 10 * 60 * 1000,           // 10 minutes  
  RISK_ASSESSMENT: 15 * 60 * 1000,     // 15 minutes
  MARKET_CONDITIONS: 2 * 60 * 1000,    // 2 minutes
  TOKEN_PRICE: 1 * 60 * 1000,          // 1 minute
  TVL_HISTORY: 30 * 60 * 1000          // 30 minutes
};