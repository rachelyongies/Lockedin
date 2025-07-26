'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { WalletConnector } from '@/components/ui/WalletConnector/WalletConnector';
import { useWalletStore } from '@/store/useWalletStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AnimatePresence } from 'framer-motion';

export default function WalletDemoPage() {
  const {
    isConnected,
    account,
    walletType,
    network,
    status,
    isConnecting
  } = useWalletStore();

  const [activeTab, setActiveTab] = useState('variants');

  const tabs = [
    { id: 'variants', label: 'Variants', icon: '🎨' },
    { id: 'animations', label: 'Animations', icon: '✨' },
    { id: 'status', label: 'Status', icon: '📊' },
    { id: 'features', label: 'Features', icon: '🚀' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <PageWrapper
      title="Wallet Connector Demo"
      description="Beautiful wallet connector with animations and multiple variants"
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-20">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              className="text-5xl md:text-7xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Wallet Connector
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Beautiful, animated wallet connection component supporting MetaMask, Phantom, and more
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <WalletConnector 
                variant="gradient"
                size="lg"
                className="mx-auto"
              />
            </motion.div>
          </div>
          
          {/* Animated background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -100, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <AnimatePresence mode="wait">
            {activeTab === 'variants' && (
              <motion.div
                key="variants"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <motion.div variants={itemVariants} className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Wallet Connector Variants</h2>
                  <p className="text-lg text-gray-600">Choose from multiple beautiful variants</p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { variant: 'gradient', name: 'Gradient', description: 'Animated gradient background' },
                    { variant: 'primary', name: 'Primary', description: 'Solid primary color' },
                    { variant: 'outline', name: 'Outline', description: 'Clean outline style' },
                  ].map((item, index) => (
                    <motion.div
                      key={item.variant}
                      variants={itemVariants}
                      className="group"
                    >
                      <Card className="p-6 hover:shadow-lg transition-all duration-300">
                        <div className="text-center space-y-4">
                          <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
                          <p className="text-gray-600">{item.description}</p>
                          <div className="pt-4">
                            <WalletConnector 
                              variant={item.variant as any}
                              size="md"
                              className="mx-auto"
                            />
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'animations' && (
              <motion.div
                key="animations"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <motion.div variants={itemVariants} className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Beautiful Animations</h2>
                  <p className="text-lg text-gray-600">Smooth, responsive animations that enhance user experience</p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                  <motion.div variants={itemVariants}>
                    <Card className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Hover Effects</h3>
                      <div className="space-y-4">
                        <div className="wallet-hover-lift">
                          <WalletConnector variant="primary" size="md" />
                        </div>
                        <p className="text-sm text-gray-600">Lift effect on hover</p>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Loading States</h3>
                      <div className="space-y-4">
                        <div className="wallet-loading">
                          <WalletConnector variant="outline" size="md" />
                        </div>
                        <p className="text-sm text-gray-600">Shimmer loading effect</p>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Success States</h3>
                      <div className="space-y-4">
                        <div className="wallet-success relative">
                          <WalletConnector variant="primary" size="md" />
                        </div>
                        <p className="text-sm text-gray-600">Success indicator animation</p>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Card className="p-6">
                      <h3 className="text-xl font-semibold mb-4">Pulse Effect</h3>
                      <div className="space-y-4">
                        <div className="wallet-pulse">
                          <WalletConnector variant="gradient" size="md" />
                        </div>
                        <p className="text-sm text-gray-600">Gentle pulse animation</p>
                      </div>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {activeTab === 'status' && (
              <motion.div
                key="status"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <motion.div variants={itemVariants} className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Connection Status</h2>
                  <p className="text-lg text-gray-600">Real-time wallet connection information</p>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="p-6">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Current Status</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Connection:</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isConnected 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Wallet Type:</span>
                            <span className="text-sm text-gray-600">
                              {walletType || 'Not connected'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Network:</span>
                            <span className="text-sm text-gray-600">
                              {network?.name || 'Not connected'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Address:</span>
                            <span className="text-sm text-gray-600 font-mono">
                              {account?.address ? 
                                `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : 
                                'Not connected'
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold">Live Demo</h3>
                        <div className="space-y-4">
                          <WalletConnector variant="primary" size="md" />
                          <p className="text-sm text-gray-600">
                            Click to test the wallet connection flow
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'features' && (
              <motion.div
                key="features"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <motion.div variants={itemVariants} className="text-center">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Features</h2>
                  <p className="text-lg text-gray-600">Everything you need for modern wallet connections</p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    {
                      icon: '🔗',
                      title: 'Multi-Chain Support',
                      description: 'Connect to Ethereum and Solana networks seamlessly'
                    },
                    {
                      icon: '🎯',
                      title: 'Auto-Detection',
                      description: 'Automatically detects installed wallets in the browser'
                    },
                    {
                      icon: '🎨',
                      title: 'Beautiful UI',
                      description: 'Modern, responsive design with smooth animations'
                    },
                    {
                      icon: '🛡️',
                      title: 'Secure',
                      description: 'Uses standard wallet connection protocols'
                    },
                    {
                      icon: '⚡',
                      title: 'Fast',
                      description: 'Optimized for performance and quick connections'
                    },
                    {
                      icon: '📱',
                      title: 'Responsive',
                      description: 'Works perfectly on desktop and mobile devices'
                    }
                  ].map((feature, index) => (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      className="group"
                    >
                      <Card className="p-6 hover:shadow-lg transition-all duration-300 h-full">
                        <div className="text-center space-y-4">
                          <div className="text-4xl">{feature.icon}</div>
                          <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                          <p className="text-gray-600">{feature.description}</p>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
} 