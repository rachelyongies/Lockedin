'use client';

import { useState, useEffect } from 'react';
import { simpleBitcoinWallet } from '@/lib/services/phantom-btc-simple';
import type { BitcoinWalletState } from '@/lib/services/phantom-btc-simple';

interface BitcoinWalletConnectorProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  network?: 'mainnet' | 'testnet';
  className?: string;
}

export function BitcoinWalletConnector({ 
  onConnect, 
  onDisconnect, 
  network = 'testnet',
  className = '' 
}: BitcoinWalletConnectorProps) {
  const [walletState, setWalletState] = useState<BitcoinWalletState>({
    connected: false,
    provider: null,
    address: null,
    publicKey: null,
    network: 'testnet'
  });
  const bitcoinWalletService = simpleBitcoinWallet;
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  // Removed seed phrase functionality - keeping it simple for Phantom integration
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Initialize wallet state and subscribe to changes
  useEffect(() => {
    setWalletState(bitcoinWalletService.getState());
    
    const unsubscribe = bitcoinWalletService.subscribe((newState) => {
      setWalletState(newState);
      if (newState.connected && newState.address && onConnect) {
        onConnect(newState.address);
      }
    });

    return unsubscribe;
  }, [bitcoinWalletService, onConnect]);

  // Real-time validation for manual address input
  useEffect(() => {
    if (!manualAddress.trim() || !showManualInput) {
      if (showManualInput) setError(null);
      return;
    }
    
    if (!bitcoinWalletService.validateAddress(manualAddress.trim(), network)) {
      setError('Invalid Bitcoin address format');
    } else {
      setError(null);
    }
  }, [bitcoinWalletService, manualAddress, network, showManualInput]);

  // Removed seed phrase validation - keeping it simple

  const connectWallet = async (provider: 'phantom' | 'xverse' | 'manual') => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);

    try {
      if (provider === 'manual') {
        setShowManualInput(true);
        setIsConnecting(false);
        return;
      }

      let address: string;
      if (provider === 'phantom') {
        address = await bitcoinWalletService.connectPhantom(network);
      } else if (provider === 'xverse') {
        address = await bitcoinWalletService.connectXverse(network);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      
      onConnect?.(address);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Bitcoin wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualConnect = () => {
    if (!manualAddress.trim()) {
      setError('Please enter a Bitcoin address');
      return;
    }

    try {
      bitcoinWalletService.setManualAddress(manualAddress.trim(), network);
      setShowManualInput(false);
      setManualAddress('');
      onConnect?.(manualAddress.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid Bitcoin address';
      setError(errorMessage);
    }
  };

  // Removed seed phrase functionality

  const disconnect = async () => {
    try {
      await bitcoinWalletService.disconnect();
      setError(null);
      setShowManualInput(false);
      setManualAddress('');
      onDisconnect?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      setError(errorMessage);
      console.error('Disconnect error:', err);
    }
  };

  const getSupportedWallets = () => {
    return bitcoinWalletService.getSupportedWallets();
  };

  const formatAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Removed reset seed input function

  if (walletState.connected && walletState.address) {
    return (
      <div className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">₿</span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {walletState.provider === 'phantom' && 'Phantom'}
              {walletState.provider === 'xverse' && 'Xverse'}
              {walletState.provider === 'manual' && 'Manual'}
            </div>
            <div 
              className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
              onClick={() => copyToClipboard(walletState.address!)}
              title="Click to copy full address"
            >
              {formatAddress(walletState.address)} ({network})
              {copyFeedback && <span className="text-green-500">✓</span>}
            </div>
          </div>
        </div>
        <button
          onClick={disconnect}
          className="px-3 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (showManualInput) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enter Bitcoin Address ({network})
          </label>
          <input
            type="text"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder={network === 'testnet' ? 'tb1q...' : 'bc1q...'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleManualConnect}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Connect
          </button>
          <button
            onClick={() => {
              setShowManualInput(false);
              setManualAddress('');
              setError(null);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm"
          >
            Cancel
          </button>
        </div>
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Removed seed phrase UI - keeping it simple for Phantom integration

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading Bitcoin wallet...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Connect Bitcoin Wallet ({network})
      </div>
      
      <div className="space-y-2">
        {getSupportedWallets().map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => connectWallet(wallet.id)}
            disabled={!wallet.available || isConnecting}
            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
              wallet.available && !isConnecting
                ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-400 dark:hover:bg-blue-900/20 cursor-pointer'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {wallet.id === 'phantom' && 'P'}
                  {wallet.id === 'xverse' && 'X'}
                  {wallet.id === 'manual' && '✏️'}
                </span>
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {wallet.name}
                </div>
                {!wallet.available && wallet.id !== 'manual' && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Not installed
                  </div>
                )}
              </div>
            </div>
            {isConnecting && (
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        💡 For testing, you can use "Manual Input" with a {network} address
      </div>
    </div>
  );
}