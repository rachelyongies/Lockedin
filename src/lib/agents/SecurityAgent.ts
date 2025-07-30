// 🛡️ Security Agent - Advanced threat detection and system security monitoring
// Monitors all agents, correlates threats, and provides security intelligence

import { BaseAgent } from './BaseAgent';
import {
  AgentConfig,
  AgentMessage,
  MessageType,
  MessagePriority,
  AgentCapabilities,
  AgentError
} from './types';

// Security-specific types
export interface SecurityThreat {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: ThreatCategory;
  source: string; // agent ID or external
  description: string;
  evidence: ThreatEvidence[];
  impact: ThreatImpact;
  recommendations: string[];
  autoRecoverable: boolean;
  mitigationInProgress: boolean;
}

export enum ThreatCategory {
  ACCESS_VIOLATION = 'access_violation',
  RATE_LIMIT_ABUSE = 'rate_limit_abuse',
  MALFORMED_DATA = 'malformed_data',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  NETWORK_ANOMALY = 'network_anomaly',
  CONSENSUS_MANIPULATION = 'consensus_manipulation',
  MEV_ATTACK = 'mev_attack',
  ORACLE_MANIPULATION = 'oracle_manipulation',
  DOS_ATTEMPT = 'dos_attempt'
}

export interface ThreatEvidence {
  type: string;
  value: any;
  timestamp: number;
  agentId?: string;
}

export interface ThreatImpact {
  affectedAgents: string[];
  potentialLoss: string; // estimated value at risk
  operationalImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  dataIntegrity: boolean; // true if data may be compromised
}

export interface SecurityEvent {
  eventId: string;
  agentId: string;
  eventType: 'error' | 'status_change' | 'anomaly' | 'threshold_breach';
  data: any;
  timestamp: number;
}

export interface ThreatPattern {
  id: string;
  name: string;
  category: ThreatCategory;
  indicators: ThreatIndicator[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeWindow: number; // milliseconds
}

export interface ThreatIndicator {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'matches';
  value: any;
  weight: number;
}

// Security monitoring configuration
interface SecurityConfig extends AgentConfig {
  threatPatterns: ThreatPattern[];
  alertThresholds: {
    errorRate: number;
    authFailures: number;
    consensusDisagreement: number;
    responseTimeAnomaly: number;
  };
  correlationWindow: number; // time window for correlating events
  autoMitigationEnabled: boolean;
}

export class SecurityAgent extends BaseAgent {
  private securityEvents: Map<string, SecurityEvent[]> = new Map();
  private activeThreats: Map<string, SecurityThreat> = new Map();
  private threatPatterns: ThreatPattern[];
  private securityConfig: SecurityConfig;
  private eventCorrelationWindow: number;
  
  // Monitoring state
  private agentMetricsBaseline: Map<string, any> = new Map();
  private networkBaseline: any = {};
  private lastThreatScan: number = 0;

  constructor(config: Partial<SecurityConfig> = {}) {
    const securityCapabilities: AgentCapabilities = {
      canAnalyzeMarket: false,
      canDiscoverRoutes: false,
      canAssessRisk: true,
      canExecuteTransactions: false,
      canMonitorPerformance: true,
      supportedNetworks: ['all'],
      supportedProtocols: ['all']
    };

    const defaultConfig: SecurityConfig = {
      id: config.id || 'security-agent',
      name: config.name || 'System Security Monitor',
      version: '1.0.0',
      capabilities: ['monitor', 'analyze', 'alert', 'mitigate'],
      dependencies: [],
      maxConcurrentTasks: 20,
      timeout: 10000,
      threatPatterns: config.threatPatterns || SecurityAgent.getDefaultThreatPatterns(),
      alertThresholds: config.alertThresholds || {
        errorRate: 0.1, // 10% error rate
        authFailures: 3,
        consensusDisagreement: 0.3, // 30% disagreement
        responseTimeAnomaly: 2.0 // 2x baseline
      },
      correlationWindow: config.correlationWindow || 300000, // 5 minutes
      autoMitigationEnabled: config.autoMitigationEnabled ?? true
    };

    super(defaultConfig, securityCapabilities);
    
    this.securityConfig = defaultConfig;
    this.threatPatterns = defaultConfig.threatPatterns;
    this.eventCorrelationWindow = defaultConfig.correlationWindow;
  }

  // Initialize security monitoring
  async initialize(): Promise<void> {
    console.log('🛡️ Initializing Security Agent...');
    
    // Start continuous threat monitoring
    this.startThreatMonitoring();
    
    // Initialize baseline metrics
    await this.establishBaseline();
    
    console.log('✅ Security Agent initialized');
  }

  // Process incoming messages
  async processMessage(message: AgentMessage, signal: AbortSignal): Promise<void> {
    switch (message.type) {
      case MessageType.ERROR_REPORT:
        await this.handleErrorReport(message);
        break;
      case MessageType.PERFORMANCE_REPORT:
        await this.handlePerformanceReport(message);
        break;
      case MessageType.REQUEST_ANALYSIS:
        await this.handleSecurityAnalysisRequest(message);
        break;
      default:
        // Log all messages for pattern analysis
        this.recordSecurityEvent({
          eventId: this.generateEventId(),
          agentId: message.from,
          eventType: 'anomaly',
          data: message,
          timestamp: Date.now()
        });
    }
  }

  // Handle security-related tasks
  async handleTask(task: any, signal: AbortSignal): Promise<any> {
    const { type, data } = task;
    
    switch (type) {
      case 'threat-analysis':
        return await this.analyzeThreat(data);
      case 'security-audit':
        return await this.performSecurityAudit(data);
      case 'incident-response':
        return await this.respondToIncident(data);
      default:
        throw new Error(`Unknown security task type: ${type}`);
    }
  }

  // Receive security events from other agents
  async receiveSecurityEvent(agentId: string, event: any): Promise<void> {
    const securityEvent: SecurityEvent = {
      eventId: this.generateEventId(),
      agentId,
      eventType: this.classifyEvent(event),
      data: event,
      timestamp: Date.now()
    };

    this.recordSecurityEvent(securityEvent);
    
    // Check if this triggers any threat patterns
    await this.evaluateThreatPatterns();
  }

  // Error analysis with security context
  protected async analyzeError(error: Error, context: any): Promise<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    recommendations: string[];
    autoRecoverable: boolean;
  }> {
    const baseAnalysis = await super.analyzeError(error, context);
    
    // Enhance with security-specific analysis
    const securityAnalysis = this.performSecurityAnalysis(error, context);
    
    return {
      severity: this.calculateCombinedSeverity(baseAnalysis.severity, securityAnalysis.severity),
      category: securityAnalysis.category || baseAnalysis.category,
      recommendations: [...baseAnalysis.recommendations, ...securityAnalysis.recommendations],
      autoRecoverable: baseAnalysis.autoRecoverable && !securityAnalysis.requiresManualReview
    };
  }

  // Security-specific error analysis
  private performSecurityAnalysis(error: Error, context: any): {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    recommendations: string[];
    requiresManualReview: boolean;
  } {
    const message = error.message.toLowerCase();
    const { agentId, frequency, timing } = context;
    
    // Authentication failures
    if (message.includes('unauthorized') || message.includes('401') || message.includes('forbidden')) {
      const authFailures = this.countRecentAuthFailures(agentId);
      if (authFailures >= this.securityConfig.alertThresholds.authFailures) {
        return {
          severity: 'critical',
          category: 'authentication_attack',
          recommendations: [
            'Rotate API keys immediately',
            'Review access logs for compromise',
            'Enable additional authentication factors',
            'Temporarily isolate affected agent'
          ],
          requiresManualReview: true
        };
      }
    }
    
    // Rate limiting patterns
    if (message.includes('rate limit') || message.includes('429')) {
      const pattern = this.analyzeRateLimitPattern(agentId);
      if (pattern.isSuspicious) {
        return {
          severity: 'high',
          category: 'rate_limit_abuse',
          recommendations: [
            'Implement exponential backoff',
            'Review request patterns for abuse',
            'Consider request batching',
            'Monitor for DDoS patterns'
          ],
          requiresManualReview: pattern.exceedsNormalUsage
        };
      }
    }
    
    // Consensus manipulation
    if (context.type === 'consensus' && frequency > 3) {
      return {
        severity: 'critical',
        category: 'consensus_manipulation',
        recommendations: [
          'Audit consensus participants',
          'Review voting patterns',
          'Check for sybil attacks',
          'Increase consensus threshold temporarily'
        ],
        requiresManualReview: true
      };
    }
    
    // Network anomalies
    if (message.includes('timeout') || message.includes('econnrefused')) {
      const networkPattern = this.analyzeNetworkPattern(agentId, timing);
      if (networkPattern.isAnomalous) {
        return {
          severity: networkPattern.severity as any,
          category: 'network_anomaly',
          recommendations: [
            'Check network connectivity',
            'Verify endpoint availability',
            'Review firewall rules',
            'Consider failover endpoints'
          ],
          requiresManualReview: networkPattern.affectsMultipleAgents
        };
      }
    }
    
    // Default analysis
    return {
      severity: 'low',
      category: 'general_error',
      recommendations: ['Monitor frequency', 'Log for analysis'],
      requiresManualReview: false
    };
  }

  // Threat pattern evaluation
  private async evaluateThreatPatterns(): Promise<void> {
    const now = Date.now();
    
    // Don't scan too frequently
    if (now - this.lastThreatScan < 1000) return;
    this.lastThreatScan = now;
    
    // Check each threat pattern
    for (const pattern of this.threatPatterns) {
      const events = this.getRecentEvents(pattern.timeWindow);
      const matchScore = this.calculatePatternMatch(pattern, events);
      
      if (matchScore >= 0.7) { // 70% confidence threshold
        await this.raiseThreat(pattern, events, matchScore);
      }
    }
    
    // Check for novel threats
    await this.detectNovelThreats();
  }

  // Calculate pattern match score
  private calculatePatternMatch(pattern: ThreatPattern, events: SecurityEvent[]): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const indicator of pattern.indicators) {
      const indicatorScore = this.evaluateIndicator(indicator, events);
      totalScore += indicatorScore * indicator.weight;
      totalWeight += indicator.weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  // Evaluate single threat indicator
  private evaluateIndicator(indicator: ThreatIndicator, events: SecurityEvent[]): number {
    const values = this.extractMetricValues(indicator.metric, events);
    
    switch (indicator.operator) {
      case 'gt':
        return values.filter(v => v > indicator.value).length / values.length;
      case 'lt':
        return values.filter(v => v < indicator.value).length / values.length;
      case 'eq':
        return values.filter(v => v === indicator.value).length / values.length;
      case 'contains':
        return values.filter(v => String(v).includes(indicator.value)).length / values.length;
      case 'matches':
        const regex = new RegExp(indicator.value);
        return values.filter(v => regex.test(String(v))).length / values.length;
      default:
        return 0;
    }
  }

  // Raise security threat
  private async raiseThreat(
    pattern: ThreatPattern, 
    events: SecurityEvent[], 
    confidence: number
  ): Promise<void> {
    const threat: SecurityThreat = {
      id: this.generateThreatId(),
      timestamp: Date.now(),
      severity: pattern.severity,
      category: pattern.category,
      source: 'pattern-detection',
      description: `${pattern.name} detected with ${(confidence * 100).toFixed(1)}% confidence`,
      evidence: events.map(e => ({
        type: e.eventType,
        value: e.data,
        timestamp: e.timestamp,
        agentId: e.agentId
      })),
      impact: this.assessThreatImpact(pattern, events),
      recommendations: this.generateRecommendations(pattern),
      autoRecoverable: pattern.severity === 'low',
      mitigationInProgress: false
    };
    
    this.activeThreats.set(threat.id, threat);
    
    // Notify coordinator
    await this.sendMessage({
      to: 'coordinator',
      type: MessageType.ERROR_REPORT,
      payload: { type: 'security-threat', threat },
      priority: this.getThreatPriority(threat.severity)
    });
    
    // Auto-mitigate if enabled and possible
    if (this.securityConfig.autoMitigationEnabled && threat.autoRecoverable) {
      await this.autoMitigate(threat);
    }
  }

  // Detect novel threats using anomaly detection
  private async detectNovelThreats(): Promise<void> {
    const recentEvents = this.getRecentEvents(this.eventCorrelationWindow);
    
    // Group events by agent
    const agentEvents = new Map<string, SecurityEvent[]>();
    for (const event of recentEvents) {
      if (!agentEvents.has(event.agentId)) {
        agentEvents.set(event.agentId, []);
      }
      agentEvents.get(event.agentId)!.push(event);
    }
    
    // Check each agent for anomalies
    for (const [agentId, events] of agentEvents) {
      const anomalies = this.detectAnomalies(agentId, events);
      
      if (anomalies.length > 0) {
        await this.raiseNovelThreat(agentId, anomalies);
      }
    }
  }

  // Detect anomalies for specific agent
  private detectAnomalies(agentId: string, events: SecurityEvent[]): any[] {
    const anomalies: any[] = [];
    const baseline = this.agentMetricsBaseline.get(agentId);
    
    if (!baseline) return anomalies;
    
    // Error rate anomaly
    const errorRate = events.filter(e => e.eventType === 'error').length / events.length;
    if (errorRate > this.securityConfig.alertThresholds.errorRate) {
      anomalies.push({
        type: 'high_error_rate',
        value: errorRate,
        baseline: baseline.errorRate || 0.01,
        severity: errorRate > 0.5 ? 'high' : 'medium'
      });
    }
    
    // Response time anomaly
    const avgResponseTime = this.calculateAverageResponseTime(events);
    if (avgResponseTime > baseline.avgResponseTime * this.securityConfig.alertThresholds.responseTimeAnomaly) {
      anomalies.push({
        type: 'response_time_anomaly',
        value: avgResponseTime,
        baseline: baseline.avgResponseTime,
        severity: 'medium'
      });
    }
    
    // Pattern anomaly (unusual sequence of events)
    const eventSequence = events.map(e => e.eventType).join('-');
    if (this.isUnusualSequence(eventSequence, baseline.commonSequences)) {
      anomalies.push({
        type: 'unusual_pattern',
        value: eventSequence,
        severity: 'medium'
      });
    }
    
    return anomalies;
  }

  // Auto-mitigation for recoverable threats
  private async autoMitigate(threat: SecurityThreat): Promise<void> {
    threat.mitigationInProgress = true;
    
    try {
      switch (threat.category) {
        case ThreatCategory.RATE_LIMIT_ABUSE:
          await this.mitigateRateLimit(threat);
          break;
        case ThreatCategory.NETWORK_ANOMALY:
          await this.mitigateNetworkIssue(threat);
          break;
        case ThreatCategory.ACCESS_VIOLATION:
          await this.mitigateAccessViolation(threat);
          break;
        default:
          console.log(`No auto-mitigation available for ${threat.category}`);
      }
      
      threat.mitigationInProgress = false;
      console.log(`✅ Auto-mitigated threat: ${threat.id}`);
    } catch (error) {
      console.error(`Failed to auto-mitigate threat ${threat.id}:`, error);
      threat.mitigationInProgress = false;
      threat.autoRecoverable = false;
    }
  }

  // Specific mitigation strategies
  private async mitigateRateLimit(threat: SecurityThreat): Promise<void> {
    const affectedAgents = threat.impact.affectedAgents;
    
    for (const agentId of affectedAgents) {
      await this.sendMessage({
        to: agentId,
        type: MessageType.REQUEST_ANALYSIS,
        payload: {
          type: 'rate-limit-adjustment',
          action: 'increase-backoff',
          factor: 2.0
        },
        priority: MessagePriority.HIGH
      });
    }
  }

  // Start continuous threat monitoring
  private startThreatMonitoring(): void {
    setInterval(() => {
      this.evaluateThreatPatterns();
      this.cleanupOldEvents();
    }, 5000); // Check every 5 seconds
  }

  // Establish baseline metrics
  private async establishBaseline(): Promise<void> {
    // In production, this would analyze historical data
    // For now, set reasonable defaults
    this.networkBaseline = {
      avgLatency: 100,
      avgThroughput: 1000,
      errorRate: 0.01
    };
  }

  // Helper methods
  private recordSecurityEvent(event: SecurityEvent): void {
    if (!this.securityEvents.has(event.agentId)) {
      this.securityEvents.set(event.agentId, []);
    }
    
    this.securityEvents.get(event.agentId)!.push(event);
  }

  private getRecentEvents(timeWindow: number): SecurityEvent[] {
    const cutoff = Date.now() - timeWindow;
    const recentEvents: SecurityEvent[] = [];
    
    for (const events of this.securityEvents.values()) {
      recentEvents.push(...events.filter(e => e.timestamp > cutoff));
    }
    
    return recentEvents;
  }

  private classifyEvent(event: any): 'error' | 'status_change' | 'anomaly' | 'threshold_breach' {
    if (event.error || event.severity) return 'error';
    if (event.status) return 'status_change';
    if (event.threshold) return 'threshold_breach';
    return 'anomaly';
  }

  private countRecentAuthFailures(agentId: string): number {
    const events = this.securityEvents.get(agentId) || [];
    const recent = events.filter(e => 
      e.timestamp > Date.now() - 300000 && // Last 5 minutes
      e.data?.error?.toLowerCase().includes('auth')
    );
    return recent.length;
  }

  private analyzeRateLimitPattern(agentId: string): { isSuspicious: boolean; exceedsNormalUsage: boolean } {
    const events = this.securityEvents.get(agentId) || [];
    const rateLimitEvents = events.filter(e => 
      e.data?.error?.toLowerCase().includes('rate limit')
    );
    
    // Check if rate limit errors are increasing
    const recentCount = rateLimitEvents.filter(e => e.timestamp > Date.now() - 60000).length;
    const olderCount = rateLimitEvents.filter(e => 
      e.timestamp > Date.now() - 120000 && e.timestamp <= Date.now() - 60000
    ).length;
    
    return {
      isSuspicious: recentCount > olderCount * 2,
      exceedsNormalUsage: recentCount > 10
    };
  }

  private analyzeNetworkPattern(agentId: string, timing: any): {
    isAnomalous: boolean;
    severity: string;
    affectsMultipleAgents: boolean;
  } {
    const networkErrors = this.getRecentEvents(300000).filter(e =>
      e.data?.error?.toLowerCase().match(/timeout|econnrefused|network/)
    );
    
    const affectedAgents = new Set(networkErrors.map(e => e.agentId));
    
    return {
      isAnomalous: networkErrors.length > 5,
      severity: networkErrors.length > 10 ? 'high' : 'medium',
      affectsMultipleAgents: affectedAgents.size > 1
    };
  }

  private extractMetricValues(metric: string, events: SecurityEvent[]): any[] {
    return events.map(e => {
      const path = metric.split('.');
      let value = e.data;
      for (const key of path) {
        value = value?.[key];
      }
      return value;
    }).filter(v => v !== undefined);
  }

  private assessThreatImpact(pattern: ThreatPattern, events: SecurityEvent[]): ThreatImpact {
    const affectedAgents = [...new Set(events.map(e => e.agentId))];
    
    return {
      affectedAgents,
      potentialLoss: this.estimatePotentialLoss(pattern),
      operationalImpact: this.determineOperationalImpact(pattern.severity),
      dataIntegrity: pattern.category === ThreatCategory.MALFORMED_DATA ||
                     pattern.category === ThreatCategory.ORACLE_MANIPULATION
    };
  }

  private estimatePotentialLoss(pattern: ThreatPattern): string {
    // Simplified estimation based on threat type
    switch (pattern.category) {
      case ThreatCategory.MEV_ATTACK:
        return 'High - Potential transaction value extraction';
      case ThreatCategory.ORACLE_MANIPULATION:
        return 'Critical - Entire protocol value at risk';
      case ThreatCategory.CONSENSUS_MANIPULATION:
        return 'High - Invalid transaction execution';
      default:
        return 'Low - Operational costs only';
    }
  }

  private determineOperationalImpact(severity: string): 'none' | 'minimal' | 'moderate' | 'severe' {
    switch (severity) {
      case 'critical': return 'severe';
      case 'high': return 'moderate';
      case 'medium': return 'minimal';
      default: return 'none';
    }
  }

  private generateRecommendations(pattern: ThreatPattern): string[] {
    const baseRecommendations = [
      `Monitor ${pattern.name} indicators closely`,
      'Review recent system changes',
      'Check external service statuses'
    ];
    
    // Add specific recommendations based on category
    switch (pattern.category) {
      case ThreatCategory.AUTHENTICATION_FAILURE:
        return [...baseRecommendations,
          'Rotate all API keys',
          'Enable 2FA where possible',
          'Review access logs'
        ];
      case ThreatCategory.MEV_ATTACK:
        return [...baseRecommendations,
          'Enable private mempool',
          'Use commit-reveal pattern',
          'Implement MEV protection'
        ];
      default:
        return baseRecommendations;
    }
  }

  private calculateCombinedSeverity(
    baseSeverity: 'low' | 'medium' | 'high' | 'critical',
    securitySeverity: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    const maxLevel = Math.max(
      severityLevels[baseSeverity],
      severityLevels[securitySeverity]
    );
    
    return Object.keys(severityLevels).find(
      key => severityLevels[key as keyof typeof severityLevels] === maxLevel
    ) as any;
  }

  private isUnusualSequence(sequence: string, commonSequences: string[]): boolean {
    // Simple check - in production would use more sophisticated pattern matching
    return !commonSequences?.includes(sequence) && sequence.length > 10;
  }

  private calculateAverageResponseTime(events: SecurityEvent[]): number {
    // Simplified - would extract from event data in production
    return 100; // ms
  }

  private getThreatPriority(severity: string): MessagePriority {
    switch (severity) {
      case 'critical': return MessagePriority.CRITICAL;
      case 'high': return MessagePriority.HIGH;
      case 'medium': return MessagePriority.MEDIUM;
      default: return MessagePriority.LOW;
    }
  }

  private cleanupOldEvents(): void {
    const cutoff = Date.now() - this.eventCorrelationWindow * 2;
    
    for (const [agentId, events] of this.securityEvents) {
      const recentEvents = events.filter(e => e.timestamp > cutoff);
      if (recentEvents.length === 0) {
        this.securityEvents.delete(agentId);
      } else {
        this.securityEvents.set(agentId, recentEvents);
      }
    }
  }

  private generateEventId(): string {
    return `sec-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateThreatId(): string {
    return `threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Default threat patterns
  private static getDefaultThreatPatterns(): ThreatPattern[] {
    return [
      {
        id: 'auth-brute-force',
        name: 'Authentication Brute Force',
        category: ThreatCategory.AUTHENTICATION_FAILURE,
        severity: 'critical',
        timeWindow: 300000, // 5 minutes
        indicators: [
          {
            metric: 'error.code',
            operator: 'eq',
            value: 401,
            weight: 0.5
          },
          {
            metric: 'error.count',
            operator: 'gt',
            value: 5,
            weight: 0.5
          }
        ]
      },
      {
        id: 'ddos-pattern',
        name: 'DDoS Attack Pattern',
        category: ThreatCategory.DOS_ATTEMPT,
        severity: 'high',
        timeWindow: 60000, // 1 minute
        indicators: [
          {
            metric: 'request.rate',
            operator: 'gt',
            value: 100,
            weight: 0.7
          },
          {
            metric: 'error.type',
            operator: 'contains',
            value: 'timeout',
            weight: 0.3
          }
        ]
      },
      {
        id: 'mev-sandwich',
        name: 'MEV Sandwich Attack',
        category: ThreatCategory.MEV_ATTACK,
        severity: 'high',
        timeWindow: 30000, // 30 seconds
        indicators: [
          {
            metric: 'transaction.timing',
            operator: 'lt',
            value: 1000, // ms
            weight: 0.4
          },
          {
            metric: 'transaction.gasPrice.variance',
            operator: 'gt',
            value: 0.5,
            weight: 0.6
          }
        ]
      }
    ];
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Clear monitoring data
    this.securityEvents.clear();
    this.activeThreats.clear();
    this.agentMetricsBaseline.clear();
    
    console.log('🛡️ Security Agent cleaned up');
  }

  // Additional mitigation methods
  private async mitigateNetworkIssue(threat: SecurityThreat): Promise<void> {
    // Notify affected agents to switch to backup endpoints
    for (const agentId of threat.impact.affectedAgents) {
      await this.sendMessage({
        to: agentId,
        type: MessageType.REQUEST_ANALYSIS,
        payload: {
          type: 'network-mitigation',
          action: 'switch-to-backup',
          reason: threat.description
        },
        priority: MessagePriority.HIGH
      });
    }
  }

  private async mitigateAccessViolation(threat: SecurityThreat): Promise<void> {
    // Temporary isolation of affected agents
    for (const agentId of threat.impact.affectedAgents) {
      await this.sendMessage({
        to: 'coordinator',
        type: MessageType.REQUEST_ANALYSIS,
        payload: {
          type: 'agent-isolation',
          agentId,
          duration: 300000, // 5 minutes
          reason: threat.description
        },
        priority: MessagePriority.CRITICAL
      });
    }
  }

  // Public API for external threat reporting
  async reportExternalThreat(threat: any): Promise<void> {
    const securityThreat: SecurityThreat = {
      id: this.generateThreatId(),
      timestamp: Date.now(),
      severity: threat.severity || 'medium',
      category: threat.category || ThreatCategory.SUSPICIOUS_PATTERN,
      source: 'external',
      description: threat.description,
      evidence: threat.evidence || [],
      impact: threat.impact || {
        affectedAgents: [],
        potentialLoss: 'Unknown',
        operationalImpact: 'minimal',
        dataIntegrity: false
      },
      recommendations: threat.recommendations || ['Investigate reported threat'],
      autoRecoverable: false,
      mitigationInProgress: false
    };
    
    await this.raiseThreat(
      this.threatPatterns[0], // Use first pattern as template
      [],
      1.0 // 100% confidence for external reports
    );
  }

  // Get current security status
  getSecurityStatus(): {
    activeThreats: SecurityThreat[];
    recentEvents: number;
    systemSecurity: 'secure' | 'warning' | 'critical';
  } {
    const activeThreats = Array.from(this.activeThreats.values());
    const recentEvents = this.getRecentEvents(300000).length;
    
    let systemSecurity: 'secure' | 'warning' | 'critical' = 'secure';
    if (activeThreats.some(t => t.severity === 'critical')) {
      systemSecurity = 'critical';
    } else if (activeThreats.some(t => t.severity === 'high')) {
      systemSecurity = 'warning';
    }
    
    return {
      activeThreats,
      recentEvents,
      systemSecurity
    };
  }

  // Handler methods
  private async handleErrorReport(message: AgentMessage): Promise<void> {
    const { error, context } = message.payload;
    await this.receiveSecurityEvent(message.from, { error, context });
  }

  private async handlePerformanceReport(message: AgentMessage): Promise<void> {
    const { metrics } = message.payload;
    
    // Update baseline for agent
    this.agentMetricsBaseline.set(message.from, {
      ...this.agentMetricsBaseline.get(message.from),
      ...metrics,
      lastUpdate: Date.now()
    });
  }

  private async handleSecurityAnalysisRequest(message: AgentMessage): Promise<void> {
    const { type, data } = message.payload;
    
    if (type === 'security-check') {
      const analysis = await this.performSecurityAudit(data);
      
      await this.sendMessage({
        to: message.from,
        type: MessageType.EXECUTION_RESULT,
        payload: {
          requestId: message.id,
          analysis
        },
        priority: MessagePriority.MEDIUM
      });
    }
  }

  private async analyzeThreat(data: any): Promise<any> {
    // Detailed threat analysis logic
    return {
      threatLevel: 'medium',
      analysis: 'Threat analysis complete',
      recommendations: ['Monitor closely', 'Review logs']
    };
  }

  private async performSecurityAudit(data: any): Promise<any> {
    const status = this.getSecurityStatus();
    
    return {
      timestamp: Date.now(),
      systemSecurity: status.systemSecurity,
      activeThreats: status.activeThreats.length,
      recommendations: status.activeThreats.length > 0 
        ? ['Address active threats', 'Review security logs']
        : ['System secure', 'Continue monitoring']
    };
  }

  private async respondToIncident(data: any): Promise<any> {
    // Incident response logic
    return {
      incidentId: this.generateThreatId(),
      status: 'responded',
      actions: ['Isolated affected components', 'Notified administrators']
    };
  }

  private async raiseNovelThreat(agentId: string, anomalies: any[]): Promise<void> {
    const threat: SecurityThreat = {
      id: this.generateThreatId(),
      timestamp: Date.now(),
      severity: this.calculateAnomalySeverity(anomalies),
      category: ThreatCategory.SUSPICIOUS_PATTERN,
      source: agentId,
      description: `Novel threat pattern detected: ${anomalies.map(a => a.type).join(', ')}`,
      evidence: anomalies.map(a => ({
        type: a.type,
        value: a.value,
        timestamp: Date.now()
      })),
      impact: {
        affectedAgents: [agentId],
        potentialLoss: 'Unknown',
        operationalImpact: 'minimal',
        dataIntegrity: false
      },
      recommendations: [
        'Review agent logs',
        'Check for system changes',
        'Monitor for pattern repetition'
      ],
      autoRecoverable: false,
      mitigationInProgress: false
    };
    
    await this.raiseThreat(
      this.threatPatterns[0], // Use generic pattern
      [],
      0.8 // 80% confidence for anomaly detection
    );
  }

  private calculateAnomalySeverity(anomalies: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;
    const mediumSeverityCount = anomalies.filter(a => a.severity === 'medium').length;
    
    if (highSeverityCount >= 2) return 'critical';
    if (highSeverityCount >= 1) return 'high';
    if (mediumSeverityCount >= 2) return 'medium';
    return 'low';
  }
}