'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fish, 
  TrendingUp, 
  TrendingDown,
  Copy,
  Eye,
  Bell,
  DollarSign,
  Activity,
  Clock,
  ChevronRight,
  ExternalLink,
  Zap,
  BarChart3,
  Users
} from 'lucide-react';
import { WhaleMonitorService, WhaleTransaction, TrendingToken } from '@/lib/services/whale-monitor';
import { StorageManager } from '@/lib/storage/storage-manager';
import { cn } from '@/lib/utils/helpers';
import { formatEther } from 'ethers';

export function WhaleTracker() {
  const [whales, setWhales] = useState<WhaleTransaction[]>([]);
  const [trending, setTrending] = useState<TrendingToken[]>([]);
  const [stats, setStats] = useState<{
    totalWhales24h: number;
    totalVolumeUSD: number;
    topToken: string;
    averageTradeSize: number;
  } | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedWhale, setSelectedWhale] = useState<WhaleTransaction | null>(null);
  const [copyAmount, setCopyAmount] = useState('100');
  const [activeTab, setActiveTab] = useState<'whales' | 'trending'>('whales');

  const whaleService = WhaleMonitorService.getInstance();
  const storage = StorageManager.getInstance();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      const unsubscribe = whaleService.onWhaleActivity((whale) => {
        setWhales(prev => [whale, ...prev].slice(0, 50));
        showWhaleNotification(whale);
      });
      
      whaleService.startMonitoring();
      
      return () => {
        unsubscribe();
        whaleService.stopMonitoring();
      };
    }
  }, [isMonitoring]);

  const loadData = async () => {
    try {
      const [recentWhales, trendingTokens, whaleStats] = await Promise.all([
        whaleService.getRecentWhales(20),
        whaleService.getTrendingTokens(),
        whaleService.getWhaleStats()
      ]);

      setWhales(recentWhales);
      setTrending(trendingTokens);
      setStats(whaleStats);
    } catch (error) {
      console.error('Failed to load whale data:', error);
    }
  };

  const showWhaleNotification = (whale: WhaleTransaction) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🐋 Whale Alert!', {
        body: `${formatAddress(whale.from)} swapped $${whale.valueUSD.toLocaleString()} worth of ${whale.token}`,
        icon: '/images/tokens/eth.svg'
      });
    }
  };

  const handleCopyTrade = async (whale: WhaleTransaction) => {
    try {
      const result = await whaleService.copyTrade(whale, copyAmount);
      if (result.success) {
        console.log('Copy trade successful:', result);
        // Show success notification
      }
    } catch (error) {
      console.error('Copy trade failed:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Fish className="w-8 h-8 text-blue-400" />
              {isMonitoring && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Social Trading Intelligence</h2>
              <p className="text-gray-400">Track whales and trending tokens on 1inch</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={cn(
              "px-4 py-2 rounded-lg transition-all flex items-center space-x-2",
              isMonitoring
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "bg-gray-800 text-white hover:bg-gray-700"
            )}
          >
            <Activity className="w-4 h-4" />
            <span>{isMonitoring ? 'Monitoring Active' : 'Start Monitoring'}</span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">24h Whales</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalWhales24h}</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">24h Volume</span>
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                ${(stats.totalVolumeUSD / 1000000).toFixed(1)}M
              </p>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Top Token</span>
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.topToken}</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Avg Trade</span>
                <BarChart3 className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                ${(stats.averageTradeSize / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('whales')}
            className={cn(
              "flex-1 py-2 px-4 rounded-md transition-all",
              activeTab === 'whales'
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            Whale Activity
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={cn(
              "flex-1 py-2 px-4 rounded-md transition-all",
              activeTab === 'trending'
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            Trending Tokens
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'whales' ? (
          <motion.div
            key="whales"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {whales.length === 0 ? (
              <div className="bg-gray-800/30 rounded-2xl p-12 text-center border border-gray-700/50">
                <Fish className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Whale Activity Yet</h3>
                <p className="text-gray-400 mb-6">Start monitoring to track large transactions</p>
                <button
                  onClick={() => setIsMonitoring(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl transition-all"
                >
                  Start Monitoring
                </button>
              </div>
            ) : (
              whales.map((whale) => (
                <WhaleCard
                  key={whale.hash}
                  whale={whale}
                  onCopy={() => {
                    setSelectedWhale(whale);
                  }}
                  onView={() => {
                    window.open(`https://etherscan.io/tx/${whale.hash}`, '_blank');
                  }}
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="trending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {trending.map((token, index) => (
              <TrendingTokenCard key={token.address} token={token} rank={index + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Trade Modal */}
      <AnimatePresence>
        {selectedWhale && (
          <CopyTradeModal
            whale={selectedWhale}
            amount={copyAmount}
            onAmountChange={setCopyAmount}
            onConfirm={() => {
              handleCopyTrade(selectedWhale);
              setSelectedWhale(null);
            }}
            onClose={() => setSelectedWhale(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Whale Card Component
function WhaleCard({
  whale,
  onCopy,
  onView
}: {
  whale: WhaleTransaction;
  onCopy: () => void;
  onView: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Fish className="w-6 h-6 text-white" />
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium">
                {formatAddress(whale.from)}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">
                {whale.token}
              </span>
            </div>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-2xl font-bold text-white">
                ${whale.valueUSD.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">
                {formatTime(whale.timestamp)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onCopy}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
            title="Copy Trade"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onView}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
            title="View on Etherscan"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Trending Token Card Component
function TrendingTokenCard({
  token,
  rank
}: {
  token: TrendingToken;
  rank: number;
}) {
  const isPositive = token.priceChangePercent > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
            {rank}
          </div>
          <div>
            <h4 className="text-white font-semibold">{token.symbol}</h4>
            <p className="text-xs text-gray-400">{token.name}</p>
          </div>
        </div>
        
        <div className={cn(
          "flex items-center space-x-1",
          isPositive ? "text-green-400" : "text-red-400"
        )}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="font-medium">{Math.abs(token.priceChangePercent).toFixed(1)}%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400">24h Volume</p>
          <p className="text-sm font-medium text-white">
            ${(token.volume24h / 1000000).toFixed(1)}M
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Whale Score</p>
          <div className="flex items-center space-x-1">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${token.whaleActivity}%` }}
                transition={{ duration: 1, delay: rank * 0.1 }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              />
            </div>
            <span className="text-xs text-white font-medium">{token.whaleActivity}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Copy Trade Modal Component
function CopyTradeModal({
  whale,
  amount,
  onAmountChange,
  onConfirm,
  onClose
}: {
  whale: WhaleTransaction;
  amount: string;
  onAmountChange: (amount: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-white mb-4">Copy Whale Trade</h3>
        
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Whale Address</span>
            <span className="text-white font-mono text-sm">{formatAddress(whale.from)}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Original Amount</span>
            <span className="text-white font-medium">${whale.valueUSD.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Token</span>
            <span className="text-white font-medium">{whale.token}</span>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Your Trade Amount (USD)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="100"
            min="1"
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all flex items-center justify-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Trade</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}