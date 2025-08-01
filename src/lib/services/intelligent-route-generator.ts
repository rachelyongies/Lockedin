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
      const fusionRoute = this.createFusionRoute(
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
      const aggregationRoute = this.createAggregationRoute(
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

  private createFusionRoute(
    fromToken: Token,
    toToken: Token,
    amount: string,
    analysis: Comprehensive1inchAnalysis,
    options: RouteGenerationOptions
  ): IntelligentRoute {
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

    return {
      id: `intelligent-fusion-${Date.now()}`,
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount,
      estimatedOutput: (quote?.toTokenAmount as string) || (quote?.toAmount as string) || '0',
      path: [{
        protocol: '1inch Fusion',
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount,
        estimatedOutput: (quote?.toTokenAmount as string) || (quote?.toAmount as string) || '0',
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

  private createAggregationRoute(
    fromToken: Token,
    toToken: Token,
    amount: string,
    analysis: Comprehensive1inchAnalysis,
    options: RouteGenerationOptions
  ): IntelligentRoute {
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

    return {
      id: `intelligent-aggregation-${Date.now()}`,
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount,
      estimatedOutput: (quote?.toTokenAmount as string) || '0',
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
        const quoteObj = quote as { protocols: unknown[]; toTokenAmount?: string };
        return {
          protocol: protocolObj.name || `DEX-${index + 1}`,
          fromToken: index === 0 ? fromToken.symbol : 'INTERMEDIATE',
          toToken: index === quoteObj.protocols.length - 1 ? toToken.symbol : 'INTERMEDIATE',
          amount: index === 0 ? amount : 'AUTO',
          estimatedOutput: index === quoteObj.protocols.length - 1 ? (quoteObj.toTokenAmount as string || '0') : 'AUTO',
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
      estimatedOutput: (quote as { toTokenAmount?: string })?.toTokenAmount || '0',
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
}

export const intelligentRouteGenerator = IntelligentRouteGenerator.getInstance();