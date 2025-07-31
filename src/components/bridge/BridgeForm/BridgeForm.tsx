'use client';

import React, { useState, useMemo } from 'react';
// import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { TokenCard } from './TokenCard';
import { SwapButton } from './SwapButton';
import { BridgeDetails } from '../BridgeDetails';
import { ActionButton } from '../ActionButton';
import { useBridgeFormState } from './useBridgeFormState';
import { TransactionMonitor } from '../TransactionFlow/TransactionMonitor';
import { cn } from '@/lib/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { Token } from '@/types/bridge';
import { useWalletStore } from '@/store/useWalletStore';

export interface BridgeFormProps {
  className?: string;
  onBridge?: (fromToken: Token, toToken: Token, amount: string) => Promise<void>;
  onQuoteError?: (error: string) => void;
  
  // Mock wallet state - replace with actual wallet integration
  isWalletConnected?: boolean;
  isCorrectNetwork?: boolean;
  walletAddress?: string;
  onConnectWallet?: () => void | Promise<void>;
  onSwitchNetwork?: () => void | Promise<void>;
  
  // Mock approval state - replace with actual contract integration
  approvalNeeded?: boolean;
  approvalLoading?: boolean;
  approvalSuccess?: boolean;
  onApprove?: () => void | Promise<void>;
  
  // Token loading states (for future use)
  loadingTokens?: boolean;
  tokenFetchError?: string;
  
  // Toast/notification handlers
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export function BridgeForm({
  className,
  onBridge,
  onQuoteError,
  isWalletConnected = false,
  isCorrectNetwork = true,
  walletAddress,
  onConnectWallet,
  onSwitchNetwork,
  approvalNeeded = false,
  approvalLoading = false,
  approvalSuccess = false,
  onApprove,
  loadingTokens = false,
  tokenFetchError,
  onError,
  onSuccess,
}: BridgeFormProps) {
  // Get wallet state
  const { isConnected, account, walletType } = useWalletStore();
  // Bridge form state
  const {
    fromToken,
    setFromToken,
    toToken,
    setToToken,
    fromAmount,
    setFromAmount,
    toAmount,
    resolver,
    setResolver,
    timelock,
    setTimelock,
    setHtlcId,
    isValidAmount,
    balanceError,
    isSwapping,
    quote,
    quoteLoading,
    quoteError,
    bridgeLoading,
    bridgeSuccess,
    handleSwapDirection,
    handleBridge,
    handleInitiateSwap,
    resetForm,
    htlcId,
  } = useBridgeFormState({ onBridge, onQuoteError, walletAddress });

  // UI state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  

  // Handle token selection
  const handleFromTokenSelect = (token: Token | null) => {
    setFromToken(token);
  };

  const handleToTokenSelect = (token: Token | null) => {
    setToToken(token);
  };

  // Enhanced reset with confirmation
  const handleReset = () => {
    if (!fromToken && !toToken && !fromAmount) {
      // Nothing to reset
      return;
    }
    
    if (showResetConfirm) {
      resetForm();
      setShowResetConfirm(false);
      onSuccess?.('Form reset successfully');
    } else {
      setShowResetConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowResetConfirm(false), 3000);
    }
  };


  // Animation variants - memoized to prevent re-renders
  const cardVariants = useMemo(() => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  }), []);

  // Bridge route display
  const bridgeRoute = useMemo(() => {
    if (!fromToken || !toToken) return null;
    return `${fromToken.symbol} → ${toToken.symbol}`;
  }, [fromToken, toToken]);


  const shouldShowDetails = useMemo(() => {
    return quote || quoteLoading || (quoteError && fromToken && toToken && isValidAmount);
  }, [quote, quoteLoading, quoteError, fromToken, toToken, isValidAmount]);

  return (
    <div className={cn('w-full max-w-lg mx-auto', className)}>
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3 }}
      >
        <div 
          className="p-6 rounded-xl backdrop-blur-xl border"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
          }}
        >
          <div className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white">
                  Bridge
                </h2>
                {/* Bridge Route Display */}
                <AnimatePresence>
                  {bridgeRoute && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="px-2 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full text-xs font-medium text-primary-400"
                    >
                      {bridgeRoute}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Enhanced Reset Button */}
              <div className="relative">
                <button
                  onClick={handleReset}
                  onBlur={() => setShowResetConfirm(false)}
                  className={cn(
                    "text-sm transition-colors px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500/30",
                    showResetConfirm 
                      ? "text-error hover:text-error-light bg-error/10" 
                      : "text-text-secondary hover:text-text-primary"
                  )}
                  title={showResetConfirm ? "Click again to confirm reset" : "Clear selected tokens and input amount"}
                  aria-label={showResetConfirm ? "Confirm reset of bridge form" : "Reset bridge form"}
                  tabIndex={0}
                >
                  {showResetConfirm ? 'Confirm Reset?' : 'Reset'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* From Token Card */}
            <TokenCard
              label="From"
              token={fromToken}
              amount={fromAmount}
              onAmountChange={setFromAmount}
              onTokenSelect={handleFromTokenSelect}
              showBalance={true}
              showMaxButton={true}
              readOnly={false}
              data-testid="bridge-from-card"
            />

            {/* Swap Direction Button */}
            <div className="flex justify-center -my-2 relative z-10">
              <SwapButton
                onSwap={handleSwapDirection}
                disabled={isSwapping || !fromToken || !toToken}
                isSwapping={isSwapping}
                data-testid="bridge-swap-button"
              />
            </div>

            {/* To Token Card */}
            <TokenCard
              label="To"
              token={toToken}
              amount={toAmount}
              onAmountChange={() => {}} // No-op for read-only
              onTokenSelect={handleToTokenSelect}
              showBalance={true}
              readOnly={true}
              loading={quoteLoading}
              data-testid="bridge-to-card"
            />

            {/* Timelock Input */}
            <div className="space-y-2">
              <label htmlFor="timelock" className="text-sm font-medium text-text-secondary">Timelock (seconds)</label>
              <input
                id="timelock"
                type="number"
                value={timelock}
                onChange={(e) => setTimelock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                min="3600"
              />
            </div>

                    {/* Solana Bridge Info */}
        {(fromToken?.network === 'solana' || toToken?.network === 'solana') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.5 20.5L12.5 16.5L8.5 12.5H23.5L19.5 16.5L23.5 20.5H8.5Z"/>
                </svg>
              </div>
              <span className="font-semibold text-purple-800">Solana Bridge</span>
            </div>
            <p className="text-sm text-purple-700">
              {walletType === 'phantom' ?
                'Phantom wallet detected. Ready for Solana transactions.' :
                'Connect Phantom wallet to bridge with Solana.'
              }
            </p>
          </motion.div>
        )}

        {/* Starknet Bridge Info */}
        {(fromToken?.network === 'starknet' || toToken?.network === 'starknet') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 8L24 24M24 8L8 24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-semibold text-cyan-800">Starknet Bridge</span>
            </div>
            <p className="text-sm text-cyan-700">
              Starknet L2 scaling solution. Fast and cost-effective transactions.
            </p>
          </motion.div>
        )}

        {/* Stellar Bridge Info */}
        {(fromToken?.network === 'stellar' || toToken?.network === 'stellar') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 6L20 12L16 18L12 12L16 6Z"/>
                </svg>
              </div>
              <span className="font-semibold text-orange-800">Stellar Bridge</span>
            </div>
            <p className="text-sm text-orange-700">
              Stellar network for fast cross-border payments and asset transfers.
            </p>
          </motion.div>
        )}

            {/* Resolver Address Input */}
            <div className="space-y-2">
              <label htmlFor="resolver" className="text-sm font-medium text-text-secondary">Resolver Address</label>
              <input
                id="resolver"
                type="text"
                value={resolver}
                onChange={(e) => setResolver(e.target.value)}
                className="w-full px-3 py-2 bg-background-secondary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                placeholder="Enter resolver address"
              />
            </div>

            {/* Bridge Details with Enhanced UX */}
            <AnimatePresence>
              {shouldShowDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <BridgeDetails
                    quote={quote}
                    loading={quoteLoading}
                    error={quoteError}
                    showExpiryTimer={true} // Enhanced: show quote expiry
                    data-testid="bridge-details"
                  />
                </motion.div>
              )}
            </AnimatePresence>


            {/* Standard Action Button */}
            <ActionButton
              isWalletConnected={isWalletConnected}
              isCorrectNetwork={isCorrectNetwork}
              walletAddress={walletAddress}
              fromToken={fromToken}
              toToken={toToken}
              fromAmount={fromAmount}
              isValidAmount={isValidAmount}
              balanceError={balanceError}
              quote={quote}
              quoteLoading={quoteLoading}
              quoteError={quoteError}
              bridgeLoading={bridgeLoading}
              bridgeSuccess={bridgeSuccess}
              approvalNeeded={approvalNeeded}
              approvalLoading={approvalLoading}
              approvalSuccess={approvalSuccess}
              onConnectWallet={onConnectWallet}
              onSwitchNetwork={onSwitchNetwork}
              onApprove={onApprove}
              onBridge={handleInitiateSwap}
              onError={onError}
              onSuccess={onSuccess}
              data-testid="bridge-action-button"
            />

            {/* Quote Expiry Warning */}
            <AnimatePresence>
              {quote && Date.now() > quote.expiresAt - 10000 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning"
                  role="alert"
                  aria-live="polite"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.318 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Quote expires soon - complete transaction quickly
                </motion.div>
              )}
            </AnimatePresence>

            {/* Transaction Monitor */}
            <TransactionMonitor htlcId={htlcId} />
          </div>
        </div>
      </motion.div>

    </div>
  );
}