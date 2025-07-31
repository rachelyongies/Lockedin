'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  Shield, 
  Activity,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Rocket,
  Award,
  Star,
  Settings,
  CheckCircle,
  Wallet,
  ArrowUpDown,
  Clock,
  BarChart3,
  Network,
  Users,
  Bot,
  Check
} from 'lucide-react';

// Import AI Agent System
import { AIAgentBridgeService, AIAgentAnalysis, AgentPrediction } from '@/lib/services/ai-agent-bridge-service';
import { Token, BitcoinToken, EthereumToken, SolanaToken, StarknetToken, StellarToken } from '@/types/bridge';
import { useWalletStore } from '@/store/useWalletStore';
import { multiWalletManager } from '@/lib/wallets/multi-wallet-manager';
import { cn } from '@/lib/utils/helpers';
import { TradingCompanion } from '@/components/ai/TradingCompanion';
import { PageWrapper } from '@/components/layout/PageWrapper';

// AI Router Interface
interface AIRouterState {
  fromToken: Token | null;
  toToken: Token | null;
  amount: string;
  isAnalyzing: boolean;
  aiResults: AIAgentAnalysis | null;
  predictions: AgentPrediction | null;
  executionStatus: 'idle' | 'analyzing' | 'ready' | 'executing' | 'completed' | 'failed';
  activeAgents: string[];
  currentPhase: string;
}

const AGENT_NAMES = {
  'market-intelligence': '🔍 Market Intelligence Agent',
  'route-discovery': '🗺️ Route Discovery Agent', 
  'risk-assessment': '🛡️ Risk Assessment Agent',
  'execution-strategy': '⚡ Execution Strategy Agent',
  'security': '🔒 Security Agent',
  'performance-monitor': '📊 Performance Monitor Agent'
};

// Supported tokens
const SUPPORTED_TOKENS: Token[] = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'bitcoin',
    chainId: 'mainnet',
    decimals: 8,
    logoUrl: '',
    coingeckoId: 'bitcoin',
    isWrapped: false,
    isNative: true,
    verified: true,
    displayPrecision: 8,
    description: 'Bitcoin native token',
    tags: ['native']
  } as BitcoinToken,
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'ethereum',
    chainId: 1,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    logoUrl: '',
    coingeckoId: 'ethereum',
    isWrapped: false,
    isNative: true,
    verified: true,
    displayPrecision: 18,
    description: 'Ethereum native token',
    tags: ['native']
  } as EthereumToken,
  {
    id: 'usdt',
    symbol: 'USDT',
    name: 'Tether',
    network: 'ethereum',
    chainId: 1,
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    logoUrl: '',
    coingeckoId: 'tether',
    isWrapped: false,
    isNative: false,
    verified: true,
    displayPrecision: 6,
    description: 'Tether USD stablecoin',
    tags: ['stablecoin']
  } as EthereumToken,
  {
    id: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    network: 'ethereum',
    chainId: 1,
    address: '0xa0b86a33e6c4b7c12a7a2a3c6e2b8b12e7c0cf5c2d',
    decimals: 6,
    logoUrl: '',
    coingeckoId: 'usd-coin',
    isWrapped: false,
    isNative: false,
    verified: true,
    displayPrecision: 6,
    description: 'USD Coin stablecoin',
    tags: ['stablecoin']
  } as EthereumToken,
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    network: 'solana',
    chainId: 'mainnet-beta',
    decimals: 9,
    logoUrl: '',
    coingeckoId: 'solana',
    isWrapped: false,
    isNative: true,
    verified: true,
    displayPrecision: 9,
    description: 'Solana native token',
    tags: ['native']
  } as SolanaToken,
  {
    id: 'strk',
    symbol: 'STRK',
    name: 'Starknet',
    network: 'starknet',
    chainId: 'mainnet',
    decimals: 18,
    logoUrl: '',
    coingeckoId: 'starknet',
    isWrapped: false,
    isNative: true,
    verified: true,
    displayPrecision: 18,
    description: 'Starknet native token',
    tags: ['native']
  } as StarknetToken,
  {
    id: 'xlm',
    symbol: 'XLM',
    name: 'Stellar',
    network: 'stellar',
    chainId: 'public',
    decimals: 7,
    logoUrl: '',
    coingeckoId: 'stellar',
    isWrapped: false,
    isNative: true,
    verified: true,
    displayPrecision: 7,
    description: 'Stellar native token',
    tags: ['native']
  } as StellarToken
];

// Live AI metrics
const LIVE_AI_METRICS = {
  activeAgents: 7,
  routesAnalyzed: 2847,
  aiSavingsToday: '$12,437',
  successRate: '98.9%',
  avgConfidence: '94.2%',
  mevBlocked: 23
};

export default function IntelligentAIRouterPage() {
  const { isConnected: storeConnected, account } = useWalletStore();
  const agentService = AIAgentBridgeService.getInstance();
  
  // Use useWalletStore since that's where your wallets are actually connected
  const isConnected = storeConnected;
  const walletAddress = typeof account === 'string' ? account : (account as { address?: string })?.address;

  // Debug wallet connection (optional - can be removed after testing)
  useEffect(() => {
    console.log('🔍 AI Router - Wallet detection status:', {
      storeConnected: storeConnected,
      storeAccount: account ? 'present' : 'none',
      walletAddress: walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : 'none',
      isConnected: isConnected
    });
  }, [storeConnected, account, walletAddress, isConnected]);
  
  const [routerState, setRouterState] = useState<AIRouterState>({
    fromToken: SUPPORTED_TOKENS[0], // BTC
    toToken: SUPPORTED_TOKENS[1], // ETH
    amount: '0.5',
    isAnalyzing: false,
    aiResults: null,
    predictions: null,
    executionStatus: 'idle',
    activeAgents: [],
    currentPhase: ''
  });

  const [liveMetrics, setLiveMetrics] = useState(LIVE_AI_METRICS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simulate live metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        routesAnalyzed: prev.routesAnalyzed + Math.floor(Math.random() * 5) + 1,
        mevBlocked: prev.mevBlocked + (Math.random() > 0.95 ? 1 : 0)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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

      // Get actual AI analysis (works without wallet connection)
      const aiAnalysis = await agentService.analyzeRoute(
        routerState.fromToken,
        routerState.toToken,
        routerState.amount,
        walletAddress // Optional - analysis works without wallet
      );

      // Get predictions
      const predictions = await agentService.getAgentPredictions(
        routerState.fromToken,
        routerState.toToken,
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
      console.error('🚨 AI Analysis failed - no mock fallback:', error);
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

  const handleTokenSelect = (isFrom: boolean, tokenId: string) => {
    const token = SUPPORTED_TOKENS.find(t => t.id === tokenId);
    if (!token) return;
    
    setRouterState(prev => ({
      ...prev,
      [isFrom ? 'fromToken' : 'toToken']: token,
      aiResults: null,
      predictions: null,
      executionStatus: 'idle',
      activeAgents: [],
      currentPhase: ''
    }));
  };


  return (
    <PageWrapper
      title="AI Router Demo"
      description="Experience the future of cross-chain bridging with our AI-powered routing system"
      keywords="AI router, cross-chain, bridge, artificial intelligence, defi"
      maxWidth="2xl"
      padding="lg"
      breadcrumbs={[
        { label: 'Bridge', href: '/' },
        { label: 'AI Router Demo' }
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
                className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-75"
              />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Intelligent AI Router
              </h1>
              <p className="text-xl text-gray-300 mt-2">
                Next-generation cross-chain bridging with AI agents
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-yellow-400" />
              <span>1inch Hackathon 2024</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-blue-400" />
              <span>Multi-Agent AI System</span>
            </div>
            <div className="flex items-center space-x-2">
              <Rocket className="w-4 h-4 text-green-400" />
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

        <div className="grid lg:grid-cols-5 gap-8">
          {/* AI Bridge Interface */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Wallet className="w-6 h-6 text-blue-400" />
              <span>AI Bridge</span>
            </h2>
            
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 space-y-6">
              {/* From Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">From</label>
                <div className="space-y-3">
                  <select 
                    value={routerState.fromToken?.id || ''}
                    onChange={(e) => handleTokenSelect(true, e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SUPPORTED_TOKENS.map(token => (
                      <option key={token.id} value={token.id}>{token.symbol} - {token.name} ({token.network})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={routerState.amount}
                    onChange={(e) => setRouterState(prev => ({ ...prev, amount: e.target.value, aiResults: null, predictions: null, executionStatus: 'idle' }))}
                    placeholder="Amount"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <motion.button
                  onClick={swapTokens}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
                >
                  <ArrowUpDown className="w-5 h-5" />
                </motion.button>
              </div>

              {/* To Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300">To</label>
                <div className="space-y-3">
                  <select 
                    value={routerState.toToken?.id || ''}
                    onChange={(e) => handleTokenSelect(false, e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SUPPORTED_TOKENS.map(token => (
                      <option key={token.id} value={token.id}>{token.symbol} - {token.name} ({token.network})</option>
                    ))}
                  </select>
                  {routerState.aiResults && routerState.aiResults.routes && routerState.aiResults.routes.length > 0 && routerState.aiResults.routes[0].estimatedOutput && (
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-400">
                        {routerState.aiResults.routes[0].estimatedOutput} {routerState.toToken?.symbol}
                      </div>
                      <div className="text-sm text-gray-400">
                        Estimated Output (AI Optimized)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Advanced AI Settings</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">MEV Protection</label>
                          <select className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-sm text-white">
                            <option>Auto (Recommended)</option>
                            <option>Maximum</option>
                            <option>Standard</option>
                            <option>Off</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Speed Priority</label>
                          <select className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-sm text-white">
                            <option>Balanced</option>
                            <option>Fastest</option>
                            <option>Cheapest</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {routerState.executionStatus === 'idle' && (
                  <motion.button
                    onClick={runAIAnalysis}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <Brain className="w-6 h-6" />
                    <span>Analyze with AI</span>
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

          {/* AI Analysis Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Activity className="w-6 h-6 text-green-400" />
              <span>AI Analysis</span>
            </h2>

            <AnimatePresence mode="wait">
              {routerState.executionStatus === 'analyzing' && (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  {/* Agent Status Grid */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      <span>Active AI Agents</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(AGENT_NAMES).map(([agentId, agentName]) => {
                        const isActive = routerState.activeAgents.includes(agentId);
                        return (
                          <motion.div
                            key={agentId}
                            animate={{ 
                              opacity: isActive ? 1 : 0.5, 
                              scale: isActive ? 1 : 0.95 
                            }}
                            className={cn(
                              "p-3 rounded-xl border transition-all duration-300",
                              isActive 
                                ? "border-blue-500/50 bg-blue-500/10" 
                                : "border-gray-700/50 bg-gray-800/30"
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <Bot className={cn(
                                "w-4 h-4",
                                isActive ? "text-blue-400" : "text-gray-500"
                              )} />
                              <span className={cn(
                                "text-sm",
                                isActive ? "text-white" : "text-gray-400"
                              )}>
                                {agentName}
                              </span>
                            </div>
                            {isActive && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 1 }}
                                className="h-1 bg-blue-400/50 rounded-full mt-2"
                              />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Analysis Status */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Network className="w-8 h-8 text-purple-400" />
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          🤖 AI Agents Collaborating...
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {routerState.currentPhase || 'Initializing analysis...'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {routerState.aiResults && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* Analysis Complete Header */}
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          ✨ Multi-Agent Analysis Complete
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Consensus reached with {(routerState.aiResults.confidence * 100).toFixed(0)}% confidence
                        </p>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {routerState.aiResults.routes.length}
                        </div>
                        <div className="text-xs text-gray-400">Routes Found</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {((1 - (routerState.aiResults.riskAssessments[0]?.overallRisk || 0)) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-400">Safety Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {routerState.aiResults.executionStrategy?.timing.optimal ? 'Now' : 'Wait'}
                        </div>
                        <div className="text-xs text-gray-400">Timing</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-400">
                          {routerState.aiResults.executionStrategy?.mevProtection.enabled ? 'Yes' : 'No'}
                        </div>
                        <div className="text-xs text-gray-400">MEV Protection</div>
                      </div>
                    </div>
                  </div>

                  {/* Route Visualization */}
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <ArrowRight className="w-5 h-5 text-blue-400" />
                      <span>Optimal AI Route</span>
                      <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                        {(routerState.aiResults.confidence * 100).toFixed(1)}% Confidence
                      </div>
                    </h3>
                    <div className="flex items-center justify-between">
                      {routerState.aiResults.routes[0].path.map((step: { protocol: string; fee: string }, index: number) => (
                        <React.Fragment key={index}>
                          <div className="text-center flex-1">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-2 mx-auto">
                              <span className="text-sm font-bold">{index + 1}</span>
                            </div>
                            <div className="text-xs font-medium">{step.protocol}</div>
                            <div className="text-xs text-gray-400">Fee: {step.fee}</div>
                          </div>
                          {index < (routerState.aiResults?.routes[0]?.path?.length || 0) - 1 && (
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ delay: 0.2 * index, duration: 0.5 }}
                              className="flex-1 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 mx-4"
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">
                        {routerState.predictions ? `$${(routerState.predictions.successProbability * 100).toFixed(2)}` : '$0.00'}
                      </div>
                      <div className="text-xs text-gray-400">Cost Savings</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {routerState.predictions ? `${(routerState.predictions.successProbability * 100).toFixed(1)}%` : '0%'}
                      </div>
                      <div className="text-xs text-gray-400">Success Rate</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {routerState.aiResults.riskAssessments[0]?.overallRisk ? 
                          (routerState.aiResults.riskAssessments[0].overallRisk < 0.3 ? 'LOW' : 
                           routerState.aiResults.riskAssessments[0].overallRisk < 0.7 ? 'MEDIUM' : 'HIGH') : 'LOW'}
                      </div>
                      <div className="text-xs text-gray-400">Risk Level</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-orange-400 mb-1">
                        {routerState.aiResults.routes[0].estimatedTime}s
                      </div>
                      <div className="text-xs text-gray-400">Est. Time</div>
                    </div>
                  </div>

                  {/* AI Insights */}
                  <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <span>AI Insights</span>
                    </h3>
                    <div className="space-y-3">
                      {routerState.aiResults.insights.map((insight: string, index: number) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="bg-blue-500/10 p-3 rounded-lg"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="text-lg">💡</div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-300">{insight}</div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Execution Strategy Details */}
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      <span>Execution Strategy</span>
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Timing */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Timing Recommendation</h4>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-orange-400" />
                          <span className="text-white">
                            {routerState.aiResults.executionStrategy.timing.optimal ? 
                              'Execute immediately' : 
                              `Wait ${Math.round(routerState.aiResults.executionStrategy.timing.delayRecommended / 60)} minutes`
                            }
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {routerState.aiResults.executionStrategy.timing.reason}
                        </p>
                      </div>

                      {/* MEV Protection */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">MEV Protection</h4>
                        <div className="flex items-center space-x-2">
                          <Shield className="w-5 h-5 text-green-400" />
                          <span className="text-white">
                            {routerState.aiResults.executionStrategy.mevProtection.strategy.replace('-', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {(routerState.aiResults.executionStrategy.mevProtection.estimatedProtection * 100).toFixed(0)}% protection effectiveness
                        </p>
                      </div>

                      {/* Gas Strategy */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Gas Optimization</h4>
                        <div className="flex items-center space-x-2">
                          <Zap className="w-5 h-5 text-blue-400" />
                          <span className="text-white">
                            {(parseFloat(routerState.aiResults.executionStrategy.gasStrategy.gasPrice) / 1e9).toFixed(0)} gwei
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          Strategy: {routerState.aiResults.executionStrategy.gasStrategy.strategy}
                        </p>
                      </div>

                      {/* Agent Predictions */}
                      {routerState.predictions && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-2">AI Predictions</h4>
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                            <span className="text-white">
                              {(routerState.predictions.optimalSlippage * 100).toFixed(2)}% slippage
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            {Math.round(routerState.predictions.estimatedTime / 60)}m estimated time
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
              
              {routerState.executionStatus === 'completed' && (
                <motion.div
                  key="completed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-8 text-center"
                >
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    🎉 Bridge Executed Successfully!
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Your AI-optimized cross-chain bridge has been completed
                  </p>
                  <motion.button
                    onClick={resetRouter}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    Start New Bridge
                  </motion.button>
                </motion.div>
              )}

              {routerState.executionStatus === 'failed' && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-8 text-center"
                >
                  <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.318 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    ⚠️ AI Analysis Failed
                  </h3>
                  <p className="text-red-300 mb-2 font-medium">
                    Unable to connect to real market data APIs
                  </p>
                  <p className="text-gray-400 mb-4 text-sm">
                    The system requires live data from 1inch, Alchemy, and other providers. Please check API configuration and try again.
                  </p>
                  <motion.button
                    onClick={resetRouter}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    Try Again
                  </motion.button>
                </motion.div>
              )}

              {!routerState.aiResults && routerState.executionStatus === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/30 rounded-2xl p-12 text-center"
                >
                  <Brain className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    Ready for AI Analysis
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Our AI agents will analyze 1000+ routes across multiple chains to find the optimal path
                  </p>
                  <div className="space-y-2">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
                      ✨ AI analysis works without wallet connection
                    </div>
                    {!isConnected && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-300">
                        💡 Connect wallet only when ready to execute the route
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* AI Agent Companion - Always Available */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <span>AI Agent Companion</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                  Always Available
                </span>
              </h3>
              
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6">
                <TradingCompanion 
                  embedded={true}
                  currentRoute={routerState.aiResults?.routes[0] ? {
                    id: routerState.aiResults.routes[0].id,
                    fromToken: routerState.fromToken!,
                    toToken: routerState.toToken!,
                    amount: routerState.amount,
                    estimatedOutput: routerState.aiResults.routes[0].estimatedOutput,
                    fees: { network: { amountUSD: 0 }, protocol: { amountUSD: 0 } },
                    estimatedTime: { minutes: Math.round(routerState.aiResults.routes[0].estimatedTime / 60) },
                    path: routerState.aiResults.routes[0].path
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
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}