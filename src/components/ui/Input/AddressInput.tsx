'use client';

import React, { useState, useCallback } from 'react';
import { Input, type InputProps } from './Input';
import { cn, isValidAddress, truncateAddress, copyToClipboard } from '@/lib/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';

export interface AddressInputProps extends Omit<InputProps, 'type'> {
  onAddressValidated?: (isValid: boolean, address?: string) => void;
  enableENS?: boolean;
  onENSResolved?: (ensName: string, address: string) => void;
  showValidation?: boolean;
  allowPaste?: boolean;
}

// Mock ENS resolution - replace with actual ENS provider
const resolveENS = async (ensName: string): Promise<string | null> => {
  // This would integrate with your ENS provider
  // For demo purposes, returning mock data
  if (ensName.endsWith('.eth')) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    return '0x742d35Cc6460C0532F0d00b4B94Df8d6DC5e5Ad8'; // Mock address
  }
  return null;
};

const validateAddress = (value: string): 'valid' | 'invalid' | 'ens' | 'loading' => {
  if (!value) return 'invalid';
  
  // Check if it's a valid Ethereum address
  if (isValidAddress(value)) {
    return 'valid';
  }
  
  // Check if it might be an ENS name
  if (value.includes('.') && value.length > 3) {
    return 'ens';
  }
  
  return 'invalid';
};

export const AddressInput = React.forwardRef<HTMLInputElement, AddressInputProps>(
  (
    {
      onAddressValidated,
      enableENS = true,
      onENSResolved,
      showValidation = true,
      allowPaste = true,
      className,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [validationState, setValidationState] = useState<'valid' | 'invalid' | 'ens' | 'loading'>('invalid');
    const [resolvedAddress, setResolvedAddress] = useState<string>('');
    const [ensName, setEnsName] = useState<string>('');
    const [showCopied, setShowCopied] = useState(false);

    // Handle input changes
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value.trim();
        setInputValue(newValue);
        
        const validation = validateAddress(newValue);
        setValidationState(validation);
        
        if (validation === 'valid') {
          onAddressValidated?.(true, newValue);
          setResolvedAddress(newValue);
          setEnsName('');
        } else if (validation === 'ens' && enableENS) {
          // Trigger ENS resolution
          setValidationState('loading');
          
          resolveENS(newValue)
            .then((address) => {
              if (address) {
                setResolvedAddress(address);
                setEnsName(newValue);
                setValidationState('valid');
                onAddressValidated?.(true, address);
                onENSResolved?.(newValue, address);
              } else {
                setValidationState('invalid');
                onAddressValidated?.(false);
              }
            })
            .catch(() => {
              setValidationState('invalid');
              onAddressValidated?.(false);
            })
            .finally(() => {
            });
        } else {
          onAddressValidated?.(false);
          setResolvedAddress('');
          setEnsName('');
        }
        
        onChange?.(e);
      },
      [onChange, onAddressValidated, enableENS, onENSResolved]
    );

    // Handle paste functionality
    const handlePaste = useCallback(
      async (e: React.ClipboardEvent<HTMLInputElement>) => {
        if (!allowPaste) return;
        
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text').trim();
        
        // Create synthetic event for the pasted value
        const syntheticEvent = {
          target: { value: pastedText },
          currentTarget: e.currentTarget,
        } as React.ChangeEvent<HTMLInputElement>;
        
        handleChange(syntheticEvent);
      },
      [allowPaste, handleChange]
    );

    // Copy address to clipboard
    const handleCopyAddress = useCallback(async () => {
      if (resolvedAddress) {
        const success = await copyToClipboard(resolvedAddress);
        if (success) {
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
        }
      }
    }, [resolvedAddress]);

    // Validation icon
    const validationIcon = () => {
      if (!showValidation || !inputValue) return null;
      
      switch (validationState) {
        case 'valid':
          return (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-success"
              title="Valid address"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.div>
          );
        case 'loading':
          return (
            <div className="text-primary-500" title="Resolving ENS...">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          );
        case 'invalid':
          return (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-error"
              title="Invalid address"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.div>
          );
        default:
          return null;
      }
    };

    const rightElement = (
      <div className="flex items-center gap-2">
        {validationIcon()}
        {resolvedAddress && (
          <button
            onClick={handleCopyAddress}
            className="p-1 hover:bg-background-secondary rounded transition-colors"
            title="Copy address"
          >
            <AnimatePresence mode="wait">
              {showCopied ? (
                <motion.svg
                  key="copied"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-4 h-4 text-success"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </motion.svg>
              ) : (
                <motion.svg
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-4 h-4 text-text-tertiary hover:text-text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>
    );

    const getHelperText = () => {
      if (ensName && resolvedAddress) {
        return `${ensName} → ${truncateAddress(resolvedAddress)}`;
      }
      if (enableENS) {
        return 'Enter Ethereum address or ENS name (e.g., vitalik.eth)';
      }
      return 'Enter Ethereum address (0x...)';
    };

    const getErrorMessage = () => {
      if (!inputValue) return undefined;
      if (validationState === 'invalid') {
        return 'Invalid Ethereum address or ENS name';
      }
      return undefined;
    };

    return (
      <Input
        ref={ref}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onPaste={handlePaste}
        rightElement={rightElement}
        helperText={getHelperText()}
        errorMessage={getErrorMessage()}
        placeholder="0x... or name.eth"
        className={cn(
          'font-mono',
          validationState === 'valid' && 'border-success',
          validationState === 'invalid' && inputValue && 'border-error',
          className
        )}
        {...props}
      />
    );
  }
);

AddressInput.displayName = 'AddressInput';