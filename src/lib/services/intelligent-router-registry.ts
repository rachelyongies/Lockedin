// Intelligent Router Token Registry and Validation Service
// Provides token validation, lookup, and routing logic specifically for the intelligent router

import {
  IntelligentRouterToken,
  IntelligentRouterChainId,
  IntelligentRouterNetwork,
  ValidationResult,
  IntelligentRouterErrorInfo,
  TokenSearchFilter,
  TokenSearchResult,
  NetworkStatus,
  isIntelligentRouterToken,
  isIntelligentRouterChainId,
  isIntelligentRouterNetwork
} from '@/types/intelligent-router';

import {
  ALL_INTELLIGENT_ROUTER_TOKENS,
  INTELLIGENT_ROUTER_TOKENS_BY_NETWORK,
  INTELLIGENT_ROUTER_NETWORKS,
  INTELLIGENT_ROUTER_RECOMMENDED_PAIRS,
  getIntelligentRouterTokens,
  getIntelligentRouterToken,
  getIntelligentRouterNetworkInfo,
  isIntelligentRouterPairRecommended,
  INTELLIGENT_ROUTER_TOKEN_COUNT
} from '@/config/intelligent-router-tokens';

export class IntelligentRouterRegistry {
  private static instance: IntelligentRouterRegistry;
  private tokenCache = new Map<string, IntelligentRouterToken>();
  private networkStatusCache = new Map<IntelligentRouterChainId, NetworkStatus>();
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): IntelligentRouterRegistry {
    if (!IntelligentRouterRegistry.instance) {
      IntelligentRouterRegistry.instance = new IntelligentRouterRegistry();
    }
    return IntelligentRouterRegistry.instance;
  }

  constructor() {
    this.initializeTokenCache();
  }

  private initializeTokenCache(): void {
    // Cache all tokens for fast lookup
    ALL_INTELLIGENT_ROUTER_TOKENS.forEach(token => {
      const key = this.getTokenCacheKey(token.symbol, token.chainId);
      this.tokenCache.set(key, token);
    });
    
    console.log(`🔄 Intelligent Router Registry initialized with ${this.tokenCache.size} tokens across ${Object.keys(INTELLIGENT_ROUTER_NETWORKS).length} networks`);
    this.lastCacheUpdate = Date.now();
  }

  private getTokenCacheKey(symbol: string, chainId: IntelligentRouterChainId): string {
    return `${symbol.toLowerCase()}-${chainId}`;
  }

  // Token Lookup and Validation
  public getToken(symbol: string, chainId: IntelligentRouterChainId): IntelligentRouterToken | null {
    const key = this.getTokenCacheKey(symbol, chainId);
    return this.tokenCache.get(key) || null;
  }

  public getTokensByNetwork(chainId: IntelligentRouterChainId): IntelligentRouterToken[] {
    return getIntelligentRouterTokens(chainId);
  }

  public getAllTokens(): IntelligentRouterToken[] {
    return ALL_INTELLIGENT_ROUTER_TOKENS;
  }

  public searchTokens(filter: TokenSearchFilter): TokenSearchResult {
    const startTime = Date.now();
    let tokens = ALL_INTELLIGENT_ROUTER_TOKENS;

    // Apply filters
    if (filter.query) {
      const query = filter.query.toLowerCase();
      tokens = tokens.filter(token => 
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query)
      );
    }

    if (filter.networks && filter.networks.length > 0) {
      tokens = tokens.filter(token => filter.networks!.includes(token.chainId));
    }

    if (filter.tags && filter.tags.length > 0) {
      tokens = tokens.filter(token => 
        filter.tags!.some(tag => token.tags.includes(tag))
      );
    }

    if (filter.verified !== undefined) {
      tokens = tokens.filter(token => token.verified === filter.verified);
    }

    // Sort results
    if (filter.sortBy) {
      tokens.sort((a, b) => {
        let comparison = 0;
        switch (filter.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'symbol':
            comparison = a.symbol.localeCompare(b.symbol);
            break;
          case 'popularity':
            // Simple popularity based on tags
            const aPopularity = a.tags.includes('native') ? 3 : a.tags.includes('stablecoin') ? 2 : 1;
            const bPopularity = b.tags.includes('native') ? 3 : b.tags.includes('stablecoin') ? 2 : 1;
            comparison = bPopularity - aPopularity;
            break;
          default:
            comparison = a.symbol.localeCompare(b.symbol);
        }
        return filter.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Apply limit
    const limit = filter.limit || 50;
    const hasMore = tokens.length > limit;
    const resultTokens = tokens.slice(0, limit);

    return {
      tokens: resultTokens,
      totalCount: tokens.length,
      hasMore,
      searchTime: Date.now() - startTime
    };
  }

  // Token Pair Validation
  public validateTokenPair(
    fromToken: IntelligentRouterToken, 
    toToken: IntelligentRouterToken
  ): ValidationResult {
    const errors: IntelligentRouterErrorInfo[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!isIntelligentRouterToken(fromToken)) {
      errors.push({
        code: 'TOKEN_NOT_FOUND',
        message: 'Invalid source token',
        details: 'Source token is not a valid intelligent router token'
      });
    }

    if (!isIntelligentRouterToken(toToken)) {
      errors.push({
        code: 'TOKEN_NOT_FOUND',
        message: 'Invalid destination token',
        details: 'Destination token is not a valid intelligent router token'
      });
    }

    if (fromToken.symbol === toToken.symbol && fromToken.chainId === toToken.chainId) {
      errors.push({
        code: 'ROUTE_NOT_AVAILABLE',
        message: 'Cannot swap token to itself',
        details: 'Source and destination tokens are identical'
      });
    }

    // Network support validation
    if (!this.isSupportedNetwork(fromToken.chainId)) {
      errors.push({
        code: 'NETWORK_NOT_SUPPORTED',
        message: `Network ${fromToken.chainId} not supported`,
        network: fromToken.chainId
      });
    }

    if (!this.isSupportedNetwork(toToken.chainId)) {
      errors.push({
        code: 'NETWORK_NOT_SUPPORTED',
        message: `Network ${toToken.chainId} not supported`,
        network: toToken.chainId
      });
    }

    // Cross-chain validation
    if (fromToken.chainId !== toToken.chainId) {
      warnings.push('Cross-chain swap detected - may require additional steps and higher fees');
      suggestions.push('Consider using same-network tokens for lower fees and faster execution');
    }

    // Liquidity validation
    if (!this.isPairRecommended(fromToken.symbol, toToken.symbol, fromToken.chainId)) {
      warnings.push('This token pair may have limited liquidity');
      suggestions.push('Consider using recommended high-liquidity pairs for better rates');
    }

    // Gas efficiency suggestions
    if (fromToken.chainId === 1 && toToken.chainId === 1) {
      suggestions.push('Consider using Polygon or Arbitrum for lower gas fees');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  // Network Support
  public isSupportedNetwork(chainId: IntelligentRouterChainId): boolean {
    return isIntelligentRouterChainId(chainId) && chainId in INTELLIGENT_ROUTER_NETWORKS;
  }

  public getSupportedNetworks(): IntelligentRouterChainId[] {
    return Object.keys(INTELLIGENT_ROUTER_NETWORKS).map(Number) as IntelligentRouterChainId[];
  }

  public getNetworkInfo(chainId: IntelligentRouterChainId) {
    return getIntelligentRouterNetworkInfo(chainId);
  }

  // Pair Recommendations
  public isPairRecommended(
    fromSymbol: string, 
    toSymbol: string, 
    chainId: IntelligentRouterChainId
  ): boolean {
    return isIntelligentRouterPairRecommended(fromSymbol, toSymbol, chainId);
  }

  public getRecommendedPairs(chainId: IntelligentRouterChainId): string[][] {
    return INTELLIGENT_ROUTER_RECOMMENDED_PAIRS[chainId] || [];
  }

  public getRecommendedTokensForPair(symbol: string, chainId: IntelligentRouterChainId): IntelligentRouterToken[] {
    const pairs = this.getRecommendedPairs(chainId);
    const recommendedSymbols = new Set<string>();

    pairs.forEach(pair => {
      if (pair[0] === symbol) {
        recommendedSymbols.add(pair[1]);
      } else if (pair[1] === symbol) {
        recommendedSymbols.add(pair[0]);
      }
    });

    return Array.from(recommendedSymbols)
      .map(sym => this.getToken(sym, chainId))
      .filter((token): token is IntelligentRouterToken => token !== null);
  }

  // Route Analysis
  public analyzeRoute(
    fromToken: IntelligentRouterToken,
    toToken: IntelligentRouterToken
  ): {
    isCrossChain: boolean;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedSteps: number;
    routeType: 'direct' | 'bridge' | 'multi-hop';
    recommendations: string[];
  } {
    const isCrossChain = fromToken.chainId !== toToken.chainId;
    
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    let estimatedSteps = 1;
    let routeType: 'direct' | 'bridge' | 'multi-hop' = 'direct';
    const recommendations: string[] = [];

    if (isCrossChain) {
      complexity = 'complex';
      estimatedSteps = 3; // Swap -> Bridge -> Swap
      routeType = 'bridge';
      recommendations.push('Cross-chain route will require bridging');
      recommendations.push('Consider gas costs on both networks');
    } else {
      // Same network routing
      const isRecommendedPair = this.isPairRecommended(fromToken.symbol, toToken.symbol, fromToken.chainId);
      
      if (isRecommendedPair) {
        complexity = 'simple';
        estimatedSteps = 1;
        routeType = 'direct';
        recommendations.push('Direct high-liquidity route available');
      } else {
        complexity = 'medium';
        estimatedSteps = 2;
        routeType = 'multi-hop';
        recommendations.push('May require intermediate token for optimal routing');
      }
    }

    return {
      isCrossChain,
      complexity,
      estimatedSteps,
      routeType,
      recommendations
    };
  }

  // Network Status and Health
  public async getNetworkStatus(chainId: IntelligentRouterChainId): Promise<NetworkStatus> {
    const cached = this.networkStatusCache.get(chainId);
    if (cached && Date.now() - cached.lastUpdate < this.CACHE_TTL) {
      return cached;
    }

    // Mock network status - in production, this would call actual network APIs
    const networkInfo = this.getNetworkInfo(chainId);
    const status: NetworkStatus = {
      chainId,
      name: networkInfo?.name || 'Unknown',
      status: 'healthy',
      latency: Math.random() * 100 + 50, // 50-150ms
      gasPrice: {
        slow: Math.random() * 10 + 5,
        standard: Math.random() * 15 + 10,
        fast: Math.random() * 25 + 20
      },
      blockHeight: Math.floor(Math.random() * 1000000) + 18000000,
      lastUpdate: Date.now()
    };

    this.networkStatusCache.set(chainId, status);
    return status;
  }

  // Token Amount Validation
  public validateAmount(
    amount: string,
    token: IntelligentRouterToken,
    balance?: string
  ): ValidationResult {
    const errors: IntelligentRouterErrorInfo[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const amountNum = parseFloat(amount);

    // Basic amount validation
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push({
        code: 'AMOUNT_TOO_SMALL',
        message: 'Invalid amount',
        details: 'Amount must be a positive number'
      });
    }

    // Minimum amount validation
    const minAmount = token.chainId === 1 ? 0.0001 : 0.001; // Higher minimum for Ethereum due to gas
    if (amountNum > 0 && amountNum < minAmount) {
      errors.push({
        code: 'AMOUNT_TOO_SMALL',
        message: `Amount too small`,
        details: `Minimum amount is ${minAmount} ${token.symbol}`,
        token: token.symbol
      });
    }

    // Maximum amount validation (basic sanity check)
    const maxAmount = 1000000; // 1M tokens
    if (amountNum > maxAmount) {
      errors.push({
        code: 'AMOUNT_TOO_LARGE',
        message: 'Amount too large',
        details: `Maximum amount is ${maxAmount} ${token.symbol}`,
        token: token.symbol
      });
    }

    // Balance validation
    if (balance) {
      const balanceNum = parseFloat(balance);
      if (amountNum > balanceNum) {
        errors.push({
          code: 'AMOUNT_TOO_LARGE',
          message: 'Insufficient balance',
          details: `Available balance: ${balance} ${token.symbol}`,
          token: token.symbol
        });
      }

      // Warning for using most of balance
      if (amountNum > balanceNum * 0.95) {
        warnings.push('Using most of your balance - consider keeping some for transaction fees');
      }
    }

    // Gas considerations
    if (token.chainId === 1 && amountNum < 0.01) {
      suggestions.push('Consider larger amounts on Ethereum to justify gas costs');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  // Cache Management
  public clearCache(): void {
    this.tokenCache.clear();
    this.networkStatusCache.clear();
    this.initializeTokenCache();
  }

  public getCacheStats(): {
    tokenCacheSize: number;
    networkCacheSize: number;
    lastUpdate: number;
    tokenCount: typeof INTELLIGENT_ROUTER_TOKEN_COUNT;
  } {
    return {
      tokenCacheSize: this.tokenCache.size,
      networkCacheSize: this.networkStatusCache.size,
      lastUpdate: this.lastCacheUpdate,
      tokenCount: INTELLIGENT_ROUTER_TOKEN_COUNT
    };
  }

  // Utility Methods
  public formatTokenAmount(amount: string, token: IntelligentRouterToken): string {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    
    const precision = token.displayPrecision || 4;
    if (num < Math.pow(10, -precision)) {
      return `< ${Math.pow(10, -precision)}`;
    }
    
    return num.toFixed(precision);
  }

  public getTokensByTag(tag: string, chainId?: IntelligentRouterChainId): IntelligentRouterToken[] {
    const tokens = chainId ? this.getTokensByNetwork(chainId) : this.getAllTokens();
    return tokens.filter(token => token.tags.includes(tag));
  }

  public getPopularTokens(chainId?: IntelligentRouterChainId, limit: number = 10): IntelligentRouterToken[] {
    const tokens = chainId ? this.getTokensByNetwork(chainId) : this.getAllTokens();
    
    // Sort by popularity (native > stablecoin > others)
    tokens.sort((a, b) => {
      const getScore = (token: IntelligentRouterToken) => {
        if (token.isNative) return 3;
        if (token.tags.includes('stablecoin')) return 2;
        return 1;
      };
      return getScore(b) - getScore(a);
    });

    return tokens.slice(0, limit);
  }
}

// Export singleton instance
export const intelligentRouterRegistry = IntelligentRouterRegistry.getInstance();