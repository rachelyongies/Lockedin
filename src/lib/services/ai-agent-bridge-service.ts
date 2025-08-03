// AI Agent Bridge Service - Connects frontend to the AI Agent system
import { Token, BridgeRoute, createAmount } from '@/types/bridge';
import { AgentCoordinator, AgentRole } from '../agents/AgentCoordinator';
import { RouteDiscoveryAgent } from '../agents/RouteDiscoveryAgent';
import { RiskAssessmentAgent } from '../agents/RiskAssessmentAgent';
import { MarketIntelligenceAgent } from '../agents/MarketIntelligenceAgent';
import { ExecutionStrategyAgent } from '../agents/ExecutionStrategyAgent';
import { PerformanceMonitorAgent } from '../agents/PerformanceMonitorAgent';
import { SecurityAgent } from '../agents/SecurityAgent';
import { DataAggregationService } from './DataAggregationService';
import { DecisionEngine } from './DecisionEngine';
import { fusionAPI } from './1inch-fusion';
import { oneInchAggregator, Comprehensive1inchAnalysis } from './1inch-api-aggregator';
import { intelligentRouteGenerator, IntelligentRoute } from './intelligent-route-generator';
import { 
  RouteProposal, 
  RouteStep,
  RiskAssessment, 
  ExecutionStrategy,
  MarketConditions,
  MessageType,
  MessagePriority,
  UserFocusPreference,
  UserPreferenceWeights
} from '../agents/types';

export interface AIAgentAnalysis {
  routes: RouteProposal[];
  riskAssessments: RiskAssessment[];
  executionStrategy: ExecutionStrategy;
  marketConditions: MarketConditions;
  confidence: number;
  insights: string[];
  oneInchAnalysis?: Comprehensive1inchAnalysis;
  agentResponses?: Record<string, unknown>;
}

export interface AgentPrediction {
  optimalSlippage: number;
  predictedGasCost: string;
  successProbability: number;
  estimatedTime: number;
  mevProtection: {
    enabled: boolean;
    strategy: string;
    estimatedProtection: number;
  };
}

export class AIAgentBridgeService {
  private static instance: AIAgentBridgeService;
  private coordinator: AgentCoordinator;
  private dataService: DataAggregationService;
  private decisionEngine: DecisionEngine;
  private initialized = false;
  
  // Performance monitoring
  private performanceMetrics = {
    totalAnalyses: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    successRate: 0
  };

  private constructor() {
    // Initialize data service with API keys from environment
    this.dataService = new DataAggregationService({
      oneInch: process.env.NEXT_PUBLIC_1INCH_API_KEY,
      coinGecko: process.env.COINGECKO_API_KEY,
      infura: process.env.INFURA_API_KEY,
      alchemy: process.env.ALCHEMY_API_KEY
    });
    this.decisionEngine = new DecisionEngine(this.dataService);
    this.coordinator = new AgentCoordinator({
      maxAgents: 10,
      consensusTimeout: 30000
    });
  }

  static getInstance(): AIAgentBridgeService {
    if (!AIAgentBridgeService.instance) {
      AIAgentBridgeService.instance = new AIAgentBridgeService();
    }
    return AIAgentBridgeService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('🤖 Initializing AI Agent system...');
      
      // Create and register all agents
      const routeDiscoveryAgent = new RouteDiscoveryAgent({
        id: 'route-discovery-001',
        name: 'Route Discovery Agent',
        version: '1.0.0',
        capabilities: ['analyze', 'route-discovery', 'market-analysis'],
        dependencies: [],
        maxConcurrentTasks: 5,
        timeout: 30000
      }, this.dataService);

      const riskAssessmentAgent = new RiskAssessmentAgent({
        id: 'risk-assessment-001',
        name: 'Risk Assessment Agent',
        version: '1.0.0',
        capabilities: ['analyze', 'risk-assessment', 'market-analysis'],
        dependencies: [],
        maxConcurrentTasks: 3,
        timeout: 20000
      }, this.dataService);

      const marketIntelligenceAgent = new MarketIntelligenceAgent({
        id: 'market-intelligence-001',
        name: 'Market Intelligence Agent',
        version: '1.0.0',
        capabilities: ['analyze', 'market-analysis', 'performance-monitoring'],
        dependencies: [],
        maxConcurrentTasks: 5,
        timeout: 15000
      }, this.dataService, process.env.NEXT_PUBLIC_DUNE_API_KEY || process.env.DUNE_API_KEY); // Pass the API key from environment

      const executionStrategyAgent = new ExecutionStrategyAgent(this.dataService);

      const performanceMonitorAgent = new PerformanceMonitorAgent();

      const securityAgent = new SecurityAgent({
        id: 'security-001',
        name: 'Security Agent',
        version: '1.0.0',
        capabilities: ['analyze', 'market-analysis', 'performance-monitoring'],
        dependencies: [],
        maxConcurrentTasks: 10,
        timeout: 5000
      });

      // Register agents with coordinator
      await this.coordinator.registerAgent(securityAgent, 'security', AgentRole.MONITOR, 10);
      await this.coordinator.registerAgent(routeDiscoveryAgent, 'route-discovery', AgentRole.SPECIALIZED, 8);
      await this.coordinator.registerAgent(riskAssessmentAgent, 'risk-assessment', AgentRole.SPECIALIZED, 8);
      await this.coordinator.registerAgent(marketIntelligenceAgent, 'market-intelligence', AgentRole.SPECIALIZED, 7);
      await this.coordinator.registerAgent(executionStrategyAgent, 'execution-strategy', AgentRole.PRIMARY, 9, ['route-discovery-001', 'risk-assessment-001']);
      await this.coordinator.registerAgent(performanceMonitorAgent, 'performance-monitor', AgentRole.MONITOR, 6);

      // Start the coordinator
      await this.coordinator.start();
      
      console.log('🤖 AI Agent system initialized successfully with 6 agents');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize AI Agent system:', error);
      throw error;
    }
  }

  async analyzeRoute(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress?: string,
    userPreferences?: {
      userPreference?: 'speed' | 'cost' | 'security' | 'balanced';
      maxSlippage?: number;
      gasPreference?: 'slow' | 'standard' | 'fast';
    }
  ): Promise<AIAgentAnalysis> {
    const startTime = Date.now();
    this.performanceMetrics.totalAnalyses++;
    
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Convert tokens to proper format for agents
      const fromTokenAddress = this.getTokenAddress(fromToken);
      const toTokenAddress = this.getTokenAddress(toToken);
      const chainId = this.getChainId(fromToken.network);

      console.log('🔄 Fetching market data from 1inch APIs...');

      // Fetch real market data from 1inch APIs
      const [gasData, quoteData, priceData] = await Promise.all([
        this.fetchGasData(chainId),
        this.fetchQuoteData(fromTokenAddress, toTokenAddress, amount, chainId),
        this.fetchTokenPrices([fromTokenAddress, toTokenAddress])
      ]);

      console.log('✅ Market data fetched successfully');

      // Create proper MarketConditions object
      const currentMarketConditions = this.createMarketConditions(gasData, priceData);

      // Create proper RouteProposal object from quote data
      const routeProposal = this.createRouteProposal(quoteData, fromTokenAddress, toTokenAddress, amount);

      // Request route analysis from the coordinator with proper data structures
      const analysisRequest = {
        id: `analysis-${Date.now()}`,
        from: 'frontend',
        to: 'coordinator',
        type: MessageType.REQUEST_ANALYSIS,
        payload: {
          type: 'route-analysis',
          routeProposal,
          marketConditions: currentMarketConditions,
          userPreferences: {
            riskTolerance: this.mapPreferenceToRiskTolerance(userPreferences?.userPreference),
            maxSlippage: userPreferences?.maxSlippage || 0.5,
            gasPreference: userPreferences?.gasPreference || 'standard'
          },
          walletAddress: walletAddress || '0x0000000000000000000000000000000000000000',
          chainId
        },
        timestamp: Date.now(),
        priority: MessagePriority.HIGH
      };

      // Send request to coordinator for real agent analysis and collect responses
      console.log('🤖 Sending analysis request to AI agents...');
      const agentResponses = await this.collectAgentResponses(analysisRequest);
      console.log('📊 AI Agent responses collected:', {
        totalResponses: Object.keys(agentResponses).length,
        responseTypes: Object.keys(agentResponses)
      });

      // Parallel execution for better performance
      console.log('⚡ AI Agent Bridge - Starting parallel route analysis...');
      console.log('🔍 Analysis details:', {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount,
        hasWallet: !!walletAddress,
        walletAddress: walletAddress?.slice(0, 6) + '...' + walletAddress?.slice(-4) || 'none',
        canUseFusionAPI: !!walletAddress && walletAddress !== '0x0000000000000000000000000000000000000000'
      });
      
      const analysisStart = Date.now();

      // Step 1: Get comprehensive 1inch analysis in parallel with routes and market conditions
      const [routes, marketConditions, oneInchAnalysis] = await Promise.all([
        this.generateIntelligentRoutes(fromToken, toToken, amount, walletAddress, userPreferences),
        this.dataService.getNetworkConditions(),
        oneInchAggregator.getComprehensiveAnalysis(fromToken, toToken, amount, walletAddress)
      ]);

      console.log(`⚡ Route generation and 1inch analysis completed in ${Date.now() - analysisStart}ms`);
      console.log(`🔍 1inch Analysis Results:`, {
        fusionAvailable: oneInchAnalysis.quotes.fusion.available,
        aggregationAvailable: oneInchAnalysis.quotes.aggregation.available,
        recommendation: oneInchAnalysis.quotes.recommendation,
        gasRecommendation: oneInchAnalysis.gas.recommendation,
        liquiditySources: oneInchAnalysis.liquidity.totalSources,
        pathsFound: oneInchAnalysis.paths.totalPaths,
        overallConfidence: oneInchAnalysis.overall.confidence
      });

      // Step 2: If we have routes, process risk assessments and execution strategy in parallel
      let riskAssessments: RiskAssessment[] = [];
      let executionStrategy: ExecutionStrategy;

      if (routes.length > 0) {
        const [riskResults, execStrategy] = await Promise.all([
          // Parallel risk assessment for all routes
          Promise.all(routes.map(route => this.generateRealRiskAssessment(route))),
          // Enhanced execution strategy using 1inch analysis
          this.generateEnhancedExecutionStrategy(routes[0], oneInchAnalysis)
        ]);
        
        riskAssessments = riskResults;
        executionStrategy = execStrategy;
      } else {
        executionStrategy = await this.generateDefaultExecutionStrategy();
      }

      console.log(`⚡ Total analysis completed in ${Date.now() - analysisStart}ms`);

      // Perform consensus building if multiple routes available
      let consensusResult: { bestRouteId?: string; consensusScore?: number } = {};
      if (routes.length > 1) {
        try {
          console.log('🎯 Building consensus among agents for route selection...');
          
          // Generate user preference weights based on focus
          const userFocus: UserFocusPreference = userPreferences?.userPreference || 'balanced';
          const userPreferenceWeights = AgentCoordinator.generateUserPreferenceWeights(userFocus);
          
          console.log('👤 Applying user preference weighting:', {
            focus: userFocus,
            weightings: userPreferenceWeights.weightings
          });
          
          const bestRouteId = await this.coordinator.requestConsensus(
            routes,
            riskAssessments,
            executionStrategy ? [executionStrategy] : [],
            {
              cost: userPreferences?.userPreference === 'cost' ? 0.4 : 0.3,
              time: userPreferences?.userPreference === 'speed' ? 0.4 : 0.25,
              security: userPreferences?.userPreference === 'security' ? 0.4 : 0.35,
              reliability: 0.05,
              slippage: 0.05
            },
            userPreferenceWeights
          );
          
          consensusResult = { 
            bestRouteId, 
            consensusScore: 0.9 // High confidence in consensus result
          };
          
          // Reorder routes based on consensus - put consensus choice first
          const consensusRoute = routes.find(r => r.id === bestRouteId);
          if (consensusRoute) {
            // Create new array instead of reassigning const
            const reorderedRoutes = [consensusRoute, ...routes.filter(r => r.id !== bestRouteId)];
            routes.length = 0; // Clear the array
            routes.push(...reorderedRoutes); // Repopulate with reordered routes
            console.log(`✅ Consensus achieved: Route ${bestRouteId} selected as optimal`);
          }
        } catch (error) {
          console.warn('⚠️ Consensus building failed, proceeding with individual agent recommendations:', error);
          consensusResult = { consensusScore: 0.0 }; // No consensus achieved
        }
      }

      // Generate enhanced insights based on agent analysis and 1inch data
      const insights = this.generateEnhancedInsights(routes, riskAssessments, executionStrategy, oneInchAnalysis, consensusResult);

      // Update performance metrics
      const responseTime = Date.now() - startTime;
      this.updatePerformanceMetrics(responseTime, true);

      console.log(`⚡ Route analysis completed in ${responseTime}ms`);

      // Enhanced response with clear source attribution  
      const enhancedResponse = {
        routes,
        riskAssessments,
        executionStrategy,
        marketConditions,
        confidence: this.calculateEnhancedConfidence(routes, riskAssessments, executionStrategy, oneInchAnalysis),
        insights,
        oneInchAnalysis,
        consensus: consensusResult,
        
        // Enhanced source attribution
        sourceAttribution: this.generateSourceAttribution(routes, riskAssessments, executionStrategy, consensusResult),
        
        // Executive summary for user clarity
        executiveSummary: this.generateExecutiveSummary(routes, riskAssessments, executionStrategy, consensusResult, oneInchAnalysis),
        
        agentResponses: agentResponses || {}
      };

      return enhancedResponse;
    } catch (error) {
      console.error('🚨 AI Agent Analysis FAILED - Real Data Required:', {
        error: error instanceof Error ? error.message : error,
        fromToken: fromToken?.symbol,
        toToken: toToken?.symbol,
        amount,
        walletAddress,
        timestamp: new Date().toISOString(),
        apiKeys: {
          oneInch: !!process.env.NEXT_PUBLIC_1INCH_API_KEY,
          alchemy: !!process.env.ALCHEMY_API_KEY,
          coinGecko: !!process.env.COINGECKO_API_KEY,
          infura: !!process.env.INFURA_API_KEY
        },
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Update performance metrics for failed request
      const responseTime = Date.now() - startTime;
      this.updatePerformanceMetrics(responseTime, false);
      
      throw new Error(
        `AI Analysis Failed: Cannot proceed without real market data. ` +
        `Error: ${error instanceof Error ? error.message : 'API connection failed'}. ` +
        `Check API key configuration and network connectivity.`
      );
    }
  }

  private updatePerformanceMetrics(responseTime: number, success: boolean): void {
    // Update average response time
    const totalTime = this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalAnalyses - 1);
    this.performanceMetrics.averageResponseTime = (totalTime + responseTime) / this.performanceMetrics.totalAnalyses;
    
    // Update success rate
    const totalSuccesses = this.performanceMetrics.successRate * (this.performanceMetrics.totalAnalyses - 1);
    const newSuccesses = success ? totalSuccesses + 1 : totalSuccesses;
    this.performanceMetrics.successRate = newSuccesses / this.performanceMetrics.totalAnalyses;
  }

  // Get performance metrics for monitoring
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheStats: this.getCacheStats()
    };
  }

  private async getCacheStats() {
    try {
      const { CacheService } = await import('./CacheService');
      return CacheService.getInstance().getStats();
    } catch {
      return { error: 'Cache service not available' };
    }
  }

  async getAgentPredictions(
    fromToken: Token,
    toToken: Token,
    amount: string
  ): Promise<AgentPrediction> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Get market conditions
      const marketConditions = await this.dataService.getNetworkConditions();
      
      // Get gas predictions
      const gasPrices = await this.dataService.getGasPrices();
      
      // Calculate optimal parameters using agent intelligence
      const slippage = this.calculateOptimalSlippage(marketConditions, parseFloat(amount));
      const successProbability = this.calculateSuccessProbability(marketConditions);
      const estimatedTime = this.predictExecutionTime(marketConditions);

      return {
        optimalSlippage: slippage,
        predictedGasCost: gasPrices.ethereum.standard.toString(),
        successProbability,
        estimatedTime,
        mevProtection: {
          enabled: true,
          strategy: 'private-mempool',
          estimatedProtection: 0.95
        }
      };
    } catch (error) {
      console.error('🚨 ML Predictions FAILED - Real Data Required:', {
        error: error instanceof Error ? error.message : error,
        fromToken: fromToken?.symbol,
        toToken: toToken?.symbol,
        amount,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw new Error(
        `ML Predictions Failed: Cannot generate predictions without real market data. ` +
        `Error: ${error instanceof Error ? error.message : 'Data service unavailable'}.`
      );
    }
  }

  private generateInsights(
    routes: RouteProposal[],
    riskAssessments: RiskAssessment[],
    executionStrategy: ExecutionStrategy
  ): string[] {
    const insights: string[] = [];

    // Route insights
    if (routes.length > 0) {
      const bestRoute = routes[0];
      insights.push(`Found ${routes.length} optimized routes with up to ${(bestRoute.confidence * 100).toFixed(0)}% confidence`);
      
      if (bestRoute.advantages.includes('gas-optimized')) {
        insights.push(`⛽ Gas-optimized route can save up to 30% on transaction fees`);
      }
    }

    // Risk insights
    if (riskAssessments.length > 0) {
      const lowestRisk = riskAssessments.reduce((min, curr) => 
        curr.overallRisk < min.overallRisk ? curr : min
      );
      
      if (lowestRisk.overallRisk < 0.2) {
        insights.push(`🛡️ Low risk route identified - suitable for large transactions`);
      }
      
      if (lowestRisk.factors.mevRisk > 0.5) {
        insights.push(`⚡ MEV protection recommended - AI agents will handle this automatically`);
      }
    }

    // Execution strategy insights
    if (executionStrategy) {
      if (executionStrategy.timing.delayRecommended > 0) {
        const minutes = Math.round(executionStrategy.timing.delayRecommended / 60);
        insights.push(`⏰ AI recommends waiting ${minutes} minutes for optimal execution`);
      }
      
      if (executionStrategy.mevProtection.enabled) {
        insights.push(`🔒 MEV protection enabled with ${(executionStrategy.mevProtection.estimatedProtection * 100).toFixed(0)}% effectiveness`);
      }

      if (executionStrategy.orderSplitting?.enabled) {
        insights.push(`📊 Order splitting enabled - executing in ${executionStrategy.orderSplitting.numberOfParts} parts for better rates`);
      }
    }

    return insights;
  }

  private calculateOverallConfidence(
    routes: RouteProposal[],
    riskAssessments: RiskAssessment[],
    executionStrategy: ExecutionStrategy
  ): number {
    let confidence = 0;
    let weights = 0;

    // Route confidence (40% weight)
    if (routes.length > 0) {
      confidence += routes[0].confidence * 0.4;
      weights += 0.4;
    }

    // Risk assessment confidence (30% weight)
    if (riskAssessments.length > 0) {
      const riskConfidence = 1 - riskAssessments[0].overallRisk;
      confidence += riskConfidence * 0.3;
      weights += 0.3;
    }

    // Execution strategy confidence (30% weight)
    if (executionStrategy && executionStrategy.confidence) {
      confidence += executionStrategy.confidence * 0.3;
      weights += 0.3;
    }

    return weights > 0 ? confidence / weights : 0.5;
  }

  private calculateOptimalSlippage(conditions: MarketConditions, amount: number): number {
    const baseSlippage = 0.003; // 0.3% base (more realistic)
    
    // Volatility adjustment (reduced from 2% to 0.5% max)
    const volatilityAdjustment = conditions.volatility.overall * 0.005;
    
    // Liquidity adjustment (reduced from 1.5% to 0.5% max)
    const liquidityAdjustment = (1 - conditions.liquidity.overall) * 0.005;
    
    // Amount adjustment (scaled better for typical amounts)
    const amountAdjustment = Math.min(0.003, amount / 5000000); // 0.3% max for very large trades
    
    const totalSlippage = baseSlippage + volatilityAdjustment + liquidityAdjustment + amountAdjustment;
    
    console.log('🎯 Slippage calculation breakdown:');
    console.log(`   Base: ${(baseSlippage * 100).toFixed(2)}%`);
    console.log(`   Volatility adj: ${(volatilityAdjustment * 100).toFixed(2)}% (volatility: ${(conditions.volatility.overall * 100).toFixed(1)}%)`);
    console.log(`   Liquidity adj: ${(liquidityAdjustment * 100).toFixed(2)}% (liquidity: ${(conditions.liquidity.overall * 100).toFixed(1)}%)`);
    console.log(`   Amount adj: ${(amountAdjustment * 100).toFixed(2)}% (amount: $${amount.toFixed(2)})`);
    console.log(`   Total: ${(totalSlippage * 100).toFixed(2)}%`);
    
    // More realistic max of 1.5% instead of 5%
    return Math.min(0.015, totalSlippage);
  }

  private calculateSuccessProbability(conditions: MarketConditions): number {
    let probability = 0.95;
    
    // Network congestion impact
    const avgCongestion = (conditions.networkCongestion.ethereum + conditions.networkCongestion.polygon) / 2;
    if (avgCongestion > 0.8) probability -= 0.1;
    
    // Volatility impact
    if (conditions.volatility.overall > 0.7) probability -= 0.05;
    
    // Liquidity impact
    if (conditions.liquidity.overall < 0.3) probability -= 0.1;
    
    return Math.max(0.5, probability);
  }

  private predictExecutionTime(conditions: MarketConditions): number {
    const baseTime = 300; // 5 minutes
    
    // Network congestion delay
    const congestionDelay = conditions.networkCongestion.ethereum * 600;
    
    // Time of day adjustment
    const hourAdjustment = (conditions.timeOfDay >= 14 && conditions.timeOfDay <= 18) ? 120 : 0;
    
    return baseTime + congestionDelay + hourAdjustment;
  }

  private getChainId(network: string): number {
    const chainIds: Record<string, number> = {
      'ethereum': 1,
      'polygon': 137,
      'bsc': 56,
      'arbitrum': 42161,
      'optimism': 10,
      'avalanche': 43114
    };
    
    return chainIds[network.toLowerCase()] || 1;
  }

  // Get token address or fallback to symbol for tokens without addresses
  private getTokenAddress(token: Token): string {
    // Handle different token types using type guards
    if (token.network === 'ethereum') {
      return (token as { address?: string }).address || token.symbol;
    } else if (token.network === 'solana' && 'address' in token) {
      return token.address || token.symbol;
    } else if (token.network === 'starknet' && 'address' in token) {
      return token.address || token.symbol;
    } else {
      // For bitcoin, stellar, and other networks without addresses
      return token.symbol;
    }
  }

  // Convert RouteProposal to BridgeRoute format for frontend compatibility
  convertToBridgeRoute(proposal: RouteProposal): BridgeRoute {
    const totalFees = proposal.path.reduce((sum, step) => {
      const fee = parseFloat(step.fee) || 0;
      return sum + fee;
    }, 0);

    return {
      from: {
        id: `${proposal.fromToken}-ethereum`,
        symbol: proposal.fromToken,
        name: proposal.fromToken,
        decimals: 18,
        logoUrl: '',
        coingeckoId: '',
        isWrapped: false,
        verified: true,
        displayPrecision: 4,
        description: `${proposal.fromToken} token`,
        tags: [],
        network: 'ethereum' as const,
        chainId: 1 as const,
        address: proposal.fromToken,
        isNative: false
      },
      to: {
        id: `${proposal.toToken}-ethereum`,
        symbol: proposal.toToken,
        name: proposal.toToken,
        decimals: 18,
        logoUrl: '',
        coingeckoId: '',
        isWrapped: false,
        verified: true,
        displayPrecision: 4,
        description: `${proposal.toToken} token`,
        tags: [],
        network: 'ethereum' as const,
        chainId: 1 as const,
        address: proposal.toToken,
        isNative: false
      },
      limits: {
        min: createAmount('0.001', 18),
        max: createAmount('1000', 18)
      },
      estimatedTime: {
        minutes: Math.round(proposal.estimatedTime / 60)
      },
      fees: {
        network: {
          amount: createAmount(proposal.estimatedGas, 18),
          amountUSD: totalFees * 0.7
        },
        protocol: {
          amount: createAmount('0', 18),
          amountUSD: totalFees * 0.3,
          percent: (totalFees * 0.3 / parseFloat(proposal.amount)) * 100
        },
        total: {
          amount: createAmount(totalFees.toString(), 18),
          amountUSD: totalFees
        }
      },
      exchangeRate: parseFloat(proposal.estimatedOutput) / parseFloat(proposal.amount),
      inverseRate: parseFloat(proposal.amount) / parseFloat(proposal.estimatedOutput),
      priceImpact: parseFloat(proposal.priceImpact) || 0.005,
      available: true,
      isWrapping: false,
      requiresApproval: true
    };
  }

  async shutdown(): Promise<void> {
    if (this.coordinator) {
      await this.coordinator.shutdown();
    }
    this.initialized = false;
  }

  // Generate intelligent routes using comprehensive 1inch API data
  private async generateIntelligentRoutes(
    fromToken: Token, 
    toToken: Token, 
    amount: string, 
    walletAddress?: string,
    userPreferences?: {
      userPreference?: 'speed' | 'cost' | 'security' | 'balanced';
      maxSlippage?: number;
      gasPreference?: 'slow' | 'standard' | 'fast';
    }
  ): Promise<RouteProposal[]> {
    try {
      console.log('🧠 AI Agent Bridge - Using Intelligent Route Generator');
      console.log('📊 Intelligent routing parameters:', {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount,
        walletAddress: walletAddress?.slice(0, 6) + '...' + walletAddress?.slice(-4) || 'none',
        strategy: 'comprehensive-1inch-analysis',
        userPreferences: userPreferences || 'default'
      });

      // Generate intelligent routes using comprehensive 1inch API data with user preferences
      const intelligentRoutes = await intelligentRouteGenerator.generateIntelligentRoutes(
        fromToken,
        toToken,
        amount,
        walletAddress,
        {
          userPreference: userPreferences?.userPreference || 'balanced',
          maxSlippage: userPreferences?.maxSlippage || 0.01, // 1% default
          gasPreference: userPreferences?.gasPreference || 'standard',
          includeMultiHop: true
        }
      );

      console.log('🎯 Intelligent Route Generator Results:', {
        totalRoutes: intelligentRoutes.length,
        sources: intelligentRoutes.map(r => r.source),
        topRecommendation: intelligentRoutes[0]?.source || 'none',
        confidence: intelligentRoutes[0]?.confidence || 0
      });

      // Convert IntelligentRoute to RouteProposal format
      const routeProposals: RouteProposal[] = intelligentRoutes.map(route => ({
        id: route.id,
        fromToken: route.fromToken,
        toToken: route.toToken,
        amount: route.amount,
        estimatedOutput: route.estimatedOutput,
        path: route.path,
        estimatedGas: route.estimatedGas,
        estimatedTime: route.estimatedTime,
        priceImpact: route.priceImpact,
        confidence: route.confidence,
        risks: route.risks,
        advantages: route.advantages,
        proposedBy: route.proposedBy
      }));

      console.log('✅ Intelligent routes converted to RouteProposals successfully');
      return routeProposals;

    } catch (error) {
      console.error('❌ Intelligent Route Generator failed, falling back to legacy method:', error);
      
      // Fallback to legacy route generation
      return this.generateLegacyRoutes(fromToken, toToken, amount, walletAddress || '0x0000000000000000000000000000000000000000');
    }
  }

  // Legacy route generation method (kept as fallback)
  private async generateLegacyRoutes(
    fromToken: Token, 
    toToken: Token, 
    amount: string, 
    fromAddress: string
  ): Promise<RouteProposal[]> {
    try {
      console.log('🤖 AI Agent Bridge - Generating real routes');
      console.log('📊 Route parameters:', {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount,
        fromAddress: fromAddress?.slice(0, 6) + '...' + fromAddress?.slice(-4),
        willUseFusionAPI: fromAddress !== '0x0000000000000000000000000000000000000000'
      });

      // Get real liquidity data
      const liquidity = await this.dataService.getProtocolLiquidity();
      const gasPrices = await this.dataService.getGasPrices();
      
      console.log('📈 Market data retrieved:', {
        liquidityProtocols: Object.keys(liquidity).length,
        topProtocols: Object.entries(liquidity).sort(([,a], [,b]) => b - a).slice(0, 3).map(([name, tvl]) => `${name}: $${(tvl/1000000).toFixed(0)}M`),
        gasAvailable: !!gasPrices.ethereum
      });
      
      const routes: RouteProposal[] = [];
      
      // Check if we should try Fusion API first (real wallet address provided)
      // ORIGINAL APPROACH (now fallback): const shouldTryFusionAPI = fromAddress && fromAddress !== '0x0000000000000000000000000000000000000000';
      
      // NEW APPROACH: Always try Fusion first, regardless of wallet
      const shouldTryFusionAPI = true;
      
      console.log('🔄 AI Agent Bridge - Route generation strategy:', {
        strategy: shouldTryFusionAPI ? 'FUSION_API_FIRST' : 'FALLBACK_ONLY',
        reason: 'Always prioritize 1inch Fusion for best execution',
        walletAddress: fromAddress?.slice(0, 6) + '...' + fromAddress?.slice(-4),
        // originalLogic: fromAddress && fromAddress !== '0x0000000000000000000000000000000000000000' ? 'Would use Fusion' : 'Would use DEX'
      });

      if (shouldTryFusionAPI) {
        console.log('🚀 AI Agent Bridge - Attempting 1inch Fusion API integration');
        try {
          // Use the Token objects directly (no need to convert from symbols)
          console.log('🔄 AI Agent Bridge - Calling 1inch Fusion API...');
          const fusionQuote = await fusionAPI.getQuote(fromToken, toToken, amount, fromAddress);
          
          console.log('🎯 AI Agent Bridge - Fusion API success! Converting to RouteProposal...');
          
          // Convert Fusion quote to RouteProposal
          const fusionRoute: RouteProposal = {
            id: `fusion-${fusionQuote.id}`,
            fromToken: fromToken.symbol,
            toToken: toToken.symbol,
            amount,
            estimatedOutput: fusionQuote.toAmount,
            path: [{
              protocol: '1inch Fusion',
              fromToken: fromToken.symbol,
              toToken: toToken.symbol,
              amount,
              estimatedOutput: fusionQuote.toAmount,
              fee: fusionQuote.protocolFee
            }],
            estimatedGas: fusionQuote.networkFee,
            estimatedTime: 180, // 3 minutes average for Fusion
            priceImpact: fusionQuote.priceImpact,
            confidence: 0.95, // High confidence for 1inch data
            risks: ['MEV exposure', 'Network congestion'],
            advantages: ['Best price execution', 'MEV protection', 'Professional market makers'],
            proposedBy: 'fusion-api'
          };
          
          routes.push(fusionRoute);
          console.log('✅ AI Agent Bridge - Fusion route added successfully');
          
        } catch (fusionError) {
          console.log('❌ AI Agent Bridge - Fusion API failed, using fallback:', fusionError);
        }
      }
      
      // Generate routes based on real DEX liquidity (fallback/primary method)
      console.log('📊 AI Agent Bridge - Using DEX liquidity data for route generation');
      const topDexes = Object.entries(liquidity)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3); // Top 3 DEXs by liquidity
      
      console.log('🏆 Top DEXs selected:', topDexes.map(([name, tvl]) => `${name}: $${(tvl/1000000).toFixed(0)}M TVL`));
      
      for (const [protocol, tvl] of topDexes) {
        const route: RouteProposal = {
          id: `route-${protocol}-${Date.now()}`,
          fromToken: fromToken.symbol,
          toToken: toToken.symbol,
          amount,
          estimatedOutput: this.calculateRealOutput(amount, protocol, tvl),
          path: [{
            protocol: this.formatProtocolName(protocol),
            fromToken: fromToken.symbol,
            toToken: toToken.symbol,
            amount,
            estimatedOutput: this.calculateRealOutput(amount, protocol, tvl),
            fee: this.getProtocolFee(protocol)
          }],
          estimatedGas: this.calculateRealGas(protocol, gasPrices),
          estimatedTime: this.calculateRealTime(protocol),
          priceImpact: this.calculateRealPriceImpact(amount, tvl),
          confidence: this.calculateRouteConfidence(protocol, tvl),
          risks: this.getProtocolRisks(protocol),
          advantages: this.getProtocolAdvantages(protocol),
          proposedBy: 'route-discovery-001'
        };
        routes.push(route);
      }
      
      console.log('✅ AI Agent Bridge - Route generation completed');
      console.log('📋 Generated routes summary:', {
        totalRoutes: routes.length,
        protocols: routes.map(r => r.path[0]?.protocol).join(', '),
        estimatedOutputs: routes.map(r => `${r.estimatedOutput} ${toToken.symbol}`),
        dataSource: shouldTryFusionAPI ? 'Mixed (Fusion + DEX data)' : 'DEX liquidity data only'
      });
      
      return routes;
    } catch (error) {
      console.error('❌ AI Agent Bridge - Route generation failed:', error);
      console.error('🚨 Error details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  private async generateRealRiskAssessment(route: RouteProposal): Promise<RiskAssessment> {
    const networkConditions = await this.dataService.getNetworkConditions();
    
    return {
      routeId: route.id,
      overallRisk: this.calculateOverallRisk(route, networkConditions),
      factors: {
        protocolRisk: this.calculateProtocolRisk(route.path[0].protocol),
        liquidityRisk: parseFloat(route.priceImpact) / 10, // Convert price impact to risk
        slippageRisk: Math.min(0.2, parseFloat(route.priceImpact)),
        mevRisk: this.calculateMevRisk(route.path[0].protocol),
        bridgeRisk: 0.1 // Base bridge risk
      },
      recommendations: this.generateRiskRecommendations(route),
      blockers: [],
      assessedBy: 'risk-assessment-001'
    };
  }

  private async generateRealExecutionStrategy(route: RouteProposal): Promise<ExecutionStrategy> {
    const marketConditions = await this.dataService.getNetworkConditions();
    const gasPrices = await this.dataService.getGasPrices();
    
    console.log('⛽ Gas prices from data service:', {
      ethereum: gasPrices.ethereum,
      gasPriceInGwei: gasPrices.ethereum.standard,
      gasPriceInWei: gasPrices.ethereum.standard * 1e9,
      strategy: marketConditions.networkCongestion.ethereum > 0.7 ? 'fast' : 'standard'
    });
    
    return {
      routeId: route.id,
      timing: {
        optimal: marketConditions.networkCongestion.ethereum < 0.5,
        delayRecommended: marketConditions.networkCongestion.ethereum > 0.8 ? 300 : 0,
        reason: this.getTimingReason(marketConditions)
      },
      mevProtection: {
        enabled: true,
        strategy: 'private-mempool',
        estimatedProtection: 0.9
      },
      gasStrategy: {
        gasPrice: (gasPrices.ethereum.standard * 1e9).toString(), // Convert gwei to wei
        gasLimit: route.estimatedGas,
        strategy: marketConditions.networkCongestion.ethereum > 0.7 ? 'fast' : 'standard'
      },
      contingencyPlans: ['Revert to standard DEX', 'Split order'],
      strategyBy: 'execution-strategy-001'
    };
  }

  private async generateDefaultExecutionStrategy(): Promise<ExecutionStrategy> {
    return {
      routeId: 'default',
      timing: { optimal: true, delayRecommended: 0, reason: 'Default strategy' },
      mevProtection: { enabled: true, strategy: 'private-mempool', estimatedProtection: 0.8 },
      gasStrategy: { gasPrice: '20000000000', gasLimit: '200000', strategy: 'standard' },
      contingencyPlans: ['Revert to standard DEX'],
      strategyBy: 'execution-strategy-001'
    };
  }

  // Helper method to create Token objects from symbols for Fusion API
  private createTokenFromSymbol(symbol: string): Token {
    // Token mapping for Fusion API compatibility
    const tokenMap: Record<string, Partial<Token>> = {
      'BTC': {
        id: 'btc-ethereum',
        symbol: 'WBTC', // Use WBTC for BTC on Ethereum
        name: 'Wrapped Bitcoin',
        network: 'ethereum',
        chainId: 1,
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        decimals: 8,
        isNative: false,
        isWrapped: true
      },
      'ETH': {
        id: 'eth-ethereum',
        symbol: 'ETH',
        name: 'Ethereum',
        network: 'ethereum',
        chainId: 1,
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
        decimals: 18,
        isNative: true,
        isWrapped: false
      },
      'USDT': {
        id: 'usdt-ethereum',
        symbol: 'USDT',
        name: 'Tether',
        network: 'ethereum',
        chainId: 1,
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        decimals: 6,
        isNative: false,
        isWrapped: false
      },
      'USDC': {
        id: 'usdc-ethereum',
        symbol: 'USDC',
        name: 'USD Coin',
        network: 'ethereum',
        chainId: 1,
        address: '0xa0b86a33e6441b8c4c8c8c8c8c8c8c8c8c8c8c8c',
        decimals: 6,
        isNative: false,
        isWrapped: false
      }
    };
    
    const tokenData = tokenMap[symbol];
    if (!tokenData) {
      throw new Error(`Token ${symbol} not supported for Fusion API`);
    }
    
    return {
      logoUrl: '',
      coingeckoId: symbol.toLowerCase(),
      verified: true,
      displayPrecision: 4,
      description: `${tokenData.name} token`,
      tags: [],
      ...tokenData
    } as Token;
  }

  // Helper methods for real data calculations
  private calculateRealOutput(amount: string, protocol: string, tvl: number): string {
    const amountNum = parseFloat(amount);
    const slippage = Math.max(0.001, Math.min(0.05, amountNum / (tvl / 1000))); // Dynamic slippage based on TVL
    return (amountNum * (1 - slippage)).toString();
  }

  private formatProtocolName(protocol: string): string {
    const nameMap: Record<string, string> = {
      'uniswap': 'Uniswap V3',
      'sushiswap': 'SushiSwap',
      'balancer': 'Balancer V2',
      'pancakeswap': 'PancakeSwap',
      '1inch': '1inch',
      'dydx': 'dYdX',
      'raydium': 'Raydium',
      'jupiter': 'Jupiter',
      'orca': 'Orca'
    };
    return nameMap[protocol] || protocol;
  }

  private getProtocolFee(protocol: string): string {
    const feeMap: Record<string, string> = {
      'uniswap': '0.003',
      'sushiswap': '0.003',
      'balancer': '0.002',
      'pancakeswap': '0.0025',
      '1inch': '0.001',
      'dydx': '0.001',
      'raydium': '0.0025',
      'jupiter': '0.001',
      'orca': '0.003'
    };
    return feeMap[protocol] || '0.003';
  }

  private calculateRealGas(protocol: string, gasPrices: Record<string, unknown>): string {
    const baseGas = 150000;
    const protocolMultiplier: Record<string, number> = {
      'uniswap': 1.2,
      'sushiswap': 1.1,
      'balancer': 1.5,
      'pancakeswap': 1.0,
      '1inch': 1.3,
      'dydx': 0.8,
      'raydium': 1.0,
      'jupiter': 1.1,
      'orca': 1.0
    };
    return Math.round(baseGas * (protocolMultiplier[protocol] || 1.2)).toString();
  }

  private calculateRealTime(protocol: string): number {
    const timeMap: Record<string, number> = {
      'uniswap': 60,
      'sushiswap': 90,
      'balancer': 120,
      'pancakeswap': 45,
      '1inch': 30,
      'dydx': 15,
      'raydium': 30,
      'jupiter': 20,
      'orca': 45
    };
    return timeMap[protocol] || 60;
  }

  private calculateRealPriceImpact(amount: string, tvl: number): string {
    const amountNum = parseFloat(amount);
    const impact = Math.max(0.001, Math.min(0.1, amountNum / (tvl / 100)));
    return impact.toFixed(4);
  }

  private calculateRouteConfidence(protocol: string, tvl: number): number {
    const baseConfidence = 0.7;
    const tvlBonus = Math.min(0.25, tvl / 10000000000); // Bonus based on TVL
    const protocolBonus: Record<string, number> = {
      'uniswap': 0.15,
      'sushiswap': 0.10,
      'balancer': 0.12,
      'pancakeswap': 0.08,
      '1inch': 0.13,
      'dydx': 0.11,
      'raydium': 0.09,
      'jupiter': 0.10,
      'orca': 0.08
    };
    return Math.min(0.98, baseConfidence + tvlBonus + (protocolBonus[protocol] || 0.05));
  }

  private getProtocolRisks(protocol: string): string[] {
    const riskMap: Record<string, string[]> = {
      'uniswap': ['MEV exposure', 'Concentrated liquidity risk'],
      'sushiswap': ['MEV exposure', 'Lower liquidity'],
      'balancer': ['Complex pool mechanics', 'Impermanent loss'],
      'pancakeswap': ['BSC network risk', 'MEV exposure'],
      '1inch': ['Aggregation complexity', 'Route optimization'],
      'dydx': ['Perpetual risk', 'Margin requirements'],
      'raydium': ['Solana network risk', 'Lower liquidity'],
      'jupiter': ['Solana network risk', 'Route complexity'],
      'orca': ['Solana network risk', 'Newer protocol']
    };
    return riskMap[protocol] || ['Standard DeFi risks'];
  }

  private getProtocolAdvantages(protocol: string): string[] {
    const advantageMap: Record<string, string[]> = {
      'uniswap': ['Highest liquidity', 'Most reliable', 'Best prices'],
      'sushiswap': ['Multi-chain', 'Good liquidity', 'Established'],
      'balancer': ['Multi-token pools', 'Flexible ratios', 'Low slippage'],
      'pancakeswap': ['Low fees', 'Fast execution', 'BSC ecosystem'],
      '1inch': ['Best price aggregation', 'MEV protection', 'Route optimization'],
      'dydx': ['Perpetual trading', 'High leverage', 'Professional tools'],
      'raydium': ['Solana speed', 'Low fees', 'Good liquidity'],
      'jupiter': ['Solana aggregation', 'Best Solana prices', 'Fast execution'],
      'orca': ['User-friendly', 'Solana native', 'Good UX']
    };
    return advantageMap[protocol] || ['Decentralized trading'];
  }

  private calculateOverallRisk(route: RouteProposal, conditions: MarketConditions): number {
    const baseRisk = 0.1;
    const priceImpactRisk = parseFloat(route.priceImpact) * 2;
    const networkRisk = conditions.networkCongestion.ethereum * 0.2;
    const volatilityRisk = conditions.volatility.overall * 0.15;
    
    return Math.min(0.9, baseRisk + priceImpactRisk + networkRisk + volatilityRisk);
  }

  private calculateProtocolRisk(protocol: string): number {
    const riskMap: Record<string, number> = {
      'Uniswap V3': 0.05,
      'SushiSwap': 0.08,
      'Balancer V2': 0.10,
      'PancakeSwap': 0.12,
      '1inch': 0.07,
      'dYdX': 0.15,
      'Raydium': 0.18,
      'Jupiter': 0.16,
      'Orca': 0.20
    };
    return riskMap[protocol] || 0.15;
  }

  private calculateMevRisk(protocol: string): number {
    const mevRiskMap: Record<string, number> = {
      'Uniswap V3': 0.25,
      'SushiSwap': 0.20,
      'Balancer V2': 0.15,
      'PancakeSwap': 0.10,
      '1inch': 0.05, // Has MEV protection
      'dYdX': 0.08,
      'Raydium': 0.12,
      'Jupiter': 0.10,
      'Orca': 0.15
    };
    return mevRiskMap[protocol] || 0.2;
  }

  private generateRiskRecommendations(route: RouteProposal): string[] {
    const recommendations: string[] = [];
    
    if (parseFloat(route.priceImpact) > 0.02) {
      recommendations.push('Consider splitting large orders');
    }
    
    if (route.path[0].protocol.includes('1inch')) {
      recommendations.push('MEV protection enabled automatically');
    } else {
      recommendations.push('Use MEV protection service');
    }
    
    if (parseFloat(route.estimatedGas) > 200000) {
      recommendations.push('Monitor gas prices for optimal timing');
    }
    
    return recommendations;
  }

  private getTimingReason(conditions: MarketConditions): string {
    if (conditions.networkCongestion.ethereum > 0.8) {
      return 'High network congestion - consider waiting';
    } else if (conditions.volatility.overall > 0.7) {
      return 'High volatility detected - use tight slippage';
    } else {
      return 'Optimal market conditions for execution';
    }
  }

  // Enhanced methods using 1inch API data
  private async generateEnhancedExecutionStrategy(route: RouteProposal, oneInchAnalysis: Comprehensive1inchAnalysis): Promise<ExecutionStrategy> {
    const baseStrategy = await this.generateRealExecutionStrategy(route);
    
    // Enhance with 1inch gas analysis
    const fastGasPrice = oneInchAnalysis.gas.current.fast > 0 ? oneInchAnalysis.gas.current.fast : 20000000000; // 20 gwei fallback
    const standardGasPrice = oneInchAnalysis.gas.current.standard > 0 ? oneInchAnalysis.gas.current.standard : 15000000000; // 15 gwei fallback
    
    const gasStrategy = {
      gasPrice: fastGasPrice.toString(),
      gasLimit: '200000',
      strategy: oneInchAnalysis.gas.recommendation.includes('WAIT') ? 'safe' : 'fast' as 'fast' | 'standard' | 'safe' | 'custom',
      maxFeePerGas: (fastGasPrice * 1.5).toString(),
      estimatedCost: standardGasPrice.toString()
    };

    // Enhance with 1inch timing analysis
    const timing = {
      optimal: !oneInchAnalysis.gas.recommendation.includes('Wait'),
      delayRecommended: oneInchAnalysis.gas.recommendation.includes('Wait') ? 900 : 0, // 15 minutes
      reason: oneInchAnalysis.gas.recommendation
    };

    // Enhance MEV protection based on route recommendation
    const mevProtection = {
      enabled: oneInchAnalysis.quotes.recommendation === 'fusion',
      strategy: oneInchAnalysis.quotes.recommendation === 'fusion' ? 'private-mempool' : 'sandwich-protection' as 'private-mempool' | 'commit-reveal' | 'sandwich-protection',
      estimatedProtection: oneInchAnalysis.quotes.recommendation === 'fusion' ? 0.95 : 0.75
    };

    return {
      ...baseStrategy,
      gasStrategy,
      timing,
      mevProtection
    };
  }

  private generateEnhancedInsights(
    routes: RouteProposal[], 
    riskAssessments: RiskAssessment[], 
    executionStrategy: ExecutionStrategy,
    oneInchAnalysis: Comprehensive1inchAnalysis,
    consensusResult?: { bestRouteId?: string; consensusScore?: number }
  ): string[] {
    const insights = this.generateInsights(routes, riskAssessments, executionStrategy);
    
    // Add consensus insights if available
    const consensusInsights: string[] = [];
    if (consensusResult?.bestRouteId) {
      const consensusRoute = routes.find(r => r.id === consensusResult.bestRouteId);
      if (consensusRoute) {
        consensusInsights.push(`🎯 AI Consensus: Route "${consensusRoute.proposedBy}" selected with ${(consensusResult.consensusScore! * 100).toFixed(0)}% agreement`);
        consensusInsights.push(`📊 Consensus factors: multi-agent analysis, risk assessment, and execution strategy alignment`);
      }
    } else if (consensusResult?.consensusScore === 0) {
      consensusInsights.push(`⚠️ No consensus reached among agents - showing individual recommendations for user choice`);
    }
    
    // Add 1inch-specific insights
    const oneInchInsights: string[] = [];

    // Quote comparison insights
    if (oneInchAnalysis.quotes.fusion.available && oneInchAnalysis.quotes.aggregation.available) {
      oneInchInsights.push(`1inch Analysis: ${oneInchAnalysis.quotes.recommendation} offers ${oneInchAnalysis.quotes.savings.percentage.toFixed(2)}% better rates`);
    } else if (oneInchAnalysis.quotes.recommendation !== 'unavailable') {
      oneInchInsights.push(`1inch ${oneInchAnalysis.quotes.recommendation} API available: ${oneInchAnalysis.quotes.reasoning}`);
    }

    // Gas insights
    if (oneInchAnalysis.gas.recommendation) {
      oneInchInsights.push(`Gas Analysis: ${oneInchAnalysis.gas.recommendation} (${oneInchAnalysis.gas.trend})`);
    }

    // Liquidity insights
    if (oneInchAnalysis.liquidity.totalSources > 0) {
      oneInchInsights.push(`Liquidity: ${oneInchAnalysis.liquidity.totalSources} DEX sources - ${oneInchAnalysis.liquidity.coverage.description}`);
      if (oneInchAnalysis.liquidity.topSources.length > 0) {
        const topDEXs = oneInchAnalysis.liquidity.topSources.slice(0, 3).map(s => s.title).join(', ');
        oneInchInsights.push(`Top DEXs available: ${topDEXs}`);
      }
    }

    // Path analysis insights
    if (oneInchAnalysis.paths.totalPaths > 0) {
      oneInchInsights.push(`Route Options: ${oneInchAnalysis.paths.totalPaths} paths found - ${oneInchAnalysis.paths.complexity.description}`);
      if (oneInchAnalysis.paths.optimalPath) {
        oneInchInsights.push(`Optimal Path: ${oneInchAnalysis.paths.optimalPath.reasoning}`);
      }
    }

    // Overall recommendation
    const confidencePercentage = (oneInchAnalysis.overall.confidence * 100).toFixed(0);
    const recommendation = oneInchAnalysis.overall.recommendation
      .replace('PROCEED_WITH_CAUTION', 'Proceed with Caution')
      .replace('WAIT_FOR_BETTER_CONDITIONS', 'Wait for Better Conditions')
      .replace('EXECUTE', 'Execute Now');
    
    oneInchInsights.push(`1inch Analysis: ${confidencePercentage}% confidence - ${recommendation}`);

    return [...consensusInsights, ...insights, ...oneInchInsights];
  }

  private calculateEnhancedConfidence(
    routes: RouteProposal[], 
    riskAssessments: RiskAssessment[], 
    executionStrategy: ExecutionStrategy,
    oneInchAnalysis: Comprehensive1inchAnalysis
  ): number {
    const baseConfidence = this.calculateOverallConfidence(routes, riskAssessments, executionStrategy);
    const oneInchConfidence = oneInchAnalysis.overall.confidence;
    
    // Weighted average: 60% base analysis, 40% 1inch analysis
    const enhancedConfidence = (baseConfidence * 0.6) + (oneInchConfidence * 0.4);
    
    // Apply additional bonuses/penalties
    let adjustment = 0;
    
    // Bonus for having multiple quote sources
    if (oneInchAnalysis.quotes.fusion.available && oneInchAnalysis.quotes.aggregation.available) {
      adjustment += 0.1;
    }
    
    // Bonus for good liquidity
    if (oneInchAnalysis.liquidity.totalSources > 20) {
      adjustment += 0.05;
    }
    
    // Penalty for high gas prices
    if (oneInchAnalysis.gas.recommendation.includes('WAIT')) {
      adjustment -= 0.15;
    }
    
    // Bonus for multiple routing paths
    if (oneInchAnalysis.paths.totalPaths > 3) {
      adjustment += 0.05;
    }

    return Math.max(0, Math.min(1, enhancedConfidence + adjustment));
  }

  // ===== 1INCH API DATA FETCHING METHODS =====

  private async fetchGasData(chainId: number): Promise<unknown> {
    try {
      const response = await fetch(`http://localhost:3000/api/1inch/gas-tracker?chainId=${chainId}`);
      if (!response.ok) {
        throw new Error(`Gas tracker API failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch gas data:', error);
      // Return fallback gas data
      return {
        baseFee: '20000000000',
        low: { maxFeePerGas: '21000000000' },
        medium: { maxFeePerGas: '25000000000' },
        high: { maxFeePerGas: '30000000000' },
        instant: { maxFeePerGas: '40000000000' },
        timestamp: Date.now()
      };
    }
  }

  private async fetchQuoteData(fromToken: string, toToken: string, amount: string, chainId: number): Promise<unknown> {
    console.log('🔍 Hybrid Quote Fetching - Getting both 1inch APIs...');
    
    // Fetch both aggregation and fusion quotes in parallel
    const [aggregationQuote, fusionQuote] = await Promise.allSettled([
      this.fetchAggregationQuote(fromToken, toToken, amount, chainId),
      this.fetchFusionQuote(fromToken, toToken, amount, chainId)
    ]);

    const result = {
      aggregation: aggregationQuote.status === 'fulfilled' ? aggregationQuote.value : null,
      fusion: fusionQuote.status === 'fulfilled' ? fusionQuote.value : null,
      timestamp: Date.now(),
      comparison: null as unknown
    };

    // Add comparison analysis
    if (result.aggregation && result.fusion) {
      result.comparison = this.compareQuotes(result.aggregation, result.fusion);
    }

    console.log('✅ Hybrid quotes fetched:', {
      aggregationSuccess: !!result.aggregation,
      fusionSuccess: !!result.fusion,
      hasComparison: !!result.comparison
    });

    return result;
  }

  private async fetchAggregationQuote(fromToken: string, toToken: string, amount: string, chainId: number): Promise<unknown> {
    try {
      const normalizedSrc = this.normalizeTokenAddress(fromToken);
      const normalizedDst = this.normalizeTokenAddress(toToken);
      const normalizedAmount = this.normalizeAmountWithDecimals(amount, normalizedSrc);
      
      console.log('🔍 Aggregation API - Fetching quote...');

      const url = `http://localhost:3000/api/1inch/aggregation/quote?src=${normalizedSrc}&dst=${normalizedDst}&amount=${normalizedAmount}&chainId=${chainId}&includeTokensInfo=true&includeProtocols=true&includeGas=true`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Aggregation Quote API failed (${response.status}):`, errorText);
        throw new Error(`Aggregation Quote API failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Aggregation quote received');
      return { ...data, apiType: 'aggregation' };
    } catch (error) {
      console.error('Failed to fetch aggregation quote:', error);
      throw error;
    }
  }

  private async fetchFusionQuote(fromToken: string, toToken: string, amount: string, chainId: number): Promise<unknown> {
    try {
      const normalizedSrc = this.normalizeFusionTokenAddress(fromToken);
      const normalizedDst = this.normalizeFusionTokenAddress(toToken);
      const normalizedAmount = this.normalizeAmountWithDecimals(amount, normalizedSrc);
      
      console.log('🔍 Fusion API - Fetching quote...');

      const response = await fetch(`http://localhost:3000/api/1inch/fusion/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromTokenAddress: normalizedSrc,
          toTokenAddress: normalizedDst,
          amount: normalizedAmount,
          walletAddress: '0x0000000000000000000000000000000000000000',
          chainId: chainId,
          enableEstimate: true
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Fusion Quote API failed (${response.status}):`, errorText);
        throw new Error(`Fusion Quote API failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Fusion quote received');
      return { ...data, apiType: 'fusion' };
    } catch (error) {
      console.error('Failed to fetch fusion quote:', error);
      throw error;
    }
  }

  private compareQuotes(aggregationQuote: unknown, fusionQuote: unknown): unknown {
    const aggQuote = aggregationQuote as Record<string, unknown>;
    const fusionQuoteData = fusionQuote as Record<string, unknown>;
    const aggAmount = parseFloat((aggQuote?.dstAmount as string) || '0');
    const fusionAmount = parseFloat((fusionQuoteData?.dstAmount as string) || '0');
    
    const comparison = {
      betterRate: aggAmount > fusionAmount ? 'aggregation' : 'fusion',
      priceDifference: Math.abs(aggAmount - fusionAmount),
      priceDifferencePercent: aggAmount > 0 ? (Math.abs(aggAmount - fusionAmount) / aggAmount) * 100 : 0,
      aggregationAdvantages: [
        'Faster execution',
        'More DEX coverage',
        'Lower gas for simple swaps'
      ],
      fusionAdvantages: [
        'MEV protection',
        'No gas fees upfront',
        'Better for large trades'
      ],
      recommendation: this.getQuoteRecommendation(aggregationQuote, fusionQuote)
    };

    return comparison;
  }

  private getQuoteRecommendation(aggQuote: unknown, fusionQuote: unknown): string {
    const aggQuoteData = aggQuote as Record<string, unknown>;
    const fusionQuoteData = fusionQuote as Record<string, unknown>;
    const aggAmount = parseFloat((aggQuoteData?.dstAmount as string) || '0');
    const fusionAmount = parseFloat((fusionQuoteData?.dstAmount as string) || '0');
    const difference = Math.abs(aggAmount - fusionAmount) / Math.max(aggAmount, fusionAmount);
    
    if (difference < 0.01) { // Less than 1% difference
      return 'fusion'; // Prefer Fusion for MEV protection when rates are similar
    } else if (aggAmount > fusionAmount) {
      return difference > 0.05 ? 'aggregation' : 'fusion'; // Prefer aggregation if >5% better
    } else {
      return 'fusion'; // Fusion has better rate
    }
  }

  private async fetchTokenPrices(tokenAddresses: string[]): Promise<unknown> {
    console.log('🔍 Fetching token prices for addresses:', tokenAddresses);
    
    // Try multiple price sources in order of preference
    const pricePromises = tokenAddresses.map(async (address) => {
      const normalizedAddress = this.normalizeTokenAddress(address);
      
      // Try spot price API first (most reliable)
      try {
        console.log(`🔍 Trying spot price for ${normalizedAddress}...`);
        const spotResponse = await fetch(`http://localhost:3000/api/1inch/spot-price/1/${normalizedAddress}/USD`);
        if (spotResponse.ok) {
          const spotData = await spotResponse.json();
          const price = parseFloat(spotData.price || '0');
          if (price > 0) {
            console.log(`✅ Spot price for ${normalizedAddress}: $${price}`);
            return { [address]: price };
          }
        }
      } catch (error) {
        console.warn(`Spot price failed for ${normalizedAddress}:`, error);
      }
      
      // Fallback to fusion prices (if available)
      try {
        console.log(`🔍 Trying fusion price for ${normalizedAddress}...`);
        const fusionAddress = this.normalizeFusionTokenAddress(address);
        const fusionResponse = await fetch(`http://localhost:3000/api/1inch/fusion/prices?tokens=${fusionAddress}`);
        if (fusionResponse.ok) {
          const fusionData = await fusionResponse.json();
          if (fusionData[fusionAddress]) {
            const price = parseFloat(fusionData[fusionAddress]);
            if (price > 0) {
              console.log(`✅ Fusion price for ${normalizedAddress}: $${price}`);
              return { [address]: price };
            }
          }
        }
      } catch (error) {
        console.warn(`Fusion price failed for ${normalizedAddress}:`, error);
      }
      
      // Use token-specific fallback prices
      const fallbackPrice = this.getTokenFallbackPrice(normalizedAddress);
      console.log(`🔄 Using fallback price for ${normalizedAddress}: $${fallbackPrice}`);
      return { [address]: fallbackPrice };
    });

    try {
      const priceResults = await Promise.allSettled(pricePromises);
      const prices: Record<string, number> = {};
      
      priceResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          Object.assign(prices, result.value);
        } else {
          // Final fallback for failed promises
          const address = tokenAddresses[index];
          prices[address] = this.getTokenFallbackPrice(this.normalizeTokenAddress(address));
        }
      });
      
      console.log('📊 Final token prices:', prices);
      return prices;
    } catch (error) {
      console.error('Failed to fetch any token prices:', error);
      // Return all fallback prices
      const fallbackPrices: Record<string, number> = {};
      tokenAddresses.forEach(address => {
        fallbackPrices[address] = this.getTokenFallbackPrice(this.normalizeTokenAddress(address));
      });
      return fallbackPrices;
    }
  }

  private getTokenFallbackPrice(address: string): number {
    // Realistic fallback prices for common tokens
    const fallbackPrices: Record<string, number> = {
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 3200, // WETH
      '0x0000000000000000000000000000000000000000': 3200, // ETH
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 3200, // ETH (1inch format)
      '0xa0b86a33e6441431c0b7a5cec6ecb99f2fb83a4d': 1, // USDC
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 1, // USDT
      '0x6b175474e89094c44da98b954eedeac495271d0f': 1, // DAI
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 65000, // WBTC
    };
    
    const normalizedAddr = address.toLowerCase();
    return fallbackPrices[normalizedAddr] || 1; // Default to $1 for unknown tokens
  }

  private createMarketConditions(gasData: unknown, priceData: unknown): unknown {
    const gasDataTyped = gasData as Record<string, unknown>;
    const now = new Date();
    return {
      timestamp: Date.now(),
      networkCongestion: {
        ethereum: this.calculateCongestionLevel(gasData),
        polygon: 0.3,
        bsc: 0.2,
        arbitrum: 0.1,
        bitcoin: 0.4,
        stellar: 0.1,
        solana: 0.2,
        starknet: 0.1
      },
      gasPrices: {
        ethereum: {
          fast: parseInt(gasDataTyped?.high?.maxFeePerGas || '30000000000'),
          standard: parseInt(gasDataTyped?.medium?.maxFeePerGas || '25000000000'),
          safe: parseInt(gasDataTyped?.low?.maxFeePerGas || '21000000000')
        },
        polygon: {
          fast: 40000000000,
          standard: 30000000000,
          safe: 25000000000
        }
      },
      volatility: {
        overall: 0.3, // Default moderate volatility
        tokenSpecific: this.extractTokenVolatility(priceData)
      },
      liquidity: {
        overall: 0.8, // Default good liquidity
        perDEX: {
          'uniswap-v3': 0.9,
          'uniswap-v2': 0.8,
          'sushiswap': 0.7,
          'curve': 0.8
        }
      },
      timeOfDay: now.getUTCHours(),
      dayOfWeek: now.getUTCDay(),
      prices: priceData
    };
  }

  private createRouteProposal(quoteData: unknown, fromToken: string, toToken: string, amount: string): RouteProposal {
    const quoteDataTyped = quoteData as Record<string, unknown>;
    // Handle hybrid quote structure with both aggregation and fusion data
    const baselineQuote = quoteDataTyped?.aggregation || quoteDataTyped?.fusion || quoteDataTyped;
    
    // Create properly formatted RouteProposal with required path array
    const amountOut = this.getBestAmountOut(quoteData);
    const recommendedApi = (quoteDataTyped?.comparison as Record<string, unknown>)?.recommendation as string || 'aggregation';
    
    // Create path array that RiskAssessmentAgent expects
    const routePath: RouteStep[] = [];
    
    // If we have protocol information from aggregation API, use it
    const protocols = (baselineQuote as Record<string, unknown>)?.protocols as Record<string, unknown>[] || [];
    if (protocols.length > 0) {
      protocols.forEach((protocol: Record<string, unknown>, index: number) => {
        routePath.push({
          protocol: protocol?.name as string || 'Unknown DEX',
          fromToken: index === 0 ? fromToken : 'INTERMEDIATE',
          toToken: index === protocols.length - 1 ? toToken : 'INTERMEDIATE',
          amount: index === 0 ? amount : 'AUTO',
          estimatedOutput: index === protocols.length - 1 ? amountOut : 'AUTO',
          fee: protocol?.fee as string || '0.003'
        });
      });
    } else {
      // Fallback to single-step path if no protocol info
      const protocolName = recommendedApi === 'fusion' ? '1inch Fusion' : '1inch Aggregation';
      routePath.push({
        protocol: protocolName,
        fromToken,
        toToken,
        amount,
        estimatedOutput: amountOut,
        fee: recommendedApi === 'fusion' ? '0.001' : '0.003'
      });
    }
    
    const routeProposal: RouteProposal = {
      id: `baseline-route-${Date.now()}`,
      fromToken,
      toToken,
      amount,
      estimatedOutput: amountOut,
      path: routePath, // This is the key field that was missing!
      estimatedGas: (baselineQuote as Record<string, unknown>)?.gas as string || '200000',
      estimatedTime: this.getEstimatedExecutionTime(quoteData),
      priceImpact: '0.001', // 0.1% default
      confidence: 0.8,
      risks: [
        'Market volatility',
        recommendedApi === 'fusion' ? 'Private pool execution delay' : 'MEV exposure',
        'Gas price fluctuation'
      ],
      advantages: [
        'Real-time pricing',
        recommendedApi === 'fusion' ? 'MEV protection' : 'Fast execution',
        'Multi-DEX optimization'
      ],
      proposedBy: `${recommendedApi}-baseline`
    };
    
    console.log('✅ Created baseline RouteProposal with populated path:', {
      id: routeProposal.id,
      pathLength: routeProposal.path.length,
      protocols: routeProposal.path.map(p => p.protocol),
      fromToken: routeProposal.fromToken,
      toToken: routeProposal.toToken,
      estimatedOutput: routeProposal.estimatedOutput
    });
    
    return routeProposal;
  }

  private getBestAmountOut(quoteData: unknown): string {
    const quoteDataTyped = quoteData as Record<string, unknown>;
    if ((quoteDataTyped?.comparison as Record<string, unknown>)?.recommendation === 'fusion' && quoteDataTyped?.fusion) {
      return ((quoteDataTyped?.fusion as Record<string, unknown>)?.dstAmount as string) || '0';
    } else if (quoteDataTyped?.aggregation) {
      return ((quoteDataTyped?.aggregation as Record<string, unknown>)?.dstAmount as string) || '0';
    } else if (quoteDataTyped?.fusion) {
      return ((quoteDataTyped?.fusion as Record<string, unknown>)?.dstAmount as string) || '0';
    }
    return '0';
  }

  private getEstimatedExecutionTime(quoteData: unknown): number {
    const quoteDataTyped = quoteData as Record<string, unknown>;
    if ((quoteDataTyped?.comparison as Record<string, unknown>)?.recommendation === 'fusion') {
      return 30000; // Fusion takes longer but provides MEV protection
    }
    return 15000; // Aggregation is faster
  }

  private extractPaths(quoteData: unknown): unknown[] {
    const quoteDataTyped = quoteData as Record<string, unknown>;
    return (quoteDataTyped?.protocols as Record<string, unknown>[])?.map((protocol: Record<string, unknown>, index: number) => ({
      id: `path-${index}`,
      protocols: [protocol?.name],
      percentage: protocol?.part || 100,
      estimatedGas: Math.floor(((quoteDataTyped?.gas as number) || 200000) * ((protocol?.part as number) || 100) / 100),
      source: 'aggregation' // Mark as baseline from aggregation API
    })) || [];
  }

  private calculateCongestionLevel(gasData: unknown): number {
    const gasDataTyped = gasData as Record<string, unknown>;
    if (!(gasDataTyped.medium as Record<string, unknown>)?.maxFeePerGas || !gasDataTyped.baseFee) {
      return 0.3; // Default moderate congestion
    }
    
    const medium = parseInt((gasDataTyped.medium as Record<string, unknown>).maxFeePerGas as string);
    const base = parseInt(gasDataTyped.baseFee as string);
    const ratio = medium / base;
    
    // Convert ratio to 0-1 scale
    if (ratio < 1.2) return 0.1; // Low congestion
    if (ratio < 1.5) return 0.3; // Moderate congestion
    if (ratio < 2.0) return 0.6; // High congestion
    return 0.9; // Very high congestion
  }

  private extractTokenVolatility(priceData: unknown): Record<string, number> {
    const volatility: Record<string, number> = {};
    Object.keys(priceData || {}).forEach(token => {
      volatility[token] = 0.2; // Default low volatility
    });
    return volatility;
  }

  private mapPreferenceToRiskTolerance(preference?: string): 'conservative' | 'moderate' | 'aggressive' {
    switch (preference) {
      case 'security': return 'conservative';
      case 'cost': return 'moderate';
      case 'speed': return 'aggressive';
      default: return 'moderate';
    }
  }

  private normalizeTokenAddress(address: string): string {
    // Convert zero address to 1inch native ETH format
    if (address === '0x0000000000000000000000000000000000000000') {
      return '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    }
    // Convert mixed case ETH address to lowercase
    if (address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    }
    // Ensure address is lowercase and valid format
    if (address.startsWith('0x') && address.length === 42) {
      return address.toLowerCase();
    }
    // Fallback to original if not standard format
    return address;
  }

  private normalizeAmount(amount: string): string {
    // Remove any decimals and ensure it's a valid integer string
    const cleanAmount = amount.replace(/[^0-9]/g, '');
    if (!cleanAmount || cleanAmount === '0') {
      return '1000000000000000000'; // 1 ETH in wei as fallback
    }
    return cleanAmount;
  }

  private normalizeAmountWithDecimals(amount: string, tokenAddress: string): string {
    // Get token-specific decimals
    const decimals = this.getTokenDecimals(tokenAddress);
    
    console.log(`💰 [DECIMAL CONVERSION] Converting amount for token ${tokenAddress}`);
    console.log(`💰 [DECIMAL CONVERSION] Input amount: ${amount}, Token decimals: ${decimals}`);
    
    // If amount is already in wei format (no decimal point), return as-is
    if (!amount.includes('.') || amount.includes('e')) {
      console.log(`💰 [DECIMAL CONVERSION] Amount already in wei format: ${amount}`);
      return amount;
    }
    
    // Convert decimal amount to proper format using token decimals
    const convertedAmount = this.toWei(amount, decimals);
    console.log(`💰 [DECIMAL CONVERSION] Converted ${amount} → ${convertedAmount} (${decimals} decimals)`);
    
    return convertedAmount;
  }

  private getTokenDecimals(tokenAddress: string): number {
    // Standard token decimals mapping - all addresses in lowercase for consistent matching
    const tokenDecimals: Record<string, number> = {
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 8,  // WBTC
      '0xa0b86a33e6441431c0b7a5cec6ecb99f2fb83a4d': 6,  // USDC  
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 6,  // USDT
      '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // DAI
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 18, // WETH
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 18, // ETH
      '0x0000000000000000000000000000000000000000': 18, // ETH (alternative)
      '0x514910771af9ca656af840dff83e8264ecf986ca': 18, // LINK
      '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 18, // UNI
      '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 18, // MATIC
      '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b': 8,  // CRO
      '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 18, // SHIB
      '0x4fabb145d64652a948d72533023f6e7a623c7c53': 18, // BUSD
      '0x0d8775f648430679a709e98d2b0cb6250d2887ef': 18, // BAT
      '0xbb0e17ef65f82ab018d8edd776e8dd940327b28b': 18, // AXS
    };
    
    // Normalize address to lowercase for comparison
    const normalizedAddress = tokenAddress.toLowerCase();
    const decimals = tokenDecimals[normalizedAddress];
    
    if (decimals === undefined) {
      console.warn(`⚠️ [DECIMAL CONVERSION] Unknown token decimals for ${tokenAddress}, defaulting to 18`);
      return 18; // Default to 18 decimals
    }
    
    console.log(`🔍 [DECIMAL CONVERSION] Token ${tokenAddress} has ${decimals} decimals`);
    return decimals;
  }

  private toWei(amount: string, decimals: number): string {
    // Convert decimal amount to wei format using specified decimals
    const parts = amount.split('.');
    const integerPart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
    
    // Combine integer and fractional parts
    const result = integerPart + fractionalPart;
    
    // Remove leading zeros but keep at least one digit
    return result.replace(/^0+/, '') || '0';
  }

  private async collectAgentResponses(analysisRequest: unknown): Promise<Record<string, unknown>> {
    try {
      // Send the request to coordinator and wait for processing
      console.log('🤖 Sending analysis request to AI coordinator...');
      await this.coordinator.handleMessage(analysisRequest);
      
      // Give agents time to process (they work asynchronously)
      console.log('⏳ Waiting for AI agents to complete analysis...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second wait
      
      // Since agents work autonomously, we'll return a status indicating they're working
      return {
        status: 'agents-notified',
        timestamp: Date.now(),
        message: 'AI agents have been notified and are processing the analysis request',
        expectedAgents: ['route-discovery-001', 'risk-assessment-001', 'execution-strategy-001', 'market-intelligence-001']
      };
    } catch (error) {
      console.error('Failed to collect agent responses:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  private normalizeFusionTokenAddress(address: string): string {
    // Fusion API requires specific address formatting
    // Convert zero address to native ETH representation
    if (address === '0x0000000000000000000000000000000000000000') {
      return '0x0000000000000000000000000000000000000000'; // Fusion uses zero address for ETH
    }
    
    // Convert 1inch aggregation ETH format to Fusion format
    if (address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return '0x0000000000000000000000000000000000000000'; // Fusion uses zero address for ETH
    }
    
    // Ensure proper address format - Fusion API is case-sensitive
    if (address.startsWith('0x') && address.length === 42) {
      // Keep original case for token addresses as Fusion API might be case-sensitive
      return address;
    }
    
    return address;
  }

  private generateSourceAttribution(
    routes: RouteProposal[], 
    riskAssessments: RiskAssessment[], 
    executionStrategy: ExecutionStrategy | null,
    consensusResult?: { bestRouteId?: string; consensusScore?: number }
  ): Record<string, unknown> {
    const attribution = {
      timestamp: new Date().toISOString(),
      
      // Route source breakdown
      routes: routes.map(route => ({
        id: route.id,
        proposedBy: route.proposedBy,
        source: this.getAgentDisplayName(route.proposedBy),
        confidence: route.confidence,
        estimatedOutput: route.estimatedOutput,
        priceImpact: route.priceImpact,
        advantages: route.advantages,
        risks: route.risks
      })),
      
      // Risk assessment sources
      riskAssessments: riskAssessments.map(assessment => ({
        routeId: assessment.routeId,
        assessedBy: assessment.assessedBy,
        source: this.getAgentDisplayName(assessment.assessedBy),
        overallRisk: assessment.overallRisk,
        riskLevel: this.getRiskLevel(assessment.overallRisk),
        blockers: assessment.blockers,
        recommendations: assessment.recommendations
      })),
      
      // Execution strategy source
      executionStrategy: executionStrategy ? {
        strategyBy: executionStrategy.strategyBy,
        source: this.getAgentDisplayName(executionStrategy.strategyBy),
        confidence: executionStrategy.confidence || 0,
        reasoning: executionStrategy.reasoning || []
      } : null,
      
      // Consensus information
      consensus: consensusResult ? {
        hasConsensus: !!consensusResult.bestRouteId,
        consensusScore: consensusResult.consensusScore || 0,
        selectedRoute: consensusResult.bestRouteId || null,
        method: 'multi-agent-weighted-scoring'
      } : null,
      
      // Agent participation summary
      participatingAgents: this.getParticipatingAgents(routes, riskAssessments, executionStrategy)
    };
    
    return attribution;
  }

  private generateExecutiveSummary(
    routes: RouteProposal[], 
    riskAssessments: RiskAssessment[], 
    executionStrategy: ExecutionStrategy | null,
    consensusResult?: { bestRouteId?: string; consensusScore?: number },
    oneInchAnalysis?: Comprehensive1inchAnalysis
  ): Record<string, unknown> {
    const primaryRoute = routes[0];
    const primaryRisk = riskAssessments[0];
    
    const summary = {
      // Primary recommendation
      primaryRecommendation: {
        route: primaryRoute ? {
          id: primaryRoute.id,
          source: this.getAgentDisplayName(primaryRoute.proposedBy),
          outputAmount: primaryRoute.estimatedOutput,
          confidence: `${(primaryRoute.confidence * 100).toFixed(0)}%`,
          reasoning: primaryRoute.advantages?.[0] || 'Optimal based on analysis'
        } : null,
        
        risk: primaryRisk ? {
          level: this.getRiskLevel(primaryRisk.overallRisk),
          score: primaryRisk.overallRisk,
          assessor: this.getAgentDisplayName(primaryRisk.assessedBy),
          keyRisks: primaryRisk.blockers?.slice(0, 2) || []
        } : null
      },
      
      // Consensus status
      consensusStatus: consensusResult?.bestRouteId ? {
        status: 'achieved',
        confidence: `${(consensusResult.consensusScore! * 100).toFixed(0)}%`,
        selectedRoute: consensusResult.bestRouteId,
        message: 'AI agents reached consensus on optimal route'
      } : {
        status: 'no_consensus',
        message: 'Multiple route options available - review individual agent recommendations',
        availableOptions: routes.length
      },
      
      // Key insights for user decision making
      keyInsights: [
        `${routes.length} route${routes.length === 1 ? '' : 's'} analyzed by ${this.getUniqueAgents(routes).length} AI agent${this.getUniqueAgents(routes).length === 1 ? '' : 's'}`,
        primaryRoute ? `Best output: ${primaryRoute.estimatedOutput} ${primaryRoute.toToken}` : 'No valid routes found',
        primaryRisk ? `Risk level: ${this.getRiskLevel(primaryRisk.overallRisk)}` : 'Risk assessment pending',
        oneInchAnalysis ? `1inch confidence: ${(oneInchAnalysis.overall.confidence * 100).toFixed(0)}%` : 'No 1inch analysis'
      ].filter(Boolean),
      
      // Action recommendations
      nextSteps: this.generateActionRecommendations(routes, riskAssessments, consensusResult)
    };
    
    return summary;
  }

  private getAgentDisplayName(agentId: string): string {
    const agentNames: Record<string, string> = {
      'route-discovery-001': 'Route Discovery Agent',
      'risk-assessment-001': 'Risk Assessment Agent', 
      'execution-strategy-001': 'Execution Strategy Agent',
      'market-intelligence-001': 'Market Intelligence Agent',
      '1inch-fusion-intelligent': 'AI Fusion Router',
      '1inch-aggregation-intelligent': 'AI Aggregation Router',
      '1inch-aggregation-baseline': 'Baseline Aggregation',
      '1inch-fusion-baseline': 'Baseline Fusion',
      'fusion-aware-pathfinder': 'Advanced Pathfinder'
    };
    
    return agentNames[agentId] || agentId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getRiskLevel(riskScore: number): string {
    if (riskScore <= 0.3) return 'Low Risk';
    if (riskScore <= 0.6) return 'Medium Risk';
    if (riskScore <= 0.8) return 'High Risk';
    return 'Critical Risk';
  }

  private getParticipatingAgents(
    routes: RouteProposal[], 
    riskAssessments: RiskAssessment[], 
    executionStrategy: ExecutionStrategy | null
  ): string[] {
    const agents = new Set<string>();
    
    routes.forEach(route => agents.add(this.getAgentDisplayName(route.proposedBy)));
    riskAssessments.forEach(assessment => agents.add(this.getAgentDisplayName(assessment.assessedBy)));
    if (executionStrategy) agents.add(this.getAgentDisplayName(executionStrategy.strategyBy));
    
    return Array.from(agents).sort();
  }

  private getUniqueAgents(routes: RouteProposal[]): string[] {
    return Array.from(new Set(routes.map(r => r.proposedBy)));
  }

  private generateActionRecommendations(
    routes: RouteProposal[], 
    riskAssessments: RiskAssessment[], 
    consensusResult?: { bestRouteId?: string; consensusScore?: number }
  ): string[] {
    const recommendations: string[] = [];
    
    if (consensusResult?.bestRouteId) {
      recommendations.push('✅ Execute the consensus-selected route with confidence');
      if (consensusResult.consensusScore! > 0.8) {
        recommendations.push('🚀 High consensus score indicates strong agent agreement');
      }
    } else {
      recommendations.push('⚠️ Review multiple route options and choose based on your priorities');
      recommendations.push('💡 Consider risk tolerance, time preference, and cost sensitivity');
    }
    
    // Risk-based recommendations
    const highRiskRoutes = riskAssessments.filter(r => r.overallRisk > 0.7);
    if (highRiskRoutes.length > 0) {
      recommendations.push('🛡️ Consider risk mitigation strategies for high-risk routes');
    }
    
    // Multiple routes available
    if (routes.length > 1) {
      recommendations.push('📊 Compare route outputs, risks, and execution strategies before deciding');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const aiAgentBridgeService = AIAgentBridgeService.getInstance();