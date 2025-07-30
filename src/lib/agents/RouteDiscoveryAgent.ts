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
  MarketConditions
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

    // Batch process edges for better performance
    const BATCH_SIZE = 5;
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
      } else {
        // Fall back to traditional calculation
        const slippage = edge.slippage.calculateSlippage(currentAmount, edge.liquidity);
        const stepOutputNum = currentAmount * (1 - slippage - edge.fee);
        stepOutput = stepOutputNum.toString();
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

    return {
      id: `fusion-optimized-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amountIn,
      path: steps,
      estimatedGas: totalGas.toString(),
      estimatedTime: steps.length * 12, // Faster with Fusion
      estimatedOutput: currentAmount.toString(),
      priceImpact: (totalImpliedCost * 100).toFixed(4),
      confidence,
      risks: this.assessFusionOptimizedRisks(path),
      advantages: this.identifyFusionAdvantages(path),
      proposedBy: 'fusion-aware-pathfinder'
    };
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
      canAnalyzeMarket: false,
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
      capabilities: ['pathfinding', 'routing', 'optimization', 'fusion-integration'],
      dependencies: ['data-aggregation-service'],
      maxConcurrentTasks: 10,
      timeout: 30000
    };

    super(defaultConfig, routingCapabilities);
    this.dataService = dataService;
    this.routingGraph = this.initializeEmptyGraph();
    this.fusionPathfinder = new FusionAwarePathfinder(dataService);
    this.routeCache = new Map();
  }

  async initialize(): Promise<void> {
    console.log('🛣️ Initializing Enhanced Route Discovery Agent with Fusion integration...');
    
    // Build initial routing graph
    await this.buildRoutingGraph();
    
    // 🚀 Parallelized slippage model initialization
    await this.initializeSlippageModelsParallel();
    
    // Start liquidity monitoring
    this.startLiquidityMonitoring();
    
    console.log(`✅ Route Discovery Agent initialized with ${this.routingGraph.nodes.size} tokens, ${Array.from(this.routingGraph.edges.values()).flat().length} pools, ${this.routingGraph.fusionCompatibilityCache.size} Fusion compatibility entries`);
  }

  async processMessage(message: AgentMessage, signal: AbortSignal): Promise<void> {
    switch (message.type) {
      case MessageType.REQUEST_ANALYSIS:
        await this.handleRouteRequest(message);
        break;
      case MessageType.MARKET_DATA:
        await this.handleMarketUpdate(message);
        break;
      default:
        console.log(`🛣️ Route Discovery Agent received: ${message.type}`);
    }
  }

  async handleTask(task: unknown, signal: AbortSignal): Promise<unknown> {
    const { type, data } = task;
    
    switch (type) {
      case 'find-routes':
        return await this.findOptimalRoutes(data);
      case 'find-fusion-routes':
        return await this.findFusionOptimizedRoutes(data);
      case 'update-fusion-compatibility':
        return await this.updateFusionCompatibility();
      case 'analyze-gas-curves':
        return await this.analyzeGasCurves(data);
      default:
        throw new Error(`Unknown route discovery task: ${type}`);
    }
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
    const protocols = ['uniswap-v2', 'uniswap-v3', 'sushiswap', 'curve', 'balancer'];
    
    for (const protocol of protocols) {
      try {
        const pools = await this.getProtocolPools(protocol, chainId);
        
        for (const pool of pools) {
          const edge: PoolEdge = {
            id: pool.id,
            protocol,
            fromToken: pool.token0,
            toToken: pool.token1,
            liquidity: pool.liquidityUSD,
            fee: pool.fee,
            gasEstimate: this.estimateGasForProtocol(protocol),
            slippage: this.createSlippageModel(protocol, pool),
            lastUpdate: Date.now(),
            reliability: pool.reliability || 0.8,
            mevRisk: this.calculateMEVRisk(protocol, pool),
            fusionCompatible: false // Will be tested during compatibility update
          };

          this.addEdgeToGraph(pool.token0, edge);
          
          const reverseEdge: PoolEdge = {
            ...edge,
            id: pool.id + '-reverse',
            fromToken: pool.token1,
            toToken: pool.token0
          };
          
          this.addEdgeToGraph(pool.token1, reverseEdge);
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
        params = { k: pool.reserve0 * pool.reserve1 || 1000000, fee: pool.fee || 0.003 };
        break;
      case 'uniswap-v3':
        type = 'uniswap_v3';
        params = { liquidity: pool.liquidity || 1000000, fee: pool.fee || 0.003 };
        break;
      case 'curve':
        type = 'curve';
        params = { A: pool.amplificationParameter || 100, fee: pool.fee || 0.0004 };
        break;
      case 'balancer':
        type = 'balancer';
        params = { weights: pool.weights || [0.5, 0.5], fee: pool.fee || 0.001 };
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
    if (tokenInfo.marketCap < 1000000) risk += 0.3;
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
    if (pool.liquidityUSD > 10000000) risk += 0.2;
    return Math.min(risk, 1.0);
  }

  private async getProtocolPools(protocol: string, chainId: number): Promise<Array<Record<string, unknown>>> {
    // Mock implementation - would fetch from protocol APIs
    return [
      {
        id: `${protocol}-pool-1`,
        token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        token1: '0xA0b86a33E6441E3e3f4069b80b0c0ee29C5b7e09',
        liquidityUSD: 10000000,
        fee: 0.003,
        reliability: 0.9
      }
    ];
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
      const { params } = message.payload;
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
    const { conditions } = message.payload;
    
    // Clear cache on significant market changes
    if (conditions.volatility?.overall > 0.3) {
      this.routeCache.clear();
    }
  }

  getSearchMetrics() {
    return { ...this.searchMetrics };
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
}