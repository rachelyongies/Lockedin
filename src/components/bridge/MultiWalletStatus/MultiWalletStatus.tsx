'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { multiWalletManager } from '@/lib/wallets/multi-wallet-manager';
import { NetworkManager } from '@/config/networks';
import Link from 'next/link';

interface WalletState {
  name: string;
  address: string;
  chainId: number;
  status: 'loading' | 'ready' | 'error' | 'disconnected';
  isConnected: boolean;
  lastUpdated: number;
}

export function MultiWalletStatus() {
  const [walletStates, setWalletStates] = useState<WalletState[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateWalletStates = () => {
      const states = multiWalletManager.getAllWalletStates();
      const stateList: WalletState[] = [];
      
      states.forEach((state, name) => {
        if (state.isConnected) {
          stateList.push({
            name,
            address: state.address,
            chainId: state.chainId,
            status: state.status,
            isConnected: state.isConnected,
            lastUpdated: state.lastUpdated
          });
        }
      });
      
      setWalletStates(stateList);
    };

    updateWalletStates();
    const interval = setInterval(updateWalletStates, 2000);
    return () => clearInterval(interval);
  }, []);

  const stats = multiWalletManager.getWalletStats();
  const connectedCount = stats.byStatus.ready || 0;

  if (connectedCount === 0) {
    return (
      <Card className="p-6 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border border-slate-600/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-800"></div>
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Multi-Wallet Manager</h3>
              <p className="text-sm text-gray-300">No wallets connected - Connect to start bridging</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-400 mr-2">
              <span className="block">Mainnet: 🔴 Offline</span>
              <span className="block">Testnet: 🔴 Offline</span>
            </div>
            <Link href="/multi-wallet">
              <Button 
                variant="primary" 
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                🔗 Connect Wallets
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Get network information for connected wallets
  const getNetworkInfo = (chainId: number) => {
    const network = NetworkManager.getNetworkById(chainId);
    return network ? {
      name: network.name,
      type: network.type,
      emoji: network.type === 'mainnet' ? '🜢' : '🧪',
      color: network.type === 'mainnet' ? 'text-green-400' : 'text-yellow-400'
    } : {
      name: `Chain ${chainId}`,
      type: 'unknown',
      emoji: '❓',
      color: 'text-gray-400'
    };
  };

  return (
    <Card className="p-6 bg-gradient-to-r from-emerald-900/80 to-blue-900/80 border border-emerald-500/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-40"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-emerald-900 flex items-center justify-center">
              <span className="text-xs text-white font-bold">{connectedCount}</span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">🔗 Multi-Wallet Active</h3>
            <div className="flex items-center space-x-4">
              <p className="text-sm text-emerald-200">
                {connectedCount} wallet{connectedCount > 1 ? 's' : ''} connected
              </p>
              {/* Network status indicators */}
              <div className="flex items-center space-x-2 text-xs">
                {walletStates.some(w => getNetworkInfo(w.chainId).type === 'mainnet') && (
                  <span className="flex items-center space-x-1 text-green-400">
                    <span>🜢</span>
                    <span>Mainnet</span>
                  </span>
                )}
                {walletStates.some(w => getNetworkInfo(w.chainId).type === 'testnet') && (
                  <span className="flex items-center space-x-1 text-yellow-400">
                    <span>🧪</span>
                    <span>Testnet</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:bg-white/10"
          >
            {isExpanded ? '↑ Hide' : '↓ Show'}
          </Button>
          <Link href="/multi-wallet">
            <Button 
              variant="secondary" 
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              ⚙️ Manage
            </Button>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-slate-600/50 space-y-3"
          >
            {walletStates.map((wallet) => {
              const networkInfo = getNetworkInfo(wallet.chainId);
              return (
                <div
                  key={`${wallet.name}-${wallet.address}`}
                  className="flex items-center justify-between p-4 bg-slate-800/60 rounded-lg border border-slate-600/30 hover:border-slate-500/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      wallet.status === 'ready' ? 'bg-green-500' :
                      wallet.status === 'loading' ? 'bg-yellow-500 animate-pulse' :
                      'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-semibold text-white text-sm flex items-center space-x-2">
                        <span>{wallet.name}</span>
                        <span className="text-xs px-2 py-1 rounded-full ${
                          wallet.status === 'ready' ? 'bg-green-600/20 text-green-300' :
                          wallet.status === 'loading' ? 'bg-yellow-600/20 text-yellow-300' :
                          'bg-red-600/20 text-red-300'
                        }">
                          {wallet.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium flex items-center space-x-1 ${networkInfo.color}`}>
                      <span>{networkInfo.emoji}</span>
                      <span>{networkInfo.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {networkInfo.type === 'mainnet' ? 'Production' : 
                       networkInfo.type === 'testnet' ? 'Testing' : 'Unknown'}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}