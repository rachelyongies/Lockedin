'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Token } from '@/types/bridge';
import { aiSmartRouting, RouteAnalysis, MLPrediction } from '@/lib/services/ai-smart-routing';
import { BridgeService } from '@/lib/services/bridge-service';
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
  Check
} from 'lucide-react';

interface AISmartBridgeProps {
  fromToken: Token;
  toToken: Token;
  amount: string;
  walletAddress?: string;
  onExecute: (routeAnalysis?: RouteAnalysis) => Promise<void>;
  onClose: () => void;
  isVisible: boolean;
}

export function AISmartBridge({
  fromToken,
  toToken,
  amount,
  walletAddress,
  onExecute,
  onClose,
  isVisible
}: AISmartBridgeProps) {
  const [routeAnalyses, setRouteAnalyses] = useState<RouteAnalysis[]>([]);
  const [mlPredictions, setMLPredictions] = useState<MLPrediction | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteAnalysis | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const bridgeService = BridgeService.getInstance();

  useEffect(() => {
    if (isVisible && fromToken && toToken && amount) {
      analyzeRoutes();
    }
  }, [isVisible, fromToken, toToken, amount]);

  const analyzeRoutes = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsAnalyzing(true);
    setAnalysisComplete(false);

    try {
      // Simulate AI analysis with delays for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Get AI-optimized routes
      const routes = await bridgeService.getAIOptimizedRoutes(
        fromToken,
        toToken,
        amount,
        walletAddress || '0x0000000000000000000000000000000000000000'
      );

      setRouteAnalyses(routes);
      setSelectedRoute(routes[0]); // Auto-select best route

      // Get ML predictions
      const predictions = await bridgeService.getMLPredictions(
        fromToken,
        toToken,
        amount
      );
      setMLPredictions(predictions);

      // Get AI insights
      const aiInsights = bridgeService.getSmartInsights(routes);
      setInsights(aiInsights);

      setAnalysisComplete(true);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    await onExecute(selectedRoute || undefined);
  };

  const bestRoute = routeAnalyses[0];
  const confidence = bestRoute?.confidenceScore || 0;
  const savings = bestRoute?.savingsEstimate || 0;
  const risk = bestRoute?.riskScore || 0;

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
            className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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
                  <h2 className="text-2xl font-bold text-white">AI Smart Bridge</h2>
                  <p className="text-gray-400">Powered by Machine Learning</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
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
                    className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          🧠 AI is analyzing optimal routes...
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Processing market conditions, fees, and execution time
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
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
                          transition={{ delay: index * 0.3 }}
                          className="flex items-center space-x-2 text-sm text-gray-300"
                        >
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5, delay: index * 0.3 }}
                            className="w-2 h-2 bg-blue-400 rounded-full"
                          />
                          <span>{step}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : analysisComplete ? (
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
                          ✨ AI Analysis Complete
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Found {routeAnalyses.length} optimized routes
                        </p>
                      </div>
                    </div>

                    {/* AI Confidence Metrics */}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {(confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-400">Confidence</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          ${savings.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-400">Est. Savings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-400">
                          {((1 - risk) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-400">Safety Score</div>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* AI Insights */}
            {insights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <span>AI Insights</span>
                </h3>
                <div className="space-y-3">
                  {insights.map((insight, index) => (
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

            {/* Route Options */}
            {routeAnalyses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span>Optimized Routes</span>
                </h3>
                <div className="space-y-3">
                  {routeAnalyses.map((analysis, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={cn(
                        "border rounded-xl p-4 cursor-pointer transition-all duration-200",
                        selectedRoute === analysis
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-600/50 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50"
                      )}
                      onClick={() => setSelectedRoute(analysis)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                            selectedRoute === analysis
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-500"
                          )}>
                            {selectedRoute === analysis && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">
                                {index === 0 ? "🏆 Best Route" : 
                                 index === 1 ? "⚡ Fast Route" : 
                                 "💰 Economic Route"}
                              </span>
                              {index === 0 && (
                                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                                  AI Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm">
                              Confidence: {(analysis.confidenceScore * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            ~{Math.round(analysis.executionTime / 60)} min
                          </div>
                          <div className="text-gray-400 text-sm">
                            ${analysis.savingsEstimate.toFixed(2)} saved
                          </div>
                        </div>
                      </div>

                      {/* Route Metrics */}
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-gray-400">Gas Opt.</span>
                          </div>
                          <div className="text-sm font-medium text-blue-400">
                            {(analysis.gasOptimization * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Shield className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-gray-400">Safety</span>
                          </div>
                          <div className="text-sm font-medium text-green-400">
                            {((1 - analysis.riskScore) * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Clock className="w-4 h-4 text-orange-400" />
                            <span className="text-xs text-gray-400">Speed</span>
                          </div>
                          <div className="text-sm font-medium text-orange-400">
                            {analysis.route.estimatedTime.minutes}m
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <DollarSign className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-gray-400">Cost</span>
                          </div>
                          <div className="text-sm font-medium text-purple-400">
                            ${(analysis.route.fees.network.amountUSD + analysis.route.fees.protocol.amountUSD).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ML Predictions */}
            {mlPredictions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span>ML Predictions</span>
                </h3>
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {(mlPredictions.optimalSlippage * 100).toFixed(2)}%
                      </div>
                      <div className="text-sm text-gray-400">Optimal Slippage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">
                        {mlPredictions.predictedGasCost.toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-400">Gas Price (gwei)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">
                        {(mlPredictions.successProbability * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400 mb-1">
                        {Math.round(mlPredictions.estimatedTime / 60)}m
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
                disabled={!selectedRoute}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2",
                  selectedRoute
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    : "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                )}
              >
                <Zap className="w-5 h-5" />
                <span>Execute AI-Optimized Bridge</span>
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}