// Intelligent Router Types - Extended for Multi-Network Support
// This file extends base bridge types specifically for the intelligent router
// while keeping the main bridge types unchanged

import { Token } from './bridge';

// Extended Network Types for Intelligent Router
export type IntelligentRouterNetwork = 'ethereum' | 'polygon' | 'arbitrum' | 'bsc';
export type IntelligentRouterChainId = 1 | 137 | 42161 | 56;

// Intelligent Router Token Interface (extends base Token)
export interface IntelligentRouterToken extends Omit<Token, 'network' | 'chainId'> {
  network: IntelligentRouterNetwork;
  chainId: IntelligentRouterChainId;
  address: string; // Always required for intelligent router
  verified: boolean;
  displayPrecision: number;
  description: string;
  tags: string[];
  explorerUrl?: string;
  coingeckoId?: string;
  isNative?: boolean;
  isWrapped?: boolean;
  wrappedEquivalent?: string;
  nativeEquivalent?: string;
}

// Network Information
export interface NetworkInfo {
  name: string;
  symbol: string;
  color: string;
  logo: string;
}

// Token Balance with Network Context
export interface IntelligentRouterTokenBalance {
  token: IntelligentRouterToken;
  balance: string;
  balanceFormatted: string;
  usdValue?: number;
  network: IntelligentRouterNetwork;
  chainId: IntelligentRouterChainId;
  lastUpdated: number;
}

// Route Proposal for Intelligent Router
export interface IntelligentRouterRoute {
  id: string;
  fromToken: IntelligentRouterToken;
  toToken: IntelligentRouterToken;
  amount: string;
  estimatedOutput: string;
  
  // Network-specific information
  sourceNetwork: IntelligentRouterNetwork;
  targetNetwork: IntelligentRouterNetwork;
  isCrossChain: boolean;
  
  // Route steps
  steps: IntelligentRouterRouteStep[];
  
  // Cost analysis
  estimatedGas: string;
  estimatedGasUSD?: number;
  estimatedTime: number; // seconds
  priceImpact: string;
  
  // Quality indicators
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
  
  // Route metadata
  provider: string; // '1inch' | 'bridge' | 'hybrid'
  advantages: string[];
  risks: string[];
  reasoning: string[];
  
  // Performance metrics
  mevProtection?: boolean;
  liquidityScore?: number;
  optimalForAmount?: boolean;
}

// Route Step for Multi-Network Routes
export interface IntelligentRouterRouteStep {
  stepNumber: number;
  type: 'swap' | 'bridge' | 'wrap' | 'unwrap';
  protocol: string;
  
  fromToken: IntelligentRouterToken;
  toToken: IntelligentRouterToken;
  amount: string;
  estimatedOutput: string;
  
  network: IntelligentRouterNetwork;
  estimatedGas: string;
  estimatedTime: number;
  
  description: string;
  optional?: boolean;
}

// Network Selection State
export interface NetworkSelectionState {
  selectedNetwork: IntelligentRouterChainId | 'all';
  availableNetworks: IntelligentRouterChainId[];
  networkFilter: 'all' | 'single' | 'cross-chain';
}

// Route Comparison Data
export interface RouteComparison {
  routes: IntelligentRouterRoute[];
  bestRoute: IntelligentRouterRoute;
  savings: {
    amount: string;
    percentage: number;
    comparedTo: 'worst' | 'average' | 'traditional';
  };
  recommendations: {
    speed: IntelligentRouterRoute;
    cost: IntelligentRouterRoute;
    security: IntelligentRouterRoute;
    balanced: IntelligentRouterRoute;
  };
}

// Analytics and Insights
export interface IntelligentRouterAnalytics {
  networkPerformance: {
    [K in IntelligentRouterChainId]: {
      averageGasPrice: number;
      averageBlockTime: number;
      liquidityScore: number;
      reliabilityScore: number;
      costEfficiencyScore: number;
    };
  };
  
  tokenPopularity: {
    [symbol: string]: {
      volume24h: number;
      trades24h: number;
      networks: IntelligentRouterChainId[];
    };
  };
  
  routingInsights: {
    mostEfficientPairs: Array<{
      from: string;
      to: string;
      network: IntelligentRouterChainId;
      avgSavings: number;
    }>;
    
    networkUtilization: {
      [K in IntelligentRouterChainId]: number;
    };
    
    crossChainActivity: {
      volume: number;
      popularRoutes: Array<{
        from: IntelligentRouterChainId;
        to: IntelligentRouterChainId;
        volume: number;
      }>;
    };
  };
}

// User Preferences for Intelligent Router
export interface IntelligentRouterPreferences {
  defaultNetwork: IntelligentRouterChainId;
  preferredNetworks: IntelligentRouterChainId[];
  routingPreference: 'speed' | 'cost' | 'security' | 'balanced';
  maxSlippage: number;
  gasPreference: 'slow' | 'standard' | 'fast';
  enableCrossChain: boolean;
  mevProtectionEnabled: boolean;
  showAdvancedMetrics: boolean;
}

// Error Types for Intelligent Router
export type IntelligentRouterError = 
  | 'NETWORK_NOT_SUPPORTED'
  | 'TOKEN_NOT_FOUND'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'ROUTE_NOT_AVAILABLE'
  | 'CROSS_CHAIN_DISABLED'
  | 'NETWORK_CONGESTION'
  | 'API_ERROR'
  | 'WALLET_NOT_CONNECTED'
  | 'WRONG_NETWORK'
  | 'AMOUNT_TOO_SMALL'
  | 'AMOUNT_TOO_LARGE';

export interface IntelligentRouterErrorInfo {
  code: IntelligentRouterError;
  message: string;
  details?: string;
  network?: IntelligentRouterChainId;
  token?: string;
  suggestedActions?: string[];
}

// Route Request Parameters
export interface RouteRequest {
  fromToken: IntelligentRouterToken;
  toToken: IntelligentRouterToken;
  amount: string;
  walletAddress?: string;
  
  // Network preferences
  preferredNetworks?: IntelligentRouterChainId[];
  allowCrossChain?: boolean;
  
  // Route preferences
  routePreference?: 'speed' | 'cost' | 'security' | 'balanced';
  maxSlippage?: number;
  gasPreference?: 'slow' | 'standard' | 'fast';
  
  // Advanced options
  enableMevProtection?: boolean;
  maxRoutes?: number;
  includeAnalytics?: boolean;
}

// Route Response
export interface RouteResponse {
  request: RouteRequest;
  routes: IntelligentRouterRoute[];
  comparison: RouteComparison;
  analytics?: IntelligentRouterAnalytics;
  errors?: IntelligentRouterErrorInfo[];
  metadata: {
    timestamp: number;
    processingTime: number;
    networksQueried: IntelligentRouterChainId[];
    cacheHit: boolean;
  };
}

// Token Search and Filtering
export interface TokenSearchFilter {
  query?: string;
  networks?: IntelligentRouterChainId[];
  tags?: string[];
  verified?: boolean;
  minLiquidity?: number;
  sortBy?: 'name' | 'symbol' | 'volume' | 'liquidity' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface TokenSearchResult {
  tokens: IntelligentRouterToken[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number;
}

// Network Status and Health
export interface NetworkStatus {
  chainId: IntelligentRouterChainId;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  gasPrice: {
    slow: number;
    standard: number;
    fast: number;
  };
  blockHeight: number;
  lastUpdate: number;
  issues?: string[];
}

// Validation Results
export interface ValidationResult {
  isValid: boolean;
  errors: IntelligentRouterErrorInfo[];
  warnings: string[];
  suggestions: string[];
}

// Type Guards
export function isIntelligentRouterToken(token: unknown): token is IntelligentRouterToken {
  return token !== null && 
    typeof token === 'object' &&
    token !== undefined &&
    'symbol' in token &&
    'network' in token &&
    'chainId' in token &&
    'address' in token &&
    typeof (token as IntelligentRouterToken).symbol === 'string' &&
    typeof (token as IntelligentRouterToken).network === 'string' &&
    typeof (token as IntelligentRouterToken).chainId === 'number' &&
    typeof (token as IntelligentRouterToken).address === 'string' &&
    ['ethereum', 'polygon', 'arbitrum', 'bsc'].includes((token as IntelligentRouterToken).network) &&
    [1, 137, 42161, 56].includes((token as IntelligentRouterToken).chainId);
}

export function isIntelligentRouterChainId(chainId: unknown): chainId is IntelligentRouterChainId {
  return typeof chainId === 'number' && [1, 137, 42161, 56].includes(chainId);
}

export function isIntelligentRouterNetwork(network: unknown): network is IntelligentRouterNetwork {
  return typeof network === 'string' && ['ethereum', 'polygon', 'arbitrum', 'bsc'].includes(network);
}

// Utility Types
export type NetworkTokenMap = {
  [K in IntelligentRouterChainId]: IntelligentRouterToken[];
};

export type NetworkPairRecommendations = {
  [K in IntelligentRouterChainId]: string[][];
};

// Export helper for type checking
export const INTELLIGENT_ROUTER_NETWORKS = ['ethereum', 'polygon', 'arbitrum', 'bsc'] as const;
export const INTELLIGENT_ROUTER_CHAIN_IDS = [1, 137, 42161, 56] as const;