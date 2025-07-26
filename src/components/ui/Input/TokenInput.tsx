'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Input, type InputProps } from './Input';
import { Button } from '../Button';
import { cn, formatCryptoAmount } from '@/lib/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';

export interface TokenInputProps extends Omit<InputProps, 'type' | 'rightElement'> {
  token?: {
    symbol: string;
    logoUrl?: string;
    decimals?: number;
  };
  balance?: string | number;
  onMaxClick?: () => void;
  onTokenSelect?: () => void;
  usdValue?: number;
  showBalance?: boolean;
  percentageButtons?: boolean;
  onPercentageClick?: (percentage: number) => void;
  loading?: boolean;
}

const percentages = [25, 50, 75, 100];

// Robust numeric validation with decimal precision
const validateNumericInput = (value: string, decimals: number = 18): boolean => {
  if (value === '' || value === '.') return true;
  
  // Check if it's a valid number format with proper decimal places
  const regex = new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`);
  if (!regex.test(value)) return false;
  
  // Additional validation to prevent invalid cases like multiple decimals
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) || value === '0.' || value.endsWith('.');
};

// Smart USD formatting for different value ranges
const formatUsdValue = (value: number): string => {
  if (value === 0) return '$0.00';
  if (value < 0.01) {
    return `$${value.toPrecision(2)}`;
  }
  if (value < 1000) {
    return `$${value.toFixed(2)}`;
  }
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const TokenInput = React.forwardRef<HTMLInputElement, TokenInputProps>(
  (
    {
      token,
      balance,
      onMaxClick,
      onTokenSelect,
      usdValue,
      showBalance = true,
      percentageButtons = false,
      onPercentageClick,
      loading = false,
      label = 'Amount',
      className,
      containerClassName,
      disabled,
      onChange,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    // Format balance for display
    const formattedBalance = balance
      ? formatCryptoAmount(balance, undefined, token?.decimals)
      : '0';

    // Handle numeric input validation with token decimals
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const decimals = token?.decimals || 18;
        
        if (validateNumericInput(value, decimals)) {
          // Normalize value (remove leading zeros, but preserve decimal states)
          let normalized = value;
          if (value && value !== '.' && !value.endsWith('.')) {
            normalized = value.replace(/^0+(?=\d)/, '') || '0';
          }
          
          e.target.value = normalized;
          onChange?.(e);
        }
      },
      [onChange, token?.decimals]
    );

    // Estimated skeleton width based on token symbol
    const skeletonWidth = token?.symbol 
      ? `${Math.max(4, token.symbol.length * 0.6)}rem` 
      : '4rem';

    const rightElement = (
      <div className="flex items-center gap-2">
        {showBalance && balance !== undefined && onMaxClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMaxClick}
            disabled={disabled || loading}
            className="h-6 px-2 text-xs text-primary-500 hover:text-primary-400"
          >
            MAX
          </Button>
        )}
        
        {token && (
          <button
            onClick={onTokenSelect}
            disabled={!onTokenSelect || disabled}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md',
              'transition-colors duration-200',
              onTokenSelect ? [
                'bg-background-tertiary hover:bg-background-secondary',
                'cursor-pointer'
              ] : [
                'bg-background-tertiary/50',
                'cursor-default'
              ],
              'disabled:cursor-default disabled:hover:bg-background-tertiary'
            )}
            aria-label={onTokenSelect ? `Select token (current: ${token.symbol})` : `Token: ${token.symbol}`}
          >
            {token.logoUrl && (
              <div className="relative w-5 h-5">
                <Image
                  src={token.logoUrl}
                  alt={token.symbol}
                  fill
                  className="object-contain rounded-full"
                  onError={(e) => {
                    // Hide broken images gracefully
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <span className="font-medium text-sm">{token.symbol}</span>
            {onTokenSelect && (
              <svg
                className="w-4 h-4 text-text-tertiary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    );

    return (
      <div className={cn('space-y-3', containerClassName)}>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*"
          label={label}
          rightElement={rightElement}
          className={cn(
            'font-mono text-2xl pr-36',
            // Focus state visual enhancement
            isFocused && [
              'ring-2 ring-primary-500/30',
              'shadow-lg shadow-primary-500/10'
            ],
            className
          )}
          placeholder="0.0"
          disabled={disabled || loading}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onChange={handleChange}
          {...props}
        />

        {/* Balance and USD Value Display */}
        <AnimatePresence>
          {(showBalance || usdValue !== undefined) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex justify-between items-center text-sm"
            >
              {showBalance && balance !== undefined && (
                <div className="text-text-tertiary">
                  Balance: {loading ? (
                    <span 
                      className="inline-block h-4 bg-background-tertiary animate-pulse rounded"
                      style={{ minWidth: skeletonWidth }}
                    />
                  ) : (
                    <button
                      onClick={onMaxClick}
                      disabled={!onMaxClick}
                      className={cn(
                        'text-text-secondary font-medium',
                        onMaxClick && 'hover:text-primary-500 cursor-pointer transition-colors'
                      )}
                      aria-label={onMaxClick ? `Use max balance: ${formattedBalance} ${token?.symbol}` : undefined}
                    >
                      {formattedBalance} {token?.symbol}
                    </button>
                  )}
                </div>
              )}
              
              {usdValue !== undefined && (
                <motion.div 
                  className="text-text-tertiary"
                  animate={{ 
                    color: isFocused ? 'var(--text-secondary)' : 'var(--text-tertiary)' 
                  }}
                  transition={{ duration: 0.2 }}
                >
                  ≈ {formatUsdValue(usdValue)}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Percentage Buttons */}
        {percentageButtons && onPercentageClick && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="flex gap-2"
          >
            {percentages.map((percentage) => (
              <Button
                key={percentage}
                variant="secondary"
                size="sm"
                onClick={() => onPercentageClick(percentage)}
                disabled={disabled || loading || !balance || Number(balance) === 0}
                className="flex-1 h-8 text-xs"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {percentage}%
              </Button>
            ))}
          </motion.div>
        )}

        {/* Loading overlay for the entire input */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-background-dark/20 backdrop-blur-sm flex items-center justify-center rounded-lg"
          >
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </div>
    );
  }
);

TokenInput.displayName = 'TokenInput';