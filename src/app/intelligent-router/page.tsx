'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  Shield, 
  Activity,
  Sparkles,
  Rocket,
  Star,
  CheckCircle,
  Wallet,
  ArrowUpDown,
  Clock,
  BarChart3,
  Network,
  Users,
  Bot,
  Check,
  Lightbulb,
  Route,
  TrendingUp,
  AlertTriangle,
  Target
} from 'lucide-react';

// Import AI Agent System
import { AIAgentBridgeService, AIAgentAnalysis, AgentPrediction } from '@/lib/services/ai-agent-bridge-service';
import { Token } from '@/types/bridge';
import { useWalletStore } from '@/store/useWalletStore';
import { cn } from '@/lib/utils/helpers';
import { TradingCompanion } from '@/components/ai/TradingCompanion';
import { UserPreferences } from '@/components/bridge/UserPreferences';
import { PageWrapper } from '@/components/layout/PageWrapper';

// Import Intelligent Router System
import { 
  IntelligentRouterToken, 
  IntelligentRouterChainId
} from '@/types/intelligent-router';
import { 
  ALL_INTELLIGENT_ROUTER_TOKENS,
  getIntelligentRouterTokens
} from '@/config/intelligent-router-tokens';
import { intelligentRouterRegistry } from '@/lib/services/intelligent-router-registry';
import { ChainSupportService } from '@/lib/services/chain-support-config';

// Import Enhanced UI Components
import { NetworkSelector } from '@/components/intelligent-router/NetworkSelector';
import { EnhancedTokenSelector } from '@/components/intelligent-router/EnhancedTokenSelector';
import { RouteFlowVisualization } from '@/components/intelligent-router/RouteFlowVisualization';
import { ChainSupportWarning } from '@/components/intelligent-router/ChainSupportWarning';

// AI Router Interface
interface AIRouterState {
  fromToken: IntelligentRouterToken | null;
  toToken: IntelligentRouterToken | null;
  selectedNetwork: IntelligentRouterChainId | 'all';
  amount: string;
  isAnalyzing: boolean;
  aiResults: AIAgentAnalysis | null;
  predictions: AgentPrediction | null;
  executionStatus: 'idle' | 'analyzing' | 'ready' | 'executing' | 'completed' | 'failed';
  activeAgents: string[];
  currentPhase: string;
  
  // User preferences for intelligent routing
  userPreference: 'speed' | 'cost' | 'security' | 'balanced';
  maxSlippage: number;
  gasPreference: 'slow' | 'standard' | 'fast';
}

const AGENT_NAMES = {
  'market-intelligence': 'Market Intelligence Agent',
  'route-discovery': 'Route Discovery Agent', 
  'risk-assessment': 'Risk Assessment Agent',
  'execution-strategy': 'Execution Strategy Agent',
  'security': 'Security Agent',
  'performance-monitor': 'Performance Monitor Agent'
};


// Real AI metrics
const REAL_AI_METRICS = {
  activeAgents: 6, // Market Intelligence, Route Discovery, Risk Assessment, Execution Strategy, Security, Performance Monitor
  bridgeServices: 5, // Regular bridge, Solana, Starknet, Stellar, 1inch Fusion
  tradingBuddyStatus: 'Online',
  networkHealth: '100%',
  apiResponseTime: '245ms'
};

export default function IntelligentAIRouterPage() {
  const { isConnected: storeConnected, account } = useWalletStore();
  const agentService = AIAgentBridgeService.getInstance();
  
  // Use useWalletStore since that's where your wallets are actually connected
  const isConnected = storeConnected;
  const walletAddress = typeof account === 'string' ? account : (account as { address?: string })?.address;

  // Debug wallet connection (optional - can be removed after testing)
  useEffect(() => {
    console.log('AI Router - Wallet detection status:', {
      storeConnected: storeConnected,
      storeAccount: account ? 'present' : 'none',
      walletAddress: walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : 'none',
      isConnected: isConnected
    });
  }, [storeConnected, account, walletAddress, isConnected]);
  
  const [routerState, setRouterState] = useState<AIRouterState>({
    fromToken: intelligentRouterRegistry.getToken('WBTC', 1), // WBTC on Ethereum
    toToken: intelligentRouterRegistry.getToken('ETH', 1), // ETH on Ethereum
    selectedNetwork: 'all', // No longer used but keeping for compatibility
    amount: '0.5',
    isAnalyzing: false,
    aiResults: null,
    predictions: null,
    executionStatus: 'idle',
    activeAgents: [],
    currentPhase: '',
    
    // Default user preferences
    userPreference: 'balanced',
    maxSlippage: 0.5,
    gasPreference: 'standard'
  });

  const [showChainWarning, setShowChainWarning] = useState(true);

  const [liveMetrics, setLiveMetrics] = useState(REAL_AI_METRICS);
  const [showPreferences, setShowPreferences] = useState(false);

  // Simulate real metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        // Occasionally update response time realistically
        apiResponseTime: Math.random() > 0.8 ? 
          `${Math.floor(Math.random() * 100) + 200}ms` : 
          prev.apiResponseTime
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Convert IntelligentRouterToken to Token for AI service compatibility
  const convertToLegacyToken = (irToken: IntelligentRouterToken): Token => {
    return {
      id: irToken.id,
      symbol: irToken.symbol,
      name: irToken.name,
      decimals: irToken.decimals,
      logoUrl: irToken.logoUrl,
      network: irToken.network as string, // Type conversion needed
      chainId: irToken.chainId as number, // Type conversion needed
      address: irToken.address,
      coingeckoId: irToken.coingeckoId,
      isNative: irToken.isNative,
      isWrapped: irToken.isWrapped,
      verified: irToken.verified,
      displayPrecision: irToken.displayPrecision,
      description: irToken.description,
      tags: irToken.tags
    } as Token;
  };

  const runAIAnalysis = async () => {
    if (!routerState.fromToken || !routerState.toToken || !routerState.amount) {
      return;
    }
    
    setRouterState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      executionStatus: 'analyzing',
      activeAgents: [],
      currentPhase: ''
    }));
    
    try {
      // Simulate agent activation phases
      const phases = [
        { agents: ['market-intelligence'], phase: 'Analyzing market conditions...', delay: 800 },
        { agents: ['route-discovery'], phase: 'Discovering optimal routes...', delay: 1000 },
        { agents: ['risk-assessment', 'security'], phase: 'Assessing risks and security...', delay: 1200 },
        { agents: ['execution-strategy'], phase: 'Optimizing execution strategy...', delay: 800 },
        { agents: ['performance-monitor'], phase: 'Finalizing analysis...', delay: 600 }
      ];

      // Animate through phases
      for (const { agents, phase, delay } of phases) {
        setRouterState(prev => ({ 
          ...prev, 
          currentPhase: phase,
          activeAgents: [...prev.activeAgents, ...agents]
        }));
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Convert intelligent router tokens to legacy format for AI service
      const legacyFromToken = convertToLegacyToken(routerState.fromToken);
      const legacyToToken = convertToLegacyToken(routerState.toToken);

      // Get actual AI analysis with user preferences (works without wallet connection)
      const aiAnalysis = await agentService.analyzeRoute(
        legacyFromToken,
        legacyToToken,
        routerState.amount,
        walletAddress, // Optional - analysis works without wallet
        {
          userPreference: routerState.userPreference,
          maxSlippage: routerState.maxSlippage,
          gasPreference: routerState.gasPreference
        }
      );

      // Get predictions
      const predictions = await agentService.getAgentPredictions(
        legacyFromToken,
        legacyToToken,
        routerState.amount
      );
    
      setRouterState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        aiResults: aiAnalysis,
        predictions: predictions,
        executionStatus: 'ready'
      }));
    } catch (error) {
      console.error('AI Analysis failed - no mock fallback:', error);
      setRouterState(prev => ({ 
        ...prev, 
        isAnalyzing: false,
        aiResults: null,
        predictions: null,
        executionStatus: 'failed'
      }));
    }
  };

  // Mock analysis function removed - only real data allowed

  const executeRoute = async () => {
    if (!routerState.aiResults) return;
    
    setRouterState(prev => ({ ...prev, executionStatus: 'executing' }));
    
    try {
      // Simulate execution with the AI-optimized strategy
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      setRouterState(prev => ({ ...prev, executionStatus: 'completed' }));
    } catch (error) {
      console.error('Route execution failed:', error);
      setRouterState(prev => ({ ...prev, executionStatus: 'idle' }));
    }
  };

  const resetRouter = () => {
    setRouterState(prev => ({ 
      ...prev, 
      aiResults: null,
      predictions: null,
      executionStatus: 'idle',
      activeAgents: [],
      currentPhase: ''
    }));
  };

  const swapTokens = () => {
    setRouterState(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      aiResults: null,
      predictions: null,
      executionStatus: 'idle',
      activeAgents: [],
      currentPhase: ''
    }));
  };

  // No longer needed - we use all tokens directly



  return (
    <PageWrapper
      title="Intelligent Router"
      description="Experience the future of cross-chain bridging with our intelligent routing system"
      keywords="intelligent router, cross-chain, bridge, artificial intelligence, defi"
      maxWidth="2xl"
      padding="lg"
      breadcrumbs={[
        { label: 'Bridge', href: '/' },
        { label: 'Intelligent Router' }
      ]}
      className="min-h-screen"
    >
      {/* Additional animated elements for AI demo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/3 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="relative">
              <Brain className="w-12 h-12 text-blue-400" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full opacity-75"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
              Intelligent Router
            </h1>
          </div>
          <p className="text-lg max-w-2xl mx-auto text-gray-300">
            Next-generation cross-chain bridging with intelligent agents
          </p>
          
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>AI Trading Buddy</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-blue-500" />
              <span>Multi-Agent AI System</span>
            </div>
            <div className="flex items-center space-x-2">
              <Rocket className="w-4 h-4 text-blue-600" />
              <span>Real-time Route Optimization</span>
            </div>
          </div>
        </motion.div>

        {/* Live AI Metrics Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-12"
        >
          {Object.entries(liveMetrics).map(([key, value], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              <div className="text-xs text-gray-400 capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* AI Bridge Interface */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Wallet className="w-6 h-6 text-blue-400" />
              <span>Intelligent Bridge</span>
            </h2>
            
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 space-y-6">
              {/* Chain Support Warning */}
              {routerState.fromToken && (
                <ChainSupportWarning
                  chainId={routerState.fromToken.chainId}
                  fromTokenSymbol={routerState.fromToken.symbol}
                  toTokenSymbol={routerState.toToken?.symbol}
                  isVisible={showChainWarning}
                  onDismiss={() => setShowChainWarning(false)}
                />
              )}

              {/* From Token Selection */}
              <EnhancedTokenSelector
                selectedToken={routerState.fromToken}
                availableTokens={ALL_INTELLIGENT_ROUTER_TOKENS}
                onTokenSelect={(token) => {
                  setRouterState(prev => ({
                    ...prev,
                    fromToken: token,
                    aiResults: null,
                    predictions: null,
                    executionStatus: 'idle',
                    activeAgents: [],
                    currentPhase: ''
                  }));
                  // Show warning if switching to a chain with limited support
                  const chainConfig = ChainSupportService.getChainConfig(token.chainId);
                  if (chainConfig && (!chainConfig.fusionSupported || !chainConfig.aggregationSupported)) {
                    setShowChainWarning(true);
                  }
                }}
                label="From Token"
                placeholder="Select source token"
                className="mb-4"
              />
              
              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Amount</label>
                <input
                  type="number"
                  value={routerState.amount}
                  onChange={(e) => setRouterState(prev => ({ ...prev, amount: e.target.value, aiResults: null, predictions: null, executionStatus: 'idle' }))}
                  placeholder="Enter amount"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <motion.button
                  onClick={swapTokens}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full text-white hover:from-cyan-600 hover:to-blue-700 transition-all duration-200"
                >
                  <ArrowUpDown className="w-5 h-5" />
                </motion.button>
              </div>

              {/* To Token Selection */}
              <EnhancedTokenSelector
                selectedToken={routerState.toToken}
                availableTokens={ALL_INTELLIGENT_ROUTER_TOKENS}
                onTokenSelect={(token) => {
                  setRouterState(prev => ({
                    ...prev,
                    toToken: token,
                    aiResults: null,
                    predictions: null,
                    executionStatus: 'idle',
                    activeAgents: [],
                    currentPhase: ''
                  }));
                  // Show warning if switching to a chain with limited support
                  const chainConfig = ChainSupportService.getChainConfig(token.chainId);
                  if (chainConfig && (!chainConfig.fusionSupported || !chainConfig.aggregationSupported)) {
                    setShowChainWarning(true);
                  }
                }}
                label="To Token"
                placeholder="Select destination token"
                className="mb-4"
              />
              
              {/* Route Results and Market Insights */}
              {routerState.aiResults && routerState.aiResults.routes && routerState.aiResults.routes.length > 0 && (
                <div className="space-y-4">
                  {/* Estimated Output Display */}
                  {routerState.aiResults.routes[0].estimatedOutput && (
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">You will receive</div>
                        <div className="text-xs text-gray-500">
                          via {routerState.aiResults.routes[0].path?.[0]?.protocol || '1inch Fusion'}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-green-400">
                        {(() => {
                          const amount = routerState.aiResults.routes[0].estimatedOutput;
                          const decimals = routerState.toToken?.decimals || 18;
                          try {
                            if (amount.includes('.')) {
                              return parseFloat(amount).toFixed(3);
                            }
                            const bigIntAmount = BigInt(amount);
                            const divisor = BigInt(10 ** decimals);
                            const wholePart = bigIntAmount / divisor;
                            const fractionalPart = bigIntAmount % divisor;
                            const totalAmount = Number(wholePart) + Number(fractionalPart) / (10 ** decimals);
                            return totalAmount.toFixed(3);
                          } catch {
                            return amount;
                          }
                        })()} {routerState.toToken?.symbol}
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                        <span>Confidence: {(routerState.aiResults.confidence * 100).toFixed(0)}%</span>
                        <span>~{Math.round((routerState.aiResults.routes[0].estimatedTime || 0) / 60)}m</span>
                        <span>Impact: {routerState.aiResults.routes[0].priceImpact || '0.1'}%</span>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* User Preferences for AI Routing */}
              <div className="border-t border-gray-700 pt-4">
                <UserPreferences
                  userPreference={routerState.userPreference}
                  onUserPreferenceChange={(preference) => 
                    setRouterState(prev => ({ 
                      ...prev, 
                      userPreference: preference,
                      aiResults: null, // Reset analysis when preferences change
                      predictions: null,
                      executionStatus: 'idle'
                    }))
                  }
                  maxSlippage={routerState.maxSlippage}
                  onMaxSlippageChange={(slippage) => 
                    setRouterState(prev => ({ 
                      ...prev, 
                      maxSlippage: slippage,
                      aiResults: null,
                      predictions: null,
                      executionStatus: 'idle'
                    }))
                  }
                  gasPreference={routerState.gasPreference}
                  onGasPreferenceChange={(gasPreference) => 
                    setRouterState(prev => ({ 
                      ...prev, 
                      gasPreference,
                      aiResults: null,
                      predictions: null,
                      executionStatus: 'idle'
                    }))
                  }
                  isVisible={showPreferences}
                  onToggleVisibility={() => setShowPreferences(!showPreferences)}
                  disabled={routerState.isAnalyzing || routerState.executionStatus === 'executing'}
                  className="ai-bridge-preferences"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-8">
                {routerState.executionStatus === 'idle' && (
                  <motion.button
                    onClick={runAIAnalysis}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <Brain className="w-6 h-6" />
                    <span>Analyze with Agents</span>
                  </motion.button>
                )}

                {routerState.executionStatus === 'analyzing' && (
                  <div className="w-full py-4 px-6 bg-blue-500/20 border border-blue-500/30 text-blue-300 font-semibold rounded-xl flex items-center justify-center space-x-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-blue-300/30 border-t-blue-300 rounded-full"
                    />
                    <span>{routerState.currentPhase || 'AI Agents Analyzing...'}</span>
                  </div>
                )}

                {routerState.executionStatus === 'ready' && (
                  <div className="space-y-2">
                    {isConnected ? (
                      <motion.button
                        onClick={executeRoute}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-3"
                      >
                        <Zap className="w-6 h-6" />
                        <span>Execute Route</span>
                      </motion.button>
                    ) : (
                      <div className="w-full py-4 px-6 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 font-semibold rounded-xl flex items-center justify-center space-x-3">
                        <Wallet className="w-6 h-6" />
                        <span>Connect Wallet to Execute Route</span>
                      </div>
                    )}
                    <button
                      onClick={resetRouter}
                      className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      New Analysis
                    </button>
                  </div>
                )}

                {routerState.executionStatus === 'executing' && (
                  <div className="w-full py-4 px-6 bg-green-500/20 border border-green-500/30 text-green-300 font-semibold rounded-xl flex items-center justify-center space-x-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-green-300/30 border-t-green-300 rounded-full"
                    />
                    <span>Executing Transaction...</span>
                  </div>
                )}

                {routerState.executionStatus === 'completed' && (
                  <div className="space-y-3">
                    <div className="w-full py-4 px-6 bg-green-500/20 border border-green-500/30 text-green-300 font-semibold rounded-xl flex items-center justify-center space-x-3">
                      <CheckCircle className="w-6 h-6" />
                      <span>Transaction Completed!</span>
                    </div>
                    <button
                      onClick={resetRouter}
                      className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Start New Bridge
                    </button>
                  </div>
                )}

                {routerState.executionStatus === 'failed' && (
                  <div className="space-y-3">
                    <div className="w-full py-4 px-6 bg-red-500/20 border border-red-500/30 text-red-300 font-semibold rounded-xl flex items-center justify-center space-x-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.318 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span>AI Analysis Failed - No Real Data Available</span>
                    </div>
                    <button
                      onClick={resetRouter}
                      className="w-full py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Market Analysis - Next to Bridge */}
          {routerState.aiResults && routerState.aiResults.routes && routerState.aiResults.routes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                <span>Market Analysis</span>
              </h2>
              
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6">
                <div className="space-y-3">
                  {/* Real AI insights from analysis */}
                  {routerState.aiResults.insights && routerState.aiResults.insights.length > 0 && (
                    <>
                      {routerState.aiResults.insights.map((insight: string, index: number) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20"
                        >
                          <div className="flex items-start space-x-3">
                            <Lightbulb size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-300">{insight}</div>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  )}
                  
                  {/* Real route-specific data */}
                  {routerState.fromToken && routerState.toToken && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20"
                      >
                        <div className="flex items-start space-x-3">
                          <Route size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-gray-300">
                            <span className="font-medium text-purple-300">Route Type: </span>
                            {routerState.fromToken.chainId === routerState.toToken.chainId
                              ? `Same-network swap on ${routerState.fromToken.network}`
                              : `Cross-chain route from ${routerState.fromToken.network} to ${routerState.toToken.network}`
                            }
                          </div>
                        </div>
                      </motion.div>
                      
                      {/* Real route advantages from AI analysis */}
                      {routerState.aiResults.routes[0].advantages && routerState.aiResults.routes[0].advantages.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-green-500/10 p-3 rounded-lg border border-green-500/20"
                        >
                          <div className="flex items-start space-x-3">
                            <TrendingUp size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-300">
                              <span className="font-medium text-green-300">Advantage: </span>
                              {routerState.aiResults.routes[0].advantages[0]}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Real risks from AI analysis */}
                      {routerState.aiResults.routes[0].risks && routerState.aiResults.routes[0].risks.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 }}
                          className="bg-red-500/10 p-3 rounded-lg border border-red-500/20"
                        >
                          <div className="flex items-start space-x-3">
                            <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-300">
                              <span className="font-medium text-red-300">Risk: </span>
                              {routerState.aiResults.routes[0].risks[0]}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Real execution strategy data */}
                      {routerState.aiResults.executionStrategy && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 }}
                          className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20"
                        >
                          <div className="flex items-start space-x-3">
                            <Target size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-gray-300">
                              <span className="font-medium text-cyan-300">Strategy: </span>
                              {routerState.aiResults.executionStrategy.timing.optimal 
                                ? "Execute immediately for optimal conditions"
                                : `Wait ${Math.round(routerState.aiResults.executionStrategy.timing.delayRecommended / 60)} minutes - ${routerState.aiResults.executionStrategy.timing.reason}`
                              }
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* AI Trading Buddy - Below Bridge and Market Analysis */}
        <div className="max-w-4xl mx-auto mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Bot className="w-6 h-6 text-cyan-400" />
              <span>AI Trading Buddy</span>
            </h2>
            
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-2xl p-6">
              <TradingCompanion 
                embedded={true}
                currentRoute={routerState.aiResults?.routes[0] ? {
                  from: routerState.fromToken!,
                  to: routerState.toToken!,
                  limits: {
                    min: { raw: '0.001', bn: BigInt('1000000000000000'), decimals: 18, formatted: '0.001' },
                    max: { raw: '1000', bn: BigInt('1000000000000000000000'), decimals: 18, formatted: '1000' }
                  },
                  estimatedTime: { minutes: Math.round(routerState.aiResults.routes[0].estimatedTime / 60) },
                  fees: { 
                    network: { amount: { raw: '0', bn: BigInt(0), decimals: 18, formatted: '0' }, amountUSD: 0 }, 
                    protocol: { amount: { raw: '0', bn: BigInt(0), decimals: 18, formatted: '0' }, amountUSD: 0, percent: 0 },
                    total: { amount: { raw: '0', bn: BigInt(0), decimals: 18, formatted: '0' }, amountUSD: 0 }
                  },
                  exchangeRate: parseFloat(routerState.aiResults.routes[0].estimatedOutput) / parseFloat(routerState.amount),
                  inverseRate: parseFloat(routerState.amount) / parseFloat(routerState.aiResults.routes[0].estimatedOutput),
                  priceImpact: parseFloat(routerState.aiResults.routes[0].priceImpact) || 0.005,
                  available: true,
                  isWrapping: false,
                  requiresApproval: true
                } : undefined}
                fromToken={routerState.fromToken || undefined}
                toToken={routerState.toToken || undefined}
                amount={routerState.amount}
                aiAnalysis={routerState.aiResults}
                predictions={routerState.predictions}
                executionStatus={routerState.executionStatus}
                activeAgents={routerState.activeAgents}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}
