// 🤖 Base Agent Class - Production-ready foundation with advanced error handling
// Addresses concurrency, retry logic, cancellation, and intelligent analysis

import { EventEmitter } from 'events';
import { Mutex } from 'async-mutex';
import PQueue from 'p-queue';
import {
  AgentConfig,
  AgentStatus,
  AgentMetrics,
  AgentError,
  AgentMessage,
  MessageType,
  MessagePriority,
  AgentCapabilities,
  AgentEventHandlers
} from './types';

interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface TaskContext {
  id: string;
  task: Record<string, unknown>;
  startTime: number;
  retryCount: number;
  abortController: AbortController;
}

interface ResponseHandler<T = unknown> {
  requestId: string;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected status: AgentStatus = AgentStatus.INITIALIZING;
  protected metrics: AgentMetrics;
  protected capabilities: AgentCapabilities;
  
  // Concurrent-safe message handling
  private messageQueue: PQueue;
  private messageMutex = new Mutex();
  
  // Task management with cancellation support
  protected activeTasks = new Map<string, TaskContext>();
  private taskMutex = new Mutex();
  
  // Response handling for inter-agent communication
  private responseHandlers = new Map<string, ResponseHandler<unknown>>();
  
  // Retry configuration
  protected retryPolicy: RetryPolicy = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2
  };

  // Circuit breaker for failing operations
  private circuitBreaker = {
    failures: 0,
    maxFailures: 5,
    resetTime: 60000,
    isOpen: false,
    lastFailure: 0
  };

  constructor(config: AgentConfig, capabilities: AgentCapabilities) {
    super();
    this.config = config;
    this.capabilities = capabilities;
    
    // Initialize concurrent message queue
    this.messageQueue = new PQueue({ 
      concurrency: config.maxConcurrentTasks || 10,
      timeout: config.timeout || 30000,
      throwOnTimeout: true
    });

    this.metrics = {
      tasksCompleted: 0,
      tasksInProgress: 0,
      averageResponseTime: 0,
      successRate: 1.0,
      lastActivity: Date.now(),
      errors: []
    };

    this.setupEventHandlers();
    this.startHealthMonitor();
  }

  // Abstract methods that specialized agents must implement
  abstract initialize(): Promise<void>;
  abstract processMessage(message: AgentMessage, signal: AbortSignal): Promise<void>;
  abstract handleTask(task: Record<string, unknown>, signal: AbortSignal): Promise<unknown>;
  abstract cleanup(): Promise<void>;
  
  // Optional intelligent error analysis (can be overridden by specialized agents)
  protected async analyzeError(error: Error, context: Record<string, unknown>): Promise<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    recommendations: string[];
    autoRecoverable: boolean;
  }> {
    // Default implementation - specialized agents can override with smarter analysis
    const message = error.message.toLowerCase();
    
    // Network-related errors
    if (message.includes('econnrefused') || message.includes('timeout') || message.includes('network')) {
      return {
        severity: 'medium',
        category: 'network',
        recommendations: ['Check network connectivity', 'Verify API endpoints', 'Implement retry'],
        autoRecoverable: true
      };
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
      return {
        severity: 'medium',
        category: 'rate-limit',
        recommendations: ['Implement backoff strategy', 'Use request queuing', 'Check API limits'],
        autoRecoverable: true
      };
    }
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('401') || message.includes('forbidden')) {
      return {
        severity: 'high',
        category: 'authentication',
        recommendations: ['Check API credentials', 'Refresh auth tokens', 'Verify permissions'],
        autoRecoverable: false
      };
    }
    
    // Critical system errors
    if (message.includes('out of memory') || message.includes('segfault') || message.includes('fatal')) {
      return {
        severity: 'critical',
        category: 'system',
        recommendations: ['Restart agent', 'Check system resources', 'Review memory usage'],
        autoRecoverable: false
      };
    }
    
    return {
      severity: 'low',
      category: 'unknown',
      recommendations: ['Log error for analysis', 'Monitor frequency'],
      autoRecoverable: true
    };
  }

  // Core Agent Lifecycle Management
  async start(): Promise<void> {
    try {
      this.status = AgentStatus.INITIALIZING;
      await this.initialize();
      this.status = AgentStatus.ACTIVE;
      
      console.log(`🤖 Agent ${this.config.name} started successfully`);
      this.emit('statusChange', this.status);
    } catch (error) {
      await this.handleError(error as Error, 'Failed to start agent');
      this.status = AgentStatus.ERROR;
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.status = AgentStatus.OFFLINE;
      
      // Cancel all active tasks
      await this.cancelAllTasks();
      
      // Clear message queue
      this.messageQueue.clear();
      
      // Cleanup agent-specific resources
      await this.cleanup();
      
      console.log(`🤖 Agent ${this.config.name} stopped`);
      this.emit('statusChange', this.status);
    } catch (error) {
      await this.handleError(error as Error, 'Failed to stop agent gracefully');
    }
  }

  // Concurrent-safe message handling with retry logic
  async receiveMessage(message: AgentMessage): Promise<void> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error('Circuit breaker is open - agent temporarily unavailable');
    }

    // Add to concurrent queue
    await this.messageQueue.add(async () => {
      const abortController = new AbortController();
      const taskId = this.generateTaskId();
      
      try {
        await this.processMessageWithRetry(message, abortController.signal);
        this.recordSuccess();
      } catch (error) {
        await this.handleError(error as Error, `Failed to process message ${message.id}`);
        this.recordFailure();
        throw error;
      }
    }, { priority: message.priority });
  }

  private async processMessageWithRetry(message: AgentMessage, signal: AbortSignal): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      if (signal.aborted) {
        throw new Error('Message processing cancelled');
      }
      
      try {
        this.status = AgentStatus.BUSY;
        const startTime = Date.now();
        
        await this.processMessage(message, signal);
        
        const responseTime = Date.now() - startTime;
        this.updateMetrics(responseTime, true);
        this.status = AgentStatus.ACTIVE;
        
        return; // Success!
      } catch (error) {
        lastError = error as Error;
        const errorAnalysis = await this.analyzeError(lastError, { message, attempt });
        
        if (!errorAnalysis.autoRecoverable || attempt === this.retryPolicy.maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = Math.min(
          this.retryPolicy.initialDelay * Math.pow(this.retryPolicy.backoffFactor, attempt),
          this.retryPolicy.maxDelay
        );
        
        console.log(`⏳ Retrying message processing after ${delay}ms (attempt ${attempt + 1})`);
        await this.sleep(delay);
      }
    }
    
    throw lastError || new Error('Message processing failed');
  }

  // Task execution with cancellation support
  async executeTask(taskId: string, task: Record<string, unknown>, timeoutMs?: number): Promise<unknown> {
    const release = await this.taskMutex.acquire();
    
    try {
      if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
        throw new Error('Agent at maximum concurrent task capacity');
      }
      
      const abortController = new AbortController();
      const taskContext: TaskContext = {
        id: taskId,
        task,
        startTime: Date.now(),
        retryCount: 0,
        abortController
      };
      
      this.activeTasks.set(taskId, taskContext);
      this.metrics.tasksInProgress++;
    } finally {
      release();
    }
    
    try {
      const timeout = timeoutMs || this.config.timeout;
      const result = await Promise.race([
        this.handleTaskWithRetry(taskId),
        new Promise((_, reject) => {
          const taskContext = this.activeTasks.get(taskId);
          if (taskContext) {
            const timeoutId = setTimeout(() => {
              taskContext.abortController.abort();
              reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
            }, timeout);
            
            // Clear timeout if task completes
            taskContext.abortController.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
            });
          }
        })
      ]);
      
      this.metrics.tasksCompleted++;
      return result;
    } catch (error) {
      await this.handleError(error as Error, `Task ${taskId} failed`);
      throw error;
    } finally {
      await this.cleanupTask(taskId);
    }
  }

  private async handleTaskWithRetry(taskId: string): Promise<unknown> {
    const taskContext = this.activeTasks.get(taskId);
    if (!taskContext) throw new Error('Task context not found');
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      if (taskContext.abortController.signal.aborted) {
        throw new Error('Task cancelled');
      }
      
      try {
        const result = await this.handleTask(taskContext.task, taskContext.abortController.signal);
        const responseTime = Date.now() - taskContext.startTime;
        this.updateMetrics(responseTime, true);
        return result;
      } catch (error) {
        lastError = error as Error;
        taskContext.retryCount++;
        
        const errorAnalysis = await this.analyzeError(lastError, { taskId, attempt });
        
        if (!errorAnalysis.autoRecoverable || attempt === this.retryPolicy.maxRetries) {
          throw lastError;
        }
        
        const delay = Math.min(
          this.retryPolicy.initialDelay * Math.pow(this.retryPolicy.backoffFactor, attempt),
          this.retryPolicy.maxDelay
        );
        
        console.log(`⏳ Retrying task ${taskId} after ${delay}ms (attempt ${attempt + 1})`);
        await this.sleep(delay);
      }
    }
    
    throw lastError || new Error('Task execution failed');
  }

  // Cancel specific task
  async cancelTask(taskId: string): Promise<void> {
    const taskContext = this.activeTasks.get(taskId);
    if (taskContext) {
      taskContext.abortController.abort();
      await this.cleanupTask(taskId);
    }
  }

  // Cancel all active tasks
  private async cancelAllTasks(): Promise<void> {
    const tasks = Array.from(this.activeTasks.keys());
    await Promise.all(tasks.map(taskId => this.cancelTask(taskId)));
  }

  private async cleanupTask(taskId: string): Promise<void> {
    const release = await this.taskMutex.acquire();
    try {
      this.activeTasks.delete(taskId);
      this.metrics.tasksInProgress--;
      this.updateActivity();
    } finally {
      release();
    }
  }

  // Inter-agent communication with proper typing and timeout control
  protected async requestDataFromAgent<T = unknown>(
    targetAgent: string, 
    requestType: MessageType,
    payload: unknown,
    timeoutMs: number = 30000
  ): Promise<T> {
    const requestId = this.generateTaskId();
    
    return new Promise<T>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(requestId);
        reject(new Error(`Request to ${targetAgent} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Register response handler
      this.responseHandlers.set(requestId, {
        requestId,
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout
      });
      
      // Send request
      this.sendMessage({
        to: targetAgent,
        type: requestType,
        payload: { requestId, ...(payload as Record<string, unknown>) },
        priority: MessagePriority.MEDIUM
      });
    });
  }

  // Handle responses from other agents
  protected handleAgentResponse(message: AgentMessage): void {
    const payload = message.payload as Record<string, unknown> | undefined;
    if (message.type === MessageType.EXECUTION_RESULT && payload?.requestId) {
      const handler = this.responseHandlers.get(String(payload.requestId));
      if (handler) {
        clearTimeout(handler.timeout);
        this.responseHandlers.delete(String(payload.requestId));
        handler.resolve(payload.data);
      }
    }
  }

  // Circuit breaker implementation
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreaker.isOpen) return false;
    
    // Check if reset time has passed
    if (Date.now() - this.circuitBreaker.lastFailure > this.circuitBreaker.resetTime) {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failures = 0;
      return false;
    }
    
    return true;
  }

  private recordSuccess(): void {
    // Reset failure count on success
    if (this.circuitBreaker.failures > 0) {
      this.circuitBreaker.failures = Math.max(0, this.circuitBreaker.failures - 1);
    }
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.maxFailures) {
      this.circuitBreaker.isOpen = true;
      console.error(`🔒 Circuit breaker opened for agent ${this.config.name}`);
    }
  }

  // Enhanced error handling
  private async handleError(error: Error, context: string): Promise<void> {
    const analysis = await this.analyzeError(error, { context });
    
    const agentError: AgentError = {
      timestamp: Date.now(),
      error: error.message,
      context: {
        ...analysis,
        originalContext: context
      },
      severity: analysis.severity
    };

    const release = await this.messageMutex.acquire();
    try {
      this.metrics.errors.push(agentError);
      
      // Keep only recent errors (last 1000)
      if (this.metrics.errors.length > 1000) {
        this.metrics.errors = this.metrics.errors.slice(-1000);
      }
    } finally {
      release();
    }

    console.error(`❌ Agent ${this.config.name} Error (${analysis.severity}):`, {
      error: error.message,
      category: analysis.category,
      recommendations: analysis.recommendations
    });
    
    this.emit('error', agentError);
  }

  // Health monitoring
  private startHealthMonitor(): void {
    setInterval(async () => {
      const health = await this.healthCheck();
      if (!health.healthy) {
        console.warn(`⚠️ Agent ${this.config.name} health issues:`, health.issues);
        this.emit('healthCheck', health);
      }
    }, 60000); // Check every minute
  }

  // Utility methods
  private generateTaskId(): string {
    return `${this.config.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateMetrics(responseTime: number, success: boolean): void {
    // Thread-safe metric updates would go here
    // For now, keeping simple implementation
    const totalTasks = this.metrics.tasksCompleted;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * totalTasks + responseTime) / (totalTasks + 1);

    const totalAttempts = this.metrics.tasksCompleted + this.metrics.errors.length + 1;
    const successfulAttempts = success ? this.metrics.tasksCompleted + 1 : this.metrics.tasksCompleted;
    this.metrics.successRate = successfulAttempts / totalAttempts;
  }

  private updateActivity(): void {
    this.metrics.lastActivity = Date.now();
  }

  // Public message sending
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp' | 'from'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateTaskId(),
      from: this.config.id,
      timestamp: Date.now()
    };

    this.emit('message', fullMessage);
    this.updateActivity();
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (this.status !== AgentStatus.ACTIVE) {
      issues.push(`Agent status is ${this.status}`);
    }
    
    // More lenient success rate check - only flag if we have data and it's poor
    if (this.metrics.tasksCompleted > 5 && this.metrics.successRate < 0.7) {
      issues.push(`Low success rate: ${(this.metrics.successRate * 100).toFixed(1)}% (${this.metrics.tasksCompleted} tasks)`);
    }
    
    if (this.circuitBreaker.isOpen) {
      issues.push('Circuit breaker is open');
    }
    
    const recentErrors = this.metrics.errors.filter(e => 
      e.timestamp > Date.now() - 300000 && e.severity !== 'low'
    );
    
    if (recentErrors.length > 3) {
      issues.push(`High error rate: ${recentErrors.length} significant errors in last 5 minutes`);
    }
    
    if (Date.now() - this.metrics.lastActivity > 600000) {
      issues.push('Agent has been inactive for over 10 minutes');
    }
    
    if (this.activeTasks.size > this.config.maxConcurrentTasks * 0.8) {
      issues.push(`High task load: ${this.activeTasks.size}/${this.config.maxConcurrentTasks}`);
    }
    
    const isHealthy = issues.length === 0;
    
    // Log health status for debugging (only for unhealthy agents)
    if (!isHealthy) {
      console.log(`🔍 Health check for ${this.config.name}:`, {
        status: this.status,
        circuitBreakerOpen: this.circuitBreaker.isOpen,
        successRate: this.metrics.successRate,
        totalTasks: this.metrics.tasksCompleted,
        lastActivity: new Date(this.metrics.lastActivity).toISOString(),
        activeTasks: this.activeTasks.size,
        issues
      });
    }
    
    return {
      healthy: isHealthy,
      issues
    };
  }

  // Public API methods for AgentCoordinator
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getCapabilities(): AgentCapabilities {
    // Convert string array to capabilities object for backward compatibility
    const capabilityStrings = this.config.capabilities || [];
    return {
      canAnalyzeMarket: capabilityStrings.includes('market-analysis'),
      canDiscoverRoutes: capabilityStrings.includes('route-discovery'),
      canAssessRisk: capabilityStrings.includes('risk-assessment'),
      canExecuteTransactions: capabilityStrings.includes('transaction-execution'),
      canMonitorPerformance: capabilityStrings.includes('performance-monitoring'),
      supportedNetworks: capabilityStrings.filter(cap => cap.startsWith('network:')).map(cap => cap.replace('network:', '')),
      supportedProtocols: capabilityStrings.filter(cap => cap.startsWith('protocol:')).map(cap => cap.replace('protocol:', ''))
    };
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  isHealthy(): boolean {
    // Agent is healthy if:
    // 1. Status is ACTIVE
    // 2. Circuit breaker is closed
    // 3. Either no failures recorded OR success rate > 0.7 (more lenient)
    const hasGoodSuccessRate = this.metrics.tasksCompleted === 0 || this.metrics.successRate > 0.7;
    
    return this.status === AgentStatus.ACTIVE && 
           !this.circuitBreaker.isOpen &&
           hasGoodSuccessRate;
  }

  // Event setup
  private setupEventHandlers(): void {
    this.on('error', async (error: AgentError) => {
      if (error.severity === 'critical') {
        this.status = AgentStatus.ERROR;
        // Attempt graceful shutdown
        setTimeout(() => this.stop(), 5000);
      }
    });
    
    // Handle responses for inter-agent communication
    this.on('message', (message: AgentMessage) => {
      this.handleAgentResponse(message);
    });
  }
}