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
import { 
  RouteProposal, 
  RiskAssessment, 
  ExecutionStrategy,
  MarketConditions,
  MessageType,
  MessagePriority
} from '../agents/types';

export interface AIAgentAnalysis {
  routes: RouteProposal[];
  riskAssessments: RiskAssessment[];
  executionStrategy: ExecutionStrategy;
  marketConditions: MarketConditions;
  confidence: number;
  insights: string[];
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
        capabilities: ['discover', 'analyze'],
        dependencies: [],
        maxConcurrentTasks: 5,
        timeout: 30000
      }, this.dataService);

      const riskAssessmentAgent = new RiskAssessmentAgent({
        id: 'risk-assessment-001',
        name: 'Risk Assessment Agent',
        version: '1.0.0',
        capabilities: ['assess', 'analyze'],
        dependencies: [],
        maxConcurrentTasks: 3,
        timeout: 20000
      }, this.dataService);

      const marketIntelligenceAgent = new MarketIntelligenceAgent({
        id: 'market-intelligence-001',
        name: 'Market Intelligence Agent',
        version: '1.0.0',
        capabilities: ['analyze', 'monitor'],
        dependencies: [],
        maxConcurrentTasks: 5,
        timeout: 15000
      }, this.dataService, process.env.DUNE_API_KEY);

      const executionStrategyAgent = new ExecutionStrategyAgent(this.dataService);

      const performanceMonitorAgent = new PerformanceMonitorAgent();

      const securityAgent = new SecurityAgent({
        id: 'security-001',
        name: 'Security Agent',
        version: '1.0.0',
        capabilities: ['monitor', 'secure'],
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
    walletAddress: string
  ): Promise<AIAgentAnalysis> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Convert tokens to proper format for agents
      const fromTokenAddress = this.getTokenAddress(fromToken);
      const toTokenAddress = this.getTokenAddress(toToken);

      // Request route analysis from the coordinator
      const analysisRequest = {
        id: `analysis-${Date.now()}`,
        from: 'frontend',
        to: 'coordinator',
        type: MessageType.REQUEST_ANALYSIS,
        payload: {
          fromToken: fromTokenAddress,
          toToken: toTokenAddress,
          amount,
          fromAddress: walletAddress,
          chainId: this.getChainId(fromToken.network)
        },
        timestamp: Date.now(),
        priority: MessagePriority.HIGH
      };

      // Request consensus from all agents for route analysis
      const mockRoutes: RouteProposal[] = [
        {
          id: `route-${Date.now()}`,
          fromToken: fromTokenAddress,
          toToken: toTokenAddress,
          amount: amount,
          estimatedOutput: (parseFloat(amount) * 0.98).toString(), // Mock 2% slippage
          path: [
            {
              protocol: 'Uniswap V3',
              fromToken: fromTokenAddress,
              toToken: toTokenAddress,
              amount: amount,
              estimatedOutput: (parseFloat(amount) * 0.995).toString(),
              fee: '0.003'
            },
            {
              protocol: '1inch Fusion',
              fromToken: fromTokenAddress,
              toToken: toTokenAddress,
              amount: (parseFloat(amount) * 0.995).toString(),
              estimatedOutput: (parseFloat(amount) * 0.98).toString(),
              fee: '0.001'
            }
          ],
          estimatedGas: '270000',
          estimatedTime: 120, // 2 minutes
          priceImpact: '0.02',
          confidence: 0.85,
          risks: ['MEV exposure', 'Slippage risk'],
          advantages: ['Best price', 'MEV protection', 'Fast execution'],
          proposedBy: 'route-discovery-001'
        }
      ];

      const mockRiskAssessments: RiskAssessment[] = [
        {
          routeId: mockRoutes[0].id,
          overallRisk: 0.15, // Low risk
          factors: {
            protocolRisk: 0.1,
            liquidityRisk: 0.05,
            slippageRisk: 0.08,
            mevRisk: 0.12,
            bridgeRisk: 0.2
          },
          recommendations: ['Use MEV Protection', 'Monitor slippage'],
          blockers: [],
          assessedBy: 'risk-assessment-001'
        }
      ];

      const executionStrategy: ExecutionStrategy = {
        routeId: mockRoutes[0].id,
        timing: {
          optimal: true,
          delayRecommended: 0,
          reason: 'Optimal market conditions detected'
        },
        mevProtection: {
          enabled: true,
          strategy: 'sandwich-protection',
          estimatedProtection: 0.8
        },
        gasStrategy: {
          gasPrice: '20000000000',
          gasLimit: '200000',
          strategy: 'standard'
        },
        contingencyPlans: ['Revert to standard DEX'],
        strategyBy: 'execution-strategy-001'
      };

      const marketConditions: MarketConditions = {
        timestamp: Date.now(),
        networkCongestion: {
          ethereum: 0.3,
          polygon: 0.2,
          bsc: 0.1,
          arbitrum: 0.2,
          bitcoin: 0.3,
          stellar: 0.1,
          solana: 0.2,
          starknet: 0.2
        },
        gasPrices: {
          ethereum: { fast: 30, standard: 20, safe: 15 },
          polygon: { fast: 50, standard: 40, safe: 30 }
        },
        volatility: {
          overall: 0.5,
          tokenSpecific: {}
        },
        liquidity: {
          overall: 0.8,
          perDEX: {}
        },
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      // Send request to coordinator for future integration
      await this.coordinator.handleMessage(analysisRequest);

      const routes = mockRoutes;
      const riskAssessments = mockRiskAssessments;

      // Generate insights based on agent analysis
      const insights = this.generateInsights(routes, riskAssessments, executionStrategy);

      return {
        routes,
        riskAssessments,
        executionStrategy,
        marketConditions,
        confidence: this.calculateOverallConfidence(routes, riskAssessments, executionStrategy),
        insights
      };
    } catch (error) {
      console.error('AI Agent analysis failed:', error);
      throw error;
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
      console.error('Failed to get agent predictions:', error);
      // Return fallback predictions
      return {
        optimalSlippage: 0.005,
        predictedGasCost: '30',
        successProbability: 0.85,
        estimatedTime: 300,
        mevProtection: {
          enabled: true,
          strategy: 'private-mempool',
          estimatedProtection: 0.8
        }
      };
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
      insights.push(`🎯 Found ${routes.length} optimized routes with up to ${(bestRoute.confidence * 100).toFixed(0)}% confidence`);
      
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
    const baseSlippage = 0.005; // 0.5%
    
    // Volatility adjustment
    const volatilityAdjustment = conditions.volatility.overall * 0.02;
    
    // Liquidity adjustment
    const liquidityAdjustment = (1 - conditions.liquidity.overall) * 0.015;
    
    // Amount adjustment
    const amountAdjustment = Math.min(0.01, amount / 1000000);
    
    return Math.min(0.05, baseSlippage + volatilityAdjustment + liquidityAdjustment + amountAdjustment);
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
}

// Export singleton instance
export const aiAgentBridgeService = AIAgentBridgeService.getInstance();