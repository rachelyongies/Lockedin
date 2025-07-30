'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { multiWalletManager, PRODUCTION_WALLETS } from '@/lib/wallets/multi-wallet-manager';
import { NetworkManager } from '@/config/networks';
import { useToast } from '@/components/ui/Toast';

interface ConnectedWallet {
  name: string;
  address: string;
  chainId: number;
  status: 'loading' | 'ready' | 'error' | 'disconnected';
  type: string;
  balance?: string;
  lastUpdated: number;
}

export default function MultiWalletPage() {
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [networkFilter, setNetworkFilter] = useState<'all' | 'mainnet' | 'testnet'>('all');
  const { addToast } = useToast();

  // Refresh wallet states every 3 seconds
  useEffect(() => {
    const refreshWallets = () => {
      const states = multiWalletManager.getAllWalletStates();
      const walletList: ConnectedWallet[] = [];
      
      states.forEach((state, name) => {
        walletList.push({
          name,
          address: state.address,
          chainId: state.chainId,
          status: state.status,
          type: 'evm', // You can enhance this based on wallet type
          balance: state.balance,
          lastUpdated: state.lastUpdated
        });
      });
      
      setConnectedWallets(walletList);
    };

    refreshWallets();
    const interval = setInterval(refreshWallets, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (walletName: string, chainId: number) => {
    setIsConnecting(walletName);
    try {
      const result = await multiWalletManager.connectWallet(walletName, chainId);
      
      if (result.success) {
        addToast({ message: `✅ ${walletName} connected successfully!`, type: 'success' });
      } else {
        addToast({ message: `❌ Failed to connect ${walletName}: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      addToast({ message: `❌ Connection error: ${error}`, type: 'error' });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (walletName: string) => {
    try {
      const success = await multiWalletManager.disconnectWallet(walletName);
      if (success) {
        addToast({ message: `🔌 ${walletName} disconnected`, type: 'info' });
      }
    } catch (error) {
      addToast({ message: `❌ Disconnect error: ${error}`, type: 'error' });
    }
  };

  const getWalletStats = () => {
    return multiWalletManager.getWalletStats();
  };

  const stats = getWalletStats();

  return (
    <PageWrapper
      title="Multi-Wallet Manager"
      description="Connect multiple wallets simultaneously - MetaMask, Phantom, xDeFi, and more!"
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 py-16">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              className="text-4xl md:text-6xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              🚀 Multi-Wallet Manager
            </motion.h1>
            <motion.p 
              className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Connect multiple wallets simultaneously for true cross-chain DeFi experience
            </motion.p>
            
            {/* Live Stats */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-blue-100">Connected Wallets</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{Object.keys(stats.byType).length}</div>
                <div className="text-blue-100">Wallet Types</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{stats.byStatus.ready || 0}</div>
                <div className="text-blue-100">Ready Wallets</div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Available Wallets Section */}
          <motion.section
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Available Wallets</h2>
              
              {/* Network Filter */}
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => setNetworkFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    networkFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🌐 All Networks
                </button>
                <button
                  onClick={() => setNetworkFilter('mainnet')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    networkFilter === 'mainnet'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🟢 Mainnet Only
                </button>
                <button
                  onClick={() => setNetworkFilter('testnet')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    networkFilter === 'testnet'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🟡 Testnet Only
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRODUCTION_WALLETS.filter(wallet => {
                if (networkFilter === 'all') return true;
                return wallet.chainIds.some(chainId => {
                  const network = NetworkManager.getNetworkById(chainId);
                  return network?.type === networkFilter;
                });
              }).map((wallet) => {
                const isConnected = connectedWallets.some(cw => cw.name === wallet.name);
                const isLoading = isConnecting === wallet.name;
                
                return (
                  <motion.div
                    key={wallet.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="p-6 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center space-x-4 mb-4">
                        <img 
                          src={wallet.icon} 
                          alt={wallet.name} 
                          className="w-12 h-12 rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/wallets/default.svg';
                          }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{wallet.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">{wallet.type} wallet</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          isConnected ? 'bg-green-500' : 
                          wallet.isInstalled() ? 'bg-gray-300' : 'bg-red-500'
                        }`} />
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="text-xs">
                          <span className="text-gray-500 mb-1 block">Supported Networks:</span>
                          <div className="flex flex-wrap gap-1">
                            {wallet.chainIds.map((chainId) => {
                              const network = NetworkManager.getNetworkById(chainId);
                              const isMainnet = network?.type === 'mainnet';
                              const isTestnet = network?.type === 'testnet';
                              return (
                                <span
                                  key={chainId}
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isMainnet ? 'bg-green-100 text-green-800 border border-green-200' :
                                    isTestnet ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                    'bg-gray-100 text-gray-800 border border-gray-200'
                                  }`}
                                >
                                  {isMainnet ? '🟢' : isTestnet ? '🟡' : '⚪'} 
                                  {network?.name || `Chain ${chainId}`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Status: {wallet.isInstalled() ? '✅ Installed' : '❌ Not Installed'}
                        </div>
                      </div>
                      
                      {wallet.isInstalled() ? (
                        <div className="space-y-2">
                          {wallet.chainIds.map((chainId) => {
                            const network = NetworkManager.getNetworkById(chainId);
                            const isMainnet = network?.type === 'mainnet';
                            const isTestnet = network?.type === 'testnet';
                            const networkLabel = network?.name || `Chain ${chainId}`;
                            
                            return (
                              <Button
                                key={chainId}
                                variant={isConnected ? 'secondary' : 'primary'}
                                size="sm"
                                className={`w-full ${
                                  isMainnet ? 'border-green-300 hover:border-green-400' :
                                  isTestnet ? 'border-yellow-300 hover:border-yellow-400' :
                                  ''
                                }`}
                                onClick={() => isConnected ? 
                                  handleDisconnect(wallet.name) : 
                                  handleConnect(wallet.name, chainId)
                                }
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Connecting...</span>
                                  </div>
                                ) : isConnected ? (
                                  '🔌 Disconnect'
                                ) : (
                                  <span className="flex items-center space-x-2">
                                    <span>{isMainnet ? '🟢' : isTestnet ? '🟡' : '⚪'}</span>
                                    <span>Connect to {networkLabel}</span>
                                  </span>
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(wallet.downloadUrl, '_blank')}
                        >
                          Install Wallet
                        </Button>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* Connected Wallets Section */}
          <AnimatePresence>
            {connectedWallets.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Connected Wallets</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {connectedWallets.map((wallet, index) => (
                    <motion.div
                      key={`${wallet.name}-${wallet.address}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="p-6 border-l-4 border-l-green-500">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">{wallet.name}</h3>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                {(() => {
                                  const network = NetworkManager.getNetworkById(wallet.chainId);
                                  const isMainnet = network?.type === 'mainnet';
                                  const isTestnet = network?.type === 'testnet';
                                  return (
                                    <>
                                      <span>{isMainnet ? '🟢' : isTestnet ? '🟡' : '⚪'}</span>
                                      <span className={`text-sm font-medium ${
                                        isMainnet ? 'text-green-700' :
                                        isTestnet ? 'text-yellow-700' :
                                        'text-gray-700'
                                      }`}>
                                        {network?.name || `Chain ${wallet.chainId}`}
                                      </span>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        isMainnet ? 'bg-green-100 text-green-600' :
                                        isTestnet ? 'bg-yellow-100 text-yellow-600' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        {isMainnet ? 'MAINNET' : isTestnet ? 'TESTNET' : 'UNKNOWN'}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            wallet.status === 'ready' ? 'bg-green-100 text-green-800' :
                            wallet.status === 'loading' ? 'bg-yellow-100 text-yellow-800 animate-pulse' :
                            wallet.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {wallet.status === 'ready' ? '✅ Ready' :
                             wallet.status === 'loading' ? '⏳ Loading' :
                             wallet.status === 'error' ? '❌ Error' :
                             '⚪ Disconnected'}
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="text-sm">
                            <span className="font-medium">Address:</span>
                            <div className="font-mono text-xs text-gray-600 break-all">
                              {wallet.address}
                            </div>
                          </div>
                          {wallet.balance && (
                            <div className="text-sm">
                              <span className="font-medium">Balance:</span>
                              <span className="ml-2">{wallet.balance}</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Last updated: {new Date(wallet.lastUpdated).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => handleDisconnect(wallet.name)}
                        >
                          Disconnect
                        </Button>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Instructions */}
          <motion.section
            className="mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Card className="p-8 bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🎯 How to Use Multi-Wallet Manager</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">1. Install Wallets</h4>
                  <p className="text-gray-600 mb-4">Make sure you have the wallets installed in your browser (MetaMask, Phantom, xDeFi, etc.)</p>
                  
                  <h4 className="font-semibold text-gray-900 mb-2">2. Connect Multiple Wallets</h4>
                  <p className="text-gray-600">Click &quot;Connect&quot; for each wallet you want to use. You can connect multiple wallets simultaneously!</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">3. Cross-Chain Trading</h4>
                  <p className="text-gray-600 mb-4">Use different wallets for different chains - MetaMask for Ethereum, Phantom for Solana, etc.</p>
                  
                  <h4 className="font-semibold text-gray-900 mb-2">4. Real-Time Updates</h4>
                  <p className="text-gray-600">Watch as your wallet states update in real-time with account changes and network switches.</p>
                </div>
              </div>
            </Card>
          </motion.section>
        </div>
      </div>
    </PageWrapper>
  );
}