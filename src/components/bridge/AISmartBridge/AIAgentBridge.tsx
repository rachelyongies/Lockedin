'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Token } from '@/types/bridge';
import { AIAgentBridgeService, AIAgentAnalysis, AgentPrediction } from '@/lib/services/ai-agent-bridge-service';
import { cn } from '@/lib/utils/helpers';
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
  AlertTriangle,
  Check,
  Users,
  Bot,
  Network,
  BarChart3
} from 'lucide-react';

interface AIAgentBridgeProps {
  fromToken: Token;
  toToken: Token;
  amount: string;
  walletAddress?: string;
  onExecute: (analysis?: AIAgentAnalysis) => Promise<void>;
  onClose: () => void;
  isVisible: boolean;
}

const AGENT_NAMES = {
  'market-intelligence': '🔍 Market Intelligence Agent',
  'route-discovery': '🗺️ Route Discovery Agent',
  'risk-assessment': '🛡️ Risk Assessment Agent',
  'execution-strategy': '⚡ Execution Strategy Agent',
  'security': '🔒 Security Agent',
  'performance-monitor': '📊 Performance Monitor Agent'
};

export function AIAgentBridge({
  fromToken,
  toToken,
  amount,
  walletAddress,
  onExecute,
  onClose,
  isVisible
}: AIAgentBridgeProps) {
  const [analysis, setAnalysis] = useState<AIAgentAnalysis | null>(null);
  const [predictions, setPredictions] = useState<AgentPrediction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>('');

  const agentService = AIAgentBridgeService.getInstance();

  useEffect(() => {
    if (isVisible && fromToken && toToken && amount && !isAnalyzing && !analysisComplete) {
      analyzeWithAgents();
    }
    
    // Reset state when modal closes
    if (!isVisible) {
      setAnalysisComplete(false);
      setIsAnalyzing(false);
      setAnalysis(null);
      setPredictions(null);
      setActiveAgents([]);
      setCurrentPhase('');
    }
  }, [isVisible, fromToken, toToken, amount, isAnalyzing, analysisComplete]);

  const analyzeWithAgents = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    // Prevent re-running if already analyzing
    if (isAnalyzing || analysisComplete) return;
    
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setActiveAgents([]);

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
        setCurrentPhase(phase);
        setActiveAgents(prev => [...prev, ...agents]);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Get analysis from AI agents
      const agentAnalysis = await agentService.analyzeRoute(
        fromToken,
        toToken,
        amount,
        walletAddress || '0x0000000000000000000000000000000000000000'
      );

      setAnalysis(agentAnalysis);

      // Get predictions
      const agentPredictions = await agentService.getAgentPredictions(
        fromToken,
        toToken,
        amount
      );
      setPredictions(agentPredictions);

      setAnalysisComplete(true);
    } catch (error) {
      console.error('AI Agent analysis failed:', error);
      setAnalysisComplete(true); // Mark as complete to prevent re-runs
      
      // If it's a wallet error, don't show it repeatedly
      if (error instanceof Error && error.message.toLowerCase().includes('wallet')) {
        // Just log it once
        console.log('Wallet not connected - using demo mode');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    if (analysis) {
      await onExecute(analysis);
    }
  };

  const formatGasPrice = (gasPrice: string): string => {
    const gwei = parseFloat(gasPrice) / 1e9;
    return gwei.toFixed(0);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Brain className="w-8 h-8 text-blue-400" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full opacity-75"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">AI Multi-Agent System</h2>
                  <p className="text-gray-400">Powered by 6 Specialized AI Agents</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Agent Status Grid */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Active AI Agents</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(AGENT_NAMES).map(([agentId, agentName]) => {
                  const isActive = activeAgents.includes(agentId);
                  return (
                    <motion.div
                      key={agentId}
                      initial={{ opacity: 0, scale: 0.9 }}
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
            <div className="mb-8">
              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6"
                  >
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
                          {currentPhase}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : analysisComplete && analysis ? (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          ✨ Multi-Agent Analysis Complete
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Consensus reached with {(analysis.confidence * 100).toFixed(0)}% confidence
                        </p>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {analysis.routes.length}
                        </div>
                        <div className="text-xs text-gray-400">Routes Found</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {((1 - (analysis.riskAssessments[0]?.overallRisk || 0)) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-400">Safety Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {analysis.executionStrategy?.timing.optimal ? 'Now' : 'Wait'}
                        </div>
                        <div className="text-xs text-gray-400">Timing</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-400">
                          {analysis.executionStrategy?.mevProtection.enabled ? 'Yes' : 'No'}
                        </div>
                        <div className="text-xs text-gray-400">MEV Protection</div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* AI Insights */}
            {analysis?.insights && analysis.insights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <span>Agent Insights</span>
                </h3>
                <div className="space-y-3">
                  {analysis.insights.map((insight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3"
                    >
                      <p className="text-yellow-100 text-sm font-medium">{insight}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Execution Strategy Details */}
            {analysis?.executionStrategy && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span>Execution Strategy</span>
                </h3>
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Timing */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Timing Recommendation</h4>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-orange-400" />
                        <span className="text-white">
                          {analysis.executionStrategy.timing.optimal ? 
                            'Execute immediately' : 
                            `Wait ${Math.round(analysis.executionStrategy.timing.delayRecommended / 60)} minutes`
                          }
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {analysis.executionStrategy.timing.reason}
                      </p>
                    </div>

                    {/* MEV Protection */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">MEV Protection</h4>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-green-400" />
                        <span className="text-white">
                          {analysis.executionStrategy.mevProtection.strategy.replace('-', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {(analysis.executionStrategy.mevProtection.estimatedProtection * 100).toFixed(0)}% protection effectiveness
                      </p>
                    </div>

                    {/* Gas Strategy */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Gas Optimization</h4>
                      <div className="flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-blue-400" />
                        <span className="text-white">
                          {formatGasPrice(analysis.executionStrategy.gasStrategy.gasPrice)} gwei
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Strategy: {analysis.executionStrategy.gasStrategy.strategy}
                      </p>
                    </div>

                    {/* Order Splitting */}
                    {analysis.executionStrategy.orderSplitting?.enabled && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Order Splitting</h4>
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="w-5 h-5 text-purple-400" />
                          <span className="text-white">
                            {analysis.executionStrategy.orderSplitting.numberOfParts} parts
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {analysis.executionStrategy.orderSplitting.timeBetweenParts}s between executions
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Agent Predictions */}
            {predictions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span>Agent Predictions</span>
                </h3>
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {(predictions.optimalSlippage * 100).toFixed(2)}%
                      </div>
                      <div className="text-sm text-gray-400">Optimal Slippage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {formatGasPrice(predictions.predictedGasCost)}
                      </div>
                      <div className="text-sm text-gray-400">Gas Price (gwei)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">
                        {(predictions.successProbability * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400 mb-1">
                        {Math.round(predictions.estimatedTime / 60)}m
                      </div>
                      <div className="text-sm text-gray-400">Est. Time</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-6 bg-gray-700/50 hover:bg-gray-700 text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleExecute}
                disabled={!analysis}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2",
                  analysis
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    : "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                )}
              >
                <Brain className="w-5 h-5" />
                <span>Execute Agent Strategy</span>
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}