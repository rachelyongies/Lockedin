// 📈 Performance Monitor Agent - Success tracking and analytics
// Provides comprehensive performance monitoring and analytics for the agent system

import { BaseAgent } from './BaseAgent';
import { 
  AgentMessage,
  RouteProposal,
  ExecutionStrategy,
  RiskAssessment,
  MarketConditions,
  MessageType,
  MessagePriority,
  PerformanceData
} from './types';

interface ExecutionMetrics {
  executionId: string;
  routeId: string;
  timestamp: number;
  duration: number; // milliseconds
  success: boolean;
  
  // Cost Metrics
  expectedCost: number;
  actualCost: number;
  costDelta: number;
  gasSaved: number;
  
  // Slippage Metrics
  expectedSlippage: number;
  actualSlippage: number;
  slippageDelta: number;
  
  // MEV Metrics
  mevRiskLevel: string;
  mevDetected: boolean;
  mevImpact: number;
  protectionEffectiveness: number;
  
  // Timing Metrics
  expectedTime: number;
  actualTime: number;
  timingAccuracy: number;
  
  // Route Metrics
  routeComplexity: number;
  protocolsUsed: string[];
  failurePoint?: string;
  
  // Market Conditions
  marketVolatility: number;
  gasPrice: number;
  networkCongestion: number;
}

interface AgentPerformance {
  agentId: string;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  lastError?: string;
  uptime: number;
  
  // Specialized metrics per agent type
  specializedMetrics: Record<string, number>;
}

interface SystemPerformance {
  totalExecutions: number;
  overallSuccessRate: number;
  averageCostSavings: number;
  averageSlippageAccuracy: number;
  mevProtectionRate: number;
  systemUptime: number;
  
  // Performance trends
  hourlyMetrics: HourlyMetrics[];
  dailyMetrics: DailyMetrics[];
  
  // Top performers
  bestRoutes: RoutePerformance[];
  worstRoutes: RoutePerformance[];
  agentRankings: AgentRanking[];
}

interface HourlyMetrics {
  timestamp: number;
  executionCount: number;
  successRate: number;
  averageCost: number;
  averageSlippage: number;
  mevIncidents: number;
}

interface DailyMetrics {
  date: string;
  totalExecutions: number;
  totalSavings: number;
  averageSuccessRate: number;
  uniqueUsers: number;
  topProtocols: string[];
}

interface RoutePerformance {
  routeSignature: string;
  protocols: string[];
  executionCount: number;
  successRate: number;
  averageCost: number;
  averageSlippage: number;
  totalSavings: number;
  rating: number;
}

interface AgentRanking {
  agentId: string;
  agentType: string;
  performanceScore: number;
  reliability: number;
  accuracy: number;
  efficiency: number;
  rank: number;
}

interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'cost' | 'security' | 'reliability';
  title: string;
  description: string;
  affectedAgent?: string;
  metrics: Record<string, number>;
  actionRequired: boolean;
  autoResolved: boolean;
}

interface PerformanceInsight {
  type: 'trend' | 'anomaly' | 'optimization' | 'prediction';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  recommendation: string;
  data: Record<string, any>;
}

export class PerformanceMonitorAgent extends BaseAgent {
  private executionMetrics: Map<string, ExecutionMetrics> = new Map();
  private agentPerformance: Map<string, AgentPerformance> = new Map();
  private systemPerformance: SystemPerformance;
  private performanceAlerts: PerformanceAlert[] = [];
  private performanceInsights: PerformanceInsight[] = [];
  
  // Analysis components
  private trendAnalyzer: TrendAnalyzer;
  private anomalyDetector: AnomalyDetector;
  private insightGenerator: InsightGenerator;
  private alertManager: AlertManager;
  
  // Configuration
  private config = {
    maxMetricsRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
    alertThresholds: {
      successRate: 0.95,
      responseTime: 5000, // ms
      errorRate: 0.05,
      costDeviation: 0.20, // 20%
      slippageDeviation: 0.50 // 50%
    },
    insightUpdateInterval: 5 * 60 * 1000, // 5 minutes
    alertCheckInterval: 1 * 60 * 1000, // 1 minute
    performanceWindowSize: 100 // executions
  };

  constructor() {
    super('PerformanceMonitorAgent');
    
    this.systemPerformance = {
      totalExecutions: 0,
      overallSuccessRate: 0,
      averageCostSavings: 0,
      averageSlippageAccuracy: 0,
      mevProtectionRate: 0,
      systemUptime: 0,
      hourlyMetrics: [],
      dailyMetrics: [],
      bestRoutes: [],
      worstRoutes: [],
      agentRankings: []
    };
    
    this.trendAnalyzer = new TrendAnalyzer();
    this.anomalyDetector = new AnomalyDetector();
    this.insightGenerator = new InsightGenerator();
    this.alertManager = new AlertManager();
    
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Set up periodic analysis
    setInterval(() => this.updateInsights(), this.config.insightUpdateInterval);
    setInterval(() => this.checkAlerts(), this.config.alertCheckInterval);
    setInterval(() => this.cleanOldData(), 60 * 60 * 1000); // Every hour
    
    console.log('📈 Performance monitoring started');
  }

  // ===== EXECUTION TRACKING =====

  async recordExecution(
    executionId: string,
    route: RouteProposal,
    strategy: ExecutionStrategy,
    actualResults: {
      success: boolean;
      duration: number;
      actualCost: number;
      actualSlippage: number;
      actualTime: number;
      mevDetected: boolean;
      mevImpact: number;
      protectionEffectiveness: number;
      failurePoint?: string;
    },
    marketConditions: MarketConditions
  ): Promise<void> {
    console.log(`📊 Recording execution ${executionId}...`);

    const metrics: ExecutionMetrics = {
      executionId,
      routeId: route.id,
      timestamp: Date.now(),
      duration: actualResults.duration,
      success: actualResults.success,
      
      // Cost metrics
      expectedCost: parseFloat(strategy.gasStrategy.estimatedCost),
      actualCost: actualResults.actualCost,
      costDelta: Math.abs(actualResults.actualCost - parseFloat(strategy.gasStrategy.estimatedCost)),
      gasSaved: Math.max(0, parseFloat(strategy.gasStrategy.estimatedCost) - actualResults.actualCost),
      
      // Slippage metrics
      expectedSlippage: parseFloat(route.priceImpact),
      actualSlippage: actualResults.actualSlippage,
      slippageDelta: Math.abs(actualResults.actualSlippage - parseFloat(route.priceImpact)),
      
      // MEV metrics
      mevRiskLevel: strategy.mevProtection.strategy,
      mevDetected: actualResults.mevDetected,
      mevImpact: actualResults.mevImpact,
      protectionEffectiveness: actualResults.protectionEffectiveness,
      
      // Timing metrics
      expectedTime: route.estimatedTime,
      actualTime: actualResults.actualTime,
      timingAccuracy: 1 - Math.abs(actualResults.actualTime - route.estimatedTime) / route.estimatedTime,
      
      // Route metrics
      routeComplexity: route.path.length,
      protocolsUsed: route.path.map(p => p.protocol),
      failurePoint: actualResults.failurePoint,
      
      // Market conditions
      marketVolatility: marketConditions.volatility.overall,
      gasPrice: parseFloat(strategy.gasStrategy.gasPrice),
      networkCongestion: marketConditions.networkCongestion || 0.5
    };

    this.executionMetrics.set(executionId, metrics);
    await this.updateSystemPerformance(metrics);
    
    // Generate immediate insights if significant
    await this.checkForImmediateInsights(metrics);
    
    console.log(`✅ Execution ${executionId} recorded`);
  }

  async recordAgentPerformance(
    agentId: string,
    agentType: string,
    performance: {
      requestCount: number;
      successCount: number;
      responseTime: number;
      errorCount: number;
      lastError?: string;
      specializedMetrics?: Record<string, number>;
    }
  ): Promise<void> {
    let agentPerf = this.agentPerformance.get(agentId);
    
    if (!agentPerf) {
      agentPerf = {
        agentId,
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
        uptime: 1.0,
        specializedMetrics: {}
      };
    }

    // Update metrics with exponential moving average
    const alpha = 0.1; // Smoothing factor
    
    agentPerf.totalRequests += performance.requestCount;
    agentPerf.successRate = alpha * (performance.successCount / performance.requestCount) + 
                           (1 - alpha) * agentPerf.successRate;
    agentPerf.averageResponseTime = alpha * performance.responseTime + 
                                   (1 - alpha) * agentPerf.averageResponseTime;
    agentPerf.errorRate = alpha * (performance.errorCount / performance.requestCount) + 
                         (1 - alpha) * agentPerf.errorRate;
    
    if (performance.lastError) {
      agentPerf.lastError = performance.lastError;
    }
    
    if (performance.specializedMetrics) {
      agentPerf.specializedMetrics = { ...agentPerf.specializedMetrics, ...performance.specializedMetrics };
    }

    this.agentPerformance.set(agentId, agentPerf);
    
    // Check for agent-specific alerts
    await this.checkAgentAlerts(agentId, agentPerf);
  }

  // ===== PERFORMANCE ANALYSIS =====

  private async updateSystemPerformance(metrics: ExecutionMetrics): Promise<void> {
    const perf = this.systemPerformance;
    
    // Update running totals
    perf.totalExecutions++;
    
    // Exponential moving averages
    const alpha = 1 / Math.min(perf.totalExecutions, this.config.performanceWindowSize);
    
    perf.overallSuccessRate = alpha * (metrics.success ? 1 : 0) + (1 - alpha) * perf.overallSuccessRate;
    perf.averageCostSavings = alpha * metrics.gasSaved + (1 - alpha) * perf.averageCostSavings;
    perf.averageSlippageAccuracy = alpha * (1 - metrics.slippageDelta) + (1 - alpha) * perf.averageSlippageAccuracy;
    perf.mevProtectionRate = alpha * (metrics.mevDetected ? metrics.protectionEffectiveness : 1) + 
                            (1 - alpha) * perf.mevProtectionRate;
    
    // Update hourly metrics
    await this.updateHourlyMetrics(metrics);
    
    // Update daily metrics
    await this.updateDailyMetrics(metrics);
    
    // Update route rankings
    await this.updateRouteRankings(metrics);
  }

  private async updateHourlyMetrics(metrics: ExecutionMetrics): Promise<void> {
    const now = Date.now();
    const hourStart = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
    
    let hourlyMetric = this.systemPerformance.hourlyMetrics.find(h => h.timestamp === hourStart);
    
    if (!hourlyMetric) {
      hourlyMetric = {
        timestamp: hourStart,
        executionCount: 0,
        successRate: 0,
        averageCost: 0,
        averageSlippage: 0,
        mevIncidents: 0
      };
      this.systemPerformance.hourlyMetrics.push(hourlyMetric);
      
      // Keep only last 48 hours
      this.systemPerformance.hourlyMetrics = this.systemPerformance.hourlyMetrics
        .filter(h => h.timestamp > now - 48 * 60 * 60 * 1000)
        .sort((a, b) => a.timestamp - b.timestamp);
    }
    
    // Update with running average
    const count = hourlyMetric.executionCount + 1;
    const weight = 1 / count;
    
    hourlyMetric.executionCount = count;
    hourlyMetric.successRate = weight * (metrics.success ? 1 : 0) + (1 - weight) * hourlyMetric.successRate;
    hourlyMetric.averageCost = weight * metrics.actualCost + (1 - weight) * hourlyMetric.averageCost;
    hourlyMetric.averageSlippage = weight * metrics.actualSlippage + (1 - weight) * hourlyMetric.averageSlippage;
    
    if (metrics.mevDetected) {
      hourlyMetric.mevIncidents++;
    }
  }

  private async updateDailyMetrics(metrics: ExecutionMetrics): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    let dailyMetric = this.systemPerformance.dailyMetrics.find(d => d.date === today);
    
    if (!dailyMetric) {
      dailyMetric = {
        date: today,
        totalExecutions: 0,
        totalSavings: 0,
        averageSuccessRate: 0,
        uniqueUsers: 0,
        topProtocols: []
      };
      this.systemPerformance.dailyMetrics.push(dailyMetric);
      
      // Keep only last 30 days
      this.systemPerformance.dailyMetrics = this.systemPerformance.dailyMetrics.slice(-30);
    }
    
    dailyMetric.totalExecutions++;
    dailyMetric.totalSavings += metrics.gasSaved;
    
    const count = dailyMetric.totalExecutions;
    const weight = 1 / count;
    dailyMetric.averageSuccessRate = weight * (metrics.success ? 1 : 0) + (1 - weight) * dailyMetric.averageSuccessRate;
    
    // Update top protocols
    const protocolCounts = new Map<string, number>();
    metrics.protocolsUsed.forEach(protocol => {
      protocolCounts.set(protocol, (protocolCounts.get(protocol) || 0) + 1);
    });
    
    dailyMetric.topProtocols = Array.from(protocolCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([protocol]) => protocol);
  }

  private async updateRouteRankings(metrics: ExecutionMetrics): Promise<void> {
    const routeSignature = metrics.protocolsUsed.join('-');
    
    let routePerf = this.systemPerformance.bestRoutes.find(r => r.routeSignature === routeSignature);
    
    if (!routePerf) {
      routePerf = {
        routeSignature,
        protocols: metrics.protocolsUsed,
        executionCount: 0,
        successRate: 0,
        averageCost: 0,
        averageSlippage: 0,
        totalSavings: 0,
        rating: 0
      };
      this.systemPerformance.bestRoutes.push(routePerf);
    }
    
    // Update with running averages
    const count = routePerf.executionCount + 1;
    const weight = 1 / count;
    
    routePerf.executionCount = count;
    routePerf.successRate = weight * (metrics.success ? 1 : 0) + (1 - weight) * routePerf.successRate;
    routePerf.averageCost = weight * metrics.actualCost + (1 - weight) * routePerf.averageCost;
    routePerf.averageSlippage = weight * metrics.actualSlippage + (1 - weight) * routePerf.averageSlippage;
    routePerf.totalSavings += metrics.gasSaved;
    
    // Calculate composite rating
    routePerf.rating = (
      routePerf.successRate * 0.4 +
      (1 - routePerf.averageSlippage) * 0.3 +
      Math.min(1, routePerf.totalSavings / 100) * 0.3
    );
    
    // Sort and keep top/worst routes
    this.systemPerformance.bestRoutes.sort((a, b) => b.rating - a.rating);
    this.systemPerformance.worstRoutes = [...this.systemPerformance.bestRoutes].reverse().slice(0, 10);
    this.systemPerformance.bestRoutes = this.systemPerformance.bestRoutes.slice(0, 10);
  }

  // ===== INSIGHTS AND ALERTS =====

  private async updateInsights(): Promise<void> {
    console.log('🔍 Updating performance insights...');
    
    const newInsights: PerformanceInsight[] = [];
    
    // Trend analysis
    const trends = await this.trendAnalyzer.analyzeTrends(this.systemPerformance.hourlyMetrics);
    newInsights.push(...trends);
    
    // Anomaly detection
    const anomalies = await this.anomalyDetector.detectAnomalies(Array.from(this.executionMetrics.values()));
    newInsights.push(...anomalies);
    
    // Optimization opportunities
    const optimizations = await this.insightGenerator.generateOptimizations(
      this.systemPerformance,
      this.agentPerformance
    );
    newInsights.push(...optimizations);
    
    // Performance predictions
    const predictions = await this.insightGenerator.generatePredictions(this.systemPerformance.hourlyMetrics);
    newInsights.push(...predictions);
    
    // Update insights (keep last 50)
    this.performanceInsights = [...newInsights, ...this.performanceInsights].slice(0, 50);
    
    console.log(`✅ Generated ${newInsights.length} new insights`);
  }

  private async checkAlerts(): Promise<void> {
    const newAlerts: PerformanceAlert[] = [];
    
    // System-level alerts
    if (this.systemPerformance.overallSuccessRate < this.config.alertThresholds.successRate) {
      newAlerts.push({
        id: `system-success-${Date.now()}`,
        timestamp: Date.now(),
        severity: 'error',
        category: 'performance',
        title: 'Low System Success Rate',
        description: `Overall success rate (${(this.systemPerformance.overallSuccessRate * 100).toFixed(1)}%) below threshold`,
        metrics: { successRate: this.systemPerformance.overallSuccessRate },
        actionRequired: true,
        autoResolved: false
      });
    }
    
    // Agent-level alerts are checked in recordAgentPerformance
    
    // Add new alerts
    this.performanceAlerts.push(...newAlerts);
    
    // Clean resolved alerts older than 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.performanceAlerts = this.performanceAlerts.filter(alert => 
      !alert.autoResolved || alert.timestamp > cutoff
    );
  }

  private async checkAgentAlerts(agentId: string, performance: AgentPerformance): Promise<void> {
    const alerts: PerformanceAlert[] = [];
    
    if (performance.successRate < this.config.alertThresholds.successRate) {
      alerts.push({
        id: `agent-success-${agentId}-${Date.now()}`,
        timestamp: Date.now(),
        severity: 'warning',
        category: 'performance',
        title: 'Agent Low Success Rate',
        description: `Agent ${agentId} success rate (${(performance.successRate * 100).toFixed(1)}%) below threshold`,
        affectedAgent: agentId,
        metrics: { successRate: performance.successRate },
        actionRequired: true,
        autoResolved: false
      });
    }
    
    if (performance.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        id: `agent-error-${agentId}-${Date.now()}`,
        timestamp: Date.now(),
        severity: 'error',
        category: 'reliability',
        title: 'Agent High Error Rate',
        description: `Agent ${agentId} error rate (${(performance.errorRate * 100).toFixed(1)}%) above threshold`,
        affectedAgent: agentId,
        metrics: { errorRate: performance.errorRate },
        actionRequired: true,
        autoResolved: false
      });
    }
    
    if (performance.averageResponseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        id: `agent-latency-${agentId}-${Date.now()}`,
        timestamp: Date.now(),
        severity: 'warning',
        category: 'performance',
        title: 'Agent High Response Time',
        description: `Agent ${agentId} response time (${performance.averageResponseTime.toFixed(0)}ms) above threshold`,
        affectedAgent: agentId,
        metrics: { responseTime: performance.averageResponseTime },
        actionRequired: false,
        autoResolved: false
      });
    }
    
    this.performanceAlerts.push(...alerts);
  }

  private async checkForImmediateInsights(metrics: ExecutionMetrics): Promise<void> {
    const insights: PerformanceInsight[] = [];
    
    // High cost deviation
    if (metrics.costDelta > metrics.expectedCost * this.config.alertThresholds.costDeviation) {
      insights.push({
        type: 'anomaly',
        title: 'Significant Cost Deviation Detected',
        description: `Execution cost deviated by ${((metrics.costDelta / metrics.expectedCost) * 100).toFixed(1)}% from prediction`,
        impact: 'medium',
        confidence: 0.9,
        recommendation: 'Review gas estimation algorithms and market conditions',
        data: { costDelta: metrics.costDelta, expectedCost: metrics.expectedCost }
      });
    }
    
    // High slippage deviation
    if (metrics.slippageDelta > metrics.expectedSlippage * this.config.alertThresholds.slippageDeviation) {
      insights.push({
        type: 'anomaly',
        title: 'Significant Slippage Deviation Detected',
        description: `Slippage deviated by ${((metrics.slippageDelta / metrics.expectedSlippage) * 100).toFixed(1)}% from prediction`,
        impact: 'high',
        confidence: 0.85,
        recommendation: 'Review liquidity analysis and market timing strategies',
        data: { slippageDelta: metrics.slippageDelta, expectedSlippage: metrics.expectedSlippage }
      });
    }
    
    // MEV attack detected
    if (metrics.mevDetected) {
      insights.push({
        type: 'anomaly',
        title: 'MEV Attack Detected',
        description: `MEV attack caused $${metrics.mevImpact.toFixed(2)} impact despite ${metrics.mevRiskLevel} protection`,
        impact: 'high',
        confidence: 1.0,
        recommendation: 'Enhance MEV protection strategies and detection algorithms',
        data: { mevImpact: metrics.mevImpact, protectionType: metrics.mevRiskLevel }
      });
    }
    
    this.performanceInsights.unshift(...insights);
  }

  private cleanOldData(): void {
    const cutoff = Date.now() - this.config.maxMetricsRetention;
    
    // Clean old execution metrics
    for (const [id, metrics] of this.executionMetrics) {
      if (metrics.timestamp < cutoff) {
        this.executionMetrics.delete(id);
      }
    }
    
    console.log(`🧹 Cleaned old performance data. Retaining ${this.executionMetrics.size} execution records`);
  }

  // ===== PUBLIC API =====

  getSystemPerformance(): SystemPerformance {
    return { ...this.systemPerformance };
  }

  getAgentPerformance(): Map<string, AgentPerformance> {
    return new Map(this.agentPerformance);
  }

  getRecentExecutions(limit: number = 20): ExecutionMetrics[] {
    return Array.from(this.executionMetrics.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getPerformanceInsights(): PerformanceInsight[] {
    return [...this.performanceInsights];
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.performanceAlerts.filter(alert => !alert.autoResolved);
  }

  async generatePerformanceReport(): Promise<{
    summary: Record<string, any>;
    trends: Record<string, any>;
    insights: PerformanceInsight[];
    recommendations: string[];
  }> {
    const recentExecutions = this.getRecentExecutions(100);
    const activeAlerts = this.getActiveAlerts();
    
    return {
      summary: {
        totalExecutions: this.systemPerformance.totalExecutions,
        successRate: this.systemPerformance.overallSuccessRate,
        averageCostSavings: this.systemPerformance.averageCostSavings,
        mevProtectionRate: this.systemPerformance.mevProtectionRate,
        activeAlerts: activeAlerts.length,
        topProtocols: this.systemPerformance.dailyMetrics[0]?.topProtocols || []
      },
      trends: {
        hourlySuccess: this.systemPerformance.hourlyMetrics.map(h => ({
          time: h.timestamp,
          rate: h.successRate
        })),
        dailySavings: this.systemPerformance.dailyMetrics.map(d => ({
          date: d.date,
          savings: d.totalSavings
        }))
      },
      insights: this.performanceInsights.slice(0, 10),
      recommendations: this.generateRecommendations()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.systemPerformance.overallSuccessRate < 0.9) {
      recommendations.push('Improve overall system reliability - success rate below 90%');
    }
    
    if (this.systemPerformance.averageSlippageAccuracy < 0.8) {
      recommendations.push('Enhance slippage prediction accuracy');
    }
    
    const recentAlerts = this.performanceAlerts.filter(a => 
      a.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );
    
    if (recentAlerts.length > 10) {
      recommendations.push('High alert volume - review system monitoring thresholds');
    }
    
    return recommendations;
  }
}

// ===== ANALYSIS COMPONENTS =====

class TrendAnalyzer {
  async analyzeTrends(hourlyMetrics: HourlyMetrics[]): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    if (hourlyMetrics.length < 24) return insights; // Need at least 24 hours
    
    const recent24h = hourlyMetrics.slice(-24);
    const previous24h = hourlyMetrics.slice(-48, -24);
    
    // Success rate trend
    const recentSuccessRate = recent24h.reduce((sum, h) => sum + h.successRate, 0) / recent24h.length;
    const previousSuccessRate = previous24h.reduce((sum, h) => sum + h.successRate, 0) / previous24h.length;
    
    if (recentSuccessRate < previousSuccessRate - 0.05) {
      insights.push({
        type: 'trend',
        title: 'Declining Success Rate Trend',
        description: `Success rate decreased by ${((previousSuccessRate - recentSuccessRate) * 100).toFixed(1)}% over 24h`,
        impact: 'high',
        confidence: 0.8,
        recommendation: 'Investigate recent changes and market conditions',
        data: { current: recentSuccessRate, previous: previousSuccessRate }
      });
    }
    
    return insights;
  }
}

class AnomalyDetector {
  async detectAnomalies(executions: ExecutionMetrics[]): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    if (executions.length < 10) return insights;
    
    // Cost anomalies using z-score
    const costs = executions.map(e => e.actualCost);
    const costMean = costs.reduce((sum, c) => sum + c, 0) / costs.length;
    const costStd = Math.sqrt(costs.reduce((sum, c) => sum + Math.pow(c - costMean, 2), 0) / costs.length);
    
    const recentExecution = executions[executions.length - 1];
    const costZScore = Math.abs((recentExecution.actualCost - costMean) / costStd);
    
    if (costZScore > 3) {
      insights.push({
        type: 'anomaly',
        title: 'Cost Anomaly Detected',
        description: `Execution cost (${recentExecution.actualCost.toFixed(4)}) is ${costZScore.toFixed(1)} standard deviations from normal`,
        impact: 'medium',
        confidence: 0.9,
        recommendation: 'Review gas price conditions and route complexity',
        data: { cost: recentExecution.actualCost, zScore: costZScore }
      });
    }
    
    return insights;
  }
}

class InsightGenerator {
  async generateOptimizations(
    systemPerf: SystemPerformance,
    agentPerf: Map<string, AgentPerformance>
  ): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    // Identify underperforming agents
    const agents = Array.from(agentPerf.values()).sort((a, b) => a.successRate - b.successRate);
    const worstAgent = agents[0];
    
    if (worstAgent && worstAgent.successRate < 0.8) {
      insights.push({
        type: 'optimization',
        title: 'Agent Performance Optimization Opportunity',
        description: `Agent ${worstAgent.agentId} has ${(worstAgent.successRate * 100).toFixed(1)}% success rate`,
        impact: 'medium',
        confidence: 0.7,
        recommendation: 'Review agent logic and increase error handling',
        data: { agentId: worstAgent.agentId, successRate: worstAgent.successRate }
      });
    }
    
    return insights;
  }

  async generatePredictions(hourlyMetrics: HourlyMetrics[]): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    if (hourlyMetrics.length < 12) return insights;
    
    const recent = hourlyMetrics.slice(-12);
    const trend = this.calculateLinearTrend(recent.map(h => h.successRate));
    
    if (trend.slope < -0.01) {
      const hoursToThreshold = Math.max(1, Math.ceil((0.9 - trend.intercept) / trend.slope));
      
      insights.push({
        type: 'prediction',
        title: 'Performance Degradation Predicted',
        description: `Current trend suggests success rate will reach 90% threshold in ~${hoursToThreshold} hours`,
        impact: 'high',
        confidence: 0.6,
        recommendation: 'Proactive intervention recommended to prevent performance degradation',
        data: { slope: trend.slope, hoursToThreshold }
      });
    }
    
    return insights;
  }

  private calculateLinearTrend(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }
}

class AlertManager {
  // Alert management functionality would be implemented here
  // For now, we handle alerts directly in the main class
}