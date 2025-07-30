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
  ArrowUpDown
} from 'lucide-react';

// Import the AI Agent System
import type { RouteProposal, MarketConditions, ExecutionStrategy } from '../../lib/agents/types';

// AI Router Interface
interface AIRouterState {
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  amount: string;
  isAnalyzing: boolean;
  aiResults: AIAnalysisResults | null;
  executionStatus: 'idle' | 'analyzing' | 'ready' | 'executing' | 'completed' | 'failed';
}

interface AIAnalysisResults {
  bestRoute: RouteProposal;
  alternatives: RouteProposal[];
  aiInsights: AIInsight[];
  riskAssessment: {
    overall: 'low' | 'medium' | 'high';
    factors: string[];
    score: number;
  };
  savings: {
    gas: number;
    time: number;
    slippage: number;
    total: number;
  };
  confidence: number;
  executionStrategy: ExecutionStrategy;
  marketConditions: MarketConditions;
}

interface AIInsight {
  type: 'optimization' | 'warning' | 'info' | 'success';
  icon: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
}

// Supported tokens and chains
const SUPPORTED_TOKENS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' }
];

const SUPPORTED_CHAINS = [
  { id: 'bitcoin', name: 'Bitcoin', color: 'from-orange-500 to-yellow-500' },
  { id: 'ethereum', name: 'Ethereum', color: 'from-blue-500 to-purple-500' },
  { id: 'dogecoin', name: 'Dogecoin', color: 'from-yellow-500 to-orange-500' },
  { id: 'litecoin', name: 'Litecoin', color: 'from-gray-400 to-gray-600' }
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
  const [routerState, setRouterState] = useState<AIRouterState>({
    fromToken: 'BTC',
    toToken: 'ETH',
    fromChain: 'bitcoin',
    toChain: 'ethereum',
    amount: '0.5',
    isAnalyzing: false,
    aiResults: null,
    executionStatus: 'idle'
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
    setRouterState(prev => ({ ...prev, isAnalyzing: true, executionStatus: 'analyzing' }));
    
    // Simulate AI agent coordination
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Mock AI analysis results
    const mockResults: AIAnalysisResults = {
      bestRoute: {
        id: 'route-1',
        fromToken: routerState.fromToken,
        toToken: routerState.toToken,
        amount: routerState.amount,
        estimatedOutput: (parseFloat(routerState.amount) * 1.8).toString(),
        priceImpact: '0.12',
        estimatedGas: '180000',
        estimatedTime: 180,
        confidence: 0.942,
        risks: ['Low network congestion', 'Medium slippage risk'],
        advantages: ['Best route available', 'High liquidity', 'Proven protocols'],
        proposedBy: 'RouteDiscoveryAgent',
        path: [
          { 
            protocol: 'Bitcoin Network', 
            fromToken: routerState.fromToken, 
            toToken: 'BTC-WRAPPED', 
            amount: routerState.amount, 
            estimatedOutput: (parseFloat(routerState.amount) * 0.9995).toString(), 
            fee: '0.001' 
          },
          { 
            protocol: '1inch Fusion', 
            fromToken: 'BTC-WRAPPED', 
            toToken: 'ETH-BRIDGE', 
            amount: (parseFloat(routerState.amount) * 0.9995).toString(), 
            estimatedOutput: (parseFloat(routerState.amount) * 1.795).toString(), 
            fee: '0.003' 
          },
          { 
            protocol: 'Ethereum', 
            fromToken: 'ETH-BRIDGE', 
            toToken: routerState.toToken, 
            amount: (parseFloat(routerState.amount) * 1.795).toString(), 
            estimatedOutput: (parseFloat(routerState.amount) * 1.8).toString(), 
            fee: '0.002' 
          }
        ]
      },
      alternatives: [],
      aiInsights: [
        {
          type: 'optimization',
          icon: '🧠',
          title: 'Optimal Route Detected',
          description: 'AI found the most efficient path with 94.2% confidence',
          impact: 'high',
          confidence: 0.942
        },
        {
          type: 'success',
          icon: '💰',
          title: 'Significant Gas Savings',
          description: 'AI optimized gas usage to save $12.50 compared to standard routing',
          impact: 'medium',
          confidence: 0.87
        },
        {
          type: 'info',
          icon: '⚡',
          title: 'Fast Execution Window',
          description: 'Current network conditions optimal for quick execution',
          impact: 'medium',
          confidence: 0.91
        },
        {
          type: 'warning',
          icon: '🛡️',
          title: 'MEV Protection Active',
          description: 'Private mempool execution recommended for this trade size',
          impact: 'high',
          confidence: 0.96
        }
      ],
      riskAssessment: {
        overall: 'low',
        factors: ['Low network congestion', 'High liquidity', 'Proven protocols'],
        score: 0.15
      },
      savings: {
        gas: 12.50,
        time: 35,
        slippage: 0.08,
        total: 18.75
      },
      confidence: 0.942,
      executionStrategy: {
        routeId: 'route-1',
        mevProtection: {
          enabled: true,
          strategy: 'private-mempool',
          estimatedProtection: 0.96
        },
        gasStrategy: {
          gasPrice: '25000000000',
          gasLimit: '180000',
          priorityFee: '2000000000',
          strategy: 'standard'
        },
        timing: {
          optimal: false,
          delayRecommended: 45,
          reason: 'Network congestion decreasing, gas prices dropping'
        },
        orderSplitting: {
          enabled: false,
          numberOfParts: 1,
          timeBetweenParts: 0,
          randomization: false,
          sizeDistribution: [1.0],
          estimatedImprovements: {
            costSavings: 0,
            riskReduction: 0,
            mevReduction: 0
          }
        },
        contingencyPlans: ['Fallback to standard routing', 'Increase gas price if needed'],
        strategyBy: 'execution-strategy-agent',
        confidence: 0.942,
        reasoning: ['High confidence AI analysis', 'Optimal market conditions'],
        estimatedImprovements: {
          costSavings: 18.75,
          timeReduction: 12.50,
          riskReduction: 0.96
        }
      },
      marketConditions: {
        timestamp: Date.now(),
        volatility: { 
          overall: 0.12, 
          tokenSpecific: { [routerState.fromToken]: 0.15, [routerState.toToken]: 0.09 }
        },
        liquidity: { 
          overall: 850000, 
          perDEX: { uniswap: 400000, curve: 300000, balancer: 150000 }
        },
        networkCongestion: {
          ethereum: 0.25,
          polygon: 0.15,
          bsc: 0.20,
          arbitrum: 0.10,
          bitcoin: 0.30,
          stellar: 0.05,
          solana: 0.18,
          starknet: 0.12
        },
        gasPrices: {
          ethereum: { fast: 35, standard: 25, safe: 20 },
          polygon: { fast: 45, standard: 35, safe: 25 }
        },
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      }
    };
    
    setRouterState(prev => ({ 
      ...prev, 
      isAnalyzing: false, 
      aiResults: mockResults,
      executionStatus: 'ready'
    }));
  };

  const executeRoute = async () => {
    setRouterState(prev => ({ ...prev, executionStatus: 'executing' }));
    
    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    setRouterState(prev => ({ ...prev, executionStatus: 'completed' }));
  };

  const resetRouter = () => {
    setRouterState(prev => ({ 
      ...prev, 
      aiResults: null, 
      executionStatus: 'idle' 
    }));
  };

  const swapTokens = () => {
    setRouterState(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      fromChain: prev.toChain,
      toChain: prev.fromChain,
      aiResults: null,
      executionStatus: 'idle'
    }));
  };

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
                <div className="grid grid-cols-2 gap-3">
                  <select 
                    value={routerState.fromToken}
                    onChange={(e) => setRouterState(prev => ({ ...prev, fromToken: e.target.value, aiResults: null, executionStatus: 'idle' }))}
                    className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SUPPORTED_TOKENS.map(token => (
                      <option key={token.symbol} value={token.symbol}>{token.symbol} - {token.name}</option>
                    ))}
                  </select>
                  <select 
                    value={routerState.fromChain}
                    onChange={(e) => setRouterState(prev => ({ ...prev, fromChain: e.target.value, aiResults: null, executionStatus: 'idle' }))}
                    className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SUPPORTED_CHAINS.map(chain => (
                      <option key={chain.id} value={chain.id}>{chain.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  value={routerState.amount}
                  onChange={(e) => setRouterState(prev => ({ ...prev, amount: e.target.value, aiResults: null, executionStatus: 'idle' }))}
                  placeholder="Amount"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                <div className="grid grid-cols-2 gap-3">
                  <select 
                    value={routerState.toToken}
                    onChange={(e) => setRouterState(prev => ({ ...prev, toToken: e.target.value, aiResults: null, executionStatus: 'idle' }))}
                    className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SUPPORTED_TOKENS.map(token => (
                      <option key={token.symbol} value={token.symbol}>{token.symbol} - {token.name}</option>
                    ))}
                  </select>
                  <select 
                    value={routerState.toChain}
                    onChange={(e) => setRouterState(prev => ({ ...prev, toChain: e.target.value, aiResults: null, executionStatus: 'idle' }))}
                    className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SUPPORTED_CHAINS.map(chain => (
                      <option key={chain.id} value={chain.id}>{chain.name}</option>
                    ))}
                  </select>
                </div>
                {routerState.aiResults && (
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-400">
                      {routerState.aiResults.bestRoute.estimatedOutput} {routerState.toToken}
                    </div>
                    <div className="text-sm text-gray-400">
                      ${((parseFloat(routerState.aiResults.bestRoute.estimatedOutput) * (routerState.toToken === 'ETH' ? 2500 : routerState.toToken === 'BTC' ? 45000 : 1))).toLocaleString()}
                    </div>
                  </div>
                )}
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
                    <span>AI Agents Analyzing...</span>
                  </div>
                )}

                {routerState.executionStatus === 'ready' && (
                  <div className="space-y-2">
                    <motion.button
                      onClick={executeRoute}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-3"
                    >
                      <Zap className="w-6 h-6" />
                      <span>Execute Route</span>
                    </motion.button>
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
                  className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full mx-auto mb-6"
                    />
                    <h3 className="text-xl font-semibold mb-6">🧠 AI Agents Coordinating</h3>
                    <div className="space-y-3 text-sm text-gray-300">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                        <span>RouteDiscoveryAgent analyzing 1000+ paths...</span>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.0 }}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-2 h-2 bg-purple-400 rounded-full" />
                        <span>MarketIntelligenceAgent monitoring conditions...</span>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span>RiskAssessmentAgent evaluating security...</span>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.0 }}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-2 h-2 bg-orange-400 rounded-full" />
                        <span>ExecutionStrategyAgent optimizing MEV protection...</span>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.5 }}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                        <span>DecisionEngine weighing 47 factors...</span>
                      </motion.div>
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
                      {routerState.aiResults?.bestRoute.path.map((step, index) => (
                        <React.Fragment key={index}>
                          <div className="text-center flex-1">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-2 mx-auto">
                              <span className="text-sm font-bold">{index + 1}</span>
                            </div>
                            <div className="text-xs font-medium">{step.protocol}</div>
                            <div className="text-xs text-gray-400">Fee: {step.fee}</div>
                          </div>
                          {index < (routerState.aiResults?.bestRoute.path.length || 0) - 1 && (
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
                        ${routerState.aiResults.savings.total.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">Total Savings</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {routerState.aiResults.savings.time}%
                      </div>
                      <div className="text-xs text-gray-400">Faster</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {routerState.aiResults.riskAssessment.overall.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-400">Risk Level</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-orange-400 mb-1">
                        {routerState.aiResults.bestRoute.estimatedTime}s
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
                      {routerState.aiResults.aiInsights.map((insight, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className={`flex items-start space-x-3 p-3 rounded-lg ${
                            insight.type === 'success' ? 'bg-green-500/10' :
                            insight.type === 'warning' ? 'bg-yellow-500/10' :
                            insight.type === 'optimization' ? 'bg-blue-500/10' : 'bg-gray-500/10'
                          }`}
                        >
                          <div className="text-lg">{insight.icon}</div>
                          <div className="flex-1">
                            <div className="font-medium text-white">{insight.title}</div>
                            <div className="text-sm text-gray-300">{insight.description}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              Confidence: {(insight.confidence * 100).toFixed(1)}%
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
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-blue-400 mb-2">MEV Protection</h4>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div>Strategy: {routerState.aiResults.executionStrategy.mevProtection.strategy}</div>
                          <div>Protection: {(routerState.aiResults.executionStrategy.mevProtection.estimatedProtection * 100).toFixed(1)}%</div>
                          <div>Status: Enabled</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-green-400 mb-2">Gas Strategy</h4>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div>Gas Price: {(parseFloat(routerState.aiResults.executionStrategy.gasStrategy.gasPrice) / 1e9).toFixed(1)} gwei</div>
                          <div>Gas Limit: {routerState.aiResults.executionStrategy.gasStrategy.gasLimit}</div>
                          <div>Priority Fee: {routerState.aiResults.executionStrategy.gasStrategy.priorityFee ? (parseFloat(routerState.aiResults.executionStrategy.gasStrategy.priorityFee) / 1e9).toFixed(1) + ' gwei' : 'None'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  <p className="text-gray-500">
                    Configure your bridge parameters and let our AI agents find the optimal route
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}