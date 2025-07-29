'use client';

import { useState, useEffect } from 'react';

interface ManualBitcoinInputProps {
  network: 'mainnet' | 'testnet';
  onConnect: (address: string) => void;
  onCancel: () => void;
  validateAddress: (address: string) => boolean;
  className?: string;
}

export function ManualBitcoinInput({
  network,
  onConnect,
  onCancel,
  validateAddress,
  className = ''
}: ManualBitcoinInputProps) {
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  // Real-time validation
  useEffect(() => {
    if (!address.trim()) {
      setError(null);
      setIsValid(false);
      return;
    }
    
    const valid = validateAddress(address.trim());
    setIsValid(valid);
    
    if (!valid) {
      setError(`Invalid ${network} Bitcoin address format`);
    } else {
      setError(null);
    }
  }, [address, network, validateAddress]);

  const handleConnect = () => {
    if (!address.trim()) {
      setError('Please enter a Bitcoin address');
      return;
    }

    if (!isValid) {
      setError('Please enter a valid Bitcoin address');
      return;
    }

    try {
      onConnect(address.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect with manual address';
      setError(errorMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleConnect();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const getPlaceholder = () => {
    switch (network) {
      case 'testnet':
        return 'tb1q... or m... or n... or 2...';
      case 'mainnet':
        return 'bc1q... or 1... or 3...';
      default:
        return 'Enter Bitcoin address';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Enter Bitcoin Address
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bitcoin Address ({network})
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={getPlaceholder()}
            className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors font-mono text-sm ${
              error
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : isValid
                ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {isValid && !error && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Valid {network} address
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConnect}
            disabled={!isValid}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              isValid
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            }`}
          >
            Connect Wallet
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-3 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p className="font-medium">Supported address formats for {network}:</p>
        {network === 'testnet' ? (
          <ul className="space-y-1 ml-2">
            <li>• Bech32: tb1q... (recommended)</li>
            <li>• Legacy: m... or n...</li>
            <li>• Script: 2...</li>
          </ul>
        ) : (
          <ul className="space-y-1 ml-2">
            <li>• Bech32: bc1q... (recommended)</li>
            <li>• Legacy: 1...</li>
            <li>• Script: 3...</li>
          </ul>
        )}
      </div>
    </div>
  );
}