// 🎯 Execution Strategy Agent - MEV protection and timing optimization
// Provides intelligent execution strategies with MEV protection and market timing

import { BaseAgent } from './BaseAgent';
import { 
  AgentMessage,
  ExecutionStrategy,
  MEVProtection,
  GasStrategy,
  TimingStrategy,
  MarketConditions,
  RouteProposal,
  RiskAssessment,
  ExecutionSignal,
  MarketSignal,
  MessageType,
  MessagePriority,
  AgentConfig,
  AgentCapabilities,
  ConsensusRequest,
  ConsensusResponse,
  DecisionScore,
  DecisionCriteria
} from './types';
import { DataAggregationService } from '../services/DataAggregationService';

interface MEVAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  threatTypes: MEVThreatType[];
  protectionRecommendations: MEVProtectionStrategy[];
  estimatedLoss: number; // in USD
  confidence: number;
  reasoning: string[];
}

interface MEVThreatType {
  type: 'sandwich' | 'frontrun' | 'backrun' | 'liquidation' | 'arbitrage';
  probability: number;
  estimatedImpact: number;
  detection: MEVDetection;
}

interface MEVDetection {
  memoryPoolAnalysis: boolean;
  gasPriceSpike: boolean;
  largeOrderDetection: boolean;
  competitorActivity: boolean;
  historicalPatterns: boolean;
}

interface MEVProtectionStrategy {
  strategy: 'private_mempool' | 'commit_reveal' | 'order_splitting' | 'timing_delay' | 'flashloan_protection';
  effectiveness: number; // 0-1
  additionalCost: number; // in USD
  latencyImpact: number; // in seconds
  compatible: boolean; // with current route
}

interface TimingAnalysis {
  optimal: boolean;
  delayRecommended: number; // seconds
  gasOptimization: GasOptimization;
  marketTiming: MarketTiming;
  congestionAnalysis: CongestionAnalysis;
}

interface GasOptimization {
  currentPrice: string;
  predictedOptimal: string;
  waitTimeForOptimal: number; // seconds
  potentialSavings: number; // in USD
  volatility: number;
}

interface MarketTiming {
  volatilityWindow: boolean; // true if in volatile period
  liquidityDepth: number;
  spreadAnalysis: SpreadAnalysis;
  orderBookImbalance: number;
  recommendedDelay: number;
}

interface SpreadAnalysis {
  currentSpread: number;
  averageSpread: number;
  isWidening: boolean;
  predictedNarrowTime: number;
}

interface CongestionAnalysis {
  networkUtilization: number;
  pendingTransactions: number;
  mempoolSize: number;
  estimatedClearTime: number;
  priorityThreshold: string; // gas price needed for fast inclusion
}

interface ExecutionWindow {
  startTime: number;
  endTime: number;
  confidence: number;
  reasoning: string;
  gasEstimate: string;
  slippageEstimate: number;
}

interface OrderSplitStrategy {
  enabled: boolean;
  numberOfParts: number;
  timeBetweenParts: number; // seconds
  randomization: boolean;
  sizeDistribution: number[]; // percentage for each part
  estimatedImprovements: {
    slippageReduction: number;
    mevReduction: number;
    totalCostReduction: number;
  };
}

// 📊 Execution Outcome Tracking for Continuous Learning
interface ExecutionOutcome {
  strategyId: string;
  routeId: string;
  timestamp: number;
  actualResults: {
    executionSuccess: boolean;
    actualSlippage: number;
    actualGasCost: string;
    actualExecutionTime: number;
    mevDetected: boolean;
    mevType?: 'sandwich' | 'frontrun' | 'backrun' | 'liquidation';
    mevImpact?: number; // USD lost to MEV
    protectionEffectiveness?: number; // 0-1
  };
  predictions: {
    routeId?: string;
    expectedSlippage: number;
    expectedGasCost: string;
    expectedExecutionTime: number;
    mevRiskLevel: string;
    confidenceScore: number;
  };
  deltas: {
    slippageDelta: number;
    gasDelta: number;
    timeDelta: number;
    mevPredictionAccuracy: number;
  };
  learnings: string[];
}

interface StrategyPerformanceMetrics {
  totalExecutions: number;
  successRate: number;
  averageSlippageAccuracy: number;
  averageGasAccuracy: number;
  mevPredictionAccuracy: number;
  protectionEffectiveness: number;
  costSavings: number;
  confidenceCalibration: number; // How well calibrated are confidence scores
}

export class ExecutionStrategyAgent extends BaseAgent {
  private dataService: DataAggregationService;
  private mevDatabase: Map<string, MEVAnalysis[]> = new Map();
  private timingHistory: Map<string, TimingAnalysis[]> = new Map();
  private executionWindows: Map<string, ExecutionWindow[]> = new Map();
  private gasOracle: GasPriceOracle;
  private mempoolMonitor: MempoolMonitor;
  private competitorTracker: CompetitorTracker;
  
  // 📊 Feedback Loop and Learning Systems
  private executionOutcomes: Map<string, ExecutionOutcome> = new Map();
  private strategyPerformance: Map<string, StrategyPerformanceMetrics> = new Map();
  private outcomeTracker: ExecutionOutcomeTracker;
  private confidenceCalibrator: ConfidenceCalibrator;

  // MEV Protection Settings
  private mevProtectionThresholds = {
    low: { minProtection: 0.8, maxCost: 10 }, // USD
    medium: { minProtection: 0.9, maxCost: 25 },
    high: { minProtection: 0.95, maxCost: 50 },
    critical: { minProtection: 0.98, maxCost: 100 }
  };

  constructor(dataService: DataAggregationService) {
    const config: AgentConfig = {
      id: 'execution-strategy-001',
      name: 'ExecutionStrategyAgent',
      version: '1.0.0',
      capabilities: ['execute', 'analyze', 'transaction-execution', 'market-analysis', 'mev-protection', 'timing-optimization', 'gas-strategy'],
      dependencies: ['data-aggregation'],
      maxConcurrentTasks: 10,
      timeout: 30000
    };
    
    const capabilities: AgentCapabilities = {
      canAnalyzeMarket: true,
      canDiscoverRoutes: false,
      canAssessRisk: true,
      canExecuteTransactions: true,
      canMonitorPerformance: true,
      supportedNetworks: ['ethereum', 'polygon', 'bsc', 'arbitrum'],
      supportedProtocols: ['uniswap', 'sushiswap', 'balancer', '1inch']
    };
    
    super(config, capabilities);
    this.dataService = dataService;
    this.gasOracle = new GasPriceOracle(dataService);
    this.mempoolMonitor = new MempoolMonitor();
    this.competitorTracker = new CompetitorTracker();
    this.outcomeTracker = new ExecutionOutcomeTracker();
    this.confidenceCalibrator = new ConfidenceCalibrator();
    
    this.startMonitoring();
    this.loadHistoricalPerformance();
  }

  // Abstract method implementations
  async initialize(): Promise<void> {
    console.log('🚀 ExecutionStrategyAgent initialized');
  }

  async processMessage(message: AgentMessage, signal: AbortSignal): Promise<void> {
    console.log('🚀 [EXECUTION STRATEGY AGENT] ========== PROCESSING MESSAGE ==========');
    console.log('📨 INPUT MESSAGE:', {
      id: message.id,
      type: message.type,
      from: message.from,
      priority: message.priority,
      timestamp: message.timestamp,
      payloadKeys: Object.keys(message.payload || {}),
      payloadSize: JSON.stringify(message.payload || {}).length
    });
    
    if (signal.aborted) {
      console.log('⚠️ [EXECUTION STRATEGY AGENT] Signal aborted, skipping processing');
      return;
    }
    
    const startTime = Date.now();
    let result: unknown = null;
    let error: Error | null = null;
    
    try {
      switch (message.type) {
        case MessageType.REQUEST_ANALYSIS:
          console.log('🔄 Processing EXECUTION STRATEGY REQUEST...');
          result = await this.handleStrategyRequest(message.payload as Record<string, unknown>);
          break;
        case MessageType.EXECUTION_RESULT:
          console.log('🔄 Processing EXECUTION RESULT...');
          const payload = message.payload as Record<string, unknown>;
          result = await this.recordExecutionOutcome(String(payload.strategyId || ''), (payload.actualResults as ExecutionOutcome['actualResults']) || {
            executionSuccess: false,
            actualSlippage: 0,
            actualGasCost: '0',
            actualExecutionTime: 0,
            mevDetected: false
          });
          break;
        case MessageType.CONSENSUS_REQUEST:
          console.log('🔄 Processing CONSENSUS REQUEST...');
          try {
            result = await this.handleConsensusRequest(message.payload as ConsensusRequest & { responseId: string });
          } catch (error) {
            console.log('🎭 Using fallback consensus for demo mode');
            result = { 
              type: 'consensus', 
              recommendedRoute: 'demo-route', 
              confidence: 0.8, 
              score: {
                totalScore: 75,
                breakdown: {
                  cost: 80,
                  time: 75, 
                  security: 70,
                  reliability: 75,
                  slippage: 80
                },
                reasoning: ['Demo fallback recommendation']
              },
              processed: true 
            };
          }
          break;
        default:
          console.log(`🔄 Processing UNKNOWN message type: ${message.type}`);
          result = { type: 'unknown', processed: false };
      }
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ [EXECUTION STRATEGY AGENT] Error processing message:', err);
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log('📤 [EXECUTION STRATEGY AGENT] OUTPUT RESULT:', {
      success: !error,
      processingTimeMs: processingTime,
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : [],
      error: error ? error.message : null
    });
    console.log('🚀 [EXECUTION STRATEGY AGENT] ========== MESSAGE COMPLETE ==========\n');
  }

  async handleTask(task: Record<string, unknown>, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) return null;
    
    switch (task.type) {
      case 'optimize-strategy':
        const userPrefs = task.userPreferences as {
          mevTolerance: 'none' | 'low' | 'medium' | 'high';
          urgency: 'immediate' | 'normal' | 'patient';
          maxDelay: number;
          gasPriority: 'economy' | 'standard' | 'fast' | 'instant';
        } || {
          mevTolerance: 'medium',
          urgency: 'normal',
          maxDelay: 300,
          gasPriority: 'standard'
        };
        return await this.generateExecutionStrategy(task.route as RouteProposal, task.riskAssessment as RiskAssessment, task.marketConditions as MarketConditions, userPrefs);
      case 'analyze-mev':
        return await this.analyzeMEVRisks(task.route as RouteProposal, task.marketConditions as MarketConditions);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  async cleanup(): Promise<void> {
    // Stop monitoring services - simplified cleanup without stop calls
    try {
      // Services will be cleaned up by garbage collection
      console.log('Monitoring services cleanup initiated');
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
    console.log('🧹 ExecutionStrategyAgent cleanup');
  }

  private async handleStrategyRequest(payload: Record<string, unknown>): Promise<void> {
    console.log('🎯 Received strategy request:', payload);
  }

  // Helper method to map strategy types to valid enum values
  private mapStrategyType(strategy: string): 'private-mempool' | 'commit-reveal' | 'sandwich-protection' {
    switch (strategy) {
      case 'private_mempool':
      case 'private-mempool':
        return 'private-mempool';
      case 'commit_reveal':
      case 'commit-reveal':
        return 'commit-reveal';
      case 'order_splitting':
      case 'timing_delay':
      case 'flashloan_protection':
      case 'sandwich_protection':
      case 'sandwich-protection':
      default:
        return 'sandwich-protection';
    }
  }

  private startMonitoring(): void {
    // Start real-time monitoring services
    this.gasOracle.start();
    this.mempoolMonitor.start();
    this.competitorTracker.start();

    // Set up periodic analysis
    setInterval(() => this.performPeriodicAnalysis(), 30000); // Every 30 seconds
  }

  // ===== MAIN EXECUTION STRATEGY GENERATION =====

  async generateExecutionStrategy(
    route: RouteProposal,
    riskAssessment: RiskAssessment,
    marketConditions: MarketConditions,
    userPreferences: {
      mevTolerance: 'none' | 'low' | 'medium' | 'high';
      urgency: 'immediate' | 'normal' | 'patient';
      maxDelay: number; // seconds
      gasPriority: 'economy' | 'standard' | 'fast' | 'instant';
    }
  ): Promise<ExecutionStrategy> {
    console.log(`🎯 Generating execution strategy for route ${route.id}...`);

    // Parallel analysis for efficiency
    const [mevAnalysis, timingAnalysis, gasStrategy] = await Promise.all([
      this.analyzeMEVRisks(route, marketConditions),
      this.analyzeOptimalTiming(route, marketConditions),
      this.optimizeGasStrategy(route, userPreferences.gasPriority, marketConditions)
    ]);

    // Generate MEV protection strategy
    const mevProtection = await this.generateMEVProtection(
      mevAnalysis,
      userPreferences.mevTolerance,
      route
    );

    // Generate timing strategy
    const timingStrategy = await this.generateTimingStrategy(
      timingAnalysis,
      userPreferences.urgency,
      userPreferences.maxDelay
    );

    // Generate order splitting strategy if beneficial
    const orderSplitStrategy = await this.generateOrderSplitStrategy(
      route,
      mevAnalysis,
      timingAnalysis
    );

    // Calculate execution windows
    const executionWindows = await this.calculateExecutionWindows(
      route,
      gasStrategy,
      timingStrategy,
      marketConditions
    );

    const strategy: ExecutionStrategy = {
      routeId: route.id,
      mevProtection,
      gasStrategy,
      timing: timingStrategy,
      executionWindows: executionWindows.map(window => ({
        start: window.startTime || Date.now(),
        end: window.endTime || Date.now() + 300000,
        confidence: window.confidence || 0.5
      })),
      contingencyPlans: await this.generateContingencyPlans(route, mevAnalysis, timingAnalysis),
      confidence: this.calculateStrategyConfidence(mevAnalysis, timingAnalysis, gasStrategy),
      strategyBy: this.config.id,
      estimatedImprovements: {
        costSavings: 0, // Will be calculated
        timeReduction: 0, // Will be calculated  
        riskReduction: mevProtection.estimatedProtection
      }
    };

    // Calculate estimated improvements
    if (strategy.estimatedImprovements) {
      strategy.estimatedImprovements.costSavings = mevAnalysis.estimatedLoss * mevProtection.estimatedProtection;
      strategy.estimatedImprovements.timeReduction = 0; // Will be calculated based on timing analysis
      strategy.estimatedImprovements.riskReduction = mevProtection.estimatedProtection;
    }

    // Track this strategy for outcome learning
    await this.outcomeTracker.trackExecution(strategy.routeId, {
      expectedSlippage: parseFloat(route.priceImpact),
      expectedGasCost: gasStrategy.estimatedCost || '0',
      expectedExecutionTime: route.estimatedTime,
      mevRiskLevel: mevAnalysis.riskLevel,
      confidenceScore: strategy.confidence || 0.5
    });

    this.storeStrategy(strategy);
    console.log(`✅ Execution strategy generated with ${((strategy.confidence || 0.5) * 100).toFixed(1)}% confidence`);
    
    return strategy;
  }

  // ===== MEV ANALYSIS AND PROTECTION =====

  private async analyzeMEVRisks(
    route: RouteProposal,
    marketConditions: MarketConditions
  ): Promise<MEVAnalysis> {
    console.log(`🔍 Analyzing MEV risks for route ${route.id}...`);

    const threatTypes: MEVThreatType[] = [];
    const reasoning: string[] = [];

    // Analyze different MEV threat types
    const sandwichRisk = await this.analyzeSandwichRisk(route, marketConditions);
    const frontrunRisk = await this.analyzeFrontrunRisk(route, marketConditions);
    const arbitrageRisk = await this.analyzeArbitrageRisk(route, marketConditions);
    const liquidationRisk = await this.analyzeLiquidationRisk(route, marketConditions);

    threatTypes.push(sandwichRisk, frontrunRisk, arbitrageRisk, liquidationRisk);

    // Calculate overall risk level
    const maxThreatLevel = Math.max(...threatTypes.map(t => t.probability));
    const estimatedLoss = threatTypes.reduce((sum, threat) => 
      sum + (threat.probability * threat.estimatedImpact), 0
    );

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (maxThreatLevel < 0.2) riskLevel = 'low';
    else if (maxThreatLevel < 0.5) riskLevel = 'medium';
    else if (maxThreatLevel < 0.8) riskLevel = 'high';
    else riskLevel = 'critical';

    // Generate protection recommendations
    const protectionRecommendations = await this.generateMEVProtectionRecommendations(
      threatTypes,
      route,
      estimatedLoss
    );

    reasoning.push(`Sandwich attack probability: ${(sandwichRisk.probability * 100).toFixed(1)}%`);
    reasoning.push(`Frontrun risk: ${(frontrunRisk.probability * 100).toFixed(1)}%`);
    reasoning.push(`Estimated potential loss: $${estimatedLoss.toFixed(2)}`);
    reasoning.push(`Risk level: ${riskLevel.toUpperCase()}`);

    return {
      riskLevel,
      threatTypes,
      protectionRecommendations,
      estimatedLoss,
      confidence: 0.85,
      reasoning
    };
  }

  private async analyzeSandwichRisk(
    route: RouteProposal,
    marketConditions: MarketConditions
  ): Promise<MEVThreatType> {
    // High-value trades with significant price impact are vulnerable
    const priceImpact = parseFloat(route.priceImpact);
    const tradeValue = parseFloat(route.estimatedOutput) * (marketConditions.prices?.[route.tokenOut || route.toToken] || 1);

    let probability = 0;
    
    // Price impact factor (higher impact = higher risk)
    if (priceImpact > 0.05) probability += 0.4;
    else if (priceImpact > 0.02) probability += 0.2;
    else if (priceImpact > 0.01) probability += 0.1;

    // Trade value factor (higher value = higher attraction)
    if (tradeValue > 100000) probability += 0.3;
    else if (tradeValue > 50000) probability += 0.2;
    else if (tradeValue > 10000) probability += 0.1;

    // Market volatility factor
    probability += marketConditions.volatility.overall * 0.2;

    // Gas price environment (high gas = more MEV activity)
    const currentGasPrice = parseFloat(await this.gasOracle.getCurrentGasPrice());
    if (currentGasPrice > 50e9) probability += 0.1; // > 50 gwei
    else if (currentGasPrice > 30e9) probability += 0.05; // > 30 gwei

    // Competitor activity detection
    const competitorActivity = await this.competitorTracker.getRecentActivity();
    probability += competitorActivity.intensity * 0.15;

    // Cap at 95%
    probability = Math.min(probability, 0.95);

    const estimatedImpact = tradeValue * priceImpact * 0.5; // Typical sandwich extraction

    return {
      type: 'sandwich',
      probability,
      estimatedImpact,
      detection: {
        memoryPoolAnalysis: true,
        gasPriceSpike: currentGasPrice > 40e9,
        largeOrderDetection: tradeValue > 50000,
        competitorActivity: competitorActivity.intensity > 0.3,
        historicalPatterns: await this.checkHistoricalMEVPatterns(route)
      }
    };
  }

  private async analyzeFrontrunRisk(
    route: RouteProposal,
    marketConditions: MarketConditions
  ): Promise<MEVThreatType> {
    // Frontrun risk is generally lower but exists for arbitrage opportunities
    const arbitrageOpportunity = await this.detectArbitrageOpportunity(route);
    const gasPrice = parseFloat(await this.gasOracle.getCurrentGasPrice());
    
    let probability = 0.1; // Base probability
    
    if (arbitrageOpportunity.exists) {
      probability += arbitrageOpportunity.profitability * 0.3;
    }
    
    // High gas environment increases frontrun competition
    if (gasPrice > 60e9) probability += 0.2;
    
    const tradeValue = parseFloat(route.estimatedOutput) * (marketConditions.prices?.[route.tokenOut || route.toToken] || 1);
    const estimatedImpact = tradeValue * 0.02; // Typical frontrun impact

    return {
      type: 'frontrun',
      probability,
      estimatedImpact,
      detection: {
        memoryPoolAnalysis: true,
        gasPriceSpike: gasPrice > 50e9,
        largeOrderDetection: false,
        competitorActivity: true,
        historicalPatterns: false
      }
    };
  }

  private async analyzeArbitrageRisk(
    route: RouteProposal,
    marketConditions: MarketConditions
  ): Promise<MEVThreatType> {
    // Check if this trade creates arbitrage opportunities
    const priceDiscrepancy = await this.checkPriceDiscrepancies(route);
    
    let probability = 0.05; // Base probability
    
    if (priceDiscrepancy.exists) {
      probability += priceDiscrepancy.magnitude * 0.4;
    }
    
    const estimatedImpact = priceDiscrepancy.potentialProfit * 0.3;

    return {
      type: 'arbitrage',
      probability,
      estimatedImpact,
      detection: {
        memoryPoolAnalysis: false,
        gasPriceSpike: false,
        largeOrderDetection: false,
        competitorActivity: true,
        historicalPatterns: true
      }
    };
  }

  private async analyzeLiquidationRisk(
    route: RouteProposal,
    marketConditions: MarketConditions
  ): Promise<MEVThreatType> {
    // Check if trade could trigger liquidations
    const liquidationCheck = await this.checkLiquidationTriggers(route, marketConditions);
    
    return {
      type: 'liquidation',
      probability: liquidationCheck.probability,
      estimatedImpact: liquidationCheck.estimatedImpact,
      detection: {
        memoryPoolAnalysis: false,
        gasPriceSpike: false,
        largeOrderDetection: true,
        competitorActivity: true,
        historicalPatterns: true
      }
    };
  }

  private async generateMEVProtection(
    mevAnalysis: MEVAnalysis,
    userTolerance: string,
    route: RouteProposal
  ): Promise<MEVProtection> {
    const threshold = this.mevProtectionThresholds[mevAnalysis.riskLevel as keyof typeof this.mevProtectionThresholds];
    
    // Select best protection strategy based on analysis
    const recommendedStrategy = mevAnalysis.protectionRecommendations
      .filter(rec => rec.compatible && rec.additionalCost <= threshold.maxCost)
      .sort((a, b) => b.effectiveness - a.effectiveness)[0];

    if (!recommendedStrategy) {
      // Fallback to basic protection
      return {
        enabled: false,
        strategy: 'sandwich-protection', // Use valid enum value
        estimatedProtection: 0,
        cost: '0',
        additionalCost: 0,
        reasoning: ['No suitable MEV protection available within cost constraints']
      };
    }

    return {
      enabled: true,
      strategy: this.mapStrategyType(recommendedStrategy.strategy),
      estimatedProtection: recommendedStrategy.effectiveness,
      cost: recommendedStrategy.additionalCost.toString(),
      additionalCost: recommendedStrategy.additionalCost,
      reasoning: [
        `Selected ${recommendedStrategy.strategy} for ${(recommendedStrategy.effectiveness * 100).toFixed(1)}% protection`,
        `Risk level: ${mevAnalysis.riskLevel}`,
        `Estimated MEV loss without protection: $${mevAnalysis.estimatedLoss.toFixed(2)}`,
        `Additional cost: $${recommendedStrategy.additionalCost.toFixed(2)}`
      ]
    };
  }

  // ===== TIMING ANALYSIS AND OPTIMIZATION =====

  private async analyzeOptimalTiming(
    route: RouteProposal,
    marketConditions: MarketConditions
  ): Promise<TimingAnalysis> {
    console.log(`⏰ Analyzing optimal timing for route ${route.id}...`);

    const [gasOptimization, marketTiming, congestionAnalysis] = await Promise.all([
      this.analyzeGasOptimization(),
      this.analyzeMarketTiming(route, marketConditions),
      this.analyzeCongestion()
    ]);

    const delayRecommended = Math.max(
      gasOptimization.waitTimeForOptimal,
      marketTiming.recommendedDelay,
      congestionAnalysis.estimatedClearTime
    );

    const optimal = delayRecommended < 60; // Consider optimal if delay < 1 minute

    return {
      optimal,
      delayRecommended,
      gasOptimization,
      marketTiming,
      congestionAnalysis
    };
  }

  private async analyzeGasOptimization(): Promise<GasOptimization> {
    const currentPrice = await this.gasOracle.getCurrentGasPrice();
    const predictions = await this.gasOracle.getPricePredictions();
    
    const optimalPrediction = predictions.reduce((min, pred) => 
      parseFloat(pred.price) < parseFloat(min.price) ? pred : min
    );

    const potentialSavings = (parseFloat(currentPrice) - parseFloat(optimalPrediction.price)) * 
                            0.000000001 * // Convert to ETH
                            150000 * // Average gas usage
                            2000; // ETH price estimate

    return {
      currentPrice,
      predictedOptimal: optimalPrediction.price,
      waitTimeForOptimal: optimalPrediction.timeToReach,
      potentialSavings: Math.max(potentialSavings, 0),
      volatility: predictions.reduce((sum, pred) => sum + pred.confidence, 0) / predictions.length
    };
  }

  private async analyzeMarketTiming(
    route: RouteProposal,
    marketConditions: MarketConditions
  ): Promise<MarketTiming> {
    const spreadAnalysis = await this.analyzeSpread(route);
    const liquidityDepth = await this.analyzeLiquidityDepth(route);
    const orderBookImbalance = await this.analyzeOrderBookImbalance(route);
    
    // Determine if we're in a volatile window
    const volatilityWindow = marketConditions.volatility.overall > 0.3;
    
    let recommendedDelay = 0;
    if (volatilityWindow) recommendedDelay += 120; // 2 minutes
    if (spreadAnalysis.isWidening) recommendedDelay += 60; // 1 minute
    if (Math.abs(orderBookImbalance) > 0.3) recommendedDelay += 30; // 30 seconds

    return {
      volatilityWindow,
      liquidityDepth,
      spreadAnalysis,
      orderBookImbalance,
      recommendedDelay
    };
  }

  private async analyzeCongestion(): Promise<CongestionAnalysis> {
    const networkData = await this.mempoolMonitor.getNetworkStatus();
    
    return {
      networkUtilization: networkData.utilization,
      pendingTransactions: networkData.pendingCount,
      mempoolSize: networkData.mempoolSize,
      estimatedClearTime: networkData.estimatedClearTime,
      priorityThreshold: networkData.priorityGasPrice
    };
  }

  // ===== SOPHISTICATED CONFIDENCE CALCULATION =====

  private calculateStrategyConfidence(
    mevAnalysis: MEVAnalysis,
    timingAnalysis: TimingAnalysis,
    gasStrategy: GasStrategy
  ): number {
    console.log('🎯 Calculating sophisticated confidence score...');
    
    // 1. Agreement between threat types (consistency check)
    const threatAgreement = this.calculateThreatAgreement(mevAnalysis.threatTypes);
    
    // 2. Gas prediction spread/volatility
    const gasPredictionConfidence = this.calculateGasPredictionConfidence();
    
    // 3. Protection effectiveness vs estimated risk alignment
    const protectionAlignment = this.calculateProtectionAlignment(mevAnalysis);
    
    // 4. Mempool volatility and stability
    const mempoolStability = this.calculateMempoolStability();
    
    // 5. Historical performance calibration
    const historicalCalibration = this.getHistoricalCalibration(mevAnalysis.riskLevel);
    
    // 6. Market conditions uncertainty
    const marketUncertainty = this.calculateMarketUncertainty(timingAnalysis);
    
    // Weighted combination of confidence factors
    const weights = {
      threatAgreement: 0.25,
      gasPrediction: 0.20,
      protectionAlignment: 0.20,
      mempoolStability: 0.15,
      historicalCalibration: 0.15,
      marketUncertainty: 0.05
    };
    
    const rawConfidence = 
      threatAgreement * weights.threatAgreement +
      gasPredictionConfidence * weights.gasPrediction +
      protectionAlignment * weights.protectionAlignment +
      mempoolStability * weights.mempoolStability +
      historicalCalibration * weights.historicalCalibration +
      (1 - marketUncertainty) * weights.marketUncertainty;
    
    // Apply calibration based on historical performance
    const calibratedConfidence = this.confidenceCalibrator.calibrate(
      rawConfidence,
      mevAnalysis.riskLevel,
      {
        threatTypes: mevAnalysis.threatTypes.map(t => t.type),
        gasVolatility: gasPredictionConfidence,
        marketConditions: timingAnalysis.optimal ? 'stable' : 'volatile'
      }
    );
    
    console.log(`✅ Confidence calculated: ${(calibratedConfidence * 100).toFixed(1)}% (raw: ${(rawConfidence * 100).toFixed(1)}%)`);
    
    return Math.max(0.1, Math.min(0.99, calibratedConfidence));
  }
  
  private calculateThreatAgreement(threatTypes: MEVThreatType[]): number {
    if (threatTypes.length < 2) return 0.8;
    
    // Calculate standard deviation of threat probabilities
    const probabilities = threatTypes.map(t => t.probability);
    const mean = probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length;
    const variance = probabilities.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / probabilities.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher agreement = higher confidence
    const agreement = Math.max(0.1, 1 - (stdDev * 2)); // Scale stddev to 0-1 range
    
    return agreement;
  }
  
  private calculateGasPredictionConfidence(): number {
    const predictions = this.gasOracle.getPredictions();
    if (predictions.length === 0) return 0.5;
    
    // Average confidence of gas predictions
    const avgConfidence = predictions.reduce((sum, pred) => sum + pred.confidence, 0) / predictions.length;
    
    // Factor in prediction spread (lower spread = higher confidence)
    const prices = predictions.map(p => parseFloat(p.price));
    const priceSpread = Math.max(...prices) - Math.min(...prices);
    const spreadFactor = Math.max(0.1, 1 - (priceSpread / Math.min(...prices))); // Normalize by min price
    
    return (avgConfidence + spreadFactor) / 2;
  }
  
  private calculateProtectionAlignment(mevAnalysis: MEVAnalysis): number {
    // Check if protection recommendations align with threat severity
    const highestThreat = Math.max(...mevAnalysis.threatTypes.map(t => t.probability));
    const recommendedProtection = Math.max(...mevAnalysis.protectionRecommendations.map(r => r.effectiveness));
    
    // Good alignment means high threats have high protection recommendations
    const alignment = 1 - Math.abs(highestThreat - recommendedProtection);
    
    return Math.max(0.1, alignment);
  }
  
  private calculateMempoolStability(): number {
    const networkStatus = this.mempoolMonitor.getNetworkStatus();
    
    // Factors that indicate stability
    const utilizationStability = 1 - Math.abs(networkStatus.utilization - 0.7); // Optimal around 70%
    const queueStability = Math.max(0.1, 1 - (networkStatus.pendingCount / 200000)); // Normalize by typical max
    
    return (utilizationStability + queueStability) / 2;
  }
  
  private getHistoricalCalibration(riskLevel: string): number {
    const performance = this.strategyPerformance.get(riskLevel);
    if (!performance) return 0.6; // Default for no historical data
    
    // Use confidence calibration from historical performance
    return performance.confidenceCalibration;
  }
  
  private calculateMarketUncertainty(timingAnalysis: TimingAnalysis): number {
    // Higher uncertainty when:
    // - High gas volatility
    // - Wide spreads
    // - High market volatility
    // - Long delay recommendations (market timing uncertain)
    
    const gasUncertainty = timingAnalysis.gasOptimization.volatility;
    const spreadUncertainty = timingAnalysis.marketTiming.spreadAnalysis.isWidening ? 0.3 : 0.1;
    const timingUncertainty = Math.min(0.5, timingAnalysis.delayRecommended / 600); // Normalize by 10 minutes
    const volatilityUncertainty = timingAnalysis.marketTiming.volatilityWindow ? 0.4 : 0.1;
    
    return (gasUncertainty + spreadUncertainty + timingUncertainty + volatilityUncertainty) / 4;
  }

  // ===== ORDER SPLITTING STRATEGY =====

  private async generateOrderSplitStrategy(
    route: RouteProposal,
    mevAnalysis: MEVAnalysis,
    timingAnalysis: TimingAnalysis
  ): Promise<OrderSplitStrategy> {
    const priceImpact = parseFloat(route.priceImpact);
    const tradeValue = parseFloat(route.estimatedOutput);
    
    // Determine if splitting is beneficial
    const shouldSplit = priceImpact > 0.01 || mevAnalysis.riskLevel === 'high' || mevAnalysis.riskLevel === 'critical';
    
    if (!shouldSplit) {
      return {
        enabled: false,
        numberOfParts: 1,
        timeBetweenParts: 0,
        randomization: false,
        sizeDistribution: [1.0],
        estimatedImprovements: {
          slippageReduction: 0,
          mevReduction: 0,
          totalCostReduction: 0
        }
      };
    }

    // Calculate optimal number of parts based on price impact
    let numberOfParts = 2;
    if (priceImpact > 0.05) numberOfParts = 4;
    else if (priceImpact > 0.02) numberOfParts = 3;

    // Generate size distribution (slightly randomized to avoid MEV detection)
    const sizeDistribution = this.generateOptimalSizeDistribution(numberOfParts, true);
    
    // Calculate time between parts (randomized)
    const basetime = Math.max(30, timingAnalysis.delayRecommended / numberOfParts);
    const timeBetweenParts = basetime + (Math.random() * 20 - 10); // ±10 second randomization

    // Estimate improvements
    const slippageReduction = this.estimateSlippageReduction(priceImpact, numberOfParts);
    const mevReduction = this.estimateMEVReductionFromSplitting(mevAnalysis, numberOfParts);
    const totalCostReduction = slippageReduction * tradeValue + mevReduction;

    return {
      enabled: true,
      numberOfParts,
      timeBetweenParts,
      randomization: true,
      sizeDistribution,
      estimatedImprovements: {
        slippageReduction,
        mevReduction,
        totalCostReduction
      }
    };
  }

  // ===== FEEDBACK LOOP AND LEARNING METHODS =====
  
  async recordExecutionOutcome(
    strategyId: string,
    actualResults: ExecutionOutcome['actualResults']
  ): Promise<void> {
    console.log(`📊 Recording execution outcome for strategy ${strategyId}...`);
    
    const outcome = this.executionOutcomes.get(strategyId);
    if (!outcome) {
      console.warn(`No prediction found for strategy ${strategyId}`);
      return;
    }
    
    // Update actual results
    outcome.actualResults = actualResults;
    
    // Calculate deltas
    outcome.deltas = {
      slippageDelta: Math.abs(actualResults.actualSlippage - outcome.predictions.expectedSlippage),
      gasDelta: Math.abs(parseFloat(actualResults.actualGasCost) - parseFloat(outcome.predictions.expectedGasCost)),
      timeDelta: Math.abs(actualResults.actualExecutionTime - outcome.predictions.expectedExecutionTime),
      mevPredictionAccuracy: this.calculateMEVPredictionAccuracy(outcome, actualResults)
    };
    
    // Generate learnings
    outcome.learnings = this.generateLearnings(outcome);
    
    // Update performance metrics
    await this.updatePerformanceMetrics(outcome);
    
    // Update confidence calibrator
    this.confidenceCalibrator.addOutcome(outcome);
    
    console.log(`✅ Execution outcome recorded with ${outcome.learnings.length} learnings`);
  }
  
  private calculateMEVPredictionAccuracy(outcome: ExecutionOutcome, actualResults: ExecutionOutcome['actualResults']): number {
    const predictedRisk = outcome.predictions.mevRiskLevel;
    const actualMEV = actualResults.mevDetected;
    
    // Simple accuracy: did we predict MEV correctly?
    if ((predictedRisk === 'high' || predictedRisk === 'critical') && actualMEV) return 1.0;
    if ((predictedRisk === 'low' || predictedRisk === 'medium') && !actualMEV) return 1.0;
    if ((predictedRisk === 'high' || predictedRisk === 'critical') && !actualMEV) return 0.3; // False positive
    if ((predictedRisk === 'low' || predictedRisk === 'medium') && actualMEV) return 0.1; // False negative
    
    return 0.5; // Uncertain cases
  }
  
  private generateLearnings(outcome: ExecutionOutcome): string[] {
    const learnings: string[] = [];
    
    // Slippage learnings
    if (outcome.deltas.slippageDelta > 0.005) { // 0.5% threshold
      if (outcome.actualResults.actualSlippage > outcome.predictions.expectedSlippage) {
        learnings.push('Slippage prediction was too optimistic - increase slippage estimates for similar conditions');
      } else {
        learnings.push('Slippage prediction was too pessimistic - market conditions were more favorable than expected');
      }
    }
    
    // Gas learnings
    if (outcome.deltas.gasDelta > parseFloat(outcome.predictions.expectedGasCost) * 0.2) { // 20% threshold
      learnings.push('Gas estimation accuracy needs improvement - review gas oracle predictions');
    }
    
    // MEV learnings
    if (outcome.deltas.mevPredictionAccuracy < 0.5) {
      if (outcome.actualResults.mevDetected && outcome.predictions.mevRiskLevel === 'low') {
        learnings.push('MEV threat was underestimated - review threat detection algorithms');
      } else if (!outcome.actualResults.mevDetected && outcome.predictions.mevRiskLevel === 'high') {
        learnings.push('MEV threat was overestimated - false positive in threat detection');
      }
    }
    
    // Protection effectiveness learnings
    if (outcome.actualResults.protectionEffectiveness !== undefined) {
      if (outcome.actualResults.protectionEffectiveness < 0.7) {
        learnings.push('MEV protection was less effective than expected - review protection strategies');
      }
    }
    
    // Timing learnings
    if (outcome.deltas.timeDelta > 60) { // 1 minute threshold
      learnings.push('Execution timing prediction was inaccurate - review market timing analysis');
    }
    
    return learnings;
  }
  
  private async updatePerformanceMetrics(outcome: ExecutionOutcome): Promise<void> {
    const riskLevel = outcome.predictions.mevRiskLevel;
    let metrics = this.strategyPerformance.get(riskLevel);
    
    if (!metrics) {
      metrics = {
        totalExecutions: 0,
        successRate: 0,
        averageSlippageAccuracy: 0,
        averageGasAccuracy: 0,
        mevPredictionAccuracy: 0,
        protectionEffectiveness: 0,
        costSavings: 0,
        confidenceCalibration: 0.6
      };
    }
    
    // Update running averages
    const weight = 1 / (metrics.totalExecutions + 1);
    const oldWeight = 1 - weight;
    
    metrics.totalExecutions += 1;
    metrics.successRate = oldWeight * metrics.successRate + weight * (outcome.actualResults.executionSuccess ? 1 : 0);
    
    // Slippage accuracy (inverse of delta, normalized)
    const slippageAccuracy = Math.max(0, 1 - (outcome.deltas.slippageDelta / 0.05)); // Normalize by 5% max delta
    metrics.averageSlippageAccuracy = oldWeight * metrics.averageSlippageAccuracy + weight * slippageAccuracy;
    
    // Gas accuracy
    const expectedGas = parseFloat(outcome.predictions.expectedGasCost);
    const gasAccuracy = expectedGas > 0 ? Math.max(0, 1 - (outcome.deltas.gasDelta / expectedGas)) : 0;
    metrics.averageGasAccuracy = oldWeight * metrics.averageGasAccuracy + weight * gasAccuracy;
    
    // MEV prediction accuracy
    metrics.mevPredictionAccuracy = oldWeight * metrics.mevPredictionAccuracy + weight * outcome.deltas.mevPredictionAccuracy;
    
    // Protection effectiveness
    if (outcome.actualResults.protectionEffectiveness !== undefined) {
      metrics.protectionEffectiveness = oldWeight * metrics.protectionEffectiveness + 
                                      weight * outcome.actualResults.protectionEffectiveness;
    }
    
    // Cost savings (estimate based on MEV protection and gas optimization)
    const mevSavings = outcome.actualResults.mevImpact ? outcome.actualResults.mevImpact * (outcome.actualResults.protectionEffectiveness || 0) : 0;
    const gasSavings = Math.max(0, expectedGas - parseFloat(outcome.actualResults.actualGasCost)) * 0.000000001 * 2000; // Convert to USD
    const totalSavings = mevSavings + gasSavings;
    metrics.costSavings = oldWeight * metrics.costSavings + weight * totalSavings;
    
    this.strategyPerformance.set(riskLevel, metrics);
  }
  
  private async loadHistoricalPerformance(): Promise<void> {
    // Load historical performance data from storage
    // This would typically load from a database or file system
    console.log('📚 Loading historical performance data...');
    
    // Initialize with baseline metrics if no history exists
    const riskLevels = ['low', 'medium', 'high', 'critical'];
    for (const level of riskLevels) {
      if (!this.strategyPerformance.has(level)) {
        this.strategyPerformance.set(level, {
          totalExecutions: 0,
          successRate: 0.85,
          averageSlippageAccuracy: 0.75,
          averageGasAccuracy: 0.8,
          mevPredictionAccuracy: 0.7,
          protectionEffectiveness: 0.8,
          costSavings: 0,
          confidenceCalibration: 0.6
        });
      }
    }
  }

  // ===== HELPER METHODS =====

  private async performPeriodicAnalysis(): Promise<void> {
    // Update gas oracle predictions
    await this.gasOracle.updatePredictions();
    
    // Update mempool analysis
    await this.mempoolMonitor.updateStatus();
    
    // Update competitor tracking
    await this.competitorTracker.updateActivity();
    
    // Process learning queue
    await this.outcomeTracker.processLearningQueue();
    
    // Clean old data
    this.cleanOldAnalysisData();
  }

  private generateOptimalSizeDistribution(parts: number, randomize: boolean): number[] {
    const distribution: number[] = [];
    const baseSize = 1.0 / parts;
    
    for (let i = 0; i < parts; i++) {
      let size = baseSize;
      if (randomize) {
        // Add ±5% randomization
        size += (Math.random() * 0.1 - 0.05) * baseSize;
      }
      distribution.push(size);
    }
    
    // Normalize to ensure sum equals 1.0
    const sum = distribution.reduce((a, b) => a + b, 0);
    return distribution.map(size => size / sum);
  }

  private estimateSlippageReduction(priceImpact: number, parts: number): number {
    // Theoretical reduction based on square root law
    const reduction = 1 - (1 / Math.sqrt(parts));
    return priceImpact * reduction;
  }

  private estimateMEVReductionFromSplitting(mevAnalysis: MEVAnalysis, parts: number): number {
    // Splitting reduces MEV attractiveness
    const sandwichThreat = mevAnalysis.threatTypes.find(t => t.type === 'sandwich');
    if (sandwichThreat) {
      const reductionFactor = Math.min(0.7, (parts - 1) * 0.2); // Up to 70% reduction
      return sandwichThreat.estimatedImpact * reductionFactor;
    }
    return 0;
  }

  private cleanOldAnalysisData(): void {
    // Clean data older than 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [key, analyses] of this.mevDatabase) {
      this.mevDatabase.set(key, analyses.filter(a => a.confidence > cutoff));
    }
    
    // Clean old execution outcomes (keep 7 days for learning)
    const outcomeCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [key, outcome] of this.executionOutcomes) {
      if (outcome.timestamp < outcomeCutoff) {
        this.executionOutcomes.delete(key);
      }
    }
  }

  // ===== PUBLIC API FOR LEARNING AND ANALYTICS =====
  
  getPerformanceMetrics(): Map<string, StrategyPerformanceMetrics> {
    return new Map(this.strategyPerformance);
  }
  
  getRecentOutcomes(limit: number = 10): ExecutionOutcome[] {
    return Array.from(this.executionOutcomes.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  getLearningInsights(): {
    topLearnings: string[];
    performanceTrends: Record<string, number>;
    recommendedImprovements: string[];
  } {
    const recentOutcomes = this.getRecentOutcomes(50);
    
    // Aggregate learnings
    const learningCounts = new Map<string, number>();
    recentOutcomes.forEach(outcome => {
      outcome.learnings.forEach(learning => {
        learningCounts.set(learning, (learningCounts.get(learning) || 0) + 1);
      });
    });
    
    const topLearnings = Array.from(learningCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([learning]) => learning);
    
    // Performance trends
    const performanceTrends: Record<string, number> = {};
    for (const [riskLevel, metrics] of this.strategyPerformance) {
      performanceTrends[`${riskLevel}_success_rate`] = metrics.successRate;
      performanceTrends[`${riskLevel}_mev_accuracy`] = metrics.mevPredictionAccuracy;
      performanceTrends[`${riskLevel}_confidence_calibration`] = metrics.confidenceCalibration;
    }
    
    // Recommended improvements
    const recommendedImprovements: string[] = [];
    for (const [riskLevel, metrics] of this.strategyPerformance) {
      if (metrics.mevPredictionAccuracy < 0.7) {
        recommendedImprovements.push(`Improve MEV detection for ${riskLevel} risk scenarios`);
      }
      if (metrics.averageSlippageAccuracy < 0.75) {
        recommendedImprovements.push(`Enhance slippage prediction for ${riskLevel} risk scenarios`);
      }
      if (metrics.confidenceCalibration < 0.6) {
        recommendedImprovements.push(`Recalibrate confidence scoring for ${riskLevel} risk scenarios`);
      }
    }
    
    return {
      topLearnings,
      performanceTrends,
      recommendedImprovements
    };
  }

  // ===== PLACEHOLDER METHODS FOR EXTERNAL SERVICES =====

  private generateStrategyReasoning(
    mevAnalysis: MEVAnalysis,
    timingAnalysis: TimingAnalysis,
    gasStrategy: GasStrategy,
    userPreferences: Record<string, unknown>
  ): string[] {
    return [
      `MEV risk level: ${mevAnalysis.riskLevel}`,
      `Timing optimal: ${timingAnalysis.optimal}`,
      `Gas strategy: ${gasStrategy.priority}`,
      `Confidence factors: threat agreement, gas prediction stability, protection alignment`
    ];
  }

  private async generateContingencyPlans(
    route: RouteProposal,
    mevAnalysis: MEVAnalysis,
    timingAnalysis: TimingAnalysis
  ): Promise<string[]> {
    return ['Fallback to alternative route', 'Increase gas price', 'Split order further', 'Enable additional MEV protection'];
  }

  private storeStrategy(strategy: ExecutionStrategy): void {
    // Store strategy for analysis and learning
    this.executionOutcomes.set(strategy.routeId, {
      strategyId: strategy.routeId,
      routeId: strategy.routeId,
      timestamp: Date.now(),
      actualResults: {
        executionSuccess: false,
        actualSlippage: 0,
        actualGasCost: '0',
        actualExecutionTime: 0,
        mevDetected: false
      },
      predictions: {
        expectedSlippage: parseFloat('0.01'), // Will be filled from route
        expectedGasCost: strategy.gasStrategy.estimatedCost || '0',
        expectedExecutionTime: 30, // Will be filled from route
        mevRiskLevel: 'medium', // Will be filled from analysis
        confidenceScore: strategy.confidence || 0.5
      },
      deltas: {
        slippageDelta: 0,
        gasDelta: 0,
        timeDelta: 0,
        mevPredictionAccuracy: 0
      },
      learnings: []
    });
  }

  // Placeholder methods for external services
  private async checkHistoricalMEVPatterns(route: RouteProposal): Promise<boolean> { return false; }
  private async detectArbitrageOpportunity(route: RouteProposal): Promise<{exists: boolean, profitability: number}> { 
    return {exists: false, profitability: 0}; 
  }
  private async checkPriceDiscrepancies(route: RouteProposal): Promise<{exists: boolean, magnitude: number, potentialProfit: number}> { 
    return {exists: false, magnitude: 0, potentialProfit: 0}; 
  }
  private async checkLiquidationTriggers(route: RouteProposal, marketConditions: MarketConditions): Promise<{probability: number, estimatedImpact: number}> { 
    return {probability: 0.05, estimatedImpact: 0}; 
  }
  private async generateMEVProtectionRecommendations(threatTypes: MEVThreatType[], route: RouteProposal, estimatedLoss: number): Promise<MEVProtectionStrategy[]> { 
    return [{
      strategy: 'private_mempool',
      effectiveness: 0.9,
      additionalCost: 15,
      latencyImpact: 2,
      compatible: true
    }]; 
  }
  private async analyzeSpread(route: RouteProposal): Promise<SpreadAnalysis> { 
    return {currentSpread: 0.01, averageSpread: 0.015, isWidening: false, predictedNarrowTime: 0}; 
  }
  private async analyzeLiquidityDepth(route: RouteProposal): Promise<number> { return 1000000; }
  private async analyzeOrderBookImbalance(route: RouteProposal): Promise<number> { return 0.1; }
  private async optimizeGasStrategy(route: RouteProposal, priority: string, marketConditions: MarketConditions): Promise<GasStrategy> {
    return {
      priority: (priority as unknown as "low" | "medium" | "high") || "medium",
      gasPrice: '30000000000',
      gasLimit: '200000',
      maxFeePerGas: '35000000000',
      maxPriorityFeePerGas: '2000000000',
      estimatedCost: '0.007',
      strategy: 'fast'
    };
  }
  private async generateTimingStrategy(timingAnalysis: TimingAnalysis, urgency: string, maxDelay: number): Promise<TimingStrategy> {
    return {
      optimal: urgency !== 'immediate',
      delayRecommended: Math.min(timingAnalysis.delayRecommended, maxDelay),
      reason: 'Market conditions suggest waiting for better timing',
      immediate: urgency === 'immediate',
      optimalWindow: {
        start: Date.now() + timingAnalysis.delayRecommended * 1000,
        end: Date.now() + (timingAnalysis.delayRecommended + 300) * 1000
      }
    };
  }
  private async calculateExecutionWindows(route: RouteProposal, gasStrategy: GasStrategy, timingStrategy: TimingStrategy, marketConditions: MarketConditions): Promise<ExecutionWindow[]> {
    return [{
      startTime: timingStrategy.optimalWindow?.start || Date.now(),
      endTime: timingStrategy.optimalWindow?.end || Date.now() + 300000,
      confidence: 0.8,
      reasoning: 'Optimal market conditions expected',
      gasEstimate: gasStrategy.gasPrice,
      slippageEstimate: parseFloat(route.priceImpact)
    }];
  }
}

// ===== EXTERNAL SERVICE CLASSES =====

class GasPriceOracle {
  private dataService: DataAggregationService;
  private predictions: Array<{price: string, timeToReach: number, confidence: number}> = [];

  constructor(dataService: DataAggregationService) {
    this.dataService = dataService;
  }

  async start(): Promise<void> {
    await this.updatePredictions();
  }

  async getCurrentGasPrice(): Promise<string> {
    try {
      const gasData = await this.dataService.getGasOracle();
      return gasData.standard.toString();
    } catch (error) {
      console.warn('Failed to get current gas price:', error);
      return '30000000000'; // 30 gwei fallback
    }
  }

  async getPricePredictions(): Promise<Array<{price: string, timeToReach: number, confidence: number}>> {
    return this.predictions;
  }
  
  getPredictions(): Array<{price: string, timeToReach: number, confidence: number}> {
    return this.predictions;
  }

  async updatePredictions(): Promise<void> {
    // Implement gas price prediction logic
    this.predictions = [
      { price: '25000000000', timeToReach: 300, confidence: 0.7 },
      { price: '20000000000', timeToReach: 600, confidence: 0.6 },
      { price: '18000000000', timeToReach: 1200, confidence: 0.5 }
    ];
  }
}

class MempoolMonitor {
  private networkStatus = {
    utilization: 0.7,
    pendingCount: 150000,
    mempoolSize: 50000000,
    estimatedClearTime: 180,
    priorityGasPrice: '35000000000'
  };

  async start(): Promise<void> {
    // Start mempool monitoring
  }

  getNetworkStatus() {
    return this.networkStatus;
  }

  async updateStatus(): Promise<void> {
    // Update network status from blockchain
  }
}

class CompetitorTracker {
  private activity = {
    intensity: 0.3,
    recentMEVBots: 15,
    averageGasPremium: 1.2
  };

  async start(): Promise<void> {
    // Start competitor tracking
  }

  async getRecentActivity() {
    return this.activity;
  }

  async updateActivity(): Promise<void> {
    // Update competitor activity analysis
  }
}

// 📊 Execution Outcome Tracker for Continuous Learning
class ExecutionOutcomeTracker {
  private outcomes: Map<string, ExecutionOutcome> = new Map();
  private learningQueue: ExecutionOutcome[] = [];

  async trackExecution(strategyId: string, predictions: ExecutionOutcome['predictions']): Promise<void> {
    const outcome: ExecutionOutcome = {
      strategyId,
      routeId: predictions.routeId || strategyId,
      timestamp: Date.now(),
      actualResults: {
        executionSuccess: false,
        actualSlippage: 0,
        actualGasCost: '0',
        actualExecutionTime: 0,
        mevDetected: false
      }, // Will be filled when execution completes
      predictions,
      deltas: {
        slippageDelta: 0,
        gasDelta: 0,
        timeDelta: 0,
        mevPredictionAccuracy: 0
      }, // Will be calculated after execution
      learnings: []
    };
    
    this.outcomes.set(strategyId, outcome);
  }

  async recordOutcome(strategyId: string, actualResults: ExecutionOutcome['actualResults']): Promise<ExecutionOutcome | null> {
    const outcome = this.outcomes.get(strategyId);
    if (!outcome) return null;
    
    outcome.actualResults = actualResults;
    this.learningQueue.push(outcome);
    
    return outcome;
  }

  getOutcomes(): ExecutionOutcome[] {
    return Array.from(this.outcomes.values());
  }

  async processLearningQueue(): Promise<void> {
    // Process accumulated outcomes for batch learning
    while (this.learningQueue.length > 0) {
      const outcome = this.learningQueue.shift()!;
      await this.processOutcomeForLearning(outcome);
    }
  }

  private async processOutcomeForLearning(outcome: ExecutionOutcome): Promise<void> {
    // Implement learning algorithms based on outcomes
    // This could update ML models, adjust thresholds, etc.
  }
}

// 🎯 Confidence Score Calibrator
class ConfidenceCalibrator {
  private calibrationData: Map<string, Array<{predicted: number, actual: boolean}>> = new Map();
  private calibrationCurves: Map<string, (confidence: number) => number> = new Map();

  addOutcome(outcome: ExecutionOutcome): void {
    const riskLevel = outcome.predictions.mevRiskLevel;
    
    if (!this.calibrationData.has(riskLevel)) {
      this.calibrationData.set(riskLevel, []);
    }
    
    const data = this.calibrationData.get(riskLevel)!;
    data.push({
      predicted: outcome.predictions.confidenceScore,
      actual: outcome.actualResults.executionSuccess
    });
    
    // Keep only recent data (last 1000 outcomes)
    if (data.length > 1000) {
      data.splice(0, data.length - 1000);
    }
    
    // Recalibrate if we have enough data
    if (data.length >= 50) {
      this.recalibrate(riskLevel);
    }
  }

  calibrate(rawConfidence: number, riskLevel: string, context: Record<string, unknown>): number {
    const calibrationFn = this.calibrationCurves.get(riskLevel);
    
    if (!calibrationFn) {
      // No calibration data yet, return raw confidence with slight pessimistic bias
      return rawConfidence * 0.9;
    }
    
    return calibrationFn(rawConfidence);
  }

  private recalibrate(riskLevel: string): void {
    const data = this.calibrationData.get(riskLevel)!;
    
    // Simple calibration: bin predictions and calculate actual success rates
    const bins = this.createCalibrationBins(data);
    
    // Create calibration function using interpolation
    this.calibrationCurves.set(riskLevel, (confidence: number) => {
      return this.interpolateCalibration(confidence, bins);
    });
  }

  private createCalibrationBins(data: Array<{predicted: number, actual: boolean}>): Array<{confidence: number, actualRate: number}> {
    const numBins = 10;
    const bins: Array<{predictions: number[], actuals: boolean[]}> = [];
    
    // Initialize bins
    for (let i = 0; i < numBins; i++) {
      bins.push({ predictions: [], actuals: [] });
    }
    
    // Assign data to bins
    data.forEach(point => {
      const binIndex = Math.min(Math.floor(point.predicted * numBins), numBins - 1);
      bins[binIndex].predictions.push(point.predicted);
      bins[binIndex].actuals.push(point.actual);
    });
    
    // Calculate actual success rate for each bin
    return bins.map((bin, index) => {
      const avgConfidence = (index + 0.5) / numBins;
      const actualRate = bin.actuals.length > 0 ? 
        bin.actuals.filter(a => a).length / bin.actuals.length : avgConfidence;
      
      return { confidence: avgConfidence, actualRate };
    }).filter(bin => bin.actualRate >= 0); // Filter out empty bins
  }

  private interpolateCalibration(confidence: number, bins: Array<{confidence: number, actualRate: number}>): number {
    if (bins.length === 0) return confidence;
    if (bins.length === 1) return bins[0].actualRate;
    
    // Find surrounding bins
    let lowerBin = bins[0];
    let upperBin = bins[bins.length - 1];
    
    for (let i = 0; i < bins.length - 1; i++) {
      if (confidence >= bins[i].confidence && confidence <= bins[i + 1].confidence) {
        lowerBin = bins[i];
        upperBin = bins[i + 1];
        break;
      }
    }
    
    // Linear interpolation
    if (lowerBin.confidence === upperBin.confidence) {
      return lowerBin.actualRate;
    }
    
    const weight = (confidence - lowerBin.confidence) / (upperBin.confidence - lowerBin.confidence);
    return lowerBin.actualRate + weight * (upperBin.actualRate - lowerBin.actualRate);
  }

  getCalibrationStats(): Record<string, {totalOutcomes: number, calibrationError: number}> {
    const stats: Record<string, {totalOutcomes: number, calibrationError: number}> = {};
    
    for (const [riskLevel, data] of this.calibrationData) {
      const totalOutcomes = data.length;
      
      // Calculate calibration error (difference between predicted and actual rates)
      const bins = this.createCalibrationBins(data);
      const calibrationError = bins.reduce((sum, bin) => {
        return sum + Math.abs(bin.confidence - bin.actualRate);
      }, 0) / bins.length;
      
      stats[riskLevel] = { totalOutcomes, calibrationError };
    }
    
    return stats;
  }

  // Consensus handling for multi-agent decision making
  private async handleConsensusRequest(payload: ConsensusRequest & { responseId: string }): Promise<void> {
    const { requestId, routes, assessments, strategies, criteria, responseId } = payload;
    
    console.log('🎯 [EXECUTION STRATEGY AGENT] Handling consensus request:', {
      requestId,
      routeCount: routes.length,
      assessmentCount: assessments.length,
      strategyCount: strategies.length,
      criteria
    });

    // Analyze each route from execution strategy perspective
    const routeScores: { routeId: string; score: DecisionScore; confidence: number; reasoning: string[] }[] = [];

    for (const route of routes) {
      const routeAssessment = assessments.find(a => a.routeId === route.id);
      const routeStrategy = strategies.find(s => s.routeId === route.id);
      
      const score = await this.evaluateRouteForConsensus(route, routeAssessment, routeStrategy, criteria);
      routeScores.push(score);
    }

    // Select the best route based on execution strategy criteria
    const bestRoute = routeScores.reduce((best, current) => 
      current.score.totalScore > best.score.totalScore ? current : best
    );

    console.log('🎯 [EXECUTION STRATEGY AGENT] Best route selected:', {
      routeId: bestRoute.routeId,
      totalScore: bestRoute.score.totalScore,
      confidence: bestRoute.confidence
    });

    // Create consensus response
    const consensusResponse = {
      responseId,  // Fixed: use responseId not requestId
      agentId: this.config.id,
      recommendedRoute: bestRoute.routeId,
      score: bestRoute.score,
      confidence: bestRoute.confidence,
      reasoning: bestRoute.reasoning
    };

    // Send response back to coordinator
    const responseMessage: AgentMessage = {
      id: `consensus-response-${Date.now()}`,
      from: this.config.id,
      to: 'coordinator',
      type: MessageType.CONSENSUS_REQUEST, // Send back as same type with response payload
      payload: { ...consensusResponse, responseId },
      timestamp: Date.now(),
      priority: MessagePriority.HIGH
    };

    console.log('📤 [EXECUTION STRATEGY AGENT] Sending consensus response:', {
      recommendedRoute: consensusResponse.recommendedRoute,
      confidence: consensusResponse.confidence,
      responseId
    });

    // Emit the response message
    this.emit('message', responseMessage);
  }

  private async evaluateRouteForConsensus(
    route: RouteProposal,
    assessment: RiskAssessment | undefined,
    strategy: ExecutionStrategy | undefined,
    criteria: DecisionCriteria
  ): Promise<{ routeId: string; score: DecisionScore; confidence: number; reasoning: string[] }> {
    const reasoning: string[] = [];
    
    // Cost evaluation (lower estimated gas = higher score)
    const gasCost = parseFloat(route.estimatedGas) || 200000;
    const costScore = Math.max(0, 1 - (gasCost / 500000)); // Normalize against 500k gas
    reasoning.push(`Gas cost: ${gasCost} units (score: ${(costScore * 100).toFixed(0)}%)`);

    // Time evaluation (faster execution = higher score)
    const timeScore = Math.max(0, 1 - (route.estimatedTime / 600)); // Normalize against 10 minutes
    reasoning.push(`Execution time: ${route.estimatedTime}s (score: ${(timeScore * 100).toFixed(0)}%)`);

    // Security evaluation (MEV protection + low risk = higher score)
    let securityScore = 0.5; // Default
    if (route.advantages.some(adv => adv.toLowerCase().includes('mev'))) {
      securityScore += 0.3;
      reasoning.push('MEV protection detected (+30%)');
    }
    if (assessment) {
      const riskPenalty = assessment.overallRisk * 0.4;
      securityScore = Math.max(0, securityScore - riskPenalty);
      reasoning.push(`Risk assessment: ${(assessment.overallRisk * 100).toFixed(0)}% risk (-${(riskPenalty * 100).toFixed(0)}%)`);
    }

    // Reliability evaluation (confidence + established protocols = higher score)
    const reliabilityScore = route.confidence;
    reasoning.push(`Route confidence: ${(route.confidence * 100).toFixed(0)}%`);

    // Slippage evaluation (price impact consideration)
    const priceImpact = parseFloat(route.priceImpact) || 0.001;
    const slippageScore = Math.max(0, 1 - (priceImpact * 100)); // Penalize high price impact
    reasoning.push(`Price impact: ${(priceImpact * 100).toFixed(2)}% (score: ${(slippageScore * 100).toFixed(0)}%)`);

    // Calculate weighted total score
    const totalScore = 
      (costScore * criteria.cost) +
      (timeScore * criteria.time) +
      (securityScore * criteria.security) +
      (reliabilityScore * criteria.reliability) +
      (slippageScore * criteria.slippage);

    const decisionScore: DecisionScore = {
      routeId: route.id,
      totalScore,
      breakdown: {
        cost: costScore,
        time: timeScore,
        security: securityScore,
        reliability: reliabilityScore,
        slippage: slippageScore
      },
      reasoning
    };

    // Calculate confidence based on data availability and quality
    let confidence = 0.7; // Base confidence
    if (assessment) confidence += 0.1; // Bonus for risk assessment
    if (strategy) confidence += 0.1; // Bonus for execution strategy
    if (route.advantages.length > 2) confidence += 0.05; // Bonus for detailed advantages
    if (route.path.length > 0) confidence += 0.05; // Bonus for detailed path
    confidence = Math.min(0.95, confidence); // Cap at 95%

    return {
      routeId: route.id,
      score: decisionScore,
      confidence,
      reasoning
    };
  }
}