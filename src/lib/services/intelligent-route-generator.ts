// Intelligent Route Generator - Fully Based on 1inch API Data
import { Token } from '@/types/bridge';
import { oneInchAggregator, Comprehensive1inchAnalysis } from './1inch-api-aggregator';
import { tokenValidationService } from './token-validation-service';
import { RouteProposal, RouteStep } from '../agents/types';

export interface IntelligentRoute extends RouteProposal {
  source: '1inch-fusion' | '1inch-aggregation' | '1inch-hybrid';
  oneInchData: Comprehensive1inchAnalysis;
  reasoning: string[];
  userPreference?: 'speed' | 'cost' | 'security' | 'balanced';
}

export interface RouteGenerationOptions {
  userPreference?: 'speed' | 'cost' | 'security' | 'balanced';
  maxSlippage?: number;
  gasPreference?: 'slow' | 'standard' | 'fast';
  includeMultiHop?: boolean;
}

export class IntelligentRouteGenerator {
  private static instance: IntelligentRouteGenerator;

  static getInstance(): IntelligentRouteGenerator {
    if (!IntelligentRouteGenerator.instance) {
      IntelligentRouteGenerator.instance = new IntelligentRouteGenerator();
    }
    return IntelligentRouteGenerator.instance;
  }

  async generateIntelligentRoutes(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress?: string,
    options: RouteGenerationOptions = {}
  ): Promise<IntelligentRoute[]> {
    console.log('🧠 Intelligent Route Generator - Starting generation');
    
    // Validate token pair first
    const validation = tokenValidationService.validateTokenPair(fromToken, toToken);
    if (!validation.isValid) {
      console.error('❌ Invalid token pair:', validation.reason);
      return [];
    }

    // Get comprehensive 1inch analysis
    const oneInchAnalysis = await oneInchAggregator.getComprehensiveAnalysis(
      fromToken, 
      toToken, 
      amount, 
      walletAddress
    );

    console.log('📊 1inch Analysis Complete:', {
      fusionAvailable: oneInchAnalysis.quotes.fusion.available,
      aggregationAvailable: oneInchAnalysis.quotes.aggregation.available,
      gasRecommendation: oneInchAnalysis.gas.recommendation,
      liquiditySources: oneInchAnalysis.liquidity.totalSources,
      confidence: oneInchAnalysis.overall.confidence
    });

    const routes: IntelligentRoute[] = [];

    // Generate Fusion route if available
    if (oneInchAnalysis.quotes.fusion.available && oneInchAnalysis.quotes.fusion.quote) {
      const fusionRoute = await this.createFusionRoute(
        fromToken,
        toToken,
        amount,
        oneInchAnalysis,
        options
      );
      routes.push(fusionRoute);
    }

    // Generate Aggregation route if available
    if (oneInchAnalysis.quotes.aggregation.available && oneInchAnalysis.quotes.aggregation.quote) {
      const aggregationRoute = await this.createAggregationRoute(
        fromToken,
        toToken,
        amount,
        oneInchAnalysis,
        options
      );
      routes.push(aggregationRoute);
    }

    // If both are available, create a hybrid recommendation
    if (routes.length === 2) {
      const hybridRoute = this.createHybridRoute(routes, oneInchAnalysis, options);
      routes.push(hybridRoute);
    }

    // Sort routes by user preference and 1inch analysis
    const sortedRoutes = this.sortRoutesByPreference(routes, options.userPreference);

    console.log('✅ Intelligent routes generated:', {
      totalRoutes: sortedRoutes.length,
      types: sortedRoutes.map(r => r.source),
      topRecommendation: sortedRoutes[0]?.source
    });

    return sortedRoutes;
  }

  private async createFusionRoute(
    fromToken: Token,
    toToken: Token,
    amount: string,
    analysis: Comprehensive1inchAnalysis,
    options: RouteGenerationOptions
  ): Promise<IntelligentRoute> {
    const quote = analysis.quotes.fusion.quote;
    
    const reasoning = [
      '1inch Fusion: Private order settlement with MEV protection',
      `Gas optimization: ${analysis.gas.recommendation}`,
      `Liquidity: ${analysis.liquidity.totalSources} DEX sources available`,
      `Confidence: ${(analysis.overall.confidence * 100).toFixed(0)}%`
    ];

    if (analysis.quotes.savings.percentage > 0) {
      reasoning.push(`Potential savings: ${analysis.quotes.savings.percentage.toFixed(2)}% vs aggregation`);
    }

    // Calculate fallback output if API quote failed or returned 0
    let estimatedOutput = (quote?.toTokenAmount as string) || (quote?.toAmount as string) || (quote?.dstAmount as string) || '0';
    
    console.log('🔍 Fusion quote analysis:', {
      fusionAvailable: analysis.quotes.fusion.available,
      hasQuote: !!quote,
      estimatedOutput,
      quoteKeys: quote ? Object.keys(quote) : []
    });
    
    // Enhanced zero output investigation and handling
    if (estimatedOutput === '0' || !estimatedOutput || estimatedOutput === 'null') {
      console.warn('⚠️ [FUSION ZERO OUTPUT INVESTIGATION] Fusion returned 0 or invalid output');
      
      // Detailed analysis of why Fusion returned 0
      this.investigateFusionZeroOutput(quote, fromToken, toToken, amount, analysis);
      
      // Use aggregation quote as fallback
      const aggQuote = analysis.quotes.aggregation.quote;
      estimatedOutput = (aggQuote?.toTokenAmount as string) || (aggQuote?.toAmount as string) || (aggQuote?.dstAmount as string) || '0';
      
      console.log('🔍 Aggregation fallback result:', {
        aggAvailable: analysis.quotes.aggregation.available,
        hasAggQuote: !!aggQuote,
        aggOutput: estimatedOutput,
        fallbackReason: 'fusion_zero_output'
      });
      
      // If still 0, calculate rough estimate using token prices
      if (estimatedOutput === '0' || !estimatedOutput || estimatedOutput === 'null') {
        console.log('🧮 Both APIs failed, using price-based fallback calculation');
        estimatedOutput = await this.calculateFallbackOutputWithRealPrices(fromToken, toToken, amount);
        console.log('📊 Fallback calculation result:', estimatedOutput);
      }
    }

    return {
      id: `intelligent-fusion-${Date.now()}`,
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount,
      estimatedOutput,
      path: [{
        protocol: '1inch Fusion',
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount,
        estimatedOutput: (quote?.toTokenAmount as string) || (quote?.toAmount as string) || (quote?.dstAmount as string) || '0',
        fee: (quote?.protocolFee as string) || '0'
      }],
      estimatedGas: (quote?.gasCost as string) || analysis.gas.current.standard.toString(),
      estimatedTime: 180, // 3 minutes typical for Fusion
      priceImpact: (quote?.priceImpact as string) || '0.001',
      confidence: Math.min(0.98, analysis.overall.confidence + 0.1), // Boost for Fusion
      risks: ['Network congestion delays', 'Private pool liquidity'],
      advantages: [
        'MEV protection enabled',
        'Professional market makers',
        'Optimal price execution',
        'Lower slippage'
      ],
      proposedBy: '1inch-fusion-intelligent',
      source: '1inch-fusion',
      oneInchData: analysis,
      reasoning,
      userPreference: options.userPreference
    };
  }

  private async createAggregationRoute(
    fromToken: Token,
    toToken: Token,
    amount: string,
    analysis: Comprehensive1inchAnalysis,
    options: RouteGenerationOptions
  ): Promise<IntelligentRoute> {
    const quote = analysis.quotes.aggregation.quote;
    
    const reasoning = [
      '1inch Aggregation: Fast execution across multiple DEXs',
      `Gas cost: ${analysis.gas.current.fast} gwei (${analysis.gas.trend})`,
      `DEX routes: ${analysis.paths.totalPaths} paths analyzed`,
      `Liquidity coverage: ${analysis.liquidity.coverage.description}`
    ];

    if (analysis.liquidity.topSources.length > 0) {
      const topDEXs = analysis.liquidity.topSources.slice(0, 3).map(s => s.title).join(', ');
      reasoning.push(`Top DEXs: ${topDEXs}`);
    }

    // Calculate fallback output if API quote failed or returned 0
    let estimatedOutput = (quote?.toTokenAmount as string) || (quote?.toAmount as string) || (quote?.dstAmount as string) || '0';
    
    console.log('🔍 Aggregation quote analysis:', {
      aggAvailable: analysis.quotes.aggregation.available,
      hasQuote: !!quote,
      estimatedOutput,
      quoteKeys: quote ? Object.keys(quote) : []
    });
    
    // Trigger fallback if we got 0 output regardless of API availability status
    if (estimatedOutput === '0' || !estimatedOutput || estimatedOutput === 'null') {
      console.log('⚠️ Aggregation returned 0 or invalid output, trying fusion fallback');
      
      // If aggregation failed, try to use fusion quote as fallback
      const fusionQuote = analysis.quotes.fusion.quote;
      estimatedOutput = (fusionQuote?.toTokenAmount as string) || (fusionQuote?.toAmount as string) || (fusionQuote?.dstAmount as string) || '0';
      
      console.log('🔍 Fusion fallback result:', {
        fusionAvailable: analysis.quotes.fusion.available,
        hasFusionQuote: !!fusionQuote,
        fusionOutput: estimatedOutput
      });
      
      // If still 0, calculate rough estimate using token prices
      if (estimatedOutput === '0' || !estimatedOutput || estimatedOutput === 'null') {
        console.log('🧮 Both APIs failed, using price-based fallback calculation');
        estimatedOutput = await this.calculateFallbackOutputWithRealPrices(fromToken, toToken, amount);
        console.log('📊 Fallback calculation result:', estimatedOutput);
      }
    }

    return {
      id: `intelligent-aggregation-${Date.now()}`,
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount,
      estimatedOutput,
      path: this.buildAggregationPath(quote, fromToken, toToken, amount),
      estimatedGas: (quote?.gas as string) || analysis.gas.current.fast.toString(),
      estimatedTime: 60, // 1 minute typical for aggregation
      priceImpact: (quote?.priceImpact as string) || '0.002',
      confidence: analysis.overall.confidence,
      risks: ['MEV exposure', 'Gas price volatility', 'Route optimization'],
      advantages: [
        'Fast execution',
        'Multi-DEX optimization',
        'Real-time routing',
        'High liquidity access'
      ],
      proposedBy: '1inch-aggregation-intelligent',
      source: '1inch-aggregation',
      oneInchData: analysis,
      reasoning,
      userPreference: options.userPreference
    };
  }

  private createHybridRoute(
    routes: IntelligentRoute[],
    analysis: Comprehensive1inchAnalysis,
    options: RouteGenerationOptions
  ): IntelligentRoute {
    const fusionRoute = routes.find(r => r.source === '1inch-fusion')!;
    const aggregationRoute = routes.find(r => r.source === '1inch-aggregation')!;

    // Choose the best route based on comprehensive analysis
    const recommendedRoute = this.selectOptimalRoute(fusionRoute, aggregationRoute, analysis, options);
    
    const reasoning = [
      '🔥 AI Hybrid Recommendation: Best of both approaches',
      `Selected: ${recommendedRoute.source} based on analysis`,
      `Fusion vs Aggregation: ${analysis.quotes.reasoning}`,
      `Gas timing: ${analysis.gas.optimalTiming}`,
      `Overall strategy: ${analysis.overall.optimalStrategy}`
    ];

    return {
      ...recommendedRoute,
      id: `intelligent-hybrid-${Date.now()}`,
      source: '1inch-hybrid',
      reasoning,
      advantages: [
        ...recommendedRoute.advantages,
        'AI-optimized selection',
        'Multi-factor analysis',
        'Real-time adaptation'
      ],
      confidence: Math.min(0.99, recommendedRoute.confidence + 0.05) // Boost for intelligent selection
    };
  }

  private selectOptimalRoute(
    fusionRoute: IntelligentRoute,
    aggregationRoute: IntelligentRoute,
    analysis: Comprehensive1inchAnalysis,
    options: RouteGenerationOptions
  ): IntelligentRoute {
    // User preference override
    if (options.userPreference === 'speed') {
      return aggregationRoute; // Faster execution
    }
    if (options.userPreference === 'security') {
      return fusionRoute; // MEV protection
    }
    if (options.userPreference === 'cost' && analysis.quotes.savings.percentage > 1) {
      return analysis.quotes.recommendation === 'fusion' ? fusionRoute : aggregationRoute;
    }

    // AI-based selection using 1inch analysis
    if (analysis.overall.optimalStrategy === 'fusion') return fusionRoute;
    if (analysis.overall.optimalStrategy === 'aggregation') return aggregationRoute;

    // Default to higher confidence route
    return fusionRoute.confidence > aggregationRoute.confidence ? fusionRoute : aggregationRoute;
  }

  private buildAggregationPath(quote: unknown, fromToken: Token, toToken: Token, amount: string): RouteStep[] {
    // Try to extract protocols from quote
    if (quote && typeof quote === 'object' && 'protocols' in quote && Array.isArray((quote as { protocols: unknown[] }).protocols)) {
      const protocols = (quote as { protocols: unknown[] }).protocols;
      return protocols.map((protocol: unknown, index: number) => {
        const protocolObj = protocol as { name?: string; fee?: string };
        const quoteObj = quote as { protocols: unknown[]; toTokenAmount?: string; dstAmount?: string };
        return {
          protocol: protocolObj.name || `DEX-${index + 1}`,
          fromToken: index === 0 ? fromToken.symbol : 'INTERMEDIATE',
          toToken: index === quoteObj.protocols.length - 1 ? toToken.symbol : 'INTERMEDIATE',
          amount: index === 0 ? amount : 'AUTO',
          estimatedOutput: index === quoteObj.protocols.length - 1 ? ((quoteObj.toTokenAmount as string) || (quoteObj.dstAmount as string) || '0') : 'AUTO',
          fee: protocolObj.fee || '0.003'
        };
      });
    }

    // Fallback single-step path
    return [{
      protocol: '1inch Aggregation',
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount,
      estimatedOutput: ((quote as { toTokenAmount?: string; dstAmount?: string })?.toTokenAmount) || ((quote as { toTokenAmount?: string; dstAmount?: string })?.dstAmount) || '0',
      fee: '0.003'
    }];
  }

  private sortRoutesByPreference(
    routes: IntelligentRoute[],
    preference?: 'speed' | 'cost' | 'security' | 'balanced'
  ): IntelligentRoute[] {
    return routes.sort((a, b) => {
      // Prioritize hybrid routes
      if (a.source === '1inch-hybrid' && b.source !== '1inch-hybrid') return -1;
      if (b.source === '1inch-hybrid' && a.source !== '1inch-hybrid') return 1;

      // User preference sorting
      if (preference === 'speed') {
        return a.estimatedTime - b.estimatedTime;
      }
      if (preference === 'cost') {
        const aOutput = parseFloat(a.estimatedOutput);
        const bOutput = parseFloat(b.estimatedOutput);
        return bOutput - aOutput; // Higher output first
      }
      if (preference === 'security') {
        // Prioritize Fusion for security
        if (a.source.includes('fusion') && !b.source.includes('fusion')) return -1;
        if (b.source.includes('fusion') && !a.source.includes('fusion')) return 1;
      }

      // Default: sort by confidence
      return b.confidence - a.confidence;
    });
  }

  private async calculateFallbackOutputWithRealPrices(fromToken: Token, toToken: Token, amount: string): Promise<string> {
    try {
      console.log('💡 Calculating fallback output with REAL 1inch prices:', {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount
      });

      // Import the fusion pricing service to get real prices
      const { fusionFirstPricing } = await import('./fusion-first-pricing');
      
      // Get real prices for the tokens
      // Convert token symbols to their corresponding addresses for 1inch API
      const symbolToAddress = (symbol: string): string => {
        const mapping: Record<string, string> = {
          'ETH': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          'BTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          'USDC': '0xA0b86a33E6441b8C4F27eAD9083C756Cc2',
          'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
        };
        return mapping[symbol.toUpperCase()] || symbol;
      };
      
      const tokenIdentifiers = [symbolToAddress(fromToken.symbol), symbolToAddress(toToken.symbol)];
      const pricingResult = await fusionFirstPricing.getTokenPrices(tokenIdentifiers, {
        preferFusion: true,
        fallbackToCoinGecko: true
      });

      console.log('🔥 Real pricing data retrieved:', pricingResult);

      const fromTokenKey = Object.keys(pricingResult.prices).find(key => 
        key.toLowerCase().includes(fromToken.symbol.toLowerCase()) || 
        fromToken.symbol === 'WBTC' && key.toLowerCase().includes('2260fac5e5542a773aa44fbcfedf7c193bc2c599')
      );
      
      const toTokenKey = Object.keys(pricingResult.prices).find(key => 
        key.toLowerCase().includes(toToken.symbol.toLowerCase()) ||
        toToken.symbol === 'ETH' && key.toLowerCase().includes('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
      );

      const fromPrice = fromTokenKey ? pricingResult.prices[fromTokenKey] : null;
      const toPrice = toTokenKey ? pricingResult.prices[toTokenKey] : null;

      console.log('💰 Real token prices found:', {
        fromToken: fromToken.symbol,
        fromPrice: fromPrice ? `$${fromPrice.toLocaleString()}` : 'NOT FOUND',
        toToken: toToken.symbol,
        toPrice: toPrice ? `$${toPrice.toLocaleString()}` : 'NOT FOUND'
      });

      if (fromPrice && toPrice && fromPrice > 0 && toPrice > 0) {
        // Calculate output based on USD value using REAL prices
        const fromValueUSD = parseFloat(amount) * fromPrice;
        const estimatedOutput = fromValueUSD / toPrice;
        
        // Special logging for WBTC to ETH conversion
        if (fromToken.symbol === 'WBTC' && toToken.symbol === 'ETH') {
          console.log(`🏆 WBTC to ETH Conversion with REAL 1inch prices:`);
          console.log(`   WBTC Amount: ${amount}`);
          console.log(`   WBTC Price (1inch): $${fromPrice.toLocaleString()} USD`);
          console.log(`   ETH Price (1inch): $${toPrice.toLocaleString()} USD`);
          console.log(`   Total USD Value: $${fromValueUSD.toLocaleString()}`);
          console.log(`   ETH Output (before slippage): ${estimatedOutput.toFixed(6)} ETH`);
        }
        
        // Apply 2% slippage for safety since this is a rough estimate
        const outputWithSlippage = estimatedOutput * 0.98;
        
        // Format to appropriate decimals
        const formattedOutput = toToken.symbol === 'WBTC' ? 
          outputWithSlippage.toFixed(8) :  // WBTC has 8 decimals
          outputWithSlippage.toFixed(6);   // Most tokens use 6 decimals for display

        // Special logging for WBTC to ETH final result
        if (fromToken.symbol === 'WBTC' && toToken.symbol === 'ETH') {
          console.log(`   ETH Output (with 2% slippage): ${outputWithSlippage.toFixed(6)} ETH`);
          console.log(`   Final Formatted Output: ${formattedOutput} ETH`);
          console.log(`🎯 FINAL RESULT with REAL prices: ${amount} WBTC → ${formattedOutput} ETH (worth $${fromValueUSD.toLocaleString()})`);
        }

        return formattedOutput;
      } else {
        console.warn('⚠️ Could not find real prices, falling back to hardcoded estimates');
        return this.calculateFallbackOutput(fromToken, toToken, amount);
      }
    } catch (error) {
      console.error('❌ Real price fallback calculation failed:', error);
      return this.calculateFallbackOutput(fromToken, toToken, amount);
    }
  }

  private calculateFallbackOutput(fromToken: Token, toToken: Token, amount: string): string {
    try {
      console.log('💡 Calculating fallback output for:', {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount
      });

      // ❌ REMOVED: No more hardcoded price estimates
      // If we reach this point, all pricing APIs have failed
      console.error('💥 CRITICAL: All pricing sources failed, cannot calculate fallback output');
      console.error('🚫 No hardcoded estimates available - this indicates a system-wide pricing failure');
      
      // Return "0" to indicate complete failure - calling code should handle this
      console.error('🔴 Returning "0" to indicate complete pricing failure');
      return '0';
    } catch (error) {
      console.error('❌ Fallback calculation failed:', error);
      console.error('🚫 No hardcoded fallback values - returning "0" to indicate failure');
      return '0';
    }
  }

  private investigateFusionZeroOutput(
    quote: unknown, 
    fromToken: Token, 
    toToken: Token, 
    amount: string, 
    analysis: Comprehensive1inchAnalysis
  ): void {
    console.warn('🔍 [FUSION ZERO OUTPUT INVESTIGATION] Analyzing root cause...');
    
    const investigation = {
      timestamp: new Date().toISOString(),
      tokenPair: `${fromToken.symbol} → ${toToken.symbol}`,
      amount: amount,
      quoteData: quote,
      analysis: {
        // Token analysis
        tokenIssues: this.checkTokenIssues(fromToken, toToken),
        
        // Amount analysis  
        amountIssues: this.checkAmountIssues(amount, fromToken),
        
        // Market conditions
        marketConditions: {
          hasLiquidity: analysis.liquidity.totalSources > 0,
          liquiditySources: analysis.liquidity.totalSources,
          gasPrice: analysis.gas.current.fast,
          gasRecommendation: analysis.gas.recommendation
        },
        
        // API response structure
        apiResponseStructure: {
          hasQuoteObject: !!quote,
          quoteKeys: quote ? Object.keys(quote as Record<string, unknown>) : [],
          expectedFields: ['toAmount', 'toTokenAmount', 'dstAmount'],
          foundFields: quote ? Object.keys(quote as Record<string, unknown>).filter(key => 
            ['toAmount', 'toTokenAmount', 'dstAmount'].includes(key)
          ) : []
        }
      },
      
      likelyRootCauses: this.identifyLikelyRootCauses(quote, fromToken, toToken, amount, analysis),
      
      recommendedActions: [
        'Verify token contract addresses are correct',
        'Check if amount is within supported range (not too small/large)',
        'Confirm tokens are supported by 1inch Fusion',
        'Verify network/chain ID is correct',
        'Check if there are any active trading restrictions',
        'Try with a different amount to test liquidity',
        'Use aggregation API as proven fallback'
      ]
    };
    
    console.warn('📋 [FUSION ZERO OUTPUT] Investigation complete:', investigation);
  }

  private checkTokenIssues(fromToken: Token, toToken: Token): string[] {
    const issues: string[] = [];
    
    if (!fromToken.address || fromToken.address.length !== 42) {
      issues.push(`Invalid fromToken address: ${fromToken.address}`);
    }
    
    if (!toToken.address || toToken.address.length !== 42) {
      issues.push(`Invalid toToken address: ${toToken.address}`);
    }
    
    if (fromToken.address === toToken.address) {
      issues.push('Same token for both from and to');
    }
    
    return issues;
  }

  private checkAmountIssues(amount: string, fromToken: Token): string[] {
    const issues: string[] = [];
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      issues.push(`Invalid amount: ${amount}`);
    }
    
    // Check if amount is too small (less than 0.000001 tokens)
    if (amountNum < 0.000001) {
      issues.push(`Amount may be too small: ${amount} ${fromToken.symbol}`);
    }
    
    // Check if amount is extremely large (> 1 billion tokens)
    if (amountNum > 1000000000) {
      issues.push(`Amount may be too large: ${amount} ${fromToken.symbol}`);
    }
    
    return issues;
  }

  private identifyLikelyRootCauses(
    quote: unknown,
    fromToken: Token,
    toToken: Token, 
    amount: string,
    analysis: Comprehensive1inchAnalysis
  ): string[] {
    const causes: string[] = [];
    
    // No liquidity for pair
    if (analysis.liquidity.totalSources === 0) {
      causes.push('No liquidity sources available for this token pair in Fusion');
    }
    
    // Amount issues
    const amountNum = parseFloat(amount);
    if (amountNum < 0.001) {
      causes.push('Amount too small for Fusion to provide meaningful quote');
    }
    
    if (amountNum > 100000) {
      causes.push('Amount too large, may exceed available liquidity');
    }
    
    // API response structure issues
    if (!quote) {
      causes.push('Fusion API returned null/undefined response');
    } else {
      const quoteObj = quote as Record<string, unknown>;
      if (!quoteObj.toAmount && !quoteObj.toTokenAmount && !quoteObj.dstAmount) {
        causes.push('Fusion API response missing expected output amount fields');
      }
    }
    
    // Gas issues
    if (analysis.gas.current.fast > 100) {
      causes.push('High gas prices may be preventing Fusion from providing competitive quotes');
    }
    
    return causes;
  }
}

export const intelligentRouteGenerator = IntelligentRouteGenerator.getInstance();