'use client';

import { useState, useEffect, useCallback } from 'react';
import { simpleBitcoinWallet } from '@/lib/services/phantom-btc-simple';
import type { BitcoinWalletState } from '@/lib/services/phantom-btc-simple';

interface UseBitcoinWalletOptions {
  network?: 'mainnet' | 'testnet';
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export function useBitcoinWallet({ 
  network = 'testnet', 
  onConnect, 
  onDisconnect 
}: UseBitcoinWalletOptions = {}) {
  const [walletState, setWalletState] = useState<BitcoinWalletState>(() => 
    simpleBitcoinWallet.getState()
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize callbacks to prevent unnecessary re-subscriptions
  const memoizedOnConnect = useCallback(onConnect || (() => {}), [onConnect]);
  const memoizedOnDisconnect = useCallback(onDisconnect || (() => {}), [onDisconnect]);

  // Subscribe to wallet state changes
  useEffect(() => {
    const unsubscribe = simpleBitcoinWallet.subscribe((newState) => {
      setWalletState(newState);
      
      // Handle connection events
      if (newState.connected && newState.address) {
        memoizedOnConnect(newState.address);
      } else if (!newState.connected && walletState.connected) {
        // Wallet was disconnected
        memoizedOnDisconnect();
      }
    });

    return unsubscribe;
  }, [memoizedOnConnect, memoizedOnDisconnect, walletState.connected]);

  // Connect to a specific provider
  const connect = useCallback(async (provider: 'phantom' | 'xverse') => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);

    try {
      let address: string;
      
      switch (provider) {
        case 'phantom':
          address = await simpleBitcoinWallet.connectPhantom(network);
          break;
        case 'xverse':
          address = await simpleBitcoinWallet.connectXverse(network);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      return address;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to connect ${provider} wallet`;
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, network]);

  // Connect with manual address
  const connectManual = useCallback((address: string) => {
    try {
      simpleBitcoinWallet.setManualAddress(address, network);
      setError(null);
      return address;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid Bitcoin address';
      setError(errorMessage);
      throw err;
    }
  }, [network]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await simpleBitcoinWallet.disconnect();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect BTC wallet';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Get supported wallets
  const getSupportedWallets = useCallback(() => {
    return simpleBitcoinWallet.getSupportedWallets();
  }, []);

  // Validate address
  const validateAddress = useCallback((address: string) => {
    return simpleBitcoinWallet.validateAddress(address, network);
  }, [network]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    walletState,
    isConnecting,
    error,
    isConnected: walletState.connected,
    address: walletState.address,
    provider: walletState.provider,
    
    // Actions
    connect,
    connectManual,
    disconnect,
    clearError,
    
    // Utilities
    getSupportedWallets,
    validateAddress,
  };
}