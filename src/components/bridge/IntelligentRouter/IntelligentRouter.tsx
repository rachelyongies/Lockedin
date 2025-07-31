'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  BarChart3, 
  Users,
  MessageCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import { AISmartBridge } from '@/components/bridge/AISmartBridge';
import { TradingCompanion } from '@/components/ai/TradingCompanion';
import { StrategyManager } from '@/components/strategy/StrategyManager';
import { WhaleTracker } from '@/components/social/WhaleTracker';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Token, BridgeRoute } from '@/types/bridge';
import { cn } from '@/lib/utils/helpers';

interface IntelligentRouterProps {
  fromToken: Token;
  toToken: Token;
  amount: string;
  walletAddress?: string;
  onExecute: (route?: unknown) => Promise<void>;
}

export function IntelligentRouter({
  fromToken,
  toToken,
  amount,
  walletAddress,
  onExecute
}: IntelligentRouterProps) {
  const [activeTab, setActiveTab] = useState<'smart-router' | 'companion' | 'strategies' | 'social' | 'analytics'>('smart-router');
  const [showAIBridge, setShowAIBridge] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<BridgeRoute | undefined>();

  const tabs = [
    { 
      id: 'smart-router' as const, 
      label: 'AI Router', 
      icon: Brain,
      description: 'ML-powered route optimization'
    },
    { 
      id: 'companion' as const, 
      label: 'Trading Buddy', 
      icon: MessageCircle,
      description: 'AI assistant for trading'
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
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="relative">
            <Brain className="w-8 h-8 text-blue-400" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20 blur"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Intelligent Router</h2>
            <p className="text-gray-400">Powered by 1inch Fusion+ and AI</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all",
              "border border-gray-700/50",
              activeTab === tab.id
                ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-white"
                : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'smart-router' && (
          <motion.div
            key="smart-router"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">AI-Optimized Routing</h3>
                  <p className="text-sm text-gray-400">
                    Machine learning finds the best routes with lowest fees and slippage
                  </p>
                </div>
                <button
                  onClick={() => setShowAIBridge(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Routes</span>
                </button>
              </div>

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

        {activeTab === 'companion' && (
          <motion.div
            key="companion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">AI Trading Companion</h3>
              <p className="text-gray-400 mb-6">
                Get real-time explanations about routes, gas optimization tips, and answers to your 1inch Fusion+ questions.
              </p>
              <div className="text-center py-8">
                <MessageCircle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <p className="text-gray-300 mb-4">Click the chat bubble in the bottom right to start a conversation</p>
                <p className="text-sm text-gray-500">Powered by GPT-4 and real-time market data</p>
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
          >
            <AnalyticsDashboard />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Smart Bridge Modal */}
      <AISmartBridge
        fromToken={fromToken}
        toToken={toToken}
        amount={amount}
        walletAddress={walletAddress}
        onExecute={async (route) => {
          setCurrentRoute(route?.route);
          await onExecute(route);
          setShowAIBridge(false);
        }}
        onClose={() => setShowAIBridge(false)}
        isVisible={showAIBridge}
      />

      {/* Trading Companion (always rendered for floating button) */}
      <TradingCompanion
        currentRoute={currentRoute}
        fromToken={fromToken}
        toToken={toToken}
        amount={amount}
      />
    </div>
  );
}