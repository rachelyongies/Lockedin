import { Token, BridgeQuote, BridgeRoute } from '@/types/bridge';

// AI Smart Routing Types
export interface RouteAnalysis {
  route: BridgeRoute;
  confidenceScore: number; // 0-1
  savingsEstimate: number; // in USD
  riskScore: number; // 0-1 (lower is better)
  executionTime: number; // estimated seconds
  gasOptimization: number; // percentage saved
}

export interface MarketConditions {
  networkCongestion: number; // 0-1 (Ethereum network congestion)
  volatility: number; // price volatility indicator
  liquidity: number; // available liquidity depth
  feeLevel: 'low' | 'medium' | 'high';
  timeOfDay: number; // 0-23 hour
  dayOfWeek: number; // 0-6
}

export interface HistoricalData {
  timestamp: number;
  fromToken: string;
  toToken: string;
  amount: number;
  executionTime: number;
  gasCost: number;
  slippage: number;
  success: boolean;
  route: string[];
}

export interface MLPrediction {
  optimalSlippage: number;
  predictedGasCost: number;
  successProbability: number;
  estimatedTime: number;
  recommendedRoute: string[];
}

// Neural Network-like scoring system for route optimization
class RouteOptimizer {
  private weights = {
    time: 0.25,
    cost: 0.35,
    security: 0.20,
    liquidity: 0.20
  };

  // Simulate ML-based route scoring
  private calculateRouteScore(
    route: BridgeRoute,
    conditions: MarketConditions,
    historical: HistoricalData[]
  ): number {
    // Time score (faster is better)
    const timeScore = Math.max(0, 1 - (route.estimatedTime.minutes / 60));
    
    // Cost score (cheaper is better) 
    const totalFee = route.fees.network.amountUSD + route.fees.protocol.amountUSD;
    const costScore = Math.max(0, 1 - (totalFee / 1000)); // Normalize to $1000 max
    
    // Security score (based on route reliability)
    const securityScore = this.calculateSecurityScore(route, historical);
    
    // Liquidity score
    const liquidityScore = Math.min(1, conditions.liquidity);
    
    return (
      this.weights.time * timeScore +
      this.weights.cost * costScore +
      this.weights.security * securityScore +
      this.weights.liquidity * liquidityScore
    );
  }

  private calculateSecurityScore(route: BridgeRoute, historical: HistoricalData[]): number {
    // Analyze historical success rate for this route type
    const relevantData = historical.filter(h => 
      h.route.join('->') === `${route.from.symbol}->${route.to.symbol}`
    );
    
    if (relevantData.length === 0) return 0.7; // Default moderate score
    
    const successRate = relevantData.filter(h => h.success).length / relevantData.length;
    const avgTime = relevantData.reduce((sum, h) => sum + h.executionTime, 0) / relevantData.length;
    
    // Factor in consistency (lower variance = higher security)
    const timeVariance = this.calculateVariance(relevantData.map(h => h.executionTime));
    const consistencyScore = Math.max(0, 1 - (timeVariance / 10000)); // Normalize
    
    return (successRate * 0.7) + (consistencyScore * 0.3);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  optimizeRoute(
    routes: BridgeRoute[],
    conditions: MarketConditions,
    historical: HistoricalData[]
  ): RouteAnalysis[] {
    return routes.map(route => {
      const score = this.calculateRouteScore(route, conditions, historical);
      const savings = this.estimateSavings(route, conditions);
      const risk = this.calculateRiskScore(route, conditions, historical);
      
      return {
        route,
        confidenceScore: score,
        savingsEstimate: savings,
        riskScore: risk,
        executionTime: this.predictExecutionTime(route, conditions),
        gasOptimization: this.calculateGasOptimization(route, conditions)
      };
    }).sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  private estimateSavings(route: BridgeRoute, conditions: MarketConditions): number {
    // Simulate savings calculation based on market conditions
    const baseFee = route.fees.network.amountUSD + route.fees.protocol.amountUSD;
    const congestionMultiplier = 1 + conditions.networkCongestion;
    const optimizedFee = baseFee / congestionMultiplier;
    
    return Math.max(0, baseFee - optimizedFee);
  }

  private calculateRiskScore(
    route: BridgeRoute,
    conditions: MarketConditions,
    historical: HistoricalData[]
  ): number {
    let riskScore = 0;
    
    // Network congestion risk
    riskScore += conditions.networkCongestion * 0.3;
    
    // Volatility risk
    riskScore += conditions.volatility * 0.3;
    
    // Liquidity risk (inverse of available liquidity)
    riskScore += (1 - conditions.liquidity) * 0.2;
    
    // Historical failure rate
    const relevantData = historical.filter(h => 
      h.route.join('->') === `${route.from.symbol}->${route.to.symbol}`
    );
    
    if (relevantData.length > 0) {
      const failureRate = relevantData.filter(h => !h.success).length / relevantData.length;
      riskScore += failureRate * 0.2;
    }
    
    return Math.min(1, riskScore);
  }

  private predictExecutionTime(route: BridgeRoute, conditions: MarketConditions): number {
    const baseTime = route.estimatedTime.minutes * 60; // Convert to seconds
    const congestionDelay = conditions.networkCongestion * 300; // Up to 5 min delay
    const volatilityDelay = conditions.volatility * 120; // Up to 2 min delay
    
    return baseTime + congestionDelay + volatilityDelay;
  }

  private calculateGasOptimization(route: BridgeRoute, conditions: MarketConditions): number {
    // Simulate gas optimization based on network conditions
    const baseOptimization = 0.15; // 15% base optimization
    const congestionBonus = (1 - conditions.networkCongestion) * 0.1; // Up to 10% more when less congested
    const timeBonus = conditions.timeOfDay >= 2 && conditions.timeOfDay <= 8 ? 0.05 : 0; // 5% bonus during low-activity hours
    
    return Math.min(0.3, baseOptimization + congestionBonus + timeBonus); // Max 30% optimization
  }
}

// Predictive Fee Estimation using ML-like algorithms
class FeePredictor {
  private historicalGasPrices: number[] = [];
  private volatilityWindow = 50; // Number of samples to consider
  
  // Simulate ML prediction for optimal gas price
  predictOptimalGasPrice(conditions: MarketConditions): number {
    const baseGasPrice = this.getCurrentGasPrice();
    
    // Time-based adjustment
    const timeMultiplier = this.getTimeBasedMultiplier(conditions.timeOfDay, conditions.dayOfWeek);
    
    // Congestion adjustment
    const congestionMultiplier = 1 + (conditions.networkCongestion * 0.5);
    
    // Volatility adjustment
    const volatilityMultiplier = 1 + (conditions.volatility * 0.3);
    
    const predictedPrice = baseGasPrice * timeMultiplier * congestionMultiplier * volatilityMultiplier;
    
    return Math.round(predictedPrice);
  }

  private getCurrentGasPrice(): number {
    // Simulate current gas price (in gwei)
    return 30 + Math.random() * 50; // 30-80 gwei range
  }

  private getTimeBasedMultiplier(hour: number, dayOfWeek: number): number {
    // Lower fees during off-peak hours (2 AM - 8 AM UTC)
    if (hour >= 2 && hour <= 8) return 0.8;
    
    // Higher fees during peak hours (14-18 UTC)
    if (hour >= 14 && hour <= 18) return 1.3;
    
    // Weekend adjustment (slightly lower)
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0.9;
    
    return 1.0; // Normal multiplier
  }

  // Predict slippage based on market conditions
  predictOptimalSlippage(
    amount: number,
    token: Token,
    conditions: MarketConditions
  ): number {
    const baseSlippage = 0.005; // 0.5%
    
    // Liquidity adjustment
    const liquidityAdjustment = (1 - conditions.liquidity) * 0.02; // Up to 2% more slippage
    
    // Volatility adjustment
    const volatilityAdjustment = conditions.volatility * 0.015; // Up to 1.5% more slippage
    
    // Amount adjustment (larger amounts need more slippage)
    const amountAdjustment = Math.min(0.01, amount / 1000000); // Up to 1% for very large amounts
    
    const predictedSlippage = baseSlippage + liquidityAdjustment + volatilityAdjustment + amountAdjustment;
    
    return Math.min(0.05, predictedSlippage); // Max 5% slippage
  }
}

// Dynamic Slippage Engine
class DynamicSlippageEngine {
  private slippageHistory: Array<{
    timestamp: number;
    token: string;
    amount: number;
    expectedSlippage: number;
    actualSlippage: number;
  }> = [];

  calculateDynamicSlippage(
    fromToken: Token,
    toToken: Token,
    amount: number,
    conditions: MarketConditions
  ): number {
    const feePredictor = new FeePredictor();
    const baseSlippage = feePredictor.predictOptimalSlippage(amount, fromToken, conditions);
    
    // Learn from historical data
    const adjustment = this.getHistoricalAdjustment(fromToken.symbol, amount);
    
    // Market condition adjustments
    const marketAdjustment = this.getMarketAdjustment(conditions);
    
    const finalSlippage = baseSlippage + adjustment + marketAdjustment;
    
    return Math.max(0.001, Math.min(0.05, finalSlippage)); // Between 0.1% and 5%
  }

  private getHistoricalAdjustment(tokenSymbol: string, amount: number): number {
    const relevantHistory = this.slippageHistory.filter(h => 
      h.token === tokenSymbol && 
      Math.abs(h.amount - amount) / amount < 0.5 // Within 50% of amount
    );

    if (relevantHistory.length === 0) return 0;

    // Calculate average difference between expected and actual
    const avgDifference = relevantHistory.reduce((sum, h) => 
      sum + (h.actualSlippage - h.expectedSlippage), 0
    ) / relevantHistory.length;

    return avgDifference * 0.5; // Apply 50% of the learned adjustment
  }

  private getMarketAdjustment(conditions: MarketConditions): number {
    let adjustment = 0;

    // High volatility = more slippage needed
    if (conditions.volatility > 0.7) adjustment += 0.005;
    
    // Low liquidity = more slippage needed
    if (conditions.liquidity < 0.3) adjustment += 0.01;
    
    // High network congestion = more slippage needed
    if (conditions.networkCongestion > 0.8) adjustment += 0.003;

    return adjustment;
  }

  // Record actual slippage for learning
  recordSlippageResult(
    token: string,
    amount: number,
    expectedSlippage: number,
    actualSlippage: number
  ): void {
    this.slippageHistory.push({
      timestamp: Date.now(),
      token,
      amount,
      expectedSlippage,
      actualSlippage
    });

    // Keep only recent history (last 1000 records)
    if (this.slippageHistory.length > 1000) {
      this.slippageHistory = this.slippageHistory.slice(-1000);
    }
  }
}

// Main AI Smart Routing Service
export class AISmartRoutingService {
  private routeOptimizer = new RouteOptimizer();
  private feePredictor = new FeePredictor();
  private slippageEngine = new DynamicSlippageEngine();
  private historicalData: HistoricalData[] = [];

  async analyzeAndOptimizeRoutes(
    fromToken: Token,
    toToken: Token,
    amount: number,
    availableRoutes: BridgeRoute[]
  ): Promise<RouteAnalysis[]> {
    // Get current market conditions
    const conditions = await this.getCurrentMarketConditions();
    
    // Optimize routes using AI algorithms
    const optimizedRoutes = this.routeOptimizer.optimizeRoute(
      availableRoutes,
      conditions,
      this.historicalData
    );

    // Return optimized routes (fees are already properly structured)
    return optimizedRoutes;
  }

  async predictOptimalParameters(
    fromToken: Token,
    toToken: Token,
    amount: number
  ): Promise<MLPrediction> {
    const conditions = await this.getCurrentMarketConditions();
    
    return {
      optimalSlippage: this.slippageEngine.calculateDynamicSlippage(
        fromToken,
        toToken,
        amount,
        conditions
      ),
      predictedGasCost: this.feePredictor.predictOptimalGasPrice(conditions),
      successProbability: this.calculateSuccessProbability(fromToken, toToken, amount, conditions),
      estimatedTime: this.predictExecutionTime(fromToken, toToken, conditions),
      recommendedRoute: this.getRecommendedRoute(fromToken, toToken)
    };
  }

  private async getCurrentMarketConditions(): Promise<MarketConditions> {
    // In a real implementation, this would fetch from various APIs
    // For demo purposes, we'll simulate realistic conditions
    const now = new Date();
    
    return {
      networkCongestion: Math.random() * 0.8 + 0.1, // 0.1 to 0.9
      volatility: Math.random() * 0.6 + 0.1, // 0.1 to 0.7
      liquidity: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
      feeLevel: this.determineFeeLevel(),
      timeOfDay: now.getUTCHours(),
      dayOfWeek: now.getUTCDay()
    };
  }

  private determineFeeLevel(): 'low' | 'medium' | 'high' {
    const random = Math.random();
    if (random < 0.3) return 'low';
    if (random < 0.7) return 'medium';
    return 'high';
  }

  private calculateSuccessProbability(
    fromToken: Token,
    toToken: Token,
    amount: number,
    conditions: MarketConditions
  ): number {
    let probability = 0.95; // Base 95% success rate

    // Reduce probability based on risk factors
    if (conditions.networkCongestion > 0.8) probability -= 0.1;
    if (conditions.volatility > 0.7) probability -= 0.05;
    if (conditions.liquidity < 0.3) probability -= 0.1;
    if (amount > 100000) probability -= 0.05; // Large amounts are riskier

    return Math.max(0.5, probability);
  }

  private predictExecutionTime(
    fromToken: Token,
    toToken: Token,
    conditions: MarketConditions
  ): number {
    const baseTime = 300; // 5 minutes base time
    const congestionDelay = conditions.networkCongestion * 600; // Up to 10 min
    const volatilityDelay = conditions.volatility * 180; // Up to 3 min
    
    return baseTime + congestionDelay + volatilityDelay;
  }

  private getRecommendedRoute(fromToken: Token, toToken: Token): string[] {
    // Simplified route recommendation
    if (fromToken.network === toToken.network) {
      return [fromToken.symbol, toToken.symbol];
    }
    
    // Cross-chain route via bridge tokens
    return [fromToken.symbol, 'BRIDGE', toToken.symbol];
  }

  // Record transaction result for ML learning
  recordTransactionResult(
    fromToken: Token,
    toToken: Token,
    amount: number,
    route: string[],
    executionTime: number,
    gasCost: number,
    slippage: number,
    success: boolean
  ): void {
    this.historicalData.push({
      timestamp: Date.now(),
      fromToken: fromToken.symbol,
      toToken: toToken.symbol,
      amount,
      executionTime,
      gasCost,
      slippage,
      success,
      route
    });

    // Keep only recent data (last 10,000 transactions)
    if (this.historicalData.length > 10000) {
      this.historicalData = this.historicalData.slice(-10000);
    }
  }

  // Get AI-powered insights for the user
  getSmartInsights(analysis: RouteAnalysis[]): string[] {
    const insights: string[] = [];
    const bestRoute = analysis[0];

    if (bestRoute.gasOptimization > 0.2) {
      insights.push(`💡 AI detected ${(bestRoute.gasOptimization * 100).toFixed(1)}% gas savings opportunity`);
    }

    if (bestRoute.confidenceScore > 0.9) {
      insights.push(`🎯 High confidence route with ${(bestRoute.confidenceScore * 100).toFixed(1)}% success probability`);
    }

    if (bestRoute.savingsEstimate > 10) {
      insights.push(`💰 Estimated savings: $${bestRoute.savingsEstimate.toFixed(2)} compared to alternatives`);
    }

    if (bestRoute.riskScore < 0.2) {
      insights.push(`🛡️ Low risk route detected - optimal for large transactions`);
    }

    const executionMinutes = Math.round(bestRoute.executionTime / 60);
    insights.push(`⏱️ AI predicts ${executionMinutes} minute execution time`);

    return insights;
  }
}

// Export singleton instance
export const aiSmartRouting = new AISmartRoutingService();