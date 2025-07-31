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
  Check,
  MessageCircle,
  Calendar
} from 'lucide-react';

// Import AI Agent System
import { AIAgentBridgeService, AIAgentAnalysis, AgentPrediction } from '@/lib/services/ai-agent-bridge-service';
import { Token, BitcoinToken, EthereumToken, SolanaToken, StarknetToken, StellarToken } from '@/types/bridge';
import { useWalletStore } from '@/store/useWalletStore';
import { cn } from '@/lib/utils/helpers';

// Import new components
import { IntelligentRouter } from '@/components/bridge/IntelligentRouter';
import { TradingCompanion } from '@/components/ai/TradingCompanion';
import { StrategyManager } from '@/components/strategy/StrategyManager';
import { WhaleTracker } from '@/components/social/WhaleTracker';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

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
  const { isConnected, account } = useWalletStore();
  const walletAddress = typeof account === 'string' ? account : (account as { address?: string })?.address;
  const agentService = AIAgentBridgeService.getInstance();
  
  const [activeTab, setActiveTab] = useState<'router' | 'strategies' | 'social' | 'analytics'>('router');
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

  const handleBridge = async () => {
    console.log('Executing bridge with AI optimization');
  };

  const tabs = [
    { 
      id: 'router' as const, 
      label: 'AI Router', 
      icon: Brain,
      description: 'ML-powered route optimization'
    },
    { 
      id: 'strategies' as const, 
      label: 'Strategies', 
      icon: Calendar,
      description: 'Automated trading strategies'
    },
    { 
      id: 'social' as const, 
      label: 'Social Intel', 
      icon: Users,
      description: 'Whale tracking & trends'
    },
    { 
      id: 'analytics' as const, 
      label: 'Analytics', 
      icon: BarChart3,
      description: 'Performance insights'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
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
                Next-generation cross-chain bridging with AI agents & 1inch Fusion+
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

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300",
                "border border-gray-700/50",
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'router' && (
            <motion.div
              key="router"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              {/* Direct AI Bridge Interface */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="relative">
                    <Brain className="w-8 h-8 text-blue-400" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full opacity-75"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">AI Smart Bridge</h2>
                    <p className="text-gray-400">Powered by Machine Learning & 1inch Fusion+</p>
                  </div>
                </div>
              </div>

              {/* Bridge Interface - Always Visible */}
              <div className="space-y-6">
                {/* Token Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">From Token</label>
                    <div className="relative">
                      <select
                        value={routerState.fromToken?.id || ''}
                        onChange={(e) => {
                          const token = SUPPORTED_TOKENS.find(t => t.id === e.target.value);
                          setRouterState(prev => ({ ...prev, fromToken: token || null }));
                        }}
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-xl p-4 text-white appearance-none cursor-pointer hover:bg-gray-700/50 transition-colors"
                      >
                        <option value="">Select token...</option>
                        {SUPPORTED_TOKENS.map((token) => (
                          <option key={token.id} value={token.id} className="bg-gray-800">
                            {token.symbol} - {token.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
                      </div>
                    </div>
                    {routerState.fromToken && (
                      <div className="bg-gray-800/30 border border-gray-600/50 rounded-lg p-3 flex items-center space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          routerState.fromToken.symbol === 'BTC' ? "bg-orange-500" :
                          routerState.fromToken.symbol === 'ETH' ? "bg-blue-500" :
                          routerState.fromToken.symbol === 'SOL' ? "bg-purple-500" :
                          routerState.fromToken.symbol === 'STRK' ? "bg-cyan-500" :
                          routerState.fromToken.symbol === 'XLM' ? "bg-blue-400" :
                          "bg-green-500"
                        )}>
                          <span className="text-white font-bold text-sm">
                            {routerState.fromToken.symbol === 'BTC' ? '₿' :
                             routerState.fromToken.symbol === 'ETH' ? 'Ξ' :
                             routerState.fromToken.symbol === 'SOL' ? '◎' :
                             routerState.fromToken.symbol === 'STRK' ? 'S' :
                             routerState.fromToken.symbol === 'XLM' ? '★' :
                             routerState.fromToken.symbol.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-semibold">{routerState.fromToken.symbol}</div>
                          <div className="text-gray-400 text-sm">{routerState.fromToken.name}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">To Token</label>
                    <div className="relative">
                      <select
                        value={routerState.toToken?.id || ''}
                        onChange={(e) => {
                          const token = SUPPORTED_TOKENS.find(t => t.id === e.target.value);
                          setRouterState(prev => ({ ...prev, toToken: token || null }));
                        }}
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-xl p-4 text-white appearance-none cursor-pointer hover:bg-gray-700/50 transition-colors"
                      >
                        <option value="">Select token...</option>
                        {SUPPORTED_TOKENS.filter(t => t.id !== routerState.fromToken?.id).map((token) => (
                          <option key={token.id} value={token.id} className="bg-gray-800">
                            {token.symbol} - {token.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
                      </div>
                    </div>
                    {routerState.toToken && (
                      <div className="bg-gray-800/30 border border-gray-600/50 rounded-lg p-3 flex items-center space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          routerState.toToken.symbol === 'BTC' ? "bg-orange-500" :
                          routerState.toToken.symbol === 'ETH' ? "bg-blue-500" :
                          routerState.toToken.symbol === 'SOL' ? "bg-purple-500" :
                          routerState.toToken.symbol === 'STRK' ? "bg-cyan-500" :
                          routerState.toToken.symbol === 'XLM' ? "bg-blue-400" :
                          "bg-green-500"
                        )}>
                          <span className="text-white font-bold text-sm">
                            {routerState.toToken.symbol === 'BTC' ? '₿' :
                             routerState.toToken.symbol === 'ETH' ? 'Ξ' :
                             routerState.toToken.symbol === 'SOL' ? '◎' :
                             routerState.toToken.symbol === 'STRK' ? 'S' :
                             routerState.toToken.symbol === 'XLM' ? '★' :
                             routerState.toToken.symbol.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-semibold">{routerState.toToken.symbol}</div>
                          <div className="text-gray-400 text-sm">{routerState.toToken.name}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Amount</label>
                  <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-4">
                    <input
                      type="number"
                      value={routerState.amount}
                      onChange={(e) => setRouterState(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-transparent text-white text-lg outline-none"
                      placeholder="0.0"
                    />
                  </div>
                </div>

                {/* Analyze Routes Button */}
                {routerState.fromToken && routerState.toToken && routerState.amount && (
                  <div className="flex justify-center">
                    <motion.button
                      onClick={() => setRouterState(prev => ({ 
                        ...prev, 
                        isAnalyzing: true,
                        executionStatus: 'analyzing',
                        currentPhase: 'Starting AI route analysis...'
                      }))}
                      disabled={routerState.isAnalyzing}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2",
                        routerState.isAnalyzing
                          ? "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      )}
                    >
                      {routerState.isAnalyzing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                          <span>Analyzing Routes...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5" />
                          <span>Analyze Routes with AI</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                )}

                {/* AI Analysis Section */}
                <AnimatePresence>
                  {(routerState.isAnalyzing || routerState.executionStatus === 'ready') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6"
                    >
                      {routerState.isAnalyzing ? (
                        <div className="text-center py-8">
                          <div className="relative mb-4">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full mx-auto"
                            />
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2">
                            🧠 AI is analyzing optimal routes...
                          </h3>
                          <p className="text-gray-400 text-sm mb-4">
                            Processing market conditions, fees, and execution time
                          </p>
                          <div className="space-y-2">
                            {[
                              "Analyzing network congestion...",
                              "Calculating optimal slippage...",
                              "Evaluating route security...",
                              "Predicting execution time..."
                            ].map((step, index) => (
                              <motion.div
                                key={step}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.5 }}
                                className="flex items-center justify-center space-x-2 text-sm text-gray-300"
                              >
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 0.5, delay: index * 0.5 }}
                                  className="w-2 h-2 bg-blue-400 rounded-full"
                                />
                                <span>{step}</span>
                              </motion.div>
                            ))}
                          </div>
                          <motion.button
                            onClick={() => setRouterState(prev => ({ 
                              ...prev, 
                              isAnalyzing: false,
                              executionStatus: 'ready'
                            }))}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2 }}
                            className="mt-6 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                          >
                            Complete Analysis (Demo)
                          </motion.button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">
                                ✨ AI Analysis Complete
                              </h3>
                              <p className="text-gray-400 text-sm">
                                Optimal route found with {liveMetrics.avgConfidence} confidence
                              </p>
                            </div>
                          </div>

                  {/* AI Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">95.8%</div>
                      <div className="text-xs text-gray-400">Confidence</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">$42</div>
                      <div className="text-xs text-gray-400">Est. Savings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">92%</div>
                      <div className="text-xs text-gray-400">Safety Score</div>
                    </div>
                  </div>

                  {/* AI Insights */}
                  <div className="space-y-3 mb-6">
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3">
                      <p className="text-yellow-100 text-sm font-medium">
                        💡 Optimal timing detected: Gas fees are 23% below average
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-3">
                      <p className="text-green-100 text-sm font-medium">
                        🚀 Route optimized for maximum efficiency with 1inch Fusion+
                      </p>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <div className="flex space-x-4">
                    <motion.button
                      onClick={() => setRouterState(prev => ({ 
                        ...prev, 
                        isAnalyzing: true,
                        executionStatus: 'analyzing'
                      }))}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Brain className="w-5 h-5" />
                      <span>Re-analyze Routes</span>
                    </motion.button>
                    
                    <motion.button
                      onClick={handleBridge}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Zap className="w-5 h-5" />
                      <span>Execute Bridge</span>
                      <ChevronRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Route Performance Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-300">Gas Optimization</span>
                    </div>
                    <p className="text-2xl font-bold text-white">Up to 40%</p>
                    <p className="text-xs text-gray-400 mt-1">Lower gas fees with smart routing</p>
                  </div>

                  <div className="bg-gray-700/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="w-5 h-5 text-blue-400" />
                      <span className="text-sm font-medium text-gray-300">ML Confidence</span>
                    </div>
                    <p className="text-2xl font-bold text-white">95.8%</p>
                    <p className="text-xs text-gray-400 mt-1">Success rate prediction</p>
                  </div>

                  <div className="bg-gray-700/30 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-medium text-gray-300">Routes Analyzed</span>
                    </div>
                    <p className="text-2xl font-bold text-white">1,000+</p>
                    <p className="text-xs text-gray-400 mt-1">Per second with 1inch Fusion+</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'strategies' && (
            <motion.div
              key="strategies"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <StrategyManager />
            </motion.div>
          )}

          {activeTab === 'social' && (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <WhaleTracker />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6"
            >
              <AnalyticsDashboard />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trading Companion (always rendered for floating button) */}
        <TradingCompanion
          currentRoute={undefined}
          fromToken={routerState.fromToken!}
          toToken={routerState.toToken!}
          amount={routerState.amount}
        />
      </div>
    </div>
  );
}