'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/helpers';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { TokenInput } from '@/components/ui/Input';
import { TokenSelector } from '@/components/bridge/TokenSelector';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatAmountInput } from '@/lib/utils/validation';
import { Token } from '@/types/bridge';
import { ALL_TOKENS } from '@/config/tokens';
import { useWalletStore, useTokenBalances } from '@/store/useWalletStore';

interface TokenCardProps {
  label: 'From' | 'To';
  token: Token | null;
  onTokenSelect: (token: Token | null) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  showBalance?: boolean;
  showMaxButton?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  error?: string;
  className?: string;
  'aria-invalid'?: boolean;
}

// Empty card for when no token is selected
const EmptyTokenCard: React.FC<{ label: string; onTokenSelect: (token: Token | null) => void; disabled?: boolean }> = ({ 
  label, 
  onTokenSelect, 
  disabled 
}) => (
  <Card variant="glass" className="opacity-60">
    <CardHeader className="pb-3">
      <h3 className="text-sm font-medium text-text-secondary">{label}</h3>
    </CardHeader>
    <CardContent className="space-y-3">
      <TokenSelector
        selectedToken={null}
        availableTokens={ALL_TOKENS}
        onTokenSelect={onTokenSelect}
        disabled={disabled}
      />
      <div className="h-[52px] flex items-center justify-center border border-dashed border-border-color rounded-lg">
        <span className="text-text-quaternary text-sm">Select a token first</span>
      </div>
    </CardContent>
  </Card>
);

const TokenCard: React.FC<TokenCardProps> = ({
  label,
  token,
  onTokenSelect,
  amount,
  onAmountChange,
  showBalance = false,
  showMaxButton = false,
  disabled = false,
  readOnly = false,
  loading = false,
  error,
  className,
  'aria-invalid': ariaInvalid,
}) => {
  // Get real wallet balances
  const { account, isConnected } = useWalletStore();
  const { balances } = useTokenBalances();
  
  // Get balance for the selected token
  const getTokenBalance = (token: Token | null): { balance: string; usdValue: number } => {
    if (!token || !isConnected || !account) {
      return { balance: '0', usdValue: 0 };
    }
    
    // Use the balances from useTokenBalances hook
    const tokenBalanceData = balances[token.symbol];
    const tokenBalance = tokenBalanceData?.formattedBalance || '0';
    const usdValue = tokenBalanceData?.usdValue || 0;
    
    return { 
      balance: tokenBalance, 
      usdValue 
    };
  };

  // Check if user has sufficient balance
  const hasSufficientBalance = (amount: string): boolean => {
    if (!token || !isConnected) return false;
    const balanceNum = parseFloat(tokenBalance);
    const amountNum = parseFloat(amount);
    return !isNaN(balanceNum) && !isNaN(amountNum) && balanceNum >= amountNum;
  };
  
  const { balance: tokenBalance, usdValue } = getTokenBalance(token);
  const balanceUSD = usdValue > 0 ? `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';

  // Debug logging to help identify the issue
  if (token && isConnected) {
    console.log('🔍 TokenCard Debug:', {
      tokenSymbol: token.symbol,
      balances: balances,
      tokenBalance,
      isConnected,
      accountAddress: account?.address
    });
  }

  // Consistent formatting helper - MUST be before early return
  const formatAmount = useCallback((value: string | number): string => {
    const stringValue = typeof value === 'number' ? value.toString() : value;
    return formatAmountInput(stringValue, token?.decimals || 18);
  }, [token?.decimals]);

  // Handle max button click
  const handleMaxClick = useCallback(() => {
    if (disabled || readOnly || !showMaxButton || !isConnected) return;
    onAmountChange(formatAmount(tokenBalance));
  }, [disabled, readOnly, showMaxButton, isConnected, tokenBalance, onAmountChange, formatAmount]);

  // Handle amount input change with formatting
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const value = e.target.value;
    onAmountChange(formatAmount(value));
  }, [readOnly, onAmountChange, formatAmount]);

  // Percentage buttons for quick selection
  const percentageButtons = [25, 50, 75, 100];
  const handlePercentageClick = useCallback((percentage: number) => {
    if (disabled || readOnly || !isConnected) return;
    const balanceNum = parseFloat(tokenBalance);
    const percentAmount = (balanceNum * percentage) / 100;
    onAmountChange(formatAmount(percentAmount));
  }, [disabled, readOnly, isConnected, tokenBalance, onAmountChange, formatAmount]);

  // Early return for empty state - MUST be after all hooks
  if (!token && !loading) {
    return <EmptyTokenCard label={label} onTokenSelect={onTokenSelect} disabled={disabled} />;
  }

  return (
    <Card 
      variant="glass" 
      className={cn(
        'transition-all duration-200',
        error && 'border-error/50 shadow-error/10',
        loading && 'animate-pulse',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-secondary">
            {label}
          </h3>
                      {showBalance && token && (
              <div className="text-xs text-text-tertiary text-right">
                <div className={cn(
                  "Balance:",
                  hasSufficientBalance(amount) ? "text-green-400" : "text-red-400"
                )}>
                  {isConnected ? `${tokenBalance} ${token.symbol}` : 'Connect wallet'}
                </div>
                <div className="text-text-quaternary">
                  {isConnected ? balanceUSD : 'Balance not available'}
                </div>
                {amount && isConnected && !hasSufficientBalance(amount) && (
                  <div className="text-red-400 text-xs mt-1">
                    ⚠️ Insufficient balance
                  </div>
                )}
              </div>
            )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Token Selector */}
        <TokenSelector
          selectedToken={token}
          availableTokens={ALL_TOKENS}
          onTokenSelect={onTokenSelect}
          disabled={disabled}
        />

        {/* Amount Input Section */}
        <div className="space-y-2">
          {readOnly ? (
            // Read-only display for "To" amount with better UX
            <div className="relative">
              <div className={cn(
                'w-full px-4 py-3 rounded-lg border',
                'bg-card-background-secondary/50 border-border-color/50',
                'text-lg font-medium',
                'min-h-[52px] flex items-center justify-between',
                loading && 'animate-pulse'
              )}>
                <div className="flex-1">
                  {loading ? (
                    <Skeleton className="h-6 w-24" />
                  ) : amount ? (
                    <span className="text-text-primary">{amount}</span>
                  ) : (
                    <span className="text-text-quaternary italic text-base">Estimated amount</span>
                  )}
                </div>
                <div className="text-xs text-text-quaternary font-normal">
                  {readOnly && !loading && 'Auto-calculated'}
                </div>
              </div>
              
              {/* Loading overlay with better messaging */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card-background/80 backdrop-blur-sm rounded-lg">
                  <div className="flex items-center space-x-2 text-xs text-text-tertiary">
                    <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span>Calculating best rate...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Editable input for "From" amount
            <div className="relative">
              <TokenInput
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.0"
                disabled={disabled}
                errorMessage={error}
                aria-invalid={ariaInvalid}
                aria-describedby={error ? `${label.toLowerCase()}-error` : undefined}
                className="text-lg font-medium pr-16"
              />
              
              {/* Max Button */}
              {showMaxButton && !disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMaxClick}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 px-2 text-xs font-medium text-primary-400 hover:text-primary-300 hover:bg-primary-500/10"
                  aria-label={`Set maximum available balance: ${tokenBalance} ${token?.symbol}`}
                >
                  MAX
                </Button>
              )}
            </div>
          )}

          {/* Percentage Buttons (only for From token) */}
          {!readOnly && showMaxButton && !disabled && (
            <div className="flex space-x-1">
              {percentageButtons.map((percentage) => (
                <Button
                  key={percentage}
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePercentageClick(percentage)}
                  className="flex-1 h-7 text-xs font-medium text-text-tertiary hover:text-text-secondary hover:bg-background-secondary/50 transition-colors"
                  aria-label={`Set ${percentage}% of available balance`}
                >
                  {percentage}%
                </Button>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-error font-medium px-1"
              role="alert"
              aria-live="polite"
              id={`${label.toLowerCase()}-error`}
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* USD Value Display */}
        {amount && (
          <div className="text-right text-sm text-text-tertiary">
            {loading ? (
              <Skeleton className="h-4 w-16 ml-auto" />
            ) : (
              <span>~$2,456.78 USD</span> // Mock USD value - would be calculated from amount * token price
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { TokenCard };