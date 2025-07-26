'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { Token, BridgeQuote } from '@/types/bridge';

// Import proper icons (using inline SVG for now, replace with lucide-react or similar)
const WalletIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

const SwapIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 3h5v5"/>
    <path d="M8 21H3v-5"/>
    <path d="M21 3l-7 7"/>
    <path d="M3 21l7-7"/>
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M3 21v-5h5"/>
  </svg>
);

// Action button states
export type ActionButtonState = 
  | 'connect-wallet'
  | 'wrong-network'
  | 'enter-amount'
  | 'insufficient-balance'
  | 'loading-quote'
  | 'approval-needed'
  | 'approving'
  | 'ready-to-bridge'
  | 'bridging'
  | 'success'
  | 'error'
  | 'expired-quote';

interface ActionButtonConfig {
  text: string;
  variant: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'ghost';
  icon?: React.ReactNode;
  disabled: boolean;
  loading: boolean;
  loadingText?: string;
  onClick?: () => void | Promise<void>;
  ariaLabel?: string;
}

export interface ActionButtonProps {
  // Wallet state
  isWalletConnected: boolean;
  isCorrectNetwork: boolean;
  walletAddress?: string;
  
  // Form state
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  isValidAmount: boolean;
  balanceError?: string;
  
  // Quote state
  quote: BridgeQuote | null;
  quoteLoading: boolean;
  quoteError?: string;
  
  // Transaction state
  bridgeLoading: boolean;
  bridgeSuccess: boolean;
  approvalNeeded?: boolean;
  approvalLoading?: boolean;
  approvalSuccess?: boolean;
  
  // Handlers
  onConnectWallet?: () => void | Promise<void>;
  onSwitchNetwork?: () => void | Promise<void>;
  onApprove?: () => void | Promise<void>;
  onBridge?: () => void | Promise<void>;
  onRetry?: () => void | Promise<void>; // Optional retry handler
  
  // Toast/notification handler
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  
  // Configuration
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

export function ActionButton({
  isWalletConnected,
  isCorrectNetwork,
  walletAddress, // Used for future wallet validation and user feedback
  fromToken,
  toToken,
  fromAmount,
  isValidAmount,
  balanceError,
  quote,
  quoteLoading,
  quoteError,
  bridgeLoading,
  bridgeSuccess,
  approvalNeeded = false,
  approvalLoading = false,
  approvalSuccess = false,
  onConnectWallet,
  onSwitchNetwork,
  onApprove,
  onBridge,
  onRetry,
  onError,
  onSuccess,
  className,
  disabled = false,
  'data-testid': testId,
}: ActionButtonProps) {
  
  // Determine current state
  const currentState: ActionButtonState = useMemo(() => {
    // Wallet connection states
    if (!isWalletConnected) return 'connect-wallet';
    if (!isCorrectNetwork) return 'wrong-network';
    
    // Form validation states
    if (!fromToken || !toToken) return 'enter-amount';
    if (!fromAmount || !isValidAmount) return 'enter-amount';
    if (balanceError) return 'insufficient-balance';
    
    // Quote states
    if (quoteLoading) return 'loading-quote';
    if (quoteError) return 'error';
    if (!quote) return 'enter-amount';
    
    // Check if quote is expired
    if (quote && Date.now() > quote.expiresAt) return 'expired-quote';
    
    // Transaction states
    if (bridgeSuccess) return 'success';
    if (bridgeLoading) return 'bridging';
    
    // Approval states
    if (approvalLoading) return 'approving';
    if (approvalNeeded && !approvalSuccess) return 'approval-needed';
    
    // Ready to bridge
    return 'ready-to-bridge';
  }, [
    isWalletConnected,
    isCorrectNetwork,
    fromToken,
    toToken,
    fromAmount,
    isValidAmount,
    balanceError,
    quoteLoading,
    quoteError,
    quote,
    bridgeSuccess,
    bridgeLoading,
    approvalLoading,
    approvalNeeded,
    approvalSuccess,
  ]);

  // Configuration for each state
  const stateConfigs: Record<ActionButtonState, ActionButtonConfig> = {
    'connect-wallet': {
      text: 'Connect Wallet',
      variant: 'primary',
      icon: <WalletIcon className="w-4 h-4" />,
      disabled: false,
      loading: false,
      onClick: onConnectWallet,
      ariaLabel: 'Connect your crypto wallet to continue',
    },
    
    'wrong-network': {
      text: 'Switch Network',
      variant: 'warning',
      icon: <AlertCircleIcon className="w-4 h-4" />,
      disabled: false,
      loading: false,
      onClick: onSwitchNetwork,
      ariaLabel: 'Switch to the correct blockchain network',
    },
    
    'enter-amount': {
      text: 'Enter Amount',
      variant: 'secondary',
      disabled: true,
      loading: false,
      ariaLabel: 'Enter a valid amount to bridge',
    },
    
    'insufficient-balance': {
      text: 'Insufficient Balance',
      variant: 'error',
      icon: <XCircleIcon className="w-4 h-4" />,
      disabled: true,
      loading: false,
      ariaLabel: 'Insufficient token balance for this transaction',
    },
    
    'loading-quote': {
      text: 'Getting Quote',
      variant: 'secondary',
      disabled: true,
      loading: true,
      loadingText: 'Getting Quote...',
      ariaLabel: 'Fetching current exchange rate and fees',
    },
    
    'approval-needed': {
      text: `Approve ${fromToken?.symbol || 'Token'}`,
      variant: 'warning',
      icon: <CheckIcon className="w-4 h-4" />,
      disabled: false,
      loading: false,
      onClick: onApprove,
      ariaLabel: `Approve ${fromToken?.symbol || 'token'} for bridging`,
    },
    
    'approving': {
      text: 'Approving',
      variant: 'warning',
      disabled: true,
      loading: true,
      loadingText: 'Approving...',
      ariaLabel: 'Approval transaction in progress',
    },
    
    'ready-to-bridge': {
      text: `Bridge ${fromToken?.symbol || ''} → ${toToken?.symbol || ''}`,
      variant: 'primary',
      icon: <SwapIcon className="w-4 h-4" />,
      disabled: false,
      loading: false,
      onClick: onBridge,
      ariaLabel: `Bridge ${fromToken?.symbol || 'tokens'} to ${toToken?.symbol || 'target token'}`,
    },
    
    'bridging': {
      text: 'Bridging',
      variant: 'primary',
      disabled: true,
      loading: true,
      loadingText: 'Processing...',
      ariaLabel: 'Bridge transaction in progress',
    },
    
    'success': {
      text: 'Bridge Successful!',
      variant: 'success',
      icon: <CheckIcon className="w-4 h-4" />,
      disabled: true,
      loading: false,
      ariaLabel: 'Bridge transaction completed successfully',
    },
    
    'error': {
      text: 'Retry',
      variant: 'error',
      icon: <RefreshIcon className="w-4 h-4" />,
      disabled: false,
      loading: false,
      onClick: onRetry ?? onBridge, // Use retry handler or fallback to bridge
      ariaLabel: 'Retry the failed transaction',
    },
    
    'expired-quote': {
      text: 'Refresh Quote',
      variant: 'warning',
      icon: <RefreshIcon className="w-4 h-4" />,
      disabled: false,
      loading: false,
      onClick: onRetry ?? onBridge, // Use retry handler or fallback to bridge for new quote
      ariaLabel: 'Get a new price quote (current quote expired)',
    },
  };

  const config = stateConfigs[currentState];
  const isDisabled = disabled || config.disabled;

  // Enhanced click handler with error handling and toast integration
  const handleClick = async () => {
    if (isDisabled || !config.onClick) return;
    
    try {
      await config.onClick();
      
      // Show success toast for certain actions
      if (currentState === 'connect-wallet' && onSuccess) {
        onSuccess('Wallet connected successfully!');
      } else if (currentState === 'approval-needed' && onSuccess) {
        onSuccess('Token approval initiated');
      }
    } catch (error) {
      console.error('ActionButton click error:', error);
      
      // Show error toast
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      onError?.(errorMessage);
    }
  };

  // Animation variants for state transitions
  const textVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className={cn('w-full', className)} data-testid={testId}>
      <Button
        variant={config.variant}
        size="lg"
        fullWidth
        disabled={isDisabled}
        loading={config.loading}
        loadingText={config.loadingText}
        leftIcon={!config.loading ? config.icon : undefined}
        onClick={handleClick}
        aria-label={config.ariaLabel}
        className={cn(
          'h-14 text-base font-semibold transition-all duration-200',
          // State-specific styling
          currentState === 'success' && 'animate-pulse',
          currentState === 'error' && 'animate-pulse',
          currentState === 'expired-quote' && 'animate-pulse',
          // Animated gradient for connect wallet state
          currentState === 'connect-wallet' && [
            'bg-wallet-connect-gradient bg-[length:200%_100%] animate-gradient-flow',
            'relative overflow-hidden'
          ]
        )}
        data-testid={`${testId}-button`}
        data-state={currentState}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={currentState}
            variants={textVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            {config.text}
          </motion.span>
        </AnimatePresence>
      </Button>
      
      {/* Additional context text for some states with keyboard accessibility */}
      <AnimatePresence>
        {(currentState === 'insufficient-balance' && balanceError) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-sm text-error text-center"
            data-testid={`${testId}-error-message`}
            role="alert"
            aria-live="polite"
          >
            {balanceError}
          </motion.p>
        )}
        
        {(currentState === 'error' && quoteError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-sm text-error text-center"
            data-testid={`${testId}-error-message`}
            role="alert"
            aria-live="polite"
          >
            <p>{quoteError}</p>
            <button
              type="button"
              className="mt-1 text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-error/50 rounded"
              onClick={handleClick}
              tabIndex={0}
              aria-label="Click to retry the failed operation"
            >
              Try Again
            </button>
          </motion.div>
        )}
        
        {currentState === 'wrong-network' && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-sm text-warning text-center"
            data-testid={`${testId}-network-message`}
            role="alert"
            aria-live="polite"
          >
            Please switch to the correct network to continue
          </motion.p>
        )}
        
        {currentState === 'expired-quote' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-sm text-warning text-center"
            data-testid={`${testId}-expired-message`}
            role="alert"
            aria-live="polite"
          >
            <p>Price quote has expired.</p>
            <button
              type="button"
              className="mt-1 text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-warning/50 rounded"
              onClick={handleClick}
              tabIndex={0}
              aria-label="Click to get a new price quote"
            >
              Get New Quote
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}