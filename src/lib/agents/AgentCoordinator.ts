// 🎯 Agent Coordinator - Central orchestration hub for multi-agent system  
// Handles agent registration, message routing, consensus building, and system health

import { EventEmitter } from 'events';
import { BaseAgent } from './BaseAgent';
import { SecurityAgent } from './SecurityAgent';
import {
  AgentMessage,
  MessageType,
  MessagePriority,
  AgentStatus,
  ConsensusRequest,
  ConsensusResponse,
  DecisionCriteria,
  RouteProposal,
  RiskAssessment,
  ExecutionStrategy,
  AgentCapabilities,
  AgentMetrics
} from './types';

// Message routing strategy interface
export interface MessageRouterStrategy {
  canRoute(message: AgentMessage): boolean;
  route(message: AgentMessage, coordinator: AgentCoordinator): Promise<void>;
}

// Agent registry with enhanced metadata
interface AgentRegistry {
  agent: BaseAgent;
  type: string;
  role: AgentRole;
  priority: number;
  dependencies: string[];
  capabilities: AgentCapabilities;
  lastHealthCheck: Date;
  failureCount: number;
  isBackup: boolean;
  tags: string[];
}

export enum AgentRole {
  PRIMARY = 'primary',
  BACKUP = 'backup',
  SPECIALIZED = 'specialized',
  MONITOR = 'monitor'
}

// Coordinator configuration
interface CoordinatorConfig {
  maxAgents: number;
  consensusTimeout: number;
  decisionCriteria: DecisionCriteria;
  healthCheckInterval: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    maxBackoffMs: number;
  };
  loadBalancing: {
    enabled: boolean;
    maxTasksPerAgent: number;
    healthThreshold: number;
  };
  telemetry: {
    enabled: boolean;
    reportingInterval: number;
  };
}

// System telemetry
interface SystemTelemetry {
  messagesProcessed: number;
  messagesByType: Map<MessageType, number>;
  consensusRequests: number;
  consensusSuccessRate: number;
  agentFailures: Map<string, number>;
  averageResponseTime: Map<string, number>;
  systemUptime: number;
  lastReset: Date;
}

export class AgentCoordinator extends EventEmitter {
  private agents = new Map<string, AgentRegistry>();
  private messageRouters = new Map<MessageType, MessageRouterStrategy>();
  private consensusInProgress = new Map<string, ConsensusRequest>();
  private config: CoordinatorConfig;
  private _isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private telemetryInterval?: NodeJS.Timeout;
  private telemetry: SystemTelemetry;
  private startTime: Date;
  private securityAgent?: SecurityAgent;

  // Agent pools by capability and role
  private agentPools = new Map<string, Set<string>>();
  
  // Pending response handlers for inter-agent communication
  private responseHandlers = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(config: Partial<CoordinatorConfig> = {}) {
    super();
    this.config = {
      maxAgents: config.maxAgents || 20,
      consensusTimeout: config.consensusTimeout || 30000,
      decisionCriteria: config.decisionCriteria || {
        cost: 0.35,
        time: 0.25,
        security: 0.20,
        reliability: 0.15,
        slippage: 0.05
      },
      healthCheckInterval: config.healthCheckInterval || 60000,
      retryPolicy: config.retryPolicy || {
        maxRetries: 3,
        backoffMs: 1000,
        maxBackoffMs: 10000
      },
      loadBalancing: config.loadBalancing || {
        enabled: true,
        maxTasksPerAgent: 10,
        healthThreshold: 0.8
      },
      telemetry: config.telemetry || {
        enabled: true,
        reportingInterval: 300000 // 5 minutes
      }
    };

    this.startTime = new Date();
    this.telemetry = this.initializeTelemetry();
    this.setupDefaultRouters();
  }

  // Initialize telemetry tracking
  private initializeTelemetry(): SystemTelemetry {
    return {
      messagesProcessed: 0,
      messagesByType: new Map(),
      consensusRequests: 0,
      consensusSuccessRate: 1.0,
      agentFailures: new Map(),
      averageResponseTime: new Map(),
      systemUptime: 0,
      lastReset: new Date()
    };
  }

  // Setup default message routing strategies
  private setupDefaultRouters(): void {
    // Consensus message router
    this.registerMessageRouter(MessageType.CONSENSUS_REQUEST, {
      canRoute: (msg) => msg.type === MessageType.CONSENSUS_REQUEST,
      route: async (msg, coordinator) => coordinator.handleConsensusMessage(msg)
    });

    // Market data broadcast router
    this.registerMessageRouter(MessageType.MARKET_DATA, {
      canRoute: (msg) => msg.type === MessageType.MARKET_DATA,
      route: async (msg, coordinator) => coordinator.broadcastToCapableAgents(msg, 'canAnalyzeMarket')
    });

    // Risk assessment router
    this.registerMessageRouter(MessageType.RISK_ASSESSMENT, {
      canRoute: (msg) => msg.type === MessageType.RISK_ASSESSMENT,
      route: async (msg, coordinator) => coordinator.broadcastToCapableAgents(msg, 'canAssessRisk')
    });

    // Route proposal router
    this.registerMessageRouter(MessageType.ROUTE_PROPOSAL, {
      canRoute: (msg) => msg.type === MessageType.ROUTE_PROPOSAL,
      route: async (msg, coordinator) => coordinator.handleRouteProposal(msg)
    });

    // Error reporting router
    this.registerMessageRouter(MessageType.ERROR_REPORT, {
      canRoute: (msg) => msg.type === MessageType.ERROR_REPORT,
      route: async (msg, coordinator) => coordinator.handleErrorReport(msg)
    });
  }

  // Register custom message router
  registerMessageRouter(type: MessageType, router: MessageRouterStrategy): void {
    this.messageRouters.set(type, router);
  }

  // Enhanced agent registration with validation and pooling
  async registerAgent(
    agent: BaseAgent,
    type: string,
    role: AgentRole = AgentRole.PRIMARY,
    priority: number = 1,
    dependencies: string[] = [],
    isBackup: boolean = false,
    tags: string[] = []
  ): Promise<void> {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error(`Maximum agent limit reached: ${this.config.maxAgents}`);
    }

    const agentId = agent.getConfig().id;
    const capabilities = agent.getCapabilities();

    // Validate dependencies exist
    for (const dep of dependencies) {
      if (!this.agents.has(dep)) {
        throw new Error(`Dependency ${dep} not found for agent ${agentId}`);
      }
    }

    // Validate agent capabilities
    if (!this.validateAgentCapabilities(agent)) {
      throw new Error(`Agent ${agentId} failed capability validation`);
    }

    // Create registry entry
    const registry: AgentRegistry = {
      agent,
      type,
      role,
      priority,
      dependencies,
      capabilities,
      lastHealthCheck: new Date(),
      failureCount: 0,
      isBackup,
      tags
    };

    this.agents.set(agentId, registry);

    // Add to capability-based pools
    this.addToAgentPools(agentId, capabilities, type, role);

    // Set up message handling
    this.setupAgentMessageHandling(agent);

    // Register with security agent if available
    if (this.securityAgent && agent !== this.securityAgent) {
      this.setupSecurityMonitoring(agent);
    }

    // Special handling for SecurityAgent
    if (agent instanceof SecurityAgent) {
      this.securityAgent = agent;
      // Register existing agents with security monitoring
      for (const [existingId, existingRegistry] of this.agents) {
        if (existingId !== agentId) {
          this.setupSecurityMonitoring(existingRegistry.agent);
        }
      }
    }

    console.log(`🤝 Registered agent: ${agentId} (type: ${type}, role: ${role}, backup: ${isBackup})`);
  }

  // Validate agent capabilities match declared functionality
  private validateAgentCapabilities(agent: BaseAgent): boolean {
    const capabilities = agent.getCapabilities();
    const config = agent.getConfig();

    // Check if capabilities are consistent with declared functionality
    const declaredCapabilities = config.capabilities || [];

    // Validation logic - can be extended
    if (capabilities.canExecuteTransactions && !declaredCapabilities.includes('execute')) {
      console.warn(`Agent ${config.id} claims execution capability but doesn't declare it`);
      return false;
    }

    if (capabilities.canAnalyzeMarket && !declaredCapabilities.includes('analyze')) {
      console.warn(`Agent ${config.id} claims market analysis capability but doesn't declare it`);
    }

    return true;
  }

  // Add agent to capability-based pools for efficient routing
  private addToAgentPools(agentId: string, capabilities: AgentCapabilities, type: string, role: string): void {
    const pools = [];

    // Capability-based pools
    if (capabilities.canAnalyzeMarket) pools.push('market-analysis');
    if (capabilities.canDiscoverRoutes) pools.push('route-discovery');
    if (capabilities.canAssessRisk) pools.push('risk-assessment');
    if (capabilities.canExecuteTransactions) pools.push('execution');
    if (capabilities.canMonitorPerformance) pools.push('monitoring');

    // Type and role pools
    pools.push(`type:${type}`);
    pools.push(`role:${role}`);

    // Add to pools
    for (const pool of pools) {
      if (!this.agentPools.has(pool)) {
        this.agentPools.set(pool, new Set());
      }
      this.agentPools.get(pool)!.add(agentId);
    }
  }

  // Setup message handling for an agent
  private setupAgentMessageHandling(agent: BaseAgent): void {
    const agentId = agent.getConfig().id;

    // Listen for outgoing messages from agent
    agent.on('message', async (message: AgentMessage) => {
      this.telemetry.messagesProcessed++;
      this.updateMessageTypeTelemetry(message.type);
      await this.routeMessage(message);
    });

    // Listen for status changes
    agent.on('statusChange', (status: AgentStatus) => {
      console.log(`📊 Agent ${agentId} status: ${status}`);
      this.emit('agentStatusChange', { agentId, status });
      
      // Alert security agent
      if (this.securityAgent && agent !== this.securityAgent) {
        this.securityAgent.receiveSecurityEvent(agentId, { status, timestamp: Date.now() });
      }
    });

    // Listen for agent errors
    agent.on('error', (error: Error) => {
      console.error(`❌ Agent ${agentId} error:`, error);
      this.recordAgentFailure(agentId);
      this.emit('agentError', { agentId, error });
      
      // Alert security agent
      if (this.securityAgent && agent !== this.securityAgent) {
        this.securityAgent.receiveSecurityEvent(agentId, { error, timestamp: Date.now() });
      }
    });

    // Listen for health check results
    agent.on('healthCheck', (healthReport: Record<string, unknown>) => {
      if (!healthReport.healthy) {
        console.warn(`⚠️ Agent ${agentId} health issues:`, healthReport.issues);
      }
    });
  }

  // Setup security monitoring for an agent
  private setupSecurityMonitoring(agent: BaseAgent): void {
    if (!this.securityAgent) return;

    const agentId = agent.getConfig().id;

    // Monitor all agent events for security analysis
    agent.on('error', (error) => {
      this.securityAgent!.receiveSecurityEvent(agentId, { 
        type: 'error', 
        error, 
        timestamp: Date.now() 
      });
    });

    agent.on('statusChange', (status) => {
      this.securityAgent!.receiveSecurityEvent(agentId, { 
        type: 'status_change', 
        status, 
        timestamp: Date.now() 
      });
    });
  }

  // Main message routing logic with retry and fallback
  private async routeMessage(message: AgentMessage): Promise<void> {
    try {
      // Use custom router if available
      const router = this.messageRouters.get(message.type);
      if (router && router.canRoute(message)) {
        await router.route(message, this);
        return;
      }

      // Route to specific agent
      if (message.to && message.to !== 'coordinator' && message.to !== 'broadcast') {
        await this.routeToSpecificAgent(message);
        return;
      }

      // Broadcast messages
      if (message.to === 'broadcast') {
        await this.broadcastMessage(message);
        return;
      }

      // Handle coordinator messages
      if (message.to === 'coordinator') {
        await this.handleCoordinatorMessage(message);
        return;
      }

      console.warn(`Unroutable message: ${message.type} from ${message.from} to ${message.to}`);
    } catch (error) {
      console.error('Message routing failed:', error);
      this.emit('routingError', { message, error });
    }
  }

  // Route message to specific agent with retry and fallback
  private async routeToSpecificAgent(message: AgentMessage, attempt: number = 0): Promise<void> {
    const targetAgentId = message.to;
    const registry = this.agents.get(targetAgentId);

    if (!registry) {
      // Try to find fallback agent
      const fallback = await this.findFallbackAgent(targetAgentId);
      if (fallback) {
        console.log(`📎 Using fallback agent ${fallback} for ${targetAgentId}`);
        message.to = fallback;
        await this.routeToSpecificAgent(message, attempt);
      } else {
        throw new Error(`Agent ${targetAgentId} not found and no fallback available`);
      }
      return;
    }

    // Check if agent can handle the message
    if (!this.canAgentHandleMessage(registry, message)) {
      const fallback = await this.findFallbackAgent(targetAgentId);
      if (fallback) {
        message.to = fallback;
        await this.routeToSpecificAgent(message, attempt);
        return;
      }
    }

    // Attempt delivery
    try {
      await registry.agent.receiveMessage(message);
      this.recordAgentSuccess(targetAgentId);
    } catch (error) {
      this.recordAgentFailure(targetAgentId);

      if (attempt < this.config.retryPolicy.maxRetries) {
        const backoff = Math.min(
          this.config.retryPolicy.backoffMs * Math.pow(2, attempt),
          this.config.retryPolicy.maxBackoffMs
        );

        console.log(`⏳ Retrying message to ${targetAgentId} after ${backoff}ms (attempt ${attempt + 1})`);
        await this.sleep(backoff);
        await this.routeToSpecificAgent(message, attempt + 1);
      } else {
        // Final fallback attempt
        const fallback = await this.findFallbackAgent(targetAgentId);
        if (fallback && fallback !== targetAgentId) {
          message.to = fallback;
          await this.routeToSpecificAgent(message, 0);
        } else {
          throw new Error(`Failed to deliver message to ${targetAgentId} after ${attempt} attempts`);
        }
      }
    }
  }

  // Find fallback agent based on capabilities and role
  private async findFallbackAgent(failedAgentId: string): Promise<string | null> {
    const failedRegistry = this.agents.get(failedAgentId);
    if (!failedRegistry) return null;

    // Look for backup agents with same type
    const backupPool = this.agentPools.get(`type:${failedRegistry.type}`);
    if (backupPool) {
      for (const candidateId of backupPool) {
        if (candidateId === failedAgentId) continue;

        const candidate = this.agents.get(candidateId);
        if (candidate && 
            candidate.isBackup && 
            this.canAgentHandleMessage(candidate, null)) {
          return candidateId;
        }
      }
    }

    // Look for any agent with matching capabilities
    for (const [agentId, registry] of this.agents) {
      if (agentId === failedAgentId) continue;

      if (this.hasMatchingCapabilities(registry.capabilities, failedRegistry.capabilities) &&
          this.canAgentHandleMessage(registry, null)) {
        return agentId;
      }
    }

    return null;
  }

  // Check if agent can handle a message based on health and load
  private canAgentHandleMessage(registry: AgentRegistry, message: AgentMessage | null): boolean {
    const agent = registry.agent;
    const status = agent.getStatus();
    const metrics = agent.getMetrics();

    // Check basic health
    if (!agent.isHealthy() || status !== AgentStatus.ACTIVE) {
      return false;
    }

    // Check capability match if message provided
    if (message && !this.agentCanHandleMessageType(registry, message.type)) {
      return false;
    }

    // Check load balancing constraints
    if (this.config.loadBalancing.enabled) {
      if (metrics.tasksInProgress >= this.config.loadBalancing.maxTasksPerAgent) {
        return false;
      }

      if (metrics.successRate < this.config.loadBalancing.healthThreshold) {
        return false;
      }
    }

    return true;
  }

  // Check if agent can handle specific message type
  private agentCanHandleMessageType(registry: AgentRegistry, messageType: MessageType): boolean {
    const capabilities = registry.capabilities;

    switch (messageType) {
      case MessageType.MARKET_DATA:
      case MessageType.REQUEST_ANALYSIS:
        return capabilities.canAnalyzeMarket;
      case MessageType.ROUTE_PROPOSAL:
        return capabilities.canDiscoverRoutes;
      case MessageType.RISK_ASSESSMENT:
        return capabilities.canAssessRisk;
      case MessageType.EXECUTE_ROUTE:
        return capabilities.canExecuteTransactions;
      case MessageType.PERFORMANCE_REPORT:
        return capabilities.canMonitorPerformance;
      default:
        return true; // Generic messages can be handled by any agent
    }
  }

  // Broadcast message to all capable agents with load balancing
  private async broadcastMessage(message: AgentMessage): Promise<void> {
    const eligibleAgents = this.getEligibleAgents(message);

    // Sort by load and priority
    eligibleAgents.sort((a, b) => {
      const loadDiff = a.agent.getMetrics().tasksInProgress - b.agent.getMetrics().tasksInProgress;
      if (loadDiff !== 0) return loadDiff;
      return b.priority - a.priority;
    });

    // Send to eligible agents (limit broadcast size)
    const maxRecipients = Math.min(eligibleAgents.length, 5);
    const promises: Promise<void>[] = [];

    for (let i = 0; i < maxRecipients; i++) {
      const targetId = eligibleAgents[i].agent.getConfig().id;
      const routingMessage = { ...message, to: targetId };
      promises.push(this.routeToSpecificAgent(routingMessage));
    }

    await Promise.allSettled(promises);
  }

  // Broadcast to agents with specific capability
  async broadcastToCapableAgents(message: AgentMessage, capability: keyof AgentCapabilities): Promise<void> {
    const capableAgents = Array.from(this.agents.values())
      .filter(r => r.capabilities[capability] && this.canAgentHandleMessage(r, message))
      .sort((a, b) => b.priority - a.priority);

    if (capableAgents.length === 0) {
      console.warn(`No agents available with capability: ${capability}`);
      return;
    }

    // Send to top agents based on priority and load
    const promises: Promise<void>[] = [];
    const maxAgents = Math.min(capableAgents.length, 3);

    for (let i = 0; i < maxAgents; i++) {
      const targetId = capableAgents[i].agent.getConfig().id;
      const routingMessage = { ...message, to: targetId };
      promises.push(this.routeToSpecificAgent(routingMessage));
    }

    await Promise.allSettled(promises);
  }

  // Get eligible agents for a message
  private getEligibleAgents(message: AgentMessage): AgentRegistry[] {
    return Array.from(this.agents.values())
      .filter(registry => 
        registry.agent.getConfig().id !== message.from &&
        this.canAgentHandleMessage(registry, message)
      );
  }

  // Enhanced consensus building with retry and fallback
  async requestConsensus(
    routes: RouteProposal[],
    assessments: RiskAssessment[],
    strategies: ExecutionStrategy[],
    criteria?: DecisionCriteria
  ): Promise<string> {
    const requestId = this.generateRequestId();
    const consensusRequest: ConsensusRequest = {
      requestId,
      routes,
      assessments,
      strategies,
      criteria: criteria || this.config.decisionCriteria,
      deadline: Date.now() + this.config.consensusTimeout
    };

    this.consensusInProgress.set(requestId, consensusRequest);
    this.telemetry.consensusRequests++;

    try {
      console.log(`🎯 Starting consensus ${requestId} with ${routes.length} routes`);

      // Get participating agents
      const participatingAgents = this.getConsensusAgents();

      if (participatingAgents.length === 0) {
        throw new Error('No agents available for consensus');
      }

      // Gather consensus responses
      const responses = await this.gatherConsensusResponses(participatingAgents, consensusRequest);

      // Aggregate and determine best route
      const bestRouteId = this.aggregateConsensus(responses, consensusRequest);

      this.updateConsensusSuccessRate(true);
      console.log(`✅ Consensus ${requestId} completed: Route ${bestRouteId}`);

      return bestRouteId;
    } catch (error) {
      this.updateConsensusSuccessRate(false);
      console.error(`❌ Consensus ${requestId} failed:`, error);
      throw error;
    } finally {
      this.consensusInProgress.delete(requestId);
    }
  }

  // Get agents eligible for consensus participation
  private getConsensusAgents(): AgentRegistry[] {
    return Array.from(this.agents.values())
      .filter(r => 
        (r.capabilities.canAnalyzeMarket || r.capabilities.canAssessRisk) &&
        this.canAgentHandleMessage(r, null) &&
        !r.isBackup // Prefer primary agents for consensus
      )
      .sort((a, b) => b.priority - a.priority);
  }

  // Gather consensus responses with timeout and retry
  private async gatherConsensusResponses(
    agents: AgentRegistry[],
    request: ConsensusRequest
  ): Promise<ConsensusResponse[]> {
    const minResponses = Math.max(1, Math.floor(agents.length * 0.6)); // Need 60% minimum
    const responsePromises = agents.map(registry =>
      this.requestAgentConsensus(registry.agent, request)
        .catch(error => {
          console.warn(`Consensus failed from ${registry.agent.getConfig().id}:`, error);
          return null;
        })
    );

    // Wait for responses with timeout
    const results = await Promise.race([
      Promise.all(responsePromises),
      new Promise<(ConsensusResponse | null)[]>((_, reject) => 
        setTimeout(() => reject(new Error('Consensus timeout')), this.config.consensusTimeout)
      )
    ]);

    const validResponses = results.filter(r => r !== null) as ConsensusResponse[];

    if (validResponses.length < minResponses) {
      throw new Error(`Insufficient consensus responses: ${validResponses.length}/${minResponses} required`);
    }

    return validResponses;
  }

  // Request consensus from single agent
  private async requestAgentConsensus(agent: BaseAgent, request: ConsensusRequest): Promise<ConsensusResponse> {
    const requestId = this.generateRequestId();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(requestId);
        reject(new Error(`Agent ${agent.getConfig().id} consensus timeout`));
      }, this.config.consensusTimeout);

      // Register response handler
      this.responseHandlers.set(requestId, { resolve, reject, timeout });

      // Send consensus request
      const message: AgentMessage = {
        id: requestId,
        from: 'coordinator',
        to: agent.getConfig().id,
        type: MessageType.CONSENSUS_REQUEST,
        payload: { ...request, responseId: requestId },
        timestamp: Date.now(),
        priority: MessagePriority.HIGH
      };

      agent.receiveMessage(message).catch(reject);
    });
  }

  // Aggregate consensus responses using weighted scoring
  private aggregateConsensus(responses: ConsensusResponse[], request: ConsensusRequest): string {
    const routeScores = new Map<string, number>();
    const routeVotes = new Map<string, number>();

    for (const response of responses) {
      const agentWeight = this.getAgentWeight(response.agentId);
      const routeId = response.recommendedRoute;

      const currentScore = routeScores.get(routeId) || 0;
      routeScores.set(routeId, currentScore + (response.score.totalScore * agentWeight));

      const currentVotes = routeVotes.get(routeId) || 0;
      routeVotes.set(routeId, currentVotes + 1);
    }

    // Find route with highest weighted score
    let bestRoute = '';
    let bestScore = -1;

    for (const [routeId, score] of routeScores) {
      const voteCount = routeVotes.get(routeId) || 0;
      const normalizedScore = score / voteCount;

      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestRoute = routeId;
      }
    }

    console.log(`🎯 Consensus result: Route ${bestRoute} (score: ${bestScore.toFixed(3)})`);
    return bestRoute;
  }

  // Calculate agent weight for consensus
  private getAgentWeight(agentId: string): number {
    const registry = this.agents.get(agentId);
    if (!registry) return 1;

    const agent = registry.agent;
    const health = agent.isHealthy() ? 1 : 0.5;
    const metrics = agent.getMetrics();
    const reliability = metrics.successRate;
    const failurePenalty = Math.max(0.5, 1 - (registry.failureCount * 0.1));

    return registry.priority * health * reliability * failurePenalty;
  }

  // System lifecycle management
  async start(): Promise<void> {
    if (this._isRunning) {
      throw new Error('Coordinator already running');
    }

    console.log('🚀 Starting Agent Coordinator...');

    // Start agents in dependency order
    const startOrder = this.calculateStartOrder();

    for (const agentId of startOrder) {
      const registry = this.agents.get(agentId);
      if (registry) {
        try {
          await registry.agent.start();
          console.log(`✅ Started agent: ${agentId}`);
        } catch (error) {
          console.error(`❌ Failed to start agent ${agentId}:`, error);
          registry.failureCount++;
        }
      }
    }

    this._isRunning = true;
    this.startHealthMonitoring();
    this.startTelemetryReporting();

    console.log(`✅ Agent Coordinator started with ${this.agents.size} agents`);
  }

  async stop(): Promise<void> {
    if (!this._isRunning) return;

    console.log('🛑 Stopping Agent Coordinator...');

    // Stop monitoring
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);

    // Clean up pending response handlers
    for (const [requestId, handler] of this.responseHandlers) {
      clearTimeout(handler.timeout);
      handler.reject(new Error('Coordinator shutting down'));
    }
    this.responseHandlers.clear();

    // Stop agents in reverse dependency order
    const stopOrder = this.calculateStartOrder().reverse();

    for (const agentId of stopOrder) {
      const registry = this.agents.get(agentId);
      if (registry) {
        try {
          await registry.agent.stop();
          console.log(`✅ Stopped agent: ${agentId}`);
        } catch (error) {
          console.error(`❌ Failed to stop agent ${agentId}:`, error);
        }
      }
    }

    this._isRunning = false;
    console.log('✅ Agent Coordinator stopped');
  }

  // Calculate start order based on dependencies
  private calculateStartOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (agentId: string) => {
      if (visited.has(agentId)) return;
      visited.add(agentId);

      const registry = this.agents.get(agentId);
      if (!registry) return;

      // Visit dependencies first
      for (const dep of registry.dependencies) {
        visit(dep);
      }

      order.push(agentId);
    };

    // Start with agents that have no dependencies
    for (const agentId of this.agents.keys()) {
      visit(agentId);
    }

    return order;
  }

  // Health monitoring
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    const healthReport = await this.getSystemHealth();

    // Update telemetry
    for (const [agentId, registry] of this.agents) {
      registry.lastHealthCheck = new Date();
    }

    // Handle unhealthy agents
    if (healthReport.unhealthyAgents.length > 0) {
      console.warn('⚠️ Unhealthy agents detected:', healthReport.unhealthyAgents);
      this.emit('healthAlert', healthReport);

      // Attempt recovery
      for (const agentId of healthReport.unhealthyAgents) {
        await this.attemptAgentRecovery(agentId);
      }
    }

    // Restart failed agents
    for (const agentId of healthReport.failedAgents) {
      await this.restartAgent(agentId);
    }
  }

  private async attemptAgentRecovery(agentId: string): Promise<void> {
    const registry = this.agents.get(agentId);
    if (!registry) return;

    console.log(`🔧 Attempting recovery for agent ${agentId}...`);

    try {
      const health = await registry.agent.healthCheck();
      if (health.healthy) {
        console.log(`✅ Agent ${agentId} recovered`);
        registry.failureCount = Math.max(0, registry.failureCount - 1);
      } else {
        registry.failureCount++;
        if (registry.failureCount > 3) {
          await this.restartAgent(agentId);
        }
      }
    } catch (error) {
      console.error(`Recovery failed for agent ${agentId}:`, error);
      registry.failureCount++;
    }
  }

  private async restartAgent(agentId: string): Promise<void> {
    const registry = this.agents.get(agentId);
    if (!registry) return;

    console.log(`🔄 Restarting agent ${agentId}...`);

    try {
      await registry.agent.stop();
      await this.sleep(1000);
      await registry.agent.start();
      registry.failureCount = 0;
      console.log(`✅ Agent ${agentId} restarted successfully`);
    } catch (error) {
      console.error(`❌ Failed to restart agent ${agentId}:`, error);
      registry.failureCount++;
    }
  }

  // Telemetry reporting
  private startTelemetryReporting(): void {
    if (!this.config.telemetry.enabled) return;

    this.telemetryInterval = setInterval(() => {
      const report = this.generateTelemetryReport();
      this.emit('telemetryReport', report);
      console.log('📊 System Telemetry:', this.summarizeTelemetry(report));
    }, this.config.telemetry.reportingInterval);
  }

  private generateTelemetryReport(): Record<string, unknown> {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      timestamp: new Date(),
      systemUptime: uptime,
      messagesProcessed: this.telemetry.messagesProcessed,
      messagesByType: Object.fromEntries(this.telemetry.messagesByType),
      consensusRequests: this.telemetry.consensusRequests,
      consensusSuccessRate: this.telemetry.consensusSuccessRate,
      agentStats: this.getAgentStatistics(),
      systemHealth: this.getSystemHealthSummary()
    };
  }

  private getAgentStatistics(): Record<string, unknown>[] {
    const stats: Record<string, unknown>[] = [];

    for (const [agentId, registry] of this.agents) {
      const metrics = registry.agent.getMetrics();
      stats.push({
        id: agentId,
        type: registry.type,
        role: registry.role,
        status: registry.agent.getStatus(),
        tasksCompleted: metrics.tasksCompleted,
        successRate: metrics.successRate,
        averageResponseTime: metrics.averageResponseTime,
        failureCount: registry.failureCount,
        healthy: registry.agent.isHealthy()
      });
    }

    return stats;
  }

  private summarizeTelemetry(report: Record<string, unknown>): string {
    const activeAgents = (report.agentStats as Record<string, unknown>[]).filter((a: Record<string, unknown>) => a.status === 'ACTIVE').length;
    return `${activeAgents}/${this.agents.size} agents active, ${report.messagesProcessed} messages processed`;
  }

  // Message handlers
  private async handleCoordinatorMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case MessageType.REQUEST_ANALYSIS:
        await this.handleAnalysisRequest(message);
        break;
      default:
        console.log(`Unhandled coordinator message: ${message.type}`);
    }
  }

  private async handleConsensusMessage(message: AgentMessage): Promise<void> {
    const { responseId, ...response } = message.payload;
    
    const handler = this.responseHandlers.get(responseId);
    if (handler) {
      clearTimeout(handler.timeout);
      this.responseHandlers.delete(responseId);
      handler.resolve(response);
    }
  }

  private async handleRouteProposal(message: AgentMessage): Promise<void> {
    const proposal = message.payload as RouteProposal;
    console.log(`📍 Route proposal from ${message.from}: ${proposal.id}`);
    this.emit('routeProposal', proposal);
  }

  private async handleErrorReport(message: AgentMessage): Promise<void> {
    const { error, context } = message.payload;
    console.error(`📣 Error report from ${message.from}:`, error);
    this.emit('errorReport', { agentId: message.from, error, context });
  }

  private async handleAnalysisRequest(message: AgentMessage): Promise<void> {
    const { type, data } = message.payload;
    
    switch (type) {
      case 'system-health':
        const health = await this.getSystemHealth();
        await this.sendResponse(message, health);
        break;
      case 'agent-metrics':
        const metrics = this.getAgentStatistics();
        await this.sendResponse(message, metrics);
        break;
      default:
        console.log(`Unknown analysis request: ${type}`);
    }
  }

  private async sendResponse(originalMessage: AgentMessage, data: unknown): Promise<void> {
    const response: AgentMessage = {
      id: this.generateRequestId(),
      from: 'coordinator',
      to: originalMessage.from,
      type: MessageType.EXECUTION_RESULT,
      payload: {
        requestId: originalMessage.id,
        data
      },
      timestamp: Date.now(),
      priority: MessagePriority.MEDIUM
    };

    await this.routeMessage(response);
  }

  // System status methods
  async getSystemHealth(): Promise<any> {
    const unhealthyAgents: string[] = [];
    const failedAgents: string[] = [];
    const issues: string[] = [];
    let activeAgents = 0;

    for (const [agentId, registry] of this.agents) {
      const agent = registry.agent;
      const status = agent.getStatus();

      if (status === AgentStatus.ACTIVE) {
        activeAgents++;
      } else if (status === AgentStatus.ERROR) {
        failedAgents.push(agentId);
      }

      try {
        const health = await agent.healthCheck();
        if (!health.healthy) {
          unhealthyAgents.push(agentId);
          issues.push(...health.issues.map(issue => `${agentId}: ${issue}`));
        }
      } catch (error) {
        unhealthyAgents.push(agentId);
        issues.push(`${agentId}: Health check failed`);
      }
    }

    const healthy = unhealthyAgents.length === 0 && failedAgents.length === 0;

    return {
      healthy,
      totalAgents: this.agents.size,
      activeAgents,
      unhealthyAgents,
      failedAgents,
      issues,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  private getSystemHealthSummary(): string {
    const activeCount = Array.from(this.agents.values())
      .filter(r => r.agent.getStatus() === AgentStatus.ACTIVE).length;
    return `${activeCount}/${this.agents.size} agents active`;
  }

  // Public API
  getAgent(agentId: string): BaseAgent | null {
    const registry = this.agents.get(agentId);
    return registry ? registry.agent : null;
  }

  getAllAgents(): Array<{ id: string; type: string; role: string; status: AgentStatus }> {
    return Array.from(this.agents.entries()).map(([id, registry]) => ({
      id,
      type: registry.type,
      role: registry.role,
      status: registry.agent.getStatus()
    }));
  }

  getAgentMetrics(agentId: string): AgentMetrics | null {
    const registry = this.agents.get(agentId);
    return registry ? registry.agent.getMetrics() : null;
  }

  getTelemetryReport(): Record<string, unknown> {
    return this.generateTelemetryReport();
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  // Utility methods
  private hasMatchingCapabilities(cap1: AgentCapabilities, cap2: AgentCapabilities): boolean {
    return (
      cap1.canAnalyzeMarket === cap2.canAnalyzeMarket &&
      cap1.canDiscoverRoutes === cap2.canDiscoverRoutes &&
      cap1.canAssessRisk === cap2.canAssessRisk &&
      cap1.canExecuteTransactions === cap2.canExecuteTransactions
    );
  }

  private updateMessageTypeTelemetry(type: MessageType): void {
    const count = this.telemetry.messagesByType.get(type) || 0;
    this.telemetry.messagesByType.set(type, count + 1);
  }

  private updateConsensusSuccessRate(success: boolean): void {
    const total = this.telemetry.consensusRequests;
    const currentRate = this.telemetry.consensusSuccessRate;
    const newRate = (currentRate * (total - 1) + (success ? 1 : 0)) / total;
    this.telemetry.consensusSuccessRate = newRate;
  }

  private recordAgentSuccess(agentId: string): void {
    const count = this.telemetry.averageResponseTime.get(agentId) || 0;
    this.telemetry.averageResponseTime.set(agentId, count + 1);
  }

  private recordAgentFailure(agentId: string): void {
    const count = this.telemetry.agentFailures.get(agentId) || 0;
    this.telemetry.agentFailures.set(agentId, count + 1);

    const registry = this.agents.get(agentId);
    if (registry) {
      registry.failureCount++;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `coord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}