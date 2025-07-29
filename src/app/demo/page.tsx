'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  Target, 
  TrendingUp, 
  Shield, 
  Clock, 
  DollarSign,
  Activity,
  ChevronRight,
  Sparkles,
  ArrowRight,
  BarChart3,
  Cpu,
  Eye,
  Lightbulb,
  Rocket,
  Award,
  Star
} from 'lucide-react';

// Mock data for impressive demos
const DEMO_SCENARIOS = [
  {
    id: 'btc-eth',
    title: 'Bitcoin → Ethereum',
    description: 'Cross-chain BTC to ETH with AI optimization',
    from: 'BTC',
    to: 'ETH',
    amount: '0.5',
    aiSavings: 42.50,
    gasOptimization: 23.4,
    confidence: 96.8,
    timeReduction: 35,
    route: ['Bitcoin', 'Lightning', 'Ethereum'],
    insights: [
      '💡 AI detected 23% gas savings opportunity',
      '🎯 High confidence route with 96.8% success probability',
      '💰 $42.50 savings compared to standard routing',
      '⚡ 35% faster execution via optimized path'
    ]
  },
  {
    id: 'doge-eth',
    title: 'Dogecoin → Ethereum',
    description: 'DOGE to ETH with predictive fee estimation',
    from: 'DOGE',
    to: 'ETH',
    amount: '10000',
    aiSavings: 18.75,
    gasOptimization: 31.2,
    confidence: 94.2,
    timeReduction: 28,
    route: ['Dogecoin', 'Bridge', 'Ethereum'],
    insights: [
      '🚀 Optimal timing detected - network congestion low',
      '🧠 ML predicts 28% faster completion',
      '🔥 Peak efficiency window for next 15 minutes',
      '📊 Historical data shows 94% success rate'
    ]
  },
  {
    id: 'ltc-eth',
    title: 'Litecoin → Ethereum',
    description: 'LTC to ETH with dynamic slippage optimization',
    from: 'LTC',
    to: 'ETH',
    amount: '25',
    aiSavings: 67.25,
    gasOptimization: 19.8,
    confidence: 98.1,
    timeReduction: 42,
    route: ['Litecoin', 'Atomic Swap', 'Ethereum'],
    insights: [
      '🎊 Best route available - AI confidence 98.1%',
      '💎 Premium liquidity detected',
      '⚡ Lightning-fast atomic swap route',
      '🏆 Optimal execution parameters calculated'
    ]
  }
];

const AI_FEATURES = [
  {
    icon: Brain,
    title: 'Neural Route Optimization',
    description: 'Advanced ML algorithms analyze thousands of routing possibilities in real-time',
    color: 'from-blue-500 to-cyan-500',
    metrics: { improvement: '45%', accuracy: '96.8%' }
  },
  {
    icon: Target,
    title: 'Predictive Fee Estimation',
    description: 'AI predicts optimal gas prices and execution timing for maximum savings',
    color: 'from-purple-500 to-pink-500',
    metrics: { savings: '$127K', prediction: '94.2%' }
  },
  {
    icon: Shield,
    title: 'Risk Assessment Engine',
    description: 'Real-time security analysis with fraud detection and safety scoring',
    color: 'from-green-500 to-emerald-500',
    metrics: { security: '99.1%', threats: '0' }
  },
  {
    icon: Zap,
    title: 'Dynamic Slippage Control',
    description: 'Machine learning optimizes slippage tolerance based on market conditions',
    color: 'from-orange-500 to-red-500',
    metrics: { optimization: '31%', precision: '0.02%' }
  }
];

const LIVE_METRICS = {
  totalVolume: '$2.4M',
  aiSavings: '$47,832',
  successRate: '98.7%',
  avgGasOptimization: '24.3%',
  activeRoutes: 1247,
  mlPredictions: 15834
};

export default function DemoPage() {
  const [selectedScenario, setSelectedScenario] = useState(DEMO_SCENARIOS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState(LIVE_METRICS);

  // Simulate live metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        mlPredictions: prev.mlPredictions + Math.floor(Math.random() * 5) + 1,
        activeRoutes: prev.activeRoutes + Math.floor(Math.random() * 3) - 1
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const runDemo = async () => {
    setIsAnalyzing(true);
    setShowResults(false);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsAnalyzing(false);
    setShowResults(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
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
                AI-Powered Fusion+ Bridge
              </h1>
              <p className="text-xl text-gray-300 mt-2">
                Experience the future of cross-chain bridging
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
              <span>AI-Enhanced Cross-Chain</span>
            </div>
            <div className="flex items-center space-x-2">
              <Rocket className="w-4 h-4 text-green-400" />
              <span>Bitcoin • Dogecoin • Litecoin</span>
            </div>
          </div>
        </motion.div>

        {/* Live Metrics Dashboard */}
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

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Demo Scenarios */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Target className="w-6 h-6 text-purple-400" />
              <span>Demo Scenarios</span>
            </h2>
            
            <div className="space-y-4 mb-8">
              {DEMO_SCENARIOS.map((scenario, index) => (
                <motion.div
                  key={scenario.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                    selectedScenario.id === scenario.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600/50 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
                  }`}
                  onClick={() => setSelectedScenario(scenario)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{scenario.title}</h3>
                      <p className="text-sm text-gray-400">{scenario.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-medium">${scenario.aiSavings}</div>
                      <div className="text-xs text-gray-400">AI Savings</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <div className="text-blue-400 font-medium">{scenario.gasOptimization}%</div>
                      <div className="text-xs text-gray-500">Gas Opt.</div>
                    </div>
                    <div>
                      <div className="text-green-400 font-medium">{scenario.confidence}%</div>
                      <div className="text-xs text-gray-500">Confidence</div>
                    </div>
                    <div>
                      <div className="text-orange-400 font-medium">{scenario.timeReduction}%</div>
                      <div className="text-xs text-gray-500">Faster</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              onClick={runDemo}
              disabled={isAnalyzing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>AI Analyzing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  <span>Run AI Demo</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </motion.div>

          {/* AI Analysis Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Activity className="w-6 h-6 text-green-400" />
              <span>AI Analysis</span>
            </h2>

            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8 text-center"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full mx-auto mb-6"
                  />
                  <h3 className="text-xl font-semibold mb-4">🧠 AI Processing Route</h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      Analyzing network congestion...
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.0 }}
                    >
                      Calculating optimal gas prices...
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.5 }}
                    >
                      Evaluating route security...
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.0 }}
                    >
                      Optimizing execution parameters...
                    </motion.div>
                  </div>
                </motion.div>
              ) : showResults ? (
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
                      <span>Optimal Route</span>
                    </h3>
                    <div className="flex items-center justify-between">
                      {selectedScenario.route.map((step, index) => (
                        <React.Fragment key={step}>
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-2">
                              <span className="text-sm font-bold">{index + 1}</span>
                            </div>
                            <div className="text-xs font-medium">{step}</div>
                          </div>
                          {index < selectedScenario.route.length - 1 && (
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

                  {/* AI Insights */}
                  <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <span>AI Insights</span>
                    </h3>
                    <div className="space-y-3">
                      {selectedScenario.insights.map((insight, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-start space-x-3 p-3 bg-yellow-500/5 rounded-lg"
                        >
                          <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                          <p className="text-yellow-100 text-sm font-medium">{insight}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-green-400 mb-1">
                        ${selectedScenario.aiSavings}
                      </div>
                      <div className="text-sm text-gray-400">Total Savings</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-blue-400 mb-1">
                        {selectedScenario.confidence}%
                      </div>
                      <div className="text-sm text-gray-400">AI Confidence</div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/30 rounded-2xl p-12 text-center"
                >
                  <Eye className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    Ready for AI Analysis
                  </h3>
                  <p className="text-gray-500">
                    Select a scenario and click &quot;Run AI Demo&quot; to see the magic
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* AI Features Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16"
        >
          <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Revolutionary AI Features
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {AI_FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 text-center hover:border-gray-600/50 transition-all duration-300"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{feature.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(feature.metrics).map(([key, value]) => (
                    <div key={key} className={`bg-gradient-to-r ${feature.color} bg-opacity-10 rounded-lg p-2`}>
                      <div className="font-bold text-white">{value}</div>
                      <div className="text-gray-400 capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-8">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Experience the Future of Cross-Chain Bridging
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Our AI-powered bridge represents the next evolution in DeFi infrastructure, 
              delivering unprecedented efficiency, security, and user experience.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="py-4 px-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 mx-auto"
              onClick={() => window.location.href = '/'}
            >
              <Rocket className="w-6 h-6" />
              <span>Try Live Bridge</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}