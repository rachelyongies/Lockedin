// 1inch API Aggregator Service - Uses all available 1inch APIs for comprehensive analysis
import { Token } from '@/types/bridge';
import { tokenValidationService, TokenPairValidation } from './token-validation-service';

export interface OneInchQuoteComparison {
  fusion: {
    available: boolean;
    quote?: Record<string, unknown>;
    error?: string;
  };
  aggregation: {
    available: boolean;
    quote?: Record<string, unknown>;
    error?: string;
  };
  recommendation: 'fusion' | 'aggregation' | 'unavailable';
  reasoning: string;
  savings: {
    amount: string;
    percentage: number;
  };
}

export interface GasAnalysis {
  current: {
    slow: number;
    standard: number;
    fast: number;
    baseFee: number;
  };
  recommendation: string;
  trend: string;
  optimalTiming: string;
  analysis: Record<string, unknown>;
}

export interface LiquidityAnalysis {
  totalSources: number;
  topSources: Array<{
    id: string;
    title: string;
    type: string;
    tier: string;
  }>;
  coverage: {
    score: number;
    description: string;
    breakdown: Record<string, unknown>;
  };
  recommendations: string[];
}

export interface PathAnalysis {
  totalPaths: number;
  complexity: {
    score: number;
    description: string;
    distribution: Record<string, unknown>;
  };
  optimalPath: {
    index: number;
    score: number;
    reasoning: string;
  } | null;
  recommendations: string[];
}

export interface ApprovalStatus {
  tokenAddress: string;
  walletAddress: string;
  spenderAddress: string;
  currentAllowance: string;
  needsApproval: boolean;
  isUnlimited: boolean;
  recommendedAction: string;
}

export interface Comprehensive1inchAnalysis {
  quotes: OneInchQuoteComparison;
  gas: GasAnalysis;
  liquidity: LiquidityAnalysis;
  paths: PathAnalysis;
  approvals: ApprovalStatus | null;
  overall: {
    confidence: number;
    recommendation: string;
    reasoning: string[];
    optimalStrategy: 'fusion' | 'aggregation' | 'wait';
  };
  timestamp: number;
}

export class OneInchAPIAggregator {
  private static instance: OneInchAPIAggregator;
  
  // Cache to eliminate redundant API calls
  private apiCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds
  private readonly QUOTE_CACHE_TTL = 15000; // 15 seconds for quotes (more volatile)
  
  static getInstance(): OneInchAPIAggregator {
    if (!OneInchAPIAggregator.instance) {
      OneInchAPIAggregator.instance = new OneInchAPIAggregator();
    }
    return OneInchAPIAggregator.instance;
  }

  // Cache management methods
  private generateCacheKey(method: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return `${method}:${sortedParams}`;
  }

  private isCacheValid(cacheKey: string): boolean {
    const cached = this.apiCache.get(cacheKey);
    if (!cached) return false;
    
    const isExpired = Date.now() > (cached.timestamp + cached.ttl);
    if (isExpired) {
      this.apiCache.delete(cacheKey);
      return false;
    }
    
    return true;
  }

  private setCacheData(cacheKey: string, data: unknown, ttl: number): void {
    this.apiCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getCacheData<T>(cacheKey: string): T | null {
    const cached = this.apiCache.get(cacheKey);
    return cached ? (cached.data as T) : null;
  }

  private async cachedApiCall<T>(
    cacheKey: string, 
    apiCall: () => Promise<T>, 
    ttl: number = this.DEFAULT_CACHE_TTL
  ): Promise<T> {
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cachedData = this.getCacheData<T>(cacheKey);
      if (cachedData) {
        console.log(`🚀 [CACHE HIT] ${cacheKey}`);
        return cachedData;
      }
    }

    // Make API call and cache result
    console.log(`📡 [CACHE MISS] Making API call: ${cacheKey}`);
    const result = await apiCall();
    this.setCacheData(cacheKey, result, ttl);
    return result;
  }

  async getComprehensiveAnalysis(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress?: string,
    chainId?: number
  ): Promise<Comprehensive1inchAnalysis> {
    console.log('🔥 1inch API Aggregator - Starting comprehensive analysis');
    
    // Auto-detect chainId from token or default to Ethereum mainnet
    const targetChainId = chainId || this.detectChainIdFromToken(fromToken) || 1;
    
    // Validate token pair first
    const validation = tokenValidationService.validateTokenPair(fromToken, toToken);
    
    if (!validation.isValid) {
      console.error('❌ Invalid token pair for 1inch APIs:', validation.reason);
      
      return {
        ...this.getEmptyAnalysis(),
        overall: {
          confidence: 0,
          recommendation: 'INVALID_TOKEN_PAIR',
          reasoning: [validation.reason || 'Invalid token pair'],
          optimalStrategy: 'wait'
        }
      };
    }
    
    const fromTokenAddress = validation.fromTokenAddress!;
    const toTokenAddress = validation.toTokenAddress!;
    
    console.log('✅ Token pair validated successfully:', {
      fromToken: `${fromToken.symbol} -> ${fromTokenAddress}`,
      toToken: `${toToken.symbol} -> ${toTokenAddress}`,
      recommendation: (validation as { recommendation?: string }).recommendation
    });
    
    const amountInWei = tokenValidationService.convertToWei(amount, fromToken);
    
    console.log('💰 Amount conversion:', {
      originalAmount: amount,
      decimals: tokenValidationService.getTokenDecimals(fromToken),
      amountInWei: amountInWei
    });

    // Run all API calls in parallel for maximum performance
    const [quotes, gas, liquidity, paths, approvals] = await Promise.allSettled([
      this.getQuoteComparison(fromTokenAddress, toTokenAddress, amountInWei, walletAddress, targetChainId),
      this.getGasAnalysis(targetChainId),
      this.getLiquidityAnalysis(targetChainId),
      this.getPathAnalysis(fromTokenAddress, toTokenAddress, targetChainId),
      walletAddress ? this.getApprovalStatus(fromTokenAddress, walletAddress, targetChainId) : null
    ]);

    const quotesResult = quotes.status === 'fulfilled' ? quotes.value : this.getEmptyQuoteComparison();
    const gasResult = gas.status === 'fulfilled' ? gas.value : this.getEmptyGasAnalysis();
    const liquidityResult = liquidity.status === 'fulfilled' ? liquidity.value : this.getEmptyLiquidityAnalysis();
    const pathsResult = paths.status === 'fulfilled' ? paths.value : this.getEmptyPathAnalysis();
    const approvalsResult = approvals.status === 'fulfilled' ? approvals.value : null;

    // Generate overall analysis
    const overall = this.generateOverallAnalysis(quotesResult, gasResult, liquidityResult, pathsResult);

    return {
      quotes: quotesResult,
      gas: gasResult,
      liquidity: liquidityResult,
      paths: pathsResult,
      approvals: approvalsResult,
      overall,
      timestamp: Date.now()
    };
  }

  private detectChainIdFromToken(token: Token): number | null {
    // Map network names to chainIds for supported 1inch networks
    if (token.network === 'ethereum') {
      return (token as any).chainId || 1; // Default to mainnet
    }
    if (token.network === 'polygon') {
      return 137;
    }
    if (token.network === 'arbitrum') {
      return 42161;
    }
    if (token.network === 'bsc') {
      return 56;
    }
    
    // For multi-chain tokens, check if they have explicit chainId
    if ('chainId' in token && typeof token.chainId === 'number') {
      return token.chainId;
    }
    
    return null; // Unknown network
  }

  private async getQuoteComparison(
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: string,
    walletAddress?: string,
    chainId: number = 1
  ): Promise<OneInchQuoteComparison> {
    const [fusionResult, aggregationResult] = await Promise.allSettled([
      this.getFusionQuote(fromTokenAddress, toTokenAddress, amount, walletAddress, chainId),
      this.getAggregationQuote(fromTokenAddress, toTokenAddress, amount, chainId)
    ]);

    const fusion = fusionResult.status === 'fulfilled' ? 
      { available: true, quote: fusionResult.value } : 
      { available: false, error: fusionResult.status === 'rejected' ? fusionResult.reason : 'Unknown error' };

    const aggregation = aggregationResult.status === 'fulfilled' ? 
      { available: true, quote: aggregationResult.value } : 
      { available: false, error: aggregationResult.status === 'rejected' ? aggregationResult.reason : 'Unknown error' };

    // Determine recommendation
    const recommendation = this.compareQuotes(fusion, aggregation);
    const reasoning = this.generateQuoteReasoning(fusion, aggregation, recommendation);
    const savings = this.calculateSavings(fusion, aggregation);

    return {
      fusion,
      aggregation,
      recommendation,
      reasoning,
      savings
    };
  }

  private async getFusionQuote(fromTokenAddress: string, toTokenAddress: string, amount: string, walletAddress?: string, chainId: number = 1): Promise<Record<string, unknown>> {
    const cacheKey = this.generateCacheKey('fusion_quote', {
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress: walletAddress || '0x0000000000000000000000000000000000000000',
      chainId
    });

    return this.cachedApiCall(cacheKey, async () => {
      const response = await fetch('/api/1inch/fusion/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromTokenAddress,
          toTokenAddress,
          amount,
          walletAddress: walletAddress || '0x0000000000000000000000000000000000000000',
          source: 'ai-router-comparison',
          enableEstimate: true,
          complexityLevel: 'medium',
          allowPartialFill: false,
          chainId
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Fusion API error: ${error}`);
      }

      return response.json();
    }, this.QUOTE_CACHE_TTL);
  }

  private async getAggregationQuote(fromTokenAddress: string, toTokenAddress: string, amount: string, chainId: number = 1): Promise<Record<string, unknown>> {
    const cacheKey = this.generateCacheKey('aggregation_quote', {
      src: fromTokenAddress,
      dst: toTokenAddress,
      amount,
      chainId
    });

    return this.cachedApiCall(cacheKey, async () => {
      const response = await fetch('/api/1inch/aggregation/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          src: fromTokenAddress,
          dst: toTokenAddress,
          amount,
          fee: '0',
          gasPrice: 'fast',
          complexityLevel: '0',
          mainRouteParts: '10',
          parts: '50',
          chainId
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Aggregation API error: ${error}`);
      }

      return response.json();
    }, this.QUOTE_CACHE_TTL);
  }

  private async getGasAnalysis(chainId: number): Promise<GasAnalysis> {
    const cacheKey = this.generateCacheKey('gas_analysis', { chainId });

    return this.cachedApiCall(cacheKey, async () => {
      const response = await fetch(`/api/1inch/gas-tracker?chainId=${chainId}`);
    
    if (!response.ok) {
      throw new Error('Gas Tracker API error');
    }

    const data = await response.json();
    
    return {
      current: {
        slow: parseInt(data.low?.maxFeePerGas || data.baseFee || '0'),
        standard: parseInt(data.medium?.maxFeePerGas || data.baseFee || '0'),
        fast: parseInt(data.high?.maxFeePerGas || data.baseFee || '0'),
        baseFee: parseInt(data.baseFee || '0')
      },
      recommendation: data.analysis?.recommendation || 'Good time to execute - Gas prices are reasonable',
      trend: data.analysis?.trend || 'Stable network conditions',
      optimalTiming: data.analysis?.optimalTiming || 'Unknown',
      analysis: data.analysis
    };
    }, this.DEFAULT_CACHE_TTL);
  }

  private async getLiquidityAnalysis(chainId: number): Promise<LiquidityAnalysis> {
    const cacheKey = this.generateCacheKey('liquidity_analysis', { chainId });

    return this.cachedApiCall(cacheKey, async () => {
      const response = await fetch(`/api/1inch/liquidity-sources?chainId=${chainId}`);
    
    if (!response.ok) {
      throw new Error('Liquidity Sources API error');
    }

    const data = await response.json();
    
    return {
      totalSources: data.analysis?.totalSources || 0,
      topSources: data.analysis?.topSources || [],
      coverage: data.analysis?.coverage || { score: 0, description: 'Unknown', breakdown: {} },
      recommendations: data.analysis?.recommendations || []
    };
    }, this.DEFAULT_CACHE_TTL);
  }

  private async getPathAnalysis(fromTokenAddress: string, toTokenAddress: string, chainId: number): Promise<PathAnalysis> {
    const response = await fetch('/api/1inch/paths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromTokenAddress,
        toTokenAddress,
        chainId
      })
    });
    
    if (!response.ok) {
      throw new Error('Paths API error');
    }

    const data = await response.json();
    
    return {
      totalPaths: data.analysis?.totalPaths || 0,
      complexity: data.analysis?.pathComplexity || { score: 0, description: 'Unknown', distribution: {} },
      optimalPath: data.analysis?.optimalPath || null,
      recommendations: data.analysis?.recommendations || []
    };
  }

  private async getApprovalStatus(tokenAddress: string, walletAddress: string, chainId: number): Promise<ApprovalStatus> {
    const [spenderResponse, allowanceResponse] = await Promise.all([
      fetch(`/api/1inch/approve/spender?chainId=${chainId}`),
      fetch(`/api/1inch/approve/allowance?chainId=${chainId}&tokenAddress=${tokenAddress}&walletAddress=${walletAddress}`)
    ]);

    const spenderData = spenderResponse.ok ? await spenderResponse.json() : null;
    const allowanceData = allowanceResponse.ok ? await allowanceResponse.json() : null;

    return {
      tokenAddress,
      walletAddress,
      spenderAddress: spenderData?.address || 'Unknown',
      currentAllowance: allowanceData?.allowance || '0',
      needsApproval: allowanceData?.analysis?.hasAllowance === false,
      isUnlimited: allowanceData?.analysis?.isUnlimited || false,
      recommendedAction: allowanceData?.analysis?.recommendedAction || 'Check manually'
    };
  }

  private compareQuotes(fusion: Record<string, unknown> | null, aggregation: Record<string, unknown> | null): 'fusion' | 'aggregation' | 'unavailable' {
    if (!fusion?.available && !aggregation?.available) {
      return 'unavailable';
    }
    
    if (!fusion?.available) return 'aggregation';
    if (!aggregation?.available) return 'fusion';

    // Compare output amounts (assuming toTokenAmount field)
    const fusionOutput = parseFloat((fusion?.quote as Record<string, unknown>)?.toTokenAmount as string || '0');
    const aggregationOutput = parseFloat((aggregation?.quote as Record<string, unknown>)?.toTokenAmount as string || '0');

    return fusionOutput > aggregationOutput ? 'fusion' : 'aggregation';
  }

  private generateQuoteReasoning(fusion: Record<string, unknown> | null, aggregation: Record<string, unknown> | null, recommendation: string): string {
    if (recommendation === 'unavailable') {
      return 'Both Fusion and Aggregation APIs are currently unavailable';
    }

    if (recommendation === 'fusion') {
      return fusion?.available && aggregation?.available ? 
        'Fusion offers better rates with private order settlement' :
        'Only Fusion quote available';
    }

    return fusion?.available && aggregation?.available ? 
      'Aggregation offers faster execution with competitive rates' :
      'Only Aggregation quote available';
  }

  private calculateSavings(fusion: Record<string, unknown> | null, aggregation: Record<string, unknown> | null): { amount: string; percentage: number } {
    if (!fusion?.available || !aggregation?.available) {
      return { amount: '0', percentage: 0 };
    }

    const fusionOutput = parseFloat((fusion?.quote as Record<string, unknown>)?.toTokenAmount as string || '0');
    const aggregationOutput = parseFloat((aggregation?.quote as Record<string, unknown>)?.toTokenAmount as string || '0');
    
    const diff = Math.abs(fusionOutput - aggregationOutput);
    const percentage = fusionOutput > 0 ? (diff / fusionOutput) * 100 : 0;

    return {
      amount: diff.toFixed(6),
      percentage: Math.round(percentage * 100) / 100
    };
  }

  private generateOverallAnalysis(quotes: OneInchQuoteComparison, gas: GasAnalysis, liquidity: LiquidityAnalysis, paths: PathAnalysis): { confidence: number; recommendation: string; reasoning: string[]; optimalStrategy: 'wait' | 'fusion' | 'aggregation'; } {
    const reasoning: string[] = [];
    let confidence = 0;
    let optimalStrategy: 'fusion' | 'aggregation' | 'wait' = 'wait';

    // Analyze quotes
    if (quotes.recommendation !== 'unavailable') {
      confidence += 30;
      reasoning.push(`${quotes.recommendation} recommended: ${quotes.reasoning}`);
      optimalStrategy = quotes.recommendation;
    }

    // Analyze gas conditions
    if (gas.recommendation.includes('EXECUTE_NOW')) {
      confidence += 25;
      reasoning.push('Gas prices are optimal for execution');
    } else if (gas.recommendation.includes('WAIT')) {
      confidence -= 15;
      reasoning.push('High gas prices - consider waiting');
      optimalStrategy = 'wait';
    }

    // Analyze liquidity
    if (liquidity.totalSources > 20) {
      confidence += 20;
      reasoning.push(`Excellent liquidity with ${liquidity.totalSources} sources`);
    } else if (liquidity.totalSources > 10) {
      confidence += 10;
      reasoning.push(`Good liquidity with ${liquidity.totalSources} sources`);
    }

    // Analyze paths
    if (paths.totalPaths > 0) {
      confidence += 15;
      reasoning.push(`${paths.totalPaths} routing paths available`);
    }

    // Normalize confidence to 0-1 range
    confidence = Math.max(0, Math.min(100, confidence)) / 100;

    const recommendation = confidence > 0.7 ? 'EXECUTE' : 
                          confidence > 0.4 ? 'PROCEED_WITH_CAUTION' : 'WAIT_FOR_BETTER_CONDITIONS';

    return {
      confidence,
      recommendation,
      reasoning,
      optimalStrategy
    };
  }


  // Fallback methods for when APIs fail
  private getEmptyQuoteComparison(): OneInchQuoteComparison {
    return {
      fusion: { available: false, error: 'API unavailable' },
      aggregation: { available: false, error: 'API unavailable' },
      recommendation: 'unavailable',
      reasoning: '1inch APIs are currently unavailable',
      savings: { amount: '0', percentage: 0 }
    };
  }

  private getEmptyGasAnalysis(): GasAnalysis {
    return {
      current: { slow: 0, standard: 0, fast: 0, baseFee: 0 },
      recommendation: 'Gas data unavailable',
      trend: 'Unknown',
      optimalTiming: 'Unknown',
      analysis: {}
    };
  }

  private getEmptyLiquidityAnalysis(): LiquidityAnalysis {
    return {
      totalSources: 0,
      topSources: [],
      coverage: { score: 0, description: 'Data unavailable', breakdown: {} },
      recommendations: ['Liquidity data unavailable']
    };
  }

  private getEmptyPathAnalysis(): PathAnalysis {
    return {
      totalPaths: 0,
      complexity: { score: 0, description: 'Data unavailable', distribution: {} },
      optimalPath: null,
      recommendations: ['Path data unavailable']
    };
  }

  private getEmptyAnalysis(): Comprehensive1inchAnalysis {
    return {
      quotes: this.getEmptyQuoteComparison(),
      gas: this.getEmptyGasAnalysis(),
      liquidity: this.getEmptyLiquidityAnalysis(),
      paths: this.getEmptyPathAnalysis(),
      approvals: null,
      overall: {
        confidence: 0,
        recommendation: 'INVALID_TOKEN_PAIR',
        reasoning: ['Invalid token pair for 1inch APIs - only Ethereum-based tokens supported'],
        optimalStrategy: 'wait'
      },
      timestamp: Date.now()
    };
  }
}

export const oneInchAggregator = OneInchAPIAggregator.getInstance();