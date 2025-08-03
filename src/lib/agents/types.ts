// 🤖 Agent Framework Types and Interfaces
// Production-ready multi-agent system for DeFi routing optimization

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: unknown;
  timestamp: number;
  priority: MessagePriority;
}

export enum MessageType {
  // Data sharing
  MARKET_DATA = 'MARKET_DATA',
  ROUTE_PROPOSAL = 'ROUTE_PROPOSAL',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  
  // Coordination
  REQUEST_ANALYSIS = 'REQUEST_ANALYSIS',
  CONSENSUS_REQUEST = 'CONSENSUS_REQUEST',
  DECISION_MADE = 'DECISION_MADE',
  
  // Execution
  EXECUTE_ROUTE = 'EXECUTE_ROUTE',
  EXECUTION_RESULT = 'EXECUTION_RESULT',
  
  // Monitoring
  PERFORMANCE_REPORT = 'PERFORMANCE_REPORT',
  ERROR_REPORT = 'ERROR_REPORT'
}

export enum MessagePriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum AgentStatus {
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  BUSY = 'BUSY',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE'
}

export interface AgentConfig {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  dependencies: string[];
  maxConcurrentTasks: number;
  timeout: number;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  averageResponseTime: number;
  successRate: number;
  lastActivity: number;
  errors: AgentError[];
}

export interface AgentError {
  timestamp: number;
  error: string;
  context: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Market Data Types
export interface MarketConditions {
  timestamp: number;
  networkCongestion: {
    ethereum: number; // 0-1 scale
    polygon: number;
    bsc: number;
    arbitrum: number;
    bitcoin: number;     // ✅ Add this
    stellar: number;
    solana: number;
    starknet: number; 

  };
  gasPrices: {
    ethereum: { fast: number; standard: number; safe: number };
    polygon: { fast: number; standard: number; safe: number };
  };
  volatility: {
    overall: number; // 0-1 scale
    tokenSpecific: Record<string, number>;
  };
  liquidity: {
    overall: number; // 0-1 scale
    perDEX: Record<string, number>;
  };
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  prices?: Record<string, number>; // Token prices
}

export interface RouteProposal {
  id: string;
  fromToken: string;
  toToken: string;
  tokenOut?: string; // Alternative name for toToken
  amount: string;
  path: RouteStep[];
  estimatedGas: string;
  estimatedTime: number; // seconds
  estimatedOutput: string;
  priceImpact: string;
  confidence: number; // 0-1 score
  risks: string[];
  advantages: string[];
  proposedBy: string; // agent ID
  // Data quality and source tracking flags
  dataSource?: 'real_api' | 'fallback_calculation' | 'synthetic_estimate' | 'hybrid';
  isSynthetic?: boolean; // True if route uses fallback/synthetic data
  dataQuality?: 'high' | 'medium' | 'low'; // Overall data quality assessment
  fallbackReason?: string; // Why fallback calculation was used
  syntheticFlags?: string[]; // Specific parts that are synthetic (e.g., 'price', 'gas', 'time')
}

export interface RouteStep {
  protocol: string;
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedOutput: string;
  fee: string;
}

export interface RiskAssessment {
  routeId: string;
  overallRisk: number; // 0-1 scale (0 = low risk)
  securityScore: number; // 0-100 scale (100 = most secure)
  factors: {
    protocolRisk: number;
    liquidityRisk: number;
    slippageRisk: number;
    mevRisk: number;
    bridgeRisk?: number; // for cross-chain routes
  };
  recommendations: string[];
  blockers: string[]; // critical issues that prevent execution
  assessedBy: string; // agent ID
}

export interface ExecutionStrategy {
  routeId: string;
  timing: {
    optimal: boolean;
    delayRecommended: number; // seconds to wait
    reason: string;
  };
  mevProtection: {
    enabled: boolean;
    strategy: 'private-mempool' | 'commit-reveal' | 'sandwich-protection';
    estimatedProtection: number; // 0-1 effectiveness
  };
  gasStrategy: GasStrategy;
  contingencyPlans: string[];
  strategyBy: string; // agent ID
  confidence?: number; // Add confidence score
  estimatedImprovements?: {
    costSavings: number;
    timeReduction: number;
    riskReduction: number;
  };
  executionWindows?: Array<{
    start: number;
    end: number;
    confidence: number;
  }>;
  orderSplitting?: {
    enabled: boolean;
    numberOfParts: number;
    timeBetweenParts: number;
    randomization: boolean;
    sizeDistribution: number[];
    estimatedImprovements?: {
      costSavings: number;
      riskReduction: number;
      mevReduction: number;
    };
  };
  reasoning?: string[];
}

export interface PerformanceData {
  routeId: string;
  executionTime: number;
  actualGasCost: string;
  actualOutput: string;
  slippage: string;
  success: boolean;
  errors?: string[];
  savedCosts?: string;
  timestamp: number;
}

// Decision Making Types
export interface DecisionCriteria {
  cost: number;        // 0-1 weight
  time: number;        // 0-1 weight  
  security: number;    // 0-1 weight
  reliability: number; // 0-1 weight
  slippage: number;    // 0-1 weight
}

// User Focus Preferences for Agent Weighting
export type UserFocusPreference = 'speed' | 'security' | 'cost' | 'balanced';

export interface AgentWeighting {
  agentId: string;
  baseWeight: number;      // Default weight (usually 1.0)
  userBonus: number;       // Additional weight from user preference (0.0-1.0)
  finalWeight: number;     // baseWeight + userBonus
  reason: string;          // Why this agent got weighted
}

export interface UserPreferenceWeights {
  focus: UserFocusPreference;
  weightings: {
    'market-intelligence': number;
    'route-discovery': number;
    'risk-assessment': number;
    'execution-strategy': number;
    'security': number;
    'performance-monitor': number;
  };
}

export interface DecisionScore {
  routeId: string;
  totalScore: number;
  breakdown: {
    cost: number;
    time: number;
    security: number;
    reliability: number;
    slippage: number;
  };
  reasoning: string[];
}

export interface ConsensusRequest {
  requestId: string;
  routes: RouteProposal[];
  assessments: RiskAssessment[];
  strategies: ExecutionStrategy[];
  criteria: DecisionCriteria;
  deadline: number; // timestamp
  userPreferences?: UserPreferenceWeights; // Add user preference weighting
}

export interface ConsensusResponse {
  requestId: string;
  agentId: string;
  recommendedRoute: string;
  score: DecisionScore;
  confidence: number;
  reasoning: string[];
  appliedWeighting?: AgentWeighting; // Include weighting info in response
}

// Agent Communication Events
export interface AgentEventHandlers {
  onMessage: (message: AgentMessage) => Promise<void>;
  onTaskAssigned: (task: Record<string, unknown>) => Promise<void>;
  onError: (error: AgentError) => Promise<void>;
  onStatusChange: (status: AgentStatus) => Promise<void>;
}

export interface AgentCapabilities {
  canAnalyzeMarket: boolean;
  canDiscoverRoutes: boolean;
  canAssessRisk: boolean;
  canExecuteTransactions: boolean;
  canMonitorPerformance: boolean;
  supportedNetworks: string[];
  supportedProtocols: string[];
}

// Additional types for ExecutionStrategyAgent
export interface MEVProtection {
  enabled: boolean;
  strategy: 'private-mempool' | 'commit-reveal' | 'sandwich-protection';
  estimatedProtection: number;
  cost: string;
  provider?: string;
  additionalCost?: number;
  reasoning?: string[];
}

export interface GasStrategy {
  gasPrice: string;
  gasLimit: string;
  priorityFee?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  strategy: 'fast' | 'standard' | 'safe' | 'custom';
  estimatedCost?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface TimingStrategy {
  optimal: boolean;
  delayRecommended: number;
  reason: string;
  executionWindow?: {
    start: number;
    end: number;
  };
  immediate?: boolean;
  optimalWindow?: {
    start: number;
    end: number;
  };
}

export interface ExecutionSignal {
  type: 'market' | 'technical' | 'risk' | 'timing';
  signal: 'buy' | 'sell' | 'hold' | 'wait';
  strength: number; // 0-1
  confidence: number; // 0-1
  source: string;
  timestamp: number;
}

export interface MarketSignal {
  type: 'volatility' | 'liquidity' | 'volume' | 'sentiment';
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-1
  timeframe: string;
  indicators: Record<string, number>;
}