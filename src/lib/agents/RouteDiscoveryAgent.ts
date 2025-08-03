// 🛣️ Route Discovery Agent - Advanced multi-DEX pathfinding with 1inch Fusion integration
// Implements sophisticated routing with real-time gas estimates, parallel processing, and Fusion API integration

import { BaseAgent } from './BaseAgent';
import {
  AgentConfig,
  AgentMessage,
  MessageType,
  MessagePriority,
  AgentCapabilities,
  RouteProposal,
  RouteStep,
  MarketConditions,
  DecisionCriteria,
  RiskAssessment
} from './types';
import { DataAggregationService, FusionQuoteParams, FusionQuoteResponse } from '../services/DataAggregationService';

export interface RoutingGraph {
  nodes: Map<string, TokenNode>;
  edges: Map<string, PoolEdge[]>;
  liquidityIndex: Map<string, number>;
  fusionCompatibilityCache: Map<string, boolean>; // Cache for Fusion-compatible paths
  lastUpdate: number;
}

export interface TokenNode {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  price: number;
  marketCap: number;
  isStable: boolean;
  riskScore: number;
}

export interface PoolEdge {
  id: string;
  protocol: string;
  fromToken: string;
  toToken: string;
  liquidity: number;
  fee: number;
  gasEstimate: number;
  realTimeGasEstimate?: number; // Live gas estimate from Fusion
  slippage: SlippageModel;
  lastUpdate: number;
  reliability: number;
  mevRisk: number;
  fusionCompatible: boolean; // Whether this edge can be executed via Fusion
  fusionQuoteCache?: FusionEdgeQuote; // Cached Fusion quote for this edge
}

export interface FusionEdgeQuote {
  toAmount: string;
  impliedCost: number; // Derived from (1 - toTokenAmount / amountIn)
  gasEstimate: number;
  executionType: 'public' | 'private' | 'rfq';
  timestamp: number;
  ttl: number; // Time to live in ms
}

export interface SlippageModel {
  type: 'constant' | 'uniswap_v2' | 'uniswap_v3' | 'curve' | 'balancer' | 'fusion_real';
  params: Record<string, number>;
  calculateSlippage: (amountIn: number, liquidity: number) => number;
}

export interface RouteSearchParams {
  fromToken: string;
  toToken: string;
  amountIn: string;
  chainId: number;
  maxHops: number;
  maxSlippage: number;
  gasPrice: number;
  prioritizeGas: boolean;
  prioritizeSlippage: boolean;
  excludeProtocols: string[];
  includeOnlyProtocols?: string[];
  deadline: number;
  useFusionQuotes: boolean; // Enable Fusion API integration
}

export interface PathfindingResult {
  routes: RouteProposal[];
  searchStats: {
    nodesExplored: number;
    pathsEvaluated: number;
    timeSpent: number;
    cacheHits: number;
    fusionQueries: number;
    parallelBatches: number;
    optimalityGap: number;
  };
  graphStats: {
    totalNodes: number;
    totalEdges: number;
    fusionCompatibleEdges: number;
    liquidityDistribution: Record<string, number>;
    protocolCoverage: string[];
  };
}

// Enhanced pathfinding with Fusion integration
export class FusionAwarePathfinder {
  private dataService: DataAggregationService;
  private fusionQuoteCache: Map<string, FusionEdgeQuote> = new Map();
  private readonly FUSION_QUOTE_TTL = 30000; // 30 seconds

  constructor(dataService: DataAggregationService) {
    this.dataService = dataService;
  }

  async findOptimalPath(
    graph: RoutingGraph,
    start: string,
    end: string,
    params: RouteSearchParams
  ): Promise<RouteProposal[]> {
    if (params.useFusionQuotes) {
      return await this.findFusionOptimizedPath(graph, start, end, params);
    }
    
    return this.findTraditionalPath(graph, start, end, params);
  }

  // 🚀 Fusion-optimized pathfinding with real-time quotes
  private async findFusionOptimizedPath(
    graph: RoutingGraph,
    start: string,
    end: string,
    params: RouteSearchParams
  ): Promise<RouteProposal[]> {
    const distances = new Map<string, number>();
    const previous = new Map<string, {node: string, edge: PoolEdge, fusionQuote?: FusionEdgeQuote}>();
    const visited = new Set<string>();
    const pq = new PriorityQueue<{node: string, cost: number}>();

    // Initialize distances
    for (const node of graph.nodes.keys()) {
      distances.set(node, Infinity);
    }
    distances.set(start, 0);
    pq.enqueue({node: start, cost: 0});

    let fusionQueries = 0;

    while (!pq.isEmpty()) {
      const current = pq.dequeue()!;
      
      if (visited.has(current.node)) continue;
      visited.add(current.node);

      if (current.node === end) break;

      const edges = graph.edges.get(current.node) || [];
      
      // 🔍 Pre-filter edges with Fusion feasibility check
      const feasibleEdges = await this.filterFusionFeasibleEdges(edges, params, graph);
      fusionQueries += feasibleEdges.fusionQueries;
      
      for (const edge of feasibleEdges.edges) {
        const neighbor = edge.toToken;
        
        // 📊 Use real Fusion quote for accurate edge cost
        const edgeCost = await this.calculateFusionAwareEdgeCost(edge, params);
        const newDistance = (distances.get(current.node) || Infinity) + edgeCost.cost;
        
        // 🤖 Early pruning with Fusion quotes
        if (await this.shouldPruneNode(neighbor, end, newDistance, params)) {
          continue;
        }
        
        if (newDistance < (distances.get(neighbor) || Infinity)) {
          distances.set(neighbor, newDistance);
          previous.set(neighbor, {
            node: current.node,
            edge,
            fusionQuote: edgeCost.fusionQuote
          });
          pq.enqueue({node: neighbor, cost: newDistance});
        }
      }
    }

    const routes = await this.reconstructFusionOptimizedPaths(previous, start, end, graph, params);
    
    // Add Fusion query stats
    for (const route of routes) {
      (route as RouteProposal & { fusionQueries: number }).fusionQueries = fusionQueries;
    }
    
    return routes;
  }

  // 🔍 Pre-Quote Filtering for Feasibility
  private async filterFusionFeasibleEdges(
    edges: PoolEdge[],
    params: RouteSearchParams,
    graph: RoutingGraph
  ): Promise<{edges: PoolEdge[], fusionQueries: number}> {
    const feasibleEdges: PoolEdge[] = [];
    let fusionQueries = 0;

    // Validate parameters first to avoid undefined API calls
    if (!params.fromToken || !params.toToken || !params.amountIn || params.amountIn === '0') {
      console.warn('⚠️ Invalid parameters for Fusion filtering, skipping API calls');
      return { edges, fusionQueries: 0 };
    }

    // Batch process edges for better performance with rate limiting
    const BATCH_SIZE = 3; // Reduced batch size to avoid rate limits
    const batches = this.chunkArray(edges, BATCH_SIZE);

    for (const batch of batches) {
      const feasibilityChecks = batch.map(async (edge) => {
        // Check cache first
        const cacheKey = `${edge.fromToken}-${edge.toToken}-${params.amountIn}`;
        if (graph.fusionCompatibilityCache.has(cacheKey)) {
          return { edge, feasible: graph.fusionCompatibilityCache.get(cacheKey)! };
        }

        try {
          // Quick Fusion feasibility check
          const fusionParams: FusionQuoteParams = {
            src: edge.fromToken,
            dst: edge.toToken,
            amount: params.amountIn,
            from: '0x0000000000000000000000000000000000000000', // Dummy address for quote
            gasLimit: '400000'
          };

          const quote = await this.dataService.getFusionQuote(fusionParams, params.chainId);
          fusionQueries++;

          const feasible = quote && parseFloat(quote.toAmount) > 0;
          graph.fusionCompatibilityCache.set(cacheKey, feasible);

          return { edge, feasible };
        } catch (error) {
          // If Fusion quote fails, assume not feasible via Fusion but keep for traditional routing
          graph.fusionCompatibilityCache.set(cacheKey, false);
          return { edge, feasible: false };
        }
      });

      const results = await Promise.all(feasibilityChecks);
      
      for (const result of results) {
        if (result.feasible) {
          result.edge.fusionCompatible = true;
          feasibleEdges.push(result.edge);
        } else if (!params.useFusionQuotes) {
          // Keep non-Fusion edges for traditional routing
          feasibleEdges.push(result.edge);
        }
      }
    }

    return { edges: feasibleEdges, fusionQueries };
  }

  // ⚖️ Improved calculateEdgeCost Accuracy with Fusion quotes
  private async calculateFusionAwareEdgeCost(
    edge: PoolEdge,
    params: RouteSearchParams
  ): Promise<{cost: number, fusionQuote?: FusionEdgeQuote}> {
    if (!edge.fusionCompatible || !params.useFusionQuotes) {
      return { cost: this.calculateTraditionalEdgeCost(edge, params) };
    }

    // Check cache for recent Fusion quote
    const cacheKey = `${edge.id}-${params.amountIn}-${params.gasPrice}`;
    const cached = this.fusionQuoteCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return { cost: cached.impliedCost, fusionQuote: cached };
    }

    try {
      // Get real Fusion quote for accurate cost
      const fusionParams: FusionQuoteParams = {
        src: edge.fromToken,
        dst: edge.toToken,
        amount: params.amountIn,
        from: '0x0000000000000000000000000000000000000000',
        gasPrice: params.gasPrice.toString()
      };

      const quote = await this.dataService.getFusionQuote(fusionParams, params.chainId);
      
      // Derive total implied cost: (1 - toTokenAmount / amountIn)
      const amountIn = parseFloat(params.amountIn);
      const amountOut = parseFloat(quote.toAmount);
      const impliedCost = amountIn > 0 ? (1 - (amountOut / amountIn)) : 1;

      // Determine execution type for MEV analysis
      const executionType = this.determineExecutionType(quote);

      const fusionQuote: FusionEdgeQuote = {
        toAmount: quote.toAmount,
        impliedCost: Math.max(0, impliedCost),
        gasEstimate: parseInt(quote.tx.gas),
        executionType,
        timestamp: Date.now(),
        ttl: this.FUSION_QUOTE_TTL
      };

      // Cache the quote
      this.fusionQuoteCache.set(cacheKey, fusionQuote);
      
      // Update edge with real-time gas estimate
      edge.realTimeGasEstimate = fusionQuote.gasEstimate;

      return { cost: impliedCost, fusionQuote };
    } catch (error) {
      console.warn(`Fusion quote failed for edge ${edge.id}:`, error);
      return { cost: this.calculateTraditionalEdgeCost(edge, params) };
    }
  }

  // 🤖 Early Pruning in Pathfinding
  private async shouldPruneNode(
    node: string,
    target: string,
    currentCost: number,
    params: RouteSearchParams
  ): Promise<boolean> {
    if (!params.useFusionQuotes) return false;
    
    // If we're more than 3 hops away from target and cost is already high, prune
    if (currentCost > 0.1) { // 10% cost threshold
      try {
        // Quick heuristic: try direct quote from current node to target
        const directQuote = await this.dataService.getFusionQuote({
          src: node,
          dst: target,
          amount: (parseFloat(params.amountIn) * (1 - currentCost)).toString(),
          from: '0x0000000000000000000000000000000000000000'
        }, params.chainId);

        // If direct path gives better result, prune this branch
        const directCost = 1 - (parseFloat(directQuote.toAmount) / parseFloat(params.amountIn));
        return directCost < currentCost * 1.2; // 20% buffer
      } catch {
        return false; // Don't prune if we can't get direct quote
      }
    }
    
    return false;
  }

  private determineExecutionType(quote: FusionQuoteResponse): 'public' | 'private' | 'rfq' {
    // Analyze quote to determine execution type
    const protocols = quote.protocols.flat();
    
    if (protocols.some(p => p.name.toLowerCase().includes('rfq'))) {
      return 'rfq';
    }
    
    if (protocols.some(p => p.name.toLowerCase().includes('private'))) {
      return 'private';
    }
    
    return 'public';
  }

  private calculateTraditionalEdgeCost(edge: PoolEdge, params: RouteSearchParams): number {
    let cost = edge.fee;
    
    if (params.prioritizeGas) {
      const gasEstimate = edge.realTimeGasEstimate || edge.gasEstimate;
      cost += (gasEstimate * params.gasPrice) / 1e9 * 0.001;
    }
    
    if (params.prioritizeSlippage) {
      const slippage = edge.slippage.calculateSlippage(parseFloat(params.amountIn), edge.liquidity);
      cost += slippage;
    }
    
    cost += edge.mevRisk * 0.1;
    return cost * (2 - edge.reliability);
  }

  private findTraditionalPath(
    graph: RoutingGraph,
    start: string,
    end: string,
    params: RouteSearchParams
  ): RouteProposal[] {
    // Traditional Dijkstra implementation (simplified)
    return [];
  }

  private async reconstructFusionOptimizedPaths(
    previous: Map<string, {node: string, edge: PoolEdge, fusionQuote?: FusionEdgeQuote}>,
    start: string,
    end: string,
    graph: RoutingGraph,
    params: RouteSearchParams
  ): Promise<RouteProposal[]> {
    const path: Array<{node: string, edge?: PoolEdge, fusionQuote?: FusionEdgeQuote}> = [];
    let current = end;
    
    while (current !== start) {
      const prev = previous.get(current);
      if (!prev) break;
      
      path.unshift({ node: current, edge: prev.edge, fusionQuote: prev.fusionQuote });
      current = prev.node;
    }
    
    path.unshift({ node: start });

    if (path.length < 2) return [];

    // ⚙️ Replace Simulated Output with Real Quote Output
    const route = await this.buildFusionOptimizedRoute(path, params);
    return [route];
  }

  private async buildFusionOptimizedRoute(
    path: Array<{node: string, edge?: PoolEdge, fusionQuote?: FusionEdgeQuote}>,
    params: RouteSearchParams
  ): Promise<RouteProposal> {
    const steps: RouteStep[] = [];
    let totalGas = 0;
    let currentAmount = parseFloat(params.amountIn);
    let totalImpliedCost = 0;

    console.log('🧮 Route Discovery Agent - Starting price impact calculation');
    console.log(`📊 Initial amount: ${currentAmount}, Path length: ${path.length}`);

    for (let i = 1; i < path.length; i++) {
      const pathStep = path[i];
      if (!pathStep.edge) continue;

      const edge = pathStep.edge;
      const fusionQuote = pathStep.fusionQuote;

      // Use real Fusion quote output if available
      let stepOutput: string;
      let stepGas: number;

      if (fusionQuote) {
        stepOutput = fusionQuote.toAmount;
        stepGas = fusionQuote.gasEstimate;
        totalImpliedCost += fusionQuote.impliedCost;
        console.log(`🔥 Step ${i} - Using Fusion quote:`);
        console.log(`   Input: ${currentAmount} → Output: ${stepOutput}`);
        console.log(`   Implied cost: ${fusionQuote.impliedCost} (Total so far: ${totalImpliedCost})`);
        console.log(`   Gas estimate: ${stepGas}`);
      } else {
        // Fall back to traditional calculation
        const slippage = edge.slippage.calculateSlippage(currentAmount, edge.liquidity);
        const stepOutputNum = currentAmount * (1 - slippage - edge.fee);
        stepOutput = stepOutputNum.toString();
        console.log(`⚙️ Step ${i} - Using traditional calculation:`);
        console.log(`   Input: ${currentAmount} → Output: ${stepOutput}`);
        console.log(`   Slippage: ${(slippage * 100).toFixed(4)}%, Fee: ${(edge.fee * 100).toFixed(2)}%`);
        console.log(`   Price impact for this step: ${((currentAmount - stepOutputNum) / currentAmount * 100).toFixed(4)}%`);
        stepGas = edge.realTimeGasEstimate || edge.gasEstimate;
      }

      steps.push({
        protocol: edge.protocol,
        fromToken: edge.fromToken,
        toToken: edge.toToken,
        amount: i === 1 ? params.amountIn : currentAmount.toString(),
        estimatedOutput: stepOutput,
        fee: (edge.fee * 100).toFixed(3)
      });

      totalGas += stepGas;
      currentAmount = parseFloat(stepOutput);
    }

    // Calculate confidence based on Fusion compatibility
    const fusionCompatibleSteps = steps.filter((_, i) => path[i + 1]?.fusionQuote);
    const fusionCompatibilityRatio = fusionCompatibleSteps.length / steps.length;
    const baseConfidence = Math.max(0.3, 1 - (steps.length * 0.1));
    const confidence = baseConfidence * (0.7 + fusionCompatibilityRatio * 0.3);

    const finalPriceImpact = (totalImpliedCost * 100).toFixed(4);
    console.log('🎯 Route Discovery Agent - Final price impact calculation:');
    console.log(`   Total implied cost: ${totalImpliedCost}`);
    console.log(`   Final price impact: ${finalPriceImpact}%`);
    console.log(`   Initial amount: ${params.amountIn} → Final output: ${currentAmount}`);
    console.log(`   Overall efficiency: ${((parseFloat(params.amountIn) - currentAmount) / parseFloat(params.amountIn) * 100).toFixed(4)}%`);
    console.log(`   Route confidence: ${(confidence * 100).toFixed(2)}%`);
    console.log(`   Fusion compatibility: ${fusionCompatibleSteps.length}/${steps.length} steps (${(fusionCompatibilityRatio * 100).toFixed(1)}%)`);

    return {
      id: `fusion-optimized-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amountIn,
      path: steps,
      estimatedGas: totalGas.toString(),
      estimatedTime: steps.length * 12, // Faster with Fusion
      estimatedOutput: currentAmount.toString(),
      priceImpact: finalPriceImpact,
      confidence,
      risks: this.assessFusionOptimizedRisks(path),
      advantages: this.identifyFusionAdvantages(path),
      proposedBy: 'fusion-aware-pathfinder'
    };
  }

  private convertToRouteSteps(protocols: unknown[], fromToken: string, toToken: string, amountIn: string, amountOut: string): RouteStep[] {
    // Handle 1inch protocols array format and convert to RouteStep[]
    if (!protocols || !Array.isArray(protocols) || protocols.length === 0) {
      // Return default single-step path if no protocols data
      return [{
        protocol: '1inch Direct',
        fromToken,
        toToken,
        amount: amountIn,
        estimatedOutput: amountOut,
        fee: '0.003'
      }];
    }

    const steps: RouteStep[] = [];
    let currentFromToken = fromToken;
    let currentAmount = amountIn;

    for (let i = 0; i < protocols.length; i++) {
      const protocol = protocols[i] as { name?: string; part?: number; percentage?: number; toTokenAddress?: string };
      const isLastStep = i === protocols.length - 1;
      const currentToToken = isLastStep ? toToken : (protocol.toTokenAddress || 'INTERMEDIATE');
      
      // Calculate estimated output for this step
      const percentage = protocol.percentage || protocol.part || 100;
      let stepOutput: string;
      
      if (isLastStep) {
        stepOutput = amountOut;
      } else {
        // Estimate intermediate output proportionally
        const stepRatio = percentage / 100;
        stepOutput = (parseFloat(currentAmount) * stepRatio * 0.997).toString(); // ~0.3% fee
      }

      steps.push({
        protocol: protocol.name || 'Unknown DEX',
        fromToken: currentFromToken,
        toToken: currentToToken,
        amount: currentAmount,
        estimatedOutput: stepOutput,
        fee: '0.003' // Standard 0.3% fee
      });

      // Update for next iteration
      currentFromToken = currentToToken;
      currentAmount = stepOutput;
    }

    return steps;
  }

  private assessFusionOptimizedRisks(path: Array<{node: string, edge?: PoolEdge, fusionQuote?: FusionEdgeQuote}>): string[] {
    const risks: string[] = [];
    
    const fusionSteps = path.filter(p => p.fusionQuote).length;
    const totalSteps = path.length - 1;
    
    if (fusionSteps / totalSteps < 0.5) {
      risks.push('mixed-execution-types');
    }
    
    if (totalSteps > 3) {
      risks.push('complex-multi-hop');
    }
    
    const hasPrivateExecution = path.some(p => p.fusionQuote?.executionType === 'private');
    if (!hasPrivateExecution) {
      risks.push('mev-exposure');
    }

    return risks;
  }

  private identifyFusionAdvantages(path: Array<{node: string, edge?: PoolEdge, fusionQuote?: FusionEdgeQuote}>): string[] {
    const advantages: string[] = [];
    
    const privateSteps = path.filter(p => p.fusionQuote?.executionType === 'private').length;
    const rfqSteps = path.filter(p => p.fusionQuote?.executionType === 'rfq').length;
    
    if (privateSteps > 0) {
      advantages.push('mev-protected');
    }
    
    if (rfqSteps > 0) {
      advantages.push('professional-liquidity');
    }
    
    advantages.push('fusion-optimized');
    advantages.push('real-time-pricing');
    
    return advantages;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Priority Queue implementation
class PriorityQueue<T extends {cost: number}> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
    this.items.sort((a, b) => a.cost - b.cost);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class RouteDiscoveryAgent extends BaseAgent {
  private dataService: DataAggregationService;
  private routingGraph: RoutingGraph;
  private fusionPathfinder: FusionAwarePathfinder;
  private routeCache: Map<string, {routes: RouteProposal[], timestamp: number}>;
  private liquidityMonitor: NodeJS.Timeout | null = null;

  // Performance metrics
  private searchMetrics = {
    totalSearches: 0,
    avgSearchTime: 0,
    cacheHitRate: 0,
    successRate: 0,
    fusionQueries: 0,
    parallelBatches: 0
  };

  constructor(config: Partial<AgentConfig> = {}, dataService: DataAggregationService) {
    const routingCapabilities: AgentCapabilities = {
      canAnalyzeMarket: true,
      canDiscoverRoutes: true,
      canAssessRisk: true,
      canExecuteTransactions: false,
      canMonitorPerformance: true,
      supportedNetworks: ['ethereum', 'polygon', 'bsc', 'arbitrum'],
      supportedProtocols: ['uniswap-v2', 'uniswap-v3', 'sushiswap', 'curve', 'balancer', '1inch-fusion']
    };

    const defaultConfig: AgentConfig = {
      id: config.id || 'route-discovery-agent',
      name: config.name || 'Route Discovery Agent',
      version: '2.0.0',
      capabilities: ['analyze', 'pathfinding', 'routing', 'optimization', 'fusion-integration'],
      dependencies: ['data-aggregation-service'],
      maxConcurrentTasks: 10,
      timeout: 30000
    };

    super(defaultConfig, routingCapabilities);
    this.dataService = dataService;
    this.routingGraph = this.initializeEmptyGraph();
    this.fusionPathfinder = new FusionAwarePathfinder(dataService);
    this.routeCache = new Map();
    
    console.log('🔧 RouteDiscoveryAgent constructor completed - ready for price impact calculations!');
  }

  async initialize(): Promise<void> {
    console.log('🛣️ Initializing Enhanced Route Discovery Agent with Fusion integration...');
    
    try {
      // Add timeout to prevent hanging during graph building
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Route graph building timed out')), 3000) // Reduced to 3 seconds for demo
      );
      
      await Promise.race([
        this.buildRoutingGraph(),
        timeoutPromise
      ]);
      
      console.log(`✅ Routing graph built with ${this.routingGraph.nodes.size} nodes and ${Array.from(this.routingGraph.edges.values()).flat().length} edges`);
    } catch (error) {
      console.error('❌ Failed to build routing graph, using fallback data:', error);
      await this.buildFallbackGraph();
    }
    
    // Start liquidity monitoring (lightweight)
    this.startLiquidityMonitoring();
    
    console.log(`✅ Route Discovery Agent initialized with ${this.routingGraph.nodes.size} nodes available for routing`);
  }

  async processMessage(message: AgentMessage, signal: AbortSignal): Promise<void> {
    console.log('🛣️ [ROUTE DISCOVERY AGENT] ========== PROCESSING MESSAGE ==========');
    console.log('📨 INPUT MESSAGE:', {
      id: message.id,
      type: message.type,
      from: message.from,
      priority: message.priority,
      timestamp: message.timestamp,
      dataKeys: Object.keys(message.payload || {}),
      dataSize: JSON.stringify(message.payload || {}).length
    });
    
    const startTime = Date.now();
    let result: unknown = null;
    let error: Error | null = null;
    
    try {
      switch (message.type) {
        case MessageType.REQUEST_ANALYSIS:
          console.log('🔄 Processing ROUTE ANALYSIS REQUEST...');
          result = await this.handleRouteRequest(message);
          break;
        case MessageType.MARKET_DATA:
          console.log('🔄 Processing MARKET UPDATE...');
          result = await this.handleMarketUpdate(message);
          break;
        case MessageType.CONSENSUS_REQUEST:
          console.log('🔄 Processing CONSENSUS REQUEST...');
          result = await this.handleConsensusRequest(message);
          break;
        default:
          console.log(`🔄 Processing UNKNOWN message type: ${message.type}`);
          result = { type: 'unknown', processed: false };
      }
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ [ROUTE DISCOVERY AGENT] Error processing message:', err);
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log('📤 [ROUTE DISCOVERY AGENT] OUTPUT RESULT:', {
      success: !error,
      processingTimeMs: processingTime,
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : [],
      error: error ? error.message : null
    });
    console.log('🛣️ [ROUTE DISCOVERY AGENT] ========== MESSAGE COMPLETE ==========\n');
  }

  async handleTask(task: unknown, signal: AbortSignal): Promise<unknown> {
    const taskObj = task as { type: string; data: Record<string, unknown> };
    const { type, data } = taskObj;
    
    switch (type) {
      case 'find-routes':
        return await this.findOptimalRoutes(data as unknown as RouteSearchParams);
      case 'find-fusion-routes':
        return await this.findFusionOptimizedRoutes(data as unknown as RouteSearchParams);
      case 'update-fusion-compatibility':
        return await this.updateFusionCompatibility();
      case 'analyze-gas-curves':
        return await this.analyzeGasCurves(data as { tokenPair: [string, string]; amounts: string[]; chainId: number; });
      default:
        throw new Error(`Unknown route discovery task: ${type}`);
    }
  }

  // Helper methods for amount conversion
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
      console.warn(`⚠️ Unknown token decimals for ${tokenAddress}, defaulting to 18`);
      return 18; // Default to 18 decimals
    }
    
    console.log(`🔍 Token ${tokenAddress} has ${decimals} decimals`);
    return decimals;
  }

  private toWei(amount: string, decimals: number): string {
    // Convert decimal amount to wei format
    const parts = amount.split('.');
    const integerPart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
    
    // Combine integer and fractional parts
    const fullAmount = integerPart + fractionalPart;
    
    // Remove leading zeros and return
    return fullAmount.replace(/^0+/, '') || '0';
  }

  // ===== ENHANCED CORE ROUTING FUNCTIONALITY =====

  async findOptimalRoutes(params: RouteSearchParams): Promise<PathfindingResult> {
    const startTime = Date.now();
    console.log(`🔍 Finding routes with Fusion integration: ${params.fromToken} → ${params.toToken}, amount: ${params.amountIn}`);

    // Check cache first
    const cacheKey = this.generateCacheKey(params);
    const cached = this.routeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) {
      this.searchMetrics.cacheHitRate = 
        (this.searchMetrics.cacheHitRate * this.searchMetrics.totalSearches + 1) / 
        (this.searchMetrics.totalSearches + 1);
      
      return {
        routes: cached.routes,
        searchStats: {
          nodesExplored: 0,
          pathsEvaluated: cached.routes.length,
          timeSpent: Date.now() - startTime,
          cacheHits: 1,
          fusionQueries: 0,
          parallelBatches: 0,
          optimalityGap: 0
        },
        graphStats: this.getGraphStats()
      };
    }

    // Validate graph freshness and update if needed
    if (Date.now() - this.routingGraph.lastUpdate > 300000) {
      await this.updateGraphData();
    }

    // Find routes using Fusion-aware pathfinding
    const routes = await this.fusionPathfinder.findOptimalPath(
      this.routingGraph,
      params.fromToken,
      params.toToken,
      params
    );

    // Cache results
    this.routeCache.set(cacheKey, {
      routes,
      timestamp: Date.now()
    });

    // Update metrics
    this.updateSearchMetrics(startTime, routes.length > 0);

    const result: PathfindingResult = {
      routes,
      searchStats: {
        nodesExplored: this.routingGraph.nodes.size,
        pathsEvaluated: routes.length,
        timeSpent: Date.now() - startTime,
        cacheHits: 0,
        fusionQueries: (routes[0] as RouteProposal & { fusionQueries?: number })?.fusionQueries || 0,
        parallelBatches: this.searchMetrics.parallelBatches,
        optimalityGap: this.calculateOptimalityGap(routes)
      },
      graphStats: this.getGraphStats()
    };

    console.log(`✅ Found ${routes.length} Fusion-optimized routes in ${result.searchStats.timeSpent}ms`);
    return result;
  }

  async findFusionOptimizedRoutes(params: RouteSearchParams): Promise<PathfindingResult> {
    // Force Fusion quotes for this request
    const fusionParams = { ...params, useFusionQuotes: true };
    return await this.findOptimalRoutes(fusionParams);
  }

  // 🚀 Parallelized slippage model initialization
  private async initializeSlippageModelsParallel(): Promise<void> {
    console.log('🔄 Initializing slippage models with parallel processing...');
    
    const allEdges: PoolEdge[] = [];
    for (const edges of this.routingGraph.edges.values()) {
      allEdges.push(...edges);
    }

    // Process edges in parallel batches
    const BATCH_SIZE = 50;
    const batches = this.chunkArray(allEdges, BATCH_SIZE);
    this.searchMetrics.parallelBatches = batches.length;

    const batchPromises = batches.map(async (batch, batchIndex) => {
      console.log(`📊 Processing slippage batch ${batchIndex + 1}/${batches.length}`);
      
      const edgePromises = batch.map(async (edge) => {
        try {
          edge.slippage.calculateSlippage = await this.createSlippageCalculatorAsync(
            edge.slippage.type, 
            edge.slippage.params,
            edge
          );
          
          // 📊 Get real-time gas estimate from Fusion if possible
          if (edge.fusionCompatible) {
            await this.updateRealTimeGasEstimate(edge);
          }
        } catch (error) {
          console.warn(`Failed to initialize slippage model for edge ${edge.id}:`, error);
          // Fallback to simple constant slippage
          edge.slippage.calculateSlippage = () => 0.005;
        }
      });

      await Promise.all(edgePromises);
    });

    await Promise.all(batchPromises);
    console.log(`✅ Initialized ${allEdges.length} slippage models across ${batches.length} parallel batches`);
  }

  // 📊 Real-time gas estimates using 1inch Fusion API
  private async updateRealTimeGasEstimate(edge: PoolEdge): Promise<void> {
    try {
      const sampleAmount = '1000000'; // $1 worth for gas estimation
      
      const fusionParams: FusionQuoteParams = {
        src: edge.fromToken,
        dst: edge.toToken,
        amount: sampleAmount,
        from: '0x0000000000000000000000000000000000000000',
        gasLimit: '500000'
      };

      const quote = await this.dataService.getFusionQuote(fusionParams, 1);
      edge.realTimeGasEstimate = parseInt(quote.tx.gas);
      
    } catch (error) {
      // Keep static estimate if Fusion quote fails
      console.warn(`Failed to get real-time gas estimate for ${edge.protocol}:`, error);
    }
  }

  private async createSlippageCalculatorAsync(
    type: SlippageModel['type'], 
    params: Record<string, number>,
    edge: PoolEdge
  ): Promise<(amountIn: number, liquidity: number) => number> {
    
    // For Fusion-compatible edges, pre-cache some quotes for better estimation
    if (edge.fusionCompatible && type !== 'fusion_real') {
      const cachedSlippageData = await this.preCacheFusionSlippage(edge);
      return this.createCachedFusionSlippageCalculator(edge, cachedSlippageData);
    }

    // Traditional slippage calculators
    switch (type) {
      case 'uniswap_v2':
        return (amountIn: number, liquidity: number) => {
          const k = params.k || liquidity * liquidity;
          const reserveIn = Math.sqrt(k);
          const reserveOut = k / reserveIn;
          
          const amountInWithFee = amountIn * (1 - (params.fee || 0.003));
          const amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
          const priceImpact = amountOut / reserveOut;
          
          return Math.min(priceImpact, 0.3);
        };
        
      case 'uniswap_v3':
        return (amountIn: number, liquidity: number) => {
          const utilization = amountIn / (liquidity || 1);
          return Math.min(utilization * 0.1, 0.2);
        };
        
      case 'curve':
        return (amountIn: number, liquidity: number) => {
          const A = params.A || 100;
          const utilization = amountIn / (liquidity || 1);
          return Math.min(utilization * utilization / A, 0.1);
        };
        
      case 'balancer':
        return (amountIn: number, liquidity: number) => {
          const weight = (params as Record<string, unknown> & { weights?: number[] }).weights?.[0] || 0.5;
          const utilization = amountIn / (liquidity || 1);
          return Math.min(utilization / weight, 0.15);
        };
        
      default:
        return () => params.slippage || 0.005;
    }
  }

  // Pre-cache Fusion slippage data for synchronous calculation
  private async preCacheFusionSlippage(edge: PoolEdge): Promise<{baseSlippage: number, liquidityDepth: number}> {
    try {
      // Test with a standard amount to get baseline slippage
      const testAmount = '1000000'; // 1M wei as test
      const fusionParams: FusionQuoteParams = {
        src: edge.fromToken,
        dst: edge.toToken,
        amount: testAmount,
        from: '0x0000000000000000000000000000000000000000'
      };

      const quote = await this.dataService.getFusionQuote(fusionParams, 1);
      const amountOut = parseFloat(quote.toAmount);
      const amountIn = parseFloat(testAmount);
      
      // Calculate baseline slippage
      const baseSlippage = amountIn > 0 ? Math.max(0, (amountIn - amountOut) / amountIn) : 0.005;
      
      return {
        baseSlippage: Math.min(baseSlippage, 0.5),
        liquidityDepth: amountIn / Math.max(baseSlippage, 0.001) // Estimate liquidity depth
      };
      
    } catch (error) {
      // Return fallback values
      return {
        baseSlippage: 0.01,
        liquidityDepth: 100000
      };
    }
  }

  // Create cached slippage calculator using pre-fetched data
  private createCachedFusionSlippageCalculator(
    edge: PoolEdge, 
    cachedData: {baseSlippage: number, liquidityDepth: number}
  ): (amountIn: number, liquidity: number) => number {
    return (amountIn: number, liquidity: number) => {
      // Use cached data to estimate slippage based on amount
      const utilization = amountIn / Math.max(cachedData.liquidityDepth, liquidity || 1);
      const scaledSlippage = cachedData.baseSlippage * (1 + utilization * 2); // Scale based on utilization
      return Math.min(scaledSlippage, 0.5); // Cap at 50%
    };
  }

  // 📈 Live Market Conditions Estimation using Fusion quotes
  async analyzeGasCurves(params: {
    tokenPair: [string, string];
    amounts: string[];
    chainId: number;
  }): Promise<{
    gasCurve: Array<{amount: string, gasEstimate: number, gasPrice: number}>;
    slippageCurve: Array<{amount: string, slippage: number}>;
    liquidityLimits: {maxAmount: string, failurePoint?: string};
  }> {
    const { tokenPair, amounts, chainId } = params;
    const [fromToken, toToken] = tokenPair;

    const gasCurve: Array<{amount: string, gasEstimate: number, gasPrice: number}> = [];
    const slippageCurve: Array<{amount: string, slippage: number}> = [];
    let maxAmount = '0';
    let failurePoint: string | undefined;

    // Test different amounts to build curves
    const curvePromises = amounts.map(async (amount) => {
      try {
        const fusionParams: FusionQuoteParams = {
          src: fromToken,
          dst: toToken,
          amount,
          from: '0x0000000000000000000000000000000000000000'
        };

        const quote = await this.dataService.getFusionQuote(fusionParams, chainId);
        
        const gasEstimate = parseInt(quote.tx.gas);
        const gasPrice = parseInt(quote.tx.gasPrice);
        const amountIn = parseFloat(amount);
        const amountOut = parseFloat(quote.toAmount);
        const slippage = amountIn > 0 ? (amountIn - amountOut) / amountIn : 0;

        gasCurve.push({ amount, gasEstimate, gasPrice });
        slippageCurve.push({ amount, slippage });
        
        if (parseFloat(amount) > parseFloat(maxAmount)) {
          maxAmount = amount;
        }

      } catch (error) {
        if (!failurePoint && parseFloat(amount) > 0) {
          failurePoint = amount;
        }
      }
    });

    await Promise.all(curvePromises);

    // Sort curves by amount
    gasCurve.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    slippageCurve.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

    return {
      gasCurve,
      slippageCurve,
      liquidityLimits: { maxAmount, failurePoint }
    };
  }

  // 🛡️ Enhanced MEV Protection Analysis with Fusion
  calculateMEVRiskLevel(route: RouteProposal): 'low' | 'medium' | 'high' | 'critical' {
    // Check for Fusion private execution
    const hasPrivateExecution = route.advantages.includes('mev-protected');
    const hasRFQ = route.advantages.includes('professional-liquidity');
    
    if (hasPrivateExecution || hasRFQ) {
      return 'low'; // Fusion provides MEV protection
    }

    // Traditional MEV risk assessment
    const priceImpact = parseFloat(route.priceImpact);
    const hopCount = route.path.length;

    if (priceImpact > 0.05 || hopCount > 3) {
      return 'critical';
    } else if (priceImpact > 0.02 || hopCount > 2) {
      return 'high';
    } else if (priceImpact > 0.01) {
      return 'medium';
    }
    
    return 'low';
  }

  // ===== FUSION COMPATIBILITY MANAGEMENT =====

  private async updateFusionCompatibility(): Promise<{
    totalEdges: number;
    compatibleEdges: number;
    incompatibleEdges: number;
    newlyTested: number;
  }> {
    console.log('🔄 Updating Fusion compatibility cache...');
    
    const allEdges: PoolEdge[] = [];
    for (const edges of this.routingGraph.edges.values()) {
      allEdges.push(...edges);
    }

    let newlyTested = 0;
    let compatibleEdges = 0;

    // Test edges that haven't been tested yet
    const untestedEdges = allEdges.filter(edge => edge.fusionCompatible === undefined);
    
    const BATCH_SIZE = 10;
    const batches = this.chunkArray(untestedEdges, BATCH_SIZE);

    for (const batch of batches) {
      const compatibilityTests = batch.map(async (edge) => {
        const cacheKey = `${edge.fromToken}-${edge.toToken}-1000000`; // Test with $1 worth
        
        try {
          const fusionParams: FusionQuoteParams = {
            src: edge.fromToken,
            dst: edge.toToken,
            amount: '1000000',
            from: '0x0000000000000000000000000000000000000000'
          };

          await this.dataService.getFusionQuote(fusionParams, 1);
          
          edge.fusionCompatible = true;
          this.routingGraph.fusionCompatibilityCache.set(cacheKey, true);
          compatibleEdges++;
          newlyTested++;
          
        } catch (error) {
          edge.fusionCompatible = false;
          this.routingGraph.fusionCompatibilityCache.set(cacheKey, false);
          newlyTested++;
        }
      });

      await Promise.all(compatibilityTests);
    }

    // Count existing compatible edges
    for (const edge of allEdges) {
      if (edge.fusionCompatible) {
        compatibleEdges++;
      }
    }

    const incompatibleEdges = allEdges.length - compatibleEdges;

    console.log(`✅ Fusion compatibility updated: ${compatibleEdges}/${allEdges.length} edges compatible`);
    
    return {
      totalEdges: allEdges.length,
      compatibleEdges,
      incompatibleEdges,
      newlyTested
    };
  }

  // ===== UTILITY METHODS =====

  private initializeEmptyGraph(): RoutingGraph {
    return {
      nodes: new Map(),
      edges: new Map(),
      liquidityIndex: new Map(),
      fusionCompatibilityCache: new Map(), // New: Fusion compatibility cache
      lastUpdate: 0
    };
  }

  private async buildFallbackGraph(): Promise<void> {
    console.log('🔄 Building fallback routing graph with essential tokens...');
    
    // Essential tokens for major chains with real contract addresses
    const fallbackTokens = {
      // Ethereum Mainnet (chainId: 1)
      1: [
        { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18, price: 3200, marketCap: 1000000000 },
        { address: '0xA0b86a33E6441431c0B7a5cEC6eCb99F2fB83A4D', symbol: 'USDC', decimals: 6, price: 1, marketCap: 50000000000 },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, price: 1, marketCap: 80000000000 },
        { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18, price: 1, marketCap: 8000000000 },
        { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8, price: 65000, marketCap: 15000000000 },
        { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18, price: 25, marketCap: 12000000000 },
        { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18, price: 12, marketCap: 8000000000 },
        { address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', symbol: 'MATIC', decimals: 18, price: 1.2, marketCap: 7000000000 }
      ],
      // Polygon (chainId: 137)
      137: [
        { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', decimals: 18, price: 1.2, marketCap: 7000000000 },
        { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6, price: 1, marketCap: 50000000000 },
        { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6, price: 1, marketCap: 80000000000 },
        { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', decimals: 18, price: 3200, marketCap: 1000000000 }
      ]
    };

    // Add fallback tokens to graph
    for (const [chainId, tokens] of Object.entries(fallbackTokens)) {
      for (const tokenInfo of tokens) {
        const node: TokenNode = {
          address: tokenInfo.address,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          chainId: parseInt(chainId),
          price: tokenInfo.price,
          marketCap: tokenInfo.marketCap,
          isStable: ['USDC', 'USDT', 'DAI'].includes(tokenInfo.symbol),
          riskScore: this.calculateTokenRisk(tokenInfo)
        };
        
        this.routingGraph.nodes.set(tokenInfo.address, node);
      }
    }

    // Build edges between fallback tokens (simplified liquidity assumptions)
    await this.buildFallbackEdges();
    
    this.routingGraph.lastUpdate = Date.now();
    console.log(`📊 Fallback graph built with ${this.routingGraph.nodes.size} tokens`);
  }

  private async buildFallbackEdges(): Promise<void> {
    const nodes = Array.from(this.routingGraph.nodes.values());
    
    // Create edges between tokens on the same chain
    for (const nodeA of nodes) {
      for (const nodeB of nodes) {
        if (nodeA.address !== nodeB.address && nodeA.chainId === nodeB.chainId) {
          const edgeKey = `${nodeA.address}-${nodeB.address}`;
          
          // Estimate liquidity based on market caps (simplified)
          const avgMarketCap = (nodeA.marketCap + nodeB.marketCap) / 2;
          const liquidityUSD = Math.min(avgMarketCap * 0.1, 100000000); // Cap at 100M
          
          const edge: PoolEdge = {
            id: edgeKey,
            fromToken: nodeA.address,
            toToken: nodeB.address,
            protocol: 'uniswap-v3', // Default protocol
            liquidity: liquidityUSD,
            fee: 0.003,
            gasEstimate: 180000,
            slippage: {
              type: 'uniswap_v3',
              params: { fee: 0.003, tickSpacing: 60 }
            },
            lastUpdate: Date.now(),
            reliability: 0.95,
            mevRisk: 0.1,
            fusionCompatible: true
          };

          if (!this.routingGraph.edges.has(nodeA.address)) {
            this.routingGraph.edges.set(nodeA.address, []);
          }
          this.routingGraph.edges.get(nodeA.address)!.push(edge);
        }
      }
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private generateCacheKey(params: RouteSearchParams): string {
    return `${params.fromToken}-${params.toToken}-${params.amountIn}-${params.maxHops}-${params.gasPrice}-${params.useFusionQuotes}`;
  }

  private getGraphStats() {
    const fusionCompatibleEdges = Array.from(this.routingGraph.edges.values())
      .flat()
      .filter(edge => edge.fusionCompatible).length;

    return {
      totalNodes: this.routingGraph.nodes.size,
      totalEdges: Array.from(this.routingGraph.edges.values()).flat().length,
      fusionCompatibleEdges,
      liquidityDistribution: this.calculateLiquidityDistribution(),
      protocolCoverage: this.getProtocolCoverage()
    };
  }

  private calculateLiquidityDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const edges of this.routingGraph.edges.values()) {
      for (const edge of edges) {
        distribution[edge.protocol] = (distribution[edge.protocol] || 0) + edge.liquidity;
      }
    }
    
    return distribution;
  }

  private getProtocolCoverage(): string[] {
    const protocols = new Set<string>();
    
    for (const edges of this.routingGraph.edges.values()) {
      for (const edge of edges) {
        protocols.add(edge.protocol);
      }
    }
    
    return Array.from(protocols);
  }

  private calculateOptimalityGap(routes: RouteProposal[]): number {
    if (routes.length < 2) return 0;
    
    const outputs = routes.map(r => parseFloat(r.estimatedOutput)).filter(o => o > 0);
    if (outputs.length < 2) return 0;
    
    const best = Math.max(...outputs);
    const worst = Math.min(...outputs);
    
    return best > 0 ? (best - worst) / best : 0;
  }

  private updateSearchMetrics(startTime: number, success: boolean): void {
    this.searchMetrics.totalSearches++;
    const searchTime = Date.now() - startTime;
    
    this.searchMetrics.avgSearchTime = 
      (this.searchMetrics.avgSearchTime * (this.searchMetrics.totalSearches - 1) + searchTime) / 
      this.searchMetrics.totalSearches;
    
    if (success) {
      this.searchMetrics.successRate = 
        (this.searchMetrics.successRate * (this.searchMetrics.totalSearches - 1) + 1) / 
        this.searchMetrics.totalSearches;
    }
  }

  // ===== GRAPH CONSTRUCTION =====

  private async buildRoutingGraph(): Promise<void> {
    console.log('📊 Building routing graph with Fusion integration...');
    
    const supportedChains = [1, 137, 56, 42161];
    
    for (const chainId of supportedChains) {
      await this.buildChainGraph(chainId);
    }
    
    this.routingGraph.lastUpdate = Date.now();
    console.log(`📈 Graph built with Fusion integration: ${this.routingGraph.nodes.size} nodes, ${Array.from(this.routingGraph.edges.values()).flat().length} edges`);
  }

  private async buildChainGraph(chainId: number): Promise<void> {
    try {
      const tokens = await this.dataService.getAvailableTokens(chainId);
      
      // Add token nodes
      for (const [address, tokenInfo] of Object.entries(tokens)) {
        const node: TokenNode = {
          address,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          chainId,
          price: tokenInfo.price || 0,
          marketCap: tokenInfo.marketCap || 0,
          isStable: this.isStablecoin(tokenInfo.symbol),
          riskScore: this.calculateTokenRisk(tokenInfo)
        };
        
        this.routingGraph.nodes.set(address, node);
      }

      await this.buildProtocolEdges(chainId);
      
    } catch (error) {
      console.error(`Error building graph for chain ${chainId}:`, error);
    }
  }

  private async buildProtocolEdges(chainId: number): Promise<void> {
    const protocols = this.getAvailableProtocols(chainId);
    
    for (const protocol of protocols) {
      try {
        const pools = await this.getProtocolPools(protocol, chainId);
        
        for (const pool of pools) {
          const poolObj = pool as Record<string, unknown>;
          const edge: PoolEdge = {
            id: String(poolObj.id),
            protocol,
            fromToken: String(poolObj.token0),
            toToken: String(poolObj.token1),
            liquidity: Number(poolObj.liquidityUSD),
            fee: Number(poolObj.fee),
            gasEstimate: this.estimateGasForProtocol(protocol),
            slippage: this.createSlippageModel(protocol, poolObj),
            lastUpdate: Date.now(),
            reliability: Number(poolObj.reliability) || 0.8,
            mevRisk: this.calculateMEVRisk(protocol, poolObj),
            fusionCompatible: false // Will be tested during compatibility update
          };

          this.addEdgeToGraph(String(poolObj.token0), edge);
          
          const reverseEdge: PoolEdge = {
            ...edge,
            id: pool.id + '-reverse',
            fromToken: String(poolObj.token1),
            toToken: String(poolObj.token0)
          };
          
          this.addEdgeToGraph(String(poolObj.token1), reverseEdge);
        }
      } catch (error) {
        console.warn(`Failed to build edges for ${protocol} on chain ${chainId}:`, error);
      }
    }
  }

  // ===== REMAINING HELPER METHODS =====
  // (Keeping essential methods from the original implementation)

  private addEdgeToGraph(fromToken: string, edge: PoolEdge): void {
    if (!this.routingGraph.edges.has(fromToken)) {
      this.routingGraph.edges.set(fromToken, []);
    }
    this.routingGraph.edges.get(fromToken)!.push(edge);
  }

  private createSlippageModel(protocol: string, pool: Record<string, unknown>): SlippageModel {
    let type: SlippageModel['type'];
    let params: Record<string, number> = {};

    switch (protocol) {
      case 'uniswap-v2':
      case 'sushiswap':
        type = 'uniswap_v2';
        params = { k: Number(pool.reserve0 || 0) * Number(pool.reserve1 || 0) || 1000000, fee: Number(pool.fee) || 0.003 };
        break;
      case 'uniswap-v3':
        type = 'uniswap_v3';
        params = { liquidity: Number(pool.liquidity) || 1000000, fee: Number(pool.fee) || 0.003 };
        break;
      case 'curve':
        type = 'curve';
        params = { A: Number(pool.amplificationParameter) || 100, fee: Number(pool.fee) || 0.0004 };
        break;
      case 'balancer':
        type = 'balancer';
        const weights = (pool.weights as number[]) || [0.5, 0.5];
        params = { weight0: weights[0] || 0.5, weight1: weights[1] || 0.5, fee: Number(pool.fee) || 0.001 };
        break;
      default:
        type = 'constant';
        params = { slippage: 0.005 };
    }

    return {
      type,
      params,
      calculateSlippage: () => 0 // Will be set in initializeSlippageModelsParallel
    };
  }

  private isStablecoin(symbol: string): boolean {
    const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'FRAX', 'LUSD'];
    return stablecoins.includes(symbol.toUpperCase());
  }

  private calculateTokenRisk(tokenInfo: { marketCap?: number; price?: number }): number {
    let risk = 0.5;
    if (tokenInfo.marketCap && tokenInfo.marketCap < 1000000) risk += 0.3;
    if (!tokenInfo.price) risk += 0.2;
    return Math.min(risk, 1.0);
  }

  private estimateGasForProtocol(protocol: string): number {
    // Enhanced gas estimates - can be updated with real-time data
    const gasEstimates: Record<string, number> = {
      'uniswap-v2': 150000,
      'uniswap-v3': 180000,
      'sushiswap': 150000,
      'curve': 200000,
      'balancer': 250000,
      '1inch': 120000,
      '1inch-fusion': 100000 // Fusion is more gas efficient
    };
    
    return gasEstimates[protocol] || 150000;
  }

  private calculateMEVRisk(protocol: string, pool: { liquidityUSD?: number }): number {
    const baseRisk: Record<string, number> = {
      'uniswap-v2': 0.6,
      'uniswap-v3': 0.7,
      'sushiswap': 0.5,
      'curve': 0.3,
      'balancer': 0.4,
      '1inch-fusion': 0.2 // Fusion has built-in MEV protection
    };
    
    let risk = baseRisk[protocol] || 0.5;
    if (pool.liquidityUSD && Number(pool.liquidityUSD) > 10000000) risk += 0.2;
    return Math.min(risk, 1.0);
  }

  private async getProtocolPools(protocol: string, chainId: number): Promise<Array<Record<string, unknown>>> {
    console.log(`🔍 Fetching pools for ${protocol} on chain ${chainId}...`);
    
    try {
      // Check cache first
      const { CacheService, CacheKeys, CacheTTL } = await import('../services/CacheService');
      const cache = CacheService.getInstance();
      const cacheKey = CacheKeys.defiLlamaPool(protocol, chainId);
      
      const cachedData = cache.getWithStats<Array<Record<string, unknown>>>(cacheKey);
      if (cachedData) {
        console.log(`⚡ Using cached pool data for ${protocol} on chain ${chainId}`);
        return cachedData;
      }
      // Try DeFiLlama yields API for pool data
      const protocolId = this.mapProtocolToDefiLlamaId(protocol);
      if (protocolId) {
        const { ApiClients } = await import('../services/HttpConnectionManager');
        const response = await ApiClients.defillama.get(`https://yields.llama.fi/pools`);
        if (response.ok) {
          const allPools = await response.json();
          const protocolPools = allPools.data?.filter((pool: { project: string; chain: string }) => 
            pool.project === protocolId && 
            pool.chain === this.getDefiLlamaChainName(chainId)
          ) || [];
          
          if (protocolPools.length > 0) {
            console.log(`✅ Found ${protocolPools.length} pools for ${protocol}`);
            const limitedPools = protocolPools.slice(0, 20); // Limit to top 20 pools
            
            // Cache the result
            cache.set(cacheKey, limitedPools, CacheTTL.POOL_DATA);
            
            return limitedPools;
          }
        }
      }
      
      // Alternative: Try protocol-specific TVL endpoint
      if (protocolId) {
        const { ApiClients } = await import('../services/HttpConnectionManager');
        const response = await ApiClients.defillama.get(`https://api.llama.fi/protocol/${protocolId}`);
        if (response.ok) {
          const protocolData = await response.json();
          const chainName = this.getDefiLlamaChainName(chainId);
          if (protocolData.chains && protocolData.chains[chainName]) {
            console.log(`✅ Found protocol data for ${protocol} on ${chainName}`);
            const protocolPool = [{
              id: `${protocolId}_${chainId}`,
              protocol: protocolId,
              chain: chainName,
              tvl: protocolData.chains[chainName],
              category: protocolData.category
            }];
            
            // Cache the result
            cache.set(cacheKey, protocolPool, CacheTTL.POOL_DATA);
            
            return protocolPool;
          }
        }
      }
      
      // Try Bitcoin DeFi protocols if it's a Bitcoin chain
      if (this.isBitcoinChain(chainId)) {
        const btcPools = await this.getBitcoinDeFiPools(protocol);
        if (btcPools.length > 0) {
          console.log(`✅ Found ${btcPools.length} Bitcoin DeFi pools for ${protocol}`);
          return btcPools;
        }
      }
      
      console.warn(`⚠️ No pool data available for ${protocol} on chain ${chainId}`);
      return [];
      
    } catch (error) {
      console.warn(`⚠️ Failed to fetch pools for ${protocol}:`, error);
      return [];
    }
  }
  
  private mapProtocolToDefiLlamaId(protocol: string): string | null {
    const mapping: Record<string, string> = {
      'uniswap-v2': 'uniswap-v2',
      'uniswap-v3': 'uniswap-v3', 
      'sushiswap': 'sushiswap',
      'curve': 'curve-dex',
      'balancer': 'balancer-v2',
      'pancakeswap': 'pancakeswap',
      'compound': 'compound-v3',
      'aave': 'aave-v3',
      'maker': 'makerdao',
      'yearn': 'yearn-finance',
      // Chain-specific protocols
      'quickswap': 'quickswap',
      'trader-joe': 'trader-joe',
      'spookyswap': 'spookyswap'
    };
    return mapping[protocol] || null;
  }
  
  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      56: 'BSC', 
      137: 'Polygon',
      250: 'Fantom',
      43114: 'Avalanche',
      42161: 'Arbitrum',
      10: 'Optimism',
      // Bitcoin networks
      0: 'Bitcoin', // Mainnet
      8332: 'Bitcoin', // Alternative ID
      8333: 'Bitcoin' // Another common ID
    };
    return chainNames[chainId] || 'Ethereum';
  }
  
  private getDefiLlamaChainName(chainId: number): string {
    // DeFiLlama uses different chain names
    const defiLlamaChains: Record<number, string> = {
      1: 'Ethereum',
      56: 'BSC',
      137: 'Polygon', 
      250: 'Fantom',
      43114: 'Avalanche',
      42161: 'Arbitrum',
      10: 'Optimism',
      0: 'Bitcoin'
    };
    return defiLlamaChains[chainId] || 'Ethereum';
  }
  
  private getAvailableProtocols(chainId: number): string[] {
    // Chain-specific protocol availability
    const protocolsByChain: Record<number, string[]> = {
      // Ethereum - all protocols available
      1: ['uniswap-v2', 'uniswap-v3', 'sushiswap', 'curve', 'balancer', 'compound', 'aave'],
      
      // Polygon - no Uniswap V2, but has QuickSwap (Uniswap V2 fork)
      137: ['uniswap-v3', 'sushiswap', 'curve', 'balancer', 'quickswap', 'aave'],
      
      // BSC - PancakeSwap dominant
      56: ['pancakeswap', 'sushiswap', 'curve', 'uniswap-v3'],
      
      // Arbitrum - L2 protocols
      42161: ['uniswap-v3', 'sushiswap', 'curve', 'balancer', 'aave'],
      
      // Optimism - L2 protocols  
      10: ['uniswap-v3', 'sushiswap', 'curve', 'aave'],
      
      // Avalanche
      43114: ['uniswap-v3', 'sushiswap', 'curve', 'aave', 'trader-joe'],
      
      // Fantom
      250: ['sushiswap', 'curve', 'spookyswap']
    };
    
    return protocolsByChain[chainId] || ['uniswap-v3', 'sushiswap', 'curve'];
  }
  
  private isBitcoinChain(chainId: number): boolean {
    return [0, 8332, 8333].includes(chainId);
  }
  
  private async getBitcoinDeFiPools(protocol: string): Promise<Array<Record<string, unknown>>> {
    console.log(`🔍 Fetching Bitcoin DeFi pools for ${protocol}...`);
    
    try {
      // Try Stacks DeFi for Bitcoin-based protocols
      if (protocol.includes('stacks') || protocol.includes('bitcoin')) {
        const stacksPools = await this.getStacksDeFiPools();
        if (stacksPools.length > 0) return stacksPools;
      }
      
      // Try Lightning Network data
      const lightningPools = await this.getLightningNetworkData(protocol);
      if (lightningPools.length > 0) return lightningPools;
      
      console.warn(`⚠️ No Bitcoin DeFi data available for ${protocol}`);
      return [];
      
    } catch (error) {
      console.warn(`⚠️ Failed to fetch Bitcoin DeFi pools:`, error);
      return [];
    }
  }
  
  private async getStacksDeFiPools(): Promise<Array<Record<string, unknown>>> {
    try {
      // Stacks API for Bitcoin DeFi protocols
      const response = await fetch('https://api.stacksapi.co/v1/info/pools');
      if (response.ok) {
        const data = await response.json();
        return data.pools || [];
      }
    } catch (error) {
      console.warn('Failed to fetch Stacks DeFi pools:', error);
    }
    return [];
  }
  
  private async getLightningNetworkData(protocol: string): Promise<Array<Record<string, unknown>>> {
    try {
      // Lightning Network statistics (1ML.com API)
      const response = await fetch('https://1ml.com/json');
      if (response.ok) {
        const data = await response.json();
        if (data.channels) {
          return [{
            id: `lightning_${protocol}`,
            protocol: 'lightning-network',
            type: 'payment_channel',
            capacity: data.total_capacity,
            channels: data.channels,
            nodes: data.nodes
          }];
        }
      }
    } catch (error) {
      console.warn('Failed to fetch Lightning Network data:', error);
    }
    return [];
  }
  
  private isOneInchSupported(chainId: number): boolean {
    return [1, 56, 137, 250, 43114, 42161, 10].includes(chainId);
  }
  

  private startLiquidityMonitoring(): void {
    this.liquidityMonitor = setInterval(async () => {
      try {
        await this.updateGraphData();
        if (Date.now() % (30 * 60 * 1000) === 0) { // Every 30 minutes
          await this.updateFusionCompatibility();
        }
      } catch (error) {
        console.error('Error updating graph data:', error);
      }
    }, 5 * 60 * 1000);
  }

  private async updateGraphData(): Promise<void> {
    const cutoff = Date.now() - 600000;
    
    for (const [token, edges] of this.routingGraph.edges) {
      const validEdges = edges.filter(edge => edge.lastUpdate > cutoff);
      if (validEdges.length !== edges.length) {
        this.routingGraph.edges.set(token, validEdges);
      }
    }
    
    this.routingGraph.lastUpdate = Date.now();
  }

  private async handleRouteRequest(message: AgentMessage): Promise<void> {
    try {
      const payload = message.payload as { type?: string; routeProposal?: unknown; marketConditions?: unknown; userPreferences?: unknown; chainId?: number; params?: unknown };
      console.log('🔍 [ROUTE DISCOVERY] Received payload:', JSON.stringify(payload, null, 2));
      
      // Handle new structured payload format from ai-agent-bridge-service
      if (payload.type === 'route-analysis') {
        const { routeProposal, marketConditions, userPreferences } = payload;
        const routeProposalTyped = routeProposal as { quotes?: { aggregation?: unknown; fusion?: unknown }; recommendedApi?: string; enableCustomDiscovery?: boolean; fromToken?: string; toToken?: string; amountIn?: string; gasPrice?: string };
        
        console.log('🔍 [ROUTE DISCOVERY] Hybrid Route Analysis Starting...');
        console.log('📊 Baseline quotes:', {
          hasAggregation: !!routeProposalTyped?.quotes?.aggregation,
          hasFusion: !!routeProposalTyped?.quotes?.fusion,
          recommendation: routeProposalTyped?.recommendedApi,
          enableCustomDiscovery: routeProposalTyped?.enableCustomDiscovery
        });

        if (routeProposalTyped?.enableCustomDiscovery) {
          // Perform hybrid analysis: baseline + custom discovery
          const hybridResult = await this.performHybridRouteDiscovery(
            routeProposalTyped as Record<string, unknown>, 
            marketConditions as Record<string, unknown>, 
            userPreferences as Record<string, unknown>,
            payload.chainId || 1
          );
          
          await this.sendMessage({
            to: message.from,
            type: MessageType.ROUTE_PROPOSAL,
            payload: { 
              routes: hybridResult.routes, 
              searchStats: hybridResult.searchStats,
              baseline: routeProposalTyped?.quotes,
              hybrid: true
            },
            priority: MessagePriority.MEDIUM
          });
          return;
        } else {
          // Convert RouteProposal to RouteSearchParams format for legacy support
          const marketConditionsTyped = marketConditions as { gasPrices?: { ethereum?: { standard?: string } } };
          const userPreferencesTyped = userPreferences as { maxSlippage?: number; gasPreference?: string; riskTolerance?: string };
          const params: RouteSearchParams = {
            fromToken: routeProposalTyped?.fromToken || '',
            toToken: routeProposalTyped?.toToken || '',
            amountIn: routeProposalTyped?.amountIn || '0',
            chainId: payload.chainId || 1,
            maxHops: 3,
            maxSlippage: userPreferencesTyped?.maxSlippage || 0.5,
            gasPrice: routeProposalTyped?.gasPrice || parseInt(marketConditionsTyped?.gasPrices?.ethereum?.standard || '20'),
            prioritizeGas: userPreferencesTyped?.gasPreference === 'slow',
            prioritizeSlippage: userPreferencesTyped?.riskTolerance === 'conservative',
            excludeProtocols: [],
            includeOnlyProtocols: undefined,
            deadline: Date.now() + 300000, // 5 minutes
            useFusionQuotes: true
          };
          
          console.log('🔍 [ROUTE DISCOVERY] Legacy route discovery mode');
          
          const result = await this.findOptimalRoutes(params);
          
          await this.sendMessage({
            to: message.from,
            type: MessageType.ROUTE_PROPOSAL,
            payload: { routes: result.routes, searchStats: result.searchStats },
            priority: MessagePriority.MEDIUM
          });
          return;
        }
      }
      
      // Handle legacy flat payload structure
      const rawParams = (payload.params || payload) as Record<string, unknown>;
      
      console.log('🔍 [ROUTE DISCOVERY] Received legacy params:', JSON.stringify(rawParams, null, 2));
      
      // Transform the payload to match RouteSearchParams interface
      const params: RouteSearchParams = {
        fromToken: (rawParams?.fromToken as string) || '',
        toToken: (rawParams?.toToken as string) || '',
        amountIn: (rawParams?.amount as string) || '0',
        chainId: (rawParams?.chainId as number) || 1,
        maxHops: (rawParams?.maxHops as number) || 3,
        maxSlippage: (rawParams?.maxSlippage as number) || 0.5,
        gasPrice: (rawParams?.gasPrice as number) || 20,
        prioritizeGas: (rawParams?.prioritizeGas as boolean) || false,
        prioritizeSlippage: (rawParams?.prioritizeSlippage as boolean) || false,
        excludeProtocols: (rawParams?.excludeProtocols as string[]) || [],
        includeOnlyProtocols: rawParams?.includeOnlyProtocols as string[] | undefined,
        deadline: (rawParams?.deadline as number) || Date.now() + 300000, // 5 minutes
        useFusionQuotes: (rawParams?.useFusionQuotes as boolean) !== false // Default to true
      };
      
      console.log('🔍 [ROUTE DISCOVERY] Transformed legacy params:', JSON.stringify(params, null, 2));
      
      const result = await this.findOptimalRoutes(params);
      
      await this.sendMessage({
        to: message.from,
        type: MessageType.ROUTE_PROPOSAL,
        payload: { routes: result.routes, searchStats: result.searchStats },
        priority: MessagePriority.MEDIUM
      });
    } catch (error) {
      console.error('Error handling route request:', error);
    }
  }

  private async handleMarketUpdate(message: AgentMessage): Promise<void> {
    const payload = message.payload as { conditions: Record<string, unknown> };
    const { conditions } = payload;
    
    // Clear cache on significant market changes
    const volatility = conditions.volatility as { overall?: number };
    if (volatility?.overall && volatility.overall > 0.3) {
      this.routeCache.clear();
    }
  }

  getSearchMetrics() {
    return { ...this.searchMetrics };
  }

  // ===== HYBRID ROUTE DISCOVERY =====

  async performHybridRouteDiscovery(
    routeProposal: Record<string, unknown>, 
    marketConditions: Record<string, unknown>, 
    userPreferences: Record<string, unknown>,
    chainId: number
  ): Promise<PathfindingResult> {
    const routeProposalTyped = routeProposal as { fromToken?: string; toToken?: string; amountIn?: string };
    const marketConditionsTyped = marketConditions as Record<string, unknown>;
    const userPreferencesTyped = userPreferences as Record<string, unknown>;
    
    console.log('🚀 [HYBRID DISCOVERY] Starting comprehensive route analysis...');
    
    const startTime = Date.now();
    
    // 1. Extract baseline routes from 1inch APIs
    const baselineRoutes = this.extractBaselineRoutes(routeProposal as Record<string, unknown>);
    
    // 2. Perform custom multi-hop discovery
    const customRoutes = await this.discoverCustomMultiHopRoutes(
      routeProposalTyped?.fromToken || '',
      routeProposalTyped?.toToken || '',
      routeProposalTyped?.amountIn || '',
      marketConditionsTyped,
      userPreferencesTyped,
      chainId
    );
    
    // 3. Combine and analyze all routes
    const allRoutes = [...baselineRoutes, ...customRoutes];
    
    // 4. Rank routes by multiple criteria
    const rankedRoutes = this.rankHybridRoutes(allRoutes, userPreferencesTyped, marketConditionsTyped);
    
    const searchStats = {
      nodesExplored: this.routingGraph.nodes.size,
      pathsEvaluated: allRoutes.length,
      timeSpent: Date.now() - startTime,
      cacheHits: 0,
      fusionQueries: 1,
      parallelBatches: 1,
      optimalityGap: 0
    };
    
    console.log('✅ [HYBRID DISCOVERY] Analysis complete:', searchStats);
    
    // Log detailed route information
    console.log('🔍 [ROUTE DETAILS] ========== DISCOVERED ROUTES ==========');
    rankedRoutes.forEach((route, index) => {
      const routeTyped = route as Record<string, unknown>;
      console.log(`📊 Route #${index + 1} [${routeTyped?.source}]:`, {
        id: routeTyped?.id,
        amountIn: routeTyped?.amountIn,
        amountOut: routeTyped?.amountOut,
        protocols: routeTyped?.protocols,
        gas: routeTyped?.gas,
        confidence: routeTyped?.confidence,
        executionTime: routeTyped?.executionTime,
        mevProtection: routeTyped?.mevProtection,
        hopCount: routeTyped?.hopCount,
        intermediateToken: routeTyped?.intermediateToken
      });
      
      if (routeTyped?.paths && routeTyped?.paths.length > 0) {
        console.log(`  🛤️ Paths (${(routeTyped?.paths as unknown[])?.length}):`, (routeTyped?.paths as Record<string, unknown>[])?.map((path: Record<string, unknown>) => ({
          id: path?.id,
          protocols: path?.protocols,
          percentage: path?.percentage,
          from: path?.from,
          to: path?.to
        })));
      }
    });
    console.log('🔍 [ROUTE DETAILS] ========================================');
    
    return {
      routes: rankedRoutes as Record<string, unknown>[],
      searchStats
    };
  }

  private extractBaselineRoutes(routeProposal: Record<string, unknown>): unknown[] {
    const routes: unknown[] = [];
    const proposalTyped = routeProposal as { quotes?: { aggregation?: Record<string, unknown>; fusion?: Record<string, unknown> }; fromToken?: string; toToken?: string; amountIn?: string; paths?: unknown[] };
    
    // Add aggregation route if available
    if (proposalTyped.quotes?.aggregation) {
      // Convert aggregation quote to RouteProposal format with populated path
      const aggQuote = proposalTyped.quotes.aggregation;
      const aggregationPath = this.convertToRouteSteps(
        aggQuote.protocols || [],
        proposalTyped.fromToken || '',
        proposalTyped.toToken || '',
        proposalTyped.amountIn || '0',
        aggQuote.dstAmount as string || '0'
      );

      routes.push({
        id: `baseline-aggregation-${Date.now()}`,
        fromToken: proposalTyped.fromToken,
        toToken: proposalTyped.toToken,
        amount: proposalTyped.amountIn,
        estimatedOutput: aggQuote.dstAmount,
        path: aggregationPath,
        estimatedGas: (aggQuote.gas || 200000).toString(),
        estimatedTime: 60, // 1 minute typical for aggregation
        priceImpact: (aggQuote.priceImpact || '0.002').toString(),
        confidence: 0.9, // High confidence in 1inch aggregation
        risks: ['MEV exposure', 'Gas price volatility'],
        advantages: ['Fast execution', 'Multi-DEX optimization', 'Real-time routing'],
        proposedBy: '1inch-aggregation-baseline'
      });
    }
    
    // Add fusion route if available
    if (proposalTyped.quotes?.fusion) {
      // Convert fusion quote to RouteProposal format with populated path
      const fusionQuote = proposalTyped.quotes.fusion;
      const fusionPath = this.convertToRouteSteps(
        fusionQuote.protocols || [],
        proposalTyped.fromToken || '',
        proposalTyped.toToken || '',
        proposalTyped.amountIn || '0',
        fusionQuote.dstAmount as string || '0'
      );

      routes.push({
        id: `baseline-fusion-${Date.now()}`,
        fromToken: proposalTyped.fromToken,
        toToken: proposalTyped.toToken,
        amount: proposalTyped.amountIn,
        estimatedOutput: fusionQuote.dstAmount,
        path: fusionPath,
        estimatedGas: (fusionQuote.gas || 0).toString(),
        estimatedTime: 180, // 3 minutes typical for Fusion
        priceImpact: (fusionQuote.priceImpact || '0.001').toString(),
        confidence: 0.85, // High confidence with MEV protection
        risks: ['Network congestion delays', 'Private pool liquidity'],
        advantages: ['MEV protection enabled', 'Professional market makers', 'Optimal price execution'],
        proposedBy: '1inch-fusion-baseline'
      });
    }
    
    console.log('🔍 [BASELINE ROUTES] ========== 1INCH BASELINE ROUTES ==========');
    routes.forEach((route, index) => {
      const routeTyped = route as Record<string, unknown>;
      console.log(`🏦 Baseline Route #${index + 1} [${routeTyped.source}]:`, {
        amountOut: routeTyped.amountOut,
        gas: routeTyped.gas,
        confidence: routeTyped.confidence,
        mevProtection: routeTyped.mevProtection,
        executionTime: routeTyped.executionTime,
        pathCount: (routeTyped.paths as unknown[])?.length || 0
      });
    });
    console.log('🔍 [BASELINE ROUTES] =============================================');
    
    return routes;
  }

  private async discoverCustomMultiHopRoutes(
    fromToken: string,
    toToken: string,
    amount: string,
    marketConditions: unknown,
    userPreferences: unknown,
    chainId: number
  ): Promise<unknown[]> {
    console.log('🔍 [CUSTOM DISCOVERY] Exploring alternative multi-hop routes...');
    
    const customRoutes: unknown[] = [];
    
    // Define intermediate tokens for multi-hop exploration
    const intermediateTokens = this.getStrategicIntermediateTokens(fromToken, toToken, chainId);
    
    console.log('🔍 [MULTI-HOP] Intermediate tokens to explore:', 
      intermediateTokens.map(token => {
        const knownTokens: Record<string, string> = {
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
          '0xa0b86a33e6441431c0b7a5cec6ecb99f2fb83a4d': 'USDC', 
          '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
          '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
          '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
          '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',
          '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
          '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 'MATIC',
          '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b': 'CRO',
          '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 'SHIB',
          '0x4fabb145d64652a948d72533023f6e7a623c7c53': 'BUSD',
          '0x0d8775f648430679a709e98d2b0cb6250d2887ef': 'BAT',
          '0xbb0e17ef65f82ab018d8edd776e8dd940327b28b': 'AXS',
          '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 'WMATIC',
          '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'USDC.P',
          '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'USDT.P',
          '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 'DAI.P',
          '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': 'WBTC.P',
          '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'WETH.P',
          '0x4200000000000000000000000000000000000006': 'WETH.B',
          '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC.B',
          '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI.B',
          '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': 'cbBTC'
        };
        return knownTokens[token.toLowerCase()] || token.slice(0, 8) + '...';
      })
    );
    
    // Explore 2-hop routes through strategic intermediate tokens
    for (const intermediateToken of intermediateTokens) {
      try {
        const knownTokens: Record<string, string> = {
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
          '0xa0b86a33e6441431c0b7a5cec6ecb99f2fb83a4d': 'USDC', 
          '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
          '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
          '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
          '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',
          '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
          '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 'MATIC',
          '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b': 'CRO',
          '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 'SHIB',
          '0x4fabb145d64652a948d72533023f6e7a623c7c53': 'BUSD',
          '0x0d8775f648430679a709e98d2b0cb6250d2887ef': 'BAT',
          '0xbb0e17ef65f82ab018d8edd776e8dd940327b28b': 'AXS',
          '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 'WMATIC',
          '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'USDC.P',
          '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'USDT.P',
          '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 'DAI.P',
          '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': 'WBTC.P',
          '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'WETH.P',
          '0x4200000000000000000000000000000000000006': 'WETH.B',
          '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC.B',
          '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI.B',
          '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': 'cbBTC'
        };
        const tokenName = knownTokens[intermediateToken.toLowerCase()] || intermediateToken.slice(0, 8) + '...';
        
        console.log(`🔄 [2-HOP EXPLORATION] Exploring route via ${tokenName} (${intermediateToken.slice(0, 8)}...)`);
        
        const twoHopRoute = await this.explore2HopRoute(
          fromToken,
          intermediateToken,
          toToken,
          amount,
          marketConditions
        );
        
        if (twoHopRoute) {
          console.log(`✅ [2-HOP SUCCESS] Found route via ${tokenName}: ${twoHopRoute.amountOut} output`);
          customRoutes.push(twoHopRoute);
        } else {
          console.log(`❌ [2-HOP FAILED] No viable route via ${tokenName}`);
        }
      } catch (error) {
        console.warn(`⚠️ [2-HOP ERROR] Failed to explore route via ${intermediateToken.slice(0, 8)}...:`, error);
      }
    }
    
    // Explore alternative DEX combinations
    const alternativeRoutes = await this.exploreAlternativeDEXCombinations(
      fromToken,
      toToken,
      amount,
      marketConditions
    );
    
    customRoutes.push(...alternativeRoutes);
    
    console.log(`🔍 [CUSTOM DISCOVERY] Found ${customRoutes.length} custom routes`);
    
    // Log details of discovered custom routes
    if (customRoutes.length > 0) {
      console.log('🔍 [CUSTOM ROUTES] ========== DISCOVERED CUSTOM ROUTES ==========');
      customRoutes.forEach((route, index) => {
        const routeTyped = route as Record<string, unknown>;
        console.log(`🛣️ Custom Route #${index + 1}:`, {
          type: routeTyped.hopCount ? `${routeTyped.hopCount}-hop` : 'direct',
          via: routeTyped.intermediateToken ? (routeTyped.intermediateToken as string).slice(0, 8) + '...' : 'direct',
          amountOut: routeTyped.amountOut,
          protocols: routeTyped.protocols,
          confidence: routeTyped.confidence,
          paths: (routeTyped.paths as unknown[])?.length || 0
        });
        
        if (routeTyped.paths && (routeTyped.paths as unknown[]).length > 0) {
          (routeTyped.paths as Record<string, unknown>[]).forEach((path: Record<string, unknown>, pathIndex: number) => {
            console.log(`    Hop ${pathIndex + 1}: ${(path.from as string)?.slice(0, 8)}... → ${(path.to as string)?.slice(0, 8)}... via ${(path.protocols as string[])?.join(', ')}`);
          });
        }
      });
      console.log('🔍 [CUSTOM ROUTES] ===============================================');
    }
    
    return customRoutes;
  }

  private getStrategicIntermediateTokens(fromToken: string, toToken: string, chainId: number): string[] {
    // Strategic intermediate tokens based on liquidity and volume
    const mainnetTokens = [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH - Primary base pair
      '0xA0b86a33E6441431c0B7a5cEC6eCb99F2fB83A4D', // USDC - Stable high liquidity
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT - Stable high volume
      '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI - Decentralized stable
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC - Bitcoin bridge
      '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK - Oracle token
      '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI - DEX governance
      '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // MATIC - L2 bridge
      '0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b', // CRO - CEX bridge
      '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', // SHIB - Meme high volume
      '0x4Fabb145d64652a948d72533023f6E7A623C7C53', // BUSD - Binance stable
      '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', // BAT - Browser token
      '0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b'  // AXS - Gaming token
    ];

    const polygonTokens = [
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC - Native wrapper
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC - Primary stable
      '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT - Tether stable
      '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI - Maker stable
      '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', // WBTC - Bitcoin bridge
      '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'  // WETH - Ethereum bridge
    ];

    const baseTokens = [
      '0x4200000000000000000000000000000000000006', // WETH - Native wrapper
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC - Primary stable
      '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI - Maker stable
      '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'  // cbBTC - Coinbase BTC
    ];

    // Select tokens based on chain
    let strategicTokens: string[];
    switch (chainId) {
      case 1:
        strategicTokens = mainnetTokens;
        break;
      case 137:
        strategicTokens = polygonTokens;
        break;
      case 8453:
        strategicTokens = baseTokens;
        break;
      default:
        // Fallback to mainnet tokens for unknown chains
        strategicTokens = mainnetTokens;
    }
    
    // Filter out source and destination tokens
    return strategicTokens.filter(token => 
      token.toLowerCase() !== fromToken.toLowerCase() && 
      token.toLowerCase() !== toToken.toLowerCase()
    );
  }

  private async explore2HopRoute(
    fromToken: string,
    intermediateToken: string,
    toToken: string,
    amount: string,
    marketConditions: unknown
  ): Promise<unknown | null> {
    try {
      console.log(`🔄 [2-HOP] Exploring real 2-hop route: ${fromToken.slice(0, 8)}... → ${intermediateToken.slice(0, 8)}... → ${toToken.slice(0, 8)}...`);
      
      // Step 1: Get quote from fromToken to intermediateToken
      const hop1Quote = await this.getSingleHopQuote(fromToken, intermediateToken, amount, 1);
      if (!hop1Quote) {
        console.log(`❌ [2-HOP] Failed to get hop1 quote: ${fromToken} → ${intermediateToken}`);
        return null;
      }

      // Step 2: Get quote from intermediateToken to toToken using hop1 output
      const hop2Quote = await this.getSingleHopQuote(intermediateToken, toToken, hop1Quote.dstAmount, 1);
      if (!hop2Quote) {
        console.log(`❌ [2-HOP] Failed to get hop2 quote: ${intermediateToken} → ${toToken}`);
        return null;
      }

      // Calculate total slippage and fees
      const totalAmountOut = hop2Quote.dstAmount;
      const directSlippage = this.calculateSlippage(amount, totalAmountOut);
      
      // Only proceed if the 2-hop route is competitive (less than 5% additional slippage)
      if (directSlippage > 0.05) {
        console.log(`❌ [2-HOP] Route not competitive: ${directSlippage * 100}% total slippage`);
        return null;
      }

      const routeData = {
        id: `custom-2hop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fromToken,
        toToken,
        amountIn: amount,
        amountOut: totalAmountOut,
        protocols: this.extractProtocols([hop1Quote as Record<string, unknown>, hop2Quote as Record<string, unknown>]),
        gas: (parseInt((hop1Quote as Record<string, unknown>).gas as string || '150000') + parseInt((hop2Quote as Record<string, unknown>).gas as string || '150000')).toString(),
        gasPrice: (marketConditions as Record<string, unknown>)?.gasPrices?.ethereum?.standard || '25000000000',
        paths: [
          {
            id: 'hop1',
            from: fromToken,
            to: intermediateToken,
            protocols: (hop1Quote as Record<string, unknown>).protocols as string[] || ['uniswap-v3'],
            percentage: 100,
            amountIn: amount,
            amountOut: (hop1Quote as Record<string, unknown>).dstAmount as string
          },
          {
            id: 'hop2', 
            from: intermediateToken,
            to: toToken,
            protocols: (hop2Quote as Record<string, unknown>).protocols as string[] || ['sushiswap'],
            percentage: 100,
            amountIn: (hop1Quote as Record<string, unknown>).dstAmount as string,
            amountOut: (hop2Quote as Record<string, unknown>).dstAmount as string
          }
        ],
        source: 'custom-discovery',
        confidence: this.calculate2HopConfidence(hop1Quote as Record<string, unknown>, hop2Quote as Record<string, unknown>),
        executionTime: 25000, // Estimated 25 seconds for 2-hop
        mevProtection: false,
        intermediateToken,
        hopCount: 2,
        totalSlippage: directSlippage,
        estimatedOutput: totalAmountOut
      };

      console.log(`✅ [2-HOP] Successfully found 2-hop route with ${(directSlippage * 100).toFixed(2)}% slippage`);
      return routeData;
    } catch (error) {
      console.error(`❌ [2-HOP] Error exploring 2-hop route:`, error);
      return null;
    }
  }

  private async getSingleHopQuote(fromToken: string, toToken: string, amount: string, chainId: number): Promise<any> {
    try {
      // Convert amount to wei format if it's a decimal
      let amountInWei = amount;
      if (amount.includes('.') && !amount.includes('e')) {
        // This is a decimal amount, need to convert to wei
        const tokenDecimals = this.getTokenDecimals(fromToken);
        amountInWei = this.toWei(amount, tokenDecimals);
        console.log(`💰 Converting amount: ${amount} → ${amountInWei} (${tokenDecimals} decimals)`);
      }
      
      // Use 1inch aggregation API for single hop quotes
      const url = `/api/1inch/aggregation/quote?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amountInWei}&chainId=${chainId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`❌ 1inch quote API error (${response.status}) for ${fromToken} → ${toToken}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn(`❌ Failed to get single hop quote for ${fromToken} → ${toToken}:`, error);
      return null;
    }
  }

  private calculateSlippage(amountIn: string, amountOut: string): number {
    const inputAmount = parseFloat(amountIn);
    const outputAmount = parseFloat(amountOut);
    if (inputAmount === 0) return 1; // 100% slippage if no input
    
    // This is a simplified slippage calculation
    // In reality, you'd need to account for token price differences
    const expectedOutput = inputAmount; // Assuming 1:1 for simplification
    return Math.abs(expectedOutput - outputAmount) / expectedOutput;
  }

  private extractProtocols(quotes: Record<string, unknown>[]): string[] {
    const protocols = new Set<string>();
    quotes.forEach(quote => {
      if (quote.protocols) {
        (quote.protocols as (string | Record<string, unknown>)[]).forEach((protocol: string | Record<string, unknown>) => {
          if (typeof protocol === 'string') {
            protocols.add(protocol);
          } else if ((protocol as Record<string, unknown>).name) {
            protocols.add((protocol as Record<string, unknown>).name as string);
          }
        });
      }
    });
    return Array.from(protocols);
  }

  private calculate2HopConfidence(hop1Quote: Record<string, unknown>, hop2Quote: Record<string, unknown>): number {
    // Base confidence starts lower for multi-hop routes
    let confidence = 0.6;
    
    // Increase confidence based on quote reliability
    if (hop1Quote.gas && hop2Quote.gas) confidence += 0.1;
    if (hop1Quote.protocols && hop2Quote.protocols) confidence += 0.1;
    
    // Decrease confidence for high gas costs
    const totalGas = parseInt(hop1Quote.gas || '200000') + parseInt(hop2Quote.gas || '200000');
    if (totalGas > 500000) confidence -= 0.1;
    
    return Math.max(0.3, Math.min(0.9, confidence));
  }

  private async exploreAlternativeDEXCombinations(
    fromToken: string,
    toToken: string,
    amount: string,
    marketConditions: unknown
  ): Promise<unknown[]> {
    console.log('🔍 [ALT DEX] Exploring alternative DEX combinations...');
    
    const alternativeRoutes: unknown[] = [];
    
    // For now, implement simulated alternative DEX routes
    // In a real implementation, this would integrate with:
    // - Curve Finance for stable swaps
    // - Balancer for weighted pools
    // - SushiSwap for specific pairs
    // - Bancor for single-sided liquidity
    // - 0x for RFQ and Limit Orders
    
    try {
      // Simulate a Curve-style stable swap route
      if (this.isStablePair(fromToken, toToken)) {
        console.log('🌊 [ALT DEX] Detected stable pair - simulating Curve route');
        const curveRoute = {
          source: 'curve',
          amountOut: (parseFloat(amount) * 0.998).toString(), // 0.2% fee
          gas: 150000,
          confidence: 0.85,
          mevProtection: true,
          executionTime: 15000,
          protocols: ['Curve'],
          hopCount: 1,
          paths: [{
            from: fromToken,
            to: toToken,
            protocols: ['Curve'],
            part: 100
          }]
        };
        alternativeRoutes.push(curveRoute);
      }
      
      // Simulate a Balancer weighted pool route
      const balancerRoute = {
        source: 'balancer',
        amountOut: (parseFloat(amount) * 0.997).toString(), // 0.3% fee
        gas: 180000,
        confidence: 0.80,
        mevProtection: false,
        executionTime: 20000,
        protocols: ['Balancer'],
        hopCount: 1,
        paths: [{
          from: fromToken,
          to: toToken,
          protocols: ['Balancer'],
          part: 100
        }]
      };
      alternativeRoutes.push(balancerRoute);
      
      console.log(`🔍 [ALT DEX] Found ${alternativeRoutes.length} alternative DEX routes`);
      
    } catch (error) {
      console.error('❌ [ALT DEX] Error exploring alternative DEX combinations:', error);
    }
    
    return alternativeRoutes;
  }
  
  private isStablePair(fromToken: string, toToken: string): boolean {
    const stableTokens = [
      '0xa0b86a33e6441431c0b7a5cec6ecb99f2fb83a4d', // USDC
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
      '0x4fabb145d64652a948d72533023f6e7a623c7c53', // BUSD
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC (Polygon)
      '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT (Polygon)
      '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI (Polygon)
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC (Base)
      '0x50c5725949a6f0c72e6c4a641f24049a917db0cb'  // DAI (Base)
    ];
    
    const fromIsStable = stableTokens.some(stable => stable.toLowerCase() === fromToken.toLowerCase());
    const toIsStable = stableTokens.some(stable => stable.toLowerCase() === toToken.toLowerCase());
    
    return fromIsStable && toIsStable;
  }

  private rankHybridRoutes(routes: unknown[], userPreferences: unknown, marketConditions: unknown): unknown[] {
    return routes.sort((a, b) => {
      // Multi-criteria ranking based on user preferences
      const scoreA = this.calculateRouteScore(a, userPreferences, marketConditions);
      const scoreB = this.calculateRouteScore(b, userPreferences, marketConditions);
      
      return scoreB - scoreA; // Higher score first
    });
  }

  private calculateRouteScore(route: unknown, userPreferences: unknown, marketConditions: unknown): number {
    let score = 0;
    
    // Base score from output amount
    const outputAmount = parseFloat(route.amountOut || '0');
    score += outputAmount * 0.4; // 40% weight on output
    
    // Adjust for user preferences
    if (userPreferences?.riskTolerance === 'conservative' && route.mevProtection) {
      score += outputAmount * 0.2; // Bonus for MEV protection
    }
    
    if (userPreferences?.gasPreference === 'slow' && route.gas < 250000) {
      score += outputAmount * 0.1; // Bonus for low gas
    }
    
    // Confidence multiplier
    score *= (route.confidence || 0.5);
    
    // Execution time penalty for time-sensitive users
    if (userPreferences?.userPreference === 'speed') {
      score *= (30000 / (route.executionTime || 30000));
    }
    
    return score;
  }

  private calculateHybridConfidence(allRoutes: unknown[], baselineRoutes: unknown[], customRoutes: unknown[]): number {
    if (allRoutes.length === 0) return 0;
    
    // Higher confidence when we have both baseline and custom routes
    const hasBaseline = baselineRoutes.length > 0;
    const hasCustom = customRoutes.length > 0;
    
    let confidence = 0.6; // Base confidence
    
    if (hasBaseline) confidence += 0.2;
    if (hasCustom) confidence += 0.1;
    if (hasBaseline && hasCustom) confidence += 0.1; // Bonus for hybrid
    
    return Math.min(confidence, 1.0);
  }

  async cleanup(): Promise<void> {
    if (this.liquidityMonitor) {
      clearInterval(this.liquidityMonitor);
    }
    
    this.routeCache.clear();
    this.routingGraph.nodes.clear();
    this.routingGraph.edges.clear();
    this.routingGraph.fusionCompatibilityCache.clear();
    
    console.log('🛣️ Enhanced Route Discovery Agent cleaned up');
  }

  private convertToRouteSteps(protocols: unknown[], fromToken: string, toToken: string, amountIn: string, amountOut: string): RouteStep[] {
    // Handle 1inch protocols array format and convert to RouteStep[]
    if (!protocols || !Array.isArray(protocols) || protocols.length === 0) {
      // Return default single-step path if no protocols data
      return [{
        protocol: '1inch Direct',
        fromToken,
        toToken,
        amount: amountIn,
        estimatedOutput: amountOut,
        fee: '0.003'
      }];
    }

    const steps: RouteStep[] = [];
    let currentFromToken = fromToken;
    let currentAmount = amountIn;

    for (let i = 0; i < protocols.length; i++) {
      const protocol = protocols[i] as { name?: string; part?: number; percentage?: number; toTokenAddress?: string };
      const isLastStep = i === protocols.length - 1;
      const currentToToken = isLastStep ? toToken : (protocol.toTokenAddress || 'INTERMEDIATE');
      
      // Calculate estimated output for this step
      const percentage = protocol.percentage || protocol.part || 100;
      let stepOutput: string;
      
      if (isLastStep) {
        stepOutput = amountOut;
      } else {
        // Estimate intermediate output proportionally
        const stepRatio = percentage / 100;
        stepOutput = (parseFloat(currentAmount) * stepRatio * 0.997).toString(); // ~0.3% fee
      }

      steps.push({
        protocol: protocol.name || 'Unknown DEX',
        fromToken: currentFromToken,
        toToken: currentToToken,
        amount: currentAmount,
        estimatedOutput: stepOutput,
        fee: '0.003' // Standard 0.3% fee
      });

      // Update for next iteration
      currentFromToken = currentToToken;
      currentAmount = stepOutput;
    }

    return steps;
  }

  private async handleConsensusRequest(message: AgentMessage): Promise<{ type: string; messageSent: boolean; agentId: string }> {
    try {
      const payload = message.payload as {
        requestId: string;
        routes: RouteProposal[];
        assessments: RiskAssessment[];
        criteria: DecisionCriteria;
        deadline: number;
        responseId: string;
      };

      console.log(`🎯 [CONSENSUS] Route Discovery Agent evaluating ${payload.routes.length} routes for consensus`);

      // Evaluate routes based on route optimization criteria
      const bestRoute = this.selectBestRouteForConsensus(payload.routes, payload.criteria);
      
      // Create consensus response
      const consensusResponse = {
        responseId: payload.responseId,  // Fixed: use responseId not requestId
        agentId: this.config.id,
        recommendedRoute: bestRoute.routeId,
        score: bestRoute.score,
        confidence: bestRoute.confidence,
        reasoning: bestRoute.reasoning
      };

      // Send response back to coordinator
      await this.sendMessage({
        to: message.from,
        type: MessageType.CONSENSUS_REQUEST,
        payload: consensusResponse,
        priority: MessagePriority.HIGH
      });

      console.log(`✅ [CONSENSUS] Route Discovery Agent sent recommendation: ${bestRoute.routeId}`);
      
      return {
        type: 'consensus-response',
        messageSent: true,
        agentId: this.config.id
      };
    } catch (error) {
      console.error('❌ [CONSENSUS] Error handling consensus request:', error);
      return {
        type: 'consensus-error',
        messageSent: false,
        agentId: this.config.id
      };
    }
  }

  private selectBestRouteForConsensus(
    routes: RouteProposal[], 
    criteria: DecisionCriteria
  ): { routeId: string; score: any; confidence: number; reasoning: string[] } {
    let bestRoute = routes[0];
    let bestScore = 0;
    
    for (const route of routes) {
      // Calculate route optimization score
      const outputScore = parseFloat(route.estimatedOutput) || 0;
      const confidenceScore = route.confidence || 0.5;
      const gasScore = 1 / (parseFloat(route.estimatedGas) || 1000000); // Lower gas is better
      
      // Weight based on user criteria (emphasize cost and time)
      const combinedScore = 
        (outputScore / 1000000000000000000 * criteria.cost) + // Normalize ETH output
        (confidenceScore * criteria.reliability) +
        (gasScore * criteria.cost * 0.1);
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestRoute = route;
      }
    }

    return {
      routeId: bestRoute.id,
      score: {
        totalScore: bestScore,
        breakdown: {
          cost: parseFloat(bestRoute.estimatedOutput) / 1000000000000000000,
          reliability: bestRoute.confidence || 0.5,
          gas: 1 / (parseFloat(bestRoute.estimatedGas) || 1000000)
        }
      },
      confidence: bestRoute.confidence || 0.5,
      reasoning: [
        `Selected route ${bestRoute.id} for optimal output`,
        `Output: ${(parseFloat(bestRoute.estimatedOutput) / 1000000000000000000).toFixed(6)} ETH`,
        `Confidence: ${((bestRoute.confidence || 0.5) * 100).toFixed(0)}%`,
        `Gas estimate: ${bestRoute.estimatedGas}`
      ]
    };
  }
}