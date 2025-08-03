'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { BridgeForm } from '@/components/bridge/BridgeForm';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { useWalletStore } from '@/store/useWalletStore';
import { useBridgeStore } from '@/store/useBridgeStore';
import { useNetworkStore } from '@/store/useNetworkStore';
import { Token } from '@/types/bridge';
import { useEffect } from 'react';
import { bridgeService } from '@/lib/services/bridge-service';
import { solanaBridgeService } from '@/lib/services/solana-bridge-service';
import { starknetBridgeService } from '@/lib/services/starknet-bridge-service';
import { stellarBridgeService } from '@/lib/services/stellar-bridge-service';
import { WalletConnector } from '@/components/ui/WalletConnector/WalletConnector';
import { MultiWalletStatus } from '@/components/bridge/MultiWalletStatus';
import { BridgeDebug } from '@/components/bridge/BridgeDebug/BridgeDebug';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  // Global state
  const {
    isConnected: isWalletConnected,
    isConnecting,
    address: walletAddress,
    isCorrectNetwork,
    isSwitchingNetwork,
    setNetwork,
    setSwitchingNetwork,
    setConnected,
    connect,
    updateBalances,
  } = useWalletStore();

  const {
    approvalNeeded,
    approvalLoading,
    approvalSuccess,
    setApprovalLoading,
    setApprovalSuccess,
    setApprovalError,
  } = useBridgeStore();

  const {
    ethereum,
    bitcoin,
    areNetworksReady,
    isNetworkReady,
  } = useNetworkStore();

  // Toast notifications
  const toast = useToast();

  // Refresh balances when wallet connects
  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      console.log('🔄 Refreshing balances for connected wallet:', walletAddress);
      // Update balances when wallet connects
      updateBalances();
    }
  }, [isWalletConnected, walletAddress, updateBalances]);

  // Enhanced handlers with loading states
  const handleConnectWallet = async () => {
    try {
      console.log('🔗 Starting wallet connection...');
      
      // Check if MetaMask is available
      if (typeof window === 'undefined') {
        toast.error('Error', 'Window not available');
        return;
      }
      
      if (!window.ethereum) {
        toast.error('Error', 'MetaMask not installed');
        return;
      }

      // Check for multiple providers to avoid conflicts
      const providers = (window.ethereum as any).providers || [];
      if (providers.length > 1) {
        console.log('⚠️ Multiple wallet providers detected:', providers.length);
        toast.warning('Warning', 'Multiple wallet extensions detected. Please disable other wallets temporarily.');
      }
      
      console.log('🔍 MetaMask detected:', {
        isMetaMask: (window.ethereum as any).isMetaMask,
        isConnected: (window.ethereum as any).isConnected?.() || false,
        selectedAddress: (window.ethereum as any).selectedAddress,
        providers: (window.ethereum as any).providers?.length || 0
      });
      
      // Use the wallet store's connect function
      await connect('metamask');
      
      // Get the updated state
      const currentAddress = useWalletStore.getState().address;
      if (currentAddress) {
        toast.success('Success', `Connected: ${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}`);
      }
      
    } catch (error) {
      console.error('Wallet connection failed:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Error', 'Connection rejected by user');
        } else if (error.message.includes('Could not establish connection')) {
          toast.error('Error', 'MetaMask extension error. Try refreshing the page.');
        } else {
          toast.error('Error', `Connection failed: ${error.message}`);
        }
      } else {
        toast.error('Error', 'Failed to connect wallet');
      }
    }
  };

  const handleSwitchNetwork = async () => {
    setSwitchingNetwork(true);
    try {
      // Simulate network switch
      await new Promise(resolve => setTimeout(resolve, 800));
      setNetwork(1, true); // Mainnet
      toast.success('Success', 'Network switched successfully!');
    } catch {
      toast.error('Error', 'Failed to switch network');
      setSwitchingNetwork(false);
    }
  };

  const handleApprove = async () => {
    setApprovalLoading(true);
    setApprovalError(undefined);
    try {
      // Simulate token approval
      await new Promise(resolve => setTimeout(resolve, 2000));
      setApprovalSuccess(true);
      toast.success('Success', 'Token approval successful!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Approval failed';
      setApprovalError(errorMessage);
      toast.error('Error', errorMessage);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleBridge = async (fromToken: Token, toToken: Token, amount: string) => {
    console.log('🚀 Starting bridge transaction:', { fromToken, toToken, amount });
    
    if (!walletAddress) {
      toast.error('Error', 'Wallet not connected');
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Error', 'Invalid amount');
      return;
    }

    try {
      // Simulate bridge transaction for now
      toast.info('Bridge Transaction', `🔄 Initiating bridge: ${amount} ${fromToken.symbol} → ${toToken.symbol}`, 3000);

      // Simulate transaction processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock transaction ID
      const txId = `0x${Math.random().toString(16).substr(2, 40)}`;
      
      toast.success('Bridge Successful', `✅ Bridge successful! ${amount} ${fromToken.symbol} → ${toToken.symbol} | TX: ${txId.slice(0, 10)}...`, 7000);

      console.log('Bridge transaction completed:', { txId, fromToken, toToken, amount });
      
      // In a real implementation, you would:
      // 1. Call the actual bridge contract
      // 2. Wait for transaction confirmation
      // 3. Update balances
      // 4. Show transaction details
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bridge transaction failed';
      toast.error('Error', errorMessage);
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleQuoteError = (error: string) => {
    toast.error('Error', `Quote error: ${error}`);
  };

  const handleError = (message: string) => {
    toast.error('Error', message);
  };

  const handleSuccess = (message: string) => {
    toast.success('Success', message);
  };

  return (
    <ErrorBoundary>
      <div 
        className="min-h-screen bg-slate-900"
        style={{ 
          background: 'linear-gradient(135deg, #0a0b0d 0%, #111318 50%, rgba(6, 182, 212, 0.1) 100%)'
        }}
      >
      <PageWrapper
        title="ETH-BTC Bridge"
        description="Bridge your tokens between Bitcoin and Ethereum networks"
      >
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
            All Assets - Locked In
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-text-secondary">
            Seamlessly bridge your assets between Bitcoin and Ethereum networks with the best rates and lowest fees, get latest AI-powered quotes and routing, 
            aggregate all your wallets and balances, and get the best rates and lowest fees.
          </p>
        </div>

        {/* Debug Info */}
        <div className="mb-8 max-w-4xl mx-auto">
          <BridgeDebug />
        </div>

        {/* Multi-Wallet Status */}
        <div className="mb-8 max-w-4xl mx-auto">
          <MultiWalletStatus />
        </div>

        {/* Network Status Indicator */}
        <div className="mb-8 max-w-4xl mx-auto">
          <motion.div
            className="flex items-center justify-center p-3 rounded-lg"
            style={{
              background: 'rgba(16, 18, 22, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)'
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ethereum.isReadyForBridging ? '#48bb78' : '#ed8936' }}></div>
              <span className="text-sm text-gray-300">Ethereum Network Ready</span>
            </div>
            <div className="mx-2 w-px h-4 bg-gray-700"></div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: bitcoin.isReadyForBridging ? '#48bb78' : '#ed8936' }}></div>
              <span className="text-sm text-gray-300">Bitcoin Network Ready</span>
            </div>
          </motion.div>
        </div>

        {/* Bridge Navigation */}
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/fusion-atomic-bridge">
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-6 border border-orange-200/20 hover:border-orange-300/40 transition-all cursor-pointer h-full">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-bold">🔒</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">Fusion Atomic Bridge</h3>
                    <p className="text-sm text-gray-300">ETH ↔ BTC bridging with 1inch Fusion+ HTLC escrows</p>
                    <p className="text-xs text-orange-400 mt-1">🔗 Real atomic swaps with auto-resolver</p>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/multi-wallet">
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-6 border border-purple-200/20 hover:border-purple-300/40 transition-all cursor-pointer h-full">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg font-bold">👛</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">Multi-Wallet Manager</h3>
                    <p className="text-sm text-gray-300">Connect and manage multiple wallets</p>
                    <p className="text-xs text-purple-400 mt-1">🔗 Auto-detect & balance monitoring</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Multi-Wallet Quick Info */}
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-200/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🔗</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Multi-Chain Support</h3>
                  <p className="text-sm text-gray-300">Connect wallets from different chains</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-200/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">🌐</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Testnet & Mainnet</h3>
                  <p className="text-sm text-gray-300">Clear network identification</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-4 border border-blue-200/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⚡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Real-time Updates</h3>
                  <p className="text-sm text-gray-300">Live wallet status tracking</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Connect Button */}
        {!isWalletConnected && (
          <div className="mb-8 text-center">
            <Button
              onClick={handleConnectWallet}
              variant="primary"
              size="lg"
              className="mx-auto"
            >
              🔗 Connect Wallet to Bridge
            </Button>
            <p className="text-sm text-gray-400 mt-2">
              Connect your MetaMask wallet to start bridging
            </p>
          </div>
        )}

      


        {/* Loading States Overlay */}
        {(isConnecting || isSwitchingNetwork) && (
          <div className="fixed inset-0 backdrop-blur-sm z-40 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div 
              className="max-w-sm mx-4 p-6 rounded-xl"
              style={{
                background: 'rgba(16, 18, 22, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 border-2 rounded-full animate-spin"
                  style={{ 
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderTopColor: '#06b6d4'
                  }}
                />
                <div>
                  <p className="font-medium" style={{ color: '#ffffff' }}>
                    {isConnecting ? 'Connecting Wallet...' : 'Switching Network...'}
                  </p>
                  <p className="text-sm" style={{ color: '#a0aec0' }}>
                    {isConnecting ? 'Please approve the connection in your wallet' : 'Please confirm the network switch'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="card-hover text-center">
            <div 
              className="rounded-lg flex items-center justify-center mx-auto mb-4" 
              style={{ 
                background: 'linear-gradient(135deg, #06b6d4 0%, #1e3a8a 100%)',
                width: '48px',
                height: '48px'
              }}
            >
              <svg 
                className="text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ width: '24px', height: '24px' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-text-primary">Lightning Fast</h3>
            <p className="text-text-secondary">Complete cross-chain transfers in minutes, not hours.</p>
          </div>

          <div 
            className="text-center p-6 rounded-xl transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg group"
            style={{
              background: 'rgba(16, 18, 22, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(22, 25, 31, 0.9)';
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 18, 22, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <div 
              className="rounded-lg flex items-center justify-center mx-auto mb-4" 
              style={{ 
                backgroundColor: '#48bb78',
                width: '48px',
                height: '48px'
              }}
            >
              <svg 
                className="text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ width: '24px', height: '24px' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-text-primary">Secure &amp; Trusted</h3>
            <p className="text-text-secondary">Built with industry-leading security standards and audited smart contracts.</p>
          </div>

          <div 
            className="text-center p-6 rounded-xl transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg group"
            style={{
              background: 'rgba(16, 18, 22, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(22, 25, 31, 0.9)';
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 18, 22, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <div 
              className="rounded-lg flex items-center justify-center mx-auto mb-4" 
              style={{ 
                backgroundColor: '#ed8936',
                width: '48px',
                height: '48px'
              }}
            >
              <svg 
                className="text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ width: '24px', height: '24px' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-text-primary">Best Rates</h3>
            <p className="text-text-secondary">Competitive exchange rates with minimal slippage and transparent fees.</p>
          </div>
        </div>
          
     
      </div>

      {/* Toast notifications are handled by ToastProvider */}
    </PageWrapper>
    </div>
    </ErrorBoundary>
  );
}