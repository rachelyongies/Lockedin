'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { BridgeForm } from '@/components/bridge/BridgeForm';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { useWalletStore } from '@/store/useWalletStore';
import { useBridgeStore } from '@/store/useBridgeStore';
import { Token } from '@/types/bridge';

export default function Home() {
  // Global state
  const {
    isConnected: isWalletConnected,
    isConnecting,
    address: walletAddress,
    isCorrectNetwork,
    isSwitchingNetwork,
    setConnected,
    setConnecting,
    setNetwork,
    setSwitchingNetwork,
  } = useWalletStore();

  const {
    approvalNeeded,
    approvalLoading,
    approvalSuccess,
    setApprovalLoading,
    setApprovalSuccess,
    setApprovalError,
  } = useBridgeStore();

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Enhanced handlers with loading states
  const handleConnectWallet = async () => {
    setConnecting(true);
    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockAddress = '0x1234...5678';
      setConnected(true, mockAddress);
      addToast({ type: 'success', message: 'Wallet connected successfully!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to connect wallet' });
      setConnecting(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setSwitchingNetwork(true);
    try {
      // Simulate network switch
      await new Promise(resolve => setTimeout(resolve, 800));
      setNetwork(1, true); // Mainnet
      addToast({ type: 'success', message: 'Network switched successfully!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to switch network' });
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
      addToast({ type: 'success', message: 'Token approval successful!' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Approval failed';
      setApprovalError(errorMessage);
      addToast({ type: 'error', message: errorMessage });
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleBridge = async (fromToken: Token, toToken: Token, amount: string) => {
    console.log('Bridging:', { fromToken, toToken, amount });
    try {
      // Simulate bridge transaction
      await new Promise(resolve => setTimeout(resolve, 3000));
      addToast({ 
        type: 'success', 
        message: `Successfully bridged ${amount} ${fromToken.symbol} to ${toToken.symbol}!`,
        duration: 7000 // Longer duration for success messages
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bridge transaction failed';
      addToast({ type: 'error', message: errorMessage });
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleQuoteError = (error: string) => {
    addToast({ type: 'error', message: `Quote error: ${error}` });
  };

  const handleError = (message: string) => {
    addToast({ type: 'error', message });
  };

  const handleSuccess = (message: string) => {
    addToast({ type: 'success', message });
  };

  return (
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
            Cross-Chain Bridge
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-text-secondary">
            Seamlessly bridge your assets between Bitcoin and Ethereum networks with the best rates and lowest fees.
          </p>
        </div>

        {/* Bridge Form */}
        <div className="flex justify-center">
          <BridgeForm
            onBridge={handleBridge}
            onQuoteError={handleQuoteError}
            isWalletConnected={isWalletConnected}
            isCorrectNetwork={isCorrectNetwork && !isSwitchingNetwork}
            walletAddress={walletAddress}
            onConnectWallet={handleConnectWallet}
            onSwitchNetwork={handleSwitchNetwork}
            approvalNeeded={approvalNeeded}
            approvalLoading={approvalLoading}
            approvalSuccess={approvalSuccess}
            onApprove={handleApprove}
            onError={handleError}
            onSuccess={handleSuccess}
            className="w-full max-w-md"
          />
        </div>

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

        {/* Status Bar */}
        <div className="mt-8 text-center">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{ 
              color: '#a0aec0',
              background: 'rgba(16, 18, 22, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <div 
              className={`w-2 h-2 rounded-full ${isWalletConnected ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: isWalletConnected ? '#48bb78' : '#6b7280' }}
            />
            Wallet: {isWalletConnected ? `Connected (${walletAddress})` : 'Not Connected'}
            {isCorrectNetwork && isWalletConnected && (
              <>
                <div className="w-px h-4 mx-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#48bb78' }} />
                Network: Ethereum Mainnet
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onRemoveToast={removeToast}
        position="top-right"
      />
    </PageWrapper>
    </div>
  );
}