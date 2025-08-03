'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';

interface MetaMaskStatus {
  isInstalled: boolean;
  isConnected: boolean;
  address: string | null;
  chainId: string | null;
  balance: string | null;
  error: string | null;
}

export default function MetaMaskTest() {
  const [status, setStatus] = useState<MetaMaskStatus>({
    isInstalled: false,
    isConnected: false,
    address: null,
    chainId: null,
    balance: null,
    error: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  // Check MetaMask status on mount
  useEffect(() => {
    checkMetaMaskStatus();
  }, []);

  // Check if MetaMask is installed and get current status
  const checkMetaMaskStatus = async () => {
    try {
      // Check if MetaMask is installed
      const isInstalled = typeof window !== 'undefined' && 
        (window.ethereum?.isMetaMask || 
         (window.ethereum as any)?.providers?.some((p: any) => p.isMetaMask));

      if (!isInstalled) {
        setStatus(prev => ({ ...prev, isInstalled: false, error: 'MetaMask not installed' }));
        return;
      }

      setStatus(prev => ({ ...prev, isInstalled: true }));

      // Check if already connected
      const provider = window.ethereum;
      if (provider) {
        try {
          const accounts = await provider.request({ method: 'eth_accounts' });
          const chainId = await provider.request({ method: 'eth_chainId' });
          
          if (accounts && accounts.length > 0) {
            const address = accounts[0];
            const balance = await provider.request({
              method: 'eth_getBalance',
              params: [address, 'latest']
            });

            setStatus(prev => ({
              ...prev,
              isConnected: true,
              address,
              chainId,
              balance: (parseInt(balance, 16) / Math.pow(10, 18)).toString(),
              error: null
            }));

            addToast({
              message: `✅ MetaMask already connected: ${address.slice(0, 6)}...${address.slice(-4)}`,
              type: 'success'
            });
          } else {
            setStatus(prev => ({ ...prev, isConnected: false }));
          }
        } catch (error) {
          console.error('Error checking MetaMask status:', error);
          setStatus(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Unknown error' }));
        }
      }
    } catch (error) {
      console.error('Error in checkMetaMaskStatus:', error);
      setStatus(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  // Connect to MetaMask
  const connectMetaMask = async () => {
    setIsLoading(true);
    setStatus(prev => ({ ...prev, error: null }));

    try {
      if (!status.isInstalled) {
        throw new Error('MetaMask is not installed');
      }

      const provider = window.ethereum;
      if (!provider) {
        throw new Error('No Ethereum provider found');
      }

      // Request accounts
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      
      // Get chain ID
      const chainId = await provider.request({ method: 'eth_chainId' });
      
      // Get balance
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      setStatus(prev => ({
        ...prev,
        isConnected: true,
        address,
        chainId,
        balance: (parseInt(balance, 16) / Math.pow(10, 18)).toString(),
        error: null
      }));

      addToast({
        message: `✅ MetaMask connected successfully!`,
        type: 'success'
      });

    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus(prev => ({ ...prev, error: errorMessage }));
      
      addToast({
        message: `❌ Failed to connect: ${errorMessage}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to Sepolia network
  const switchToSepolia = async () => {
    setIsLoading(true);
    
    try {
      const provider = window.ethereum;
      if (!provider) {
        throw new Error('No Ethereum provider found');
      }

      // Try to switch to Sepolia
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
      });

      // Re-check status after switch
      await checkMetaMaskStatus();
      
      addToast({
        message: '✅ Switched to Sepolia network',
        type: 'success'
      });

    } catch (error: any) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }],
          });
          
          await checkMetaMaskStatus();
          
          addToast({
            message: '✅ Added and switched to Sepolia network',
            type: 'success'
          });
        } catch (addError) {
          addToast({
            message: `❌ Failed to add Sepolia network: ${addError}`,
            type: 'error'
          });
        }
      } else {
        addToast({
          message: `❌ Failed to switch network: ${error.message}`,
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect MetaMask
  const disconnectMetaMask = async () => {
    try {
      // Note: MetaMask doesn't have a true "disconnect" method
      // We just clear the local state
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        address: null,
        chainId: null,
        balance: null
      }));

      addToast({
        message: '🔌 MetaMask disconnected (local state cleared)',
        type: 'info'
      });
    } catch (error) {
      addToast({
        message: `❌ Error disconnecting: ${error}`,
        type: 'error'
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">MetaMask Connection Test</h1>
        <p className="text-gray-300">
          Test MetaMask connection and network switching
        </p>
      </motion.div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Connection Status</h2>
          
          <div className="space-y-4">
            {/* MetaMask Installation */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">MetaMask Installed:</span>
              <span className={status.isInstalled ? 'text-green-400' : 'text-red-400'}>
                {status.isInstalled ? '✅ Yes' : '❌ No'}
              </span>
            </div>

            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Connected:</span>
              <span className={status.isConnected ? 'text-green-400' : 'text-red-400'}>
                {status.isConnected ? '✅ Yes' : '❌ No'}
              </span>
            </div>

            {/* Wallet Address */}
            {status.address && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Address:</span>
                <span className="font-mono text-blue-400 text-sm">
                  {status.address.slice(0, 6)}...{status.address.slice(-4)}
                </span>
              </div>
            )}

            {/* Chain ID */}
            {status.chainId && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Chain ID:</span>
                <span className="text-blue-400">
                  {parseInt(status.chainId, 16)} ({status.chainId})
                </span>
              </div>
            )}

            {/* Balance */}
            {status.balance && (
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Balance:</span>
                <span className="text-green-400">
                  {parseFloat(status.balance).toFixed(4)} ETH
                </span>
              </div>
            )}

            {/* Error */}
            {status.error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="text-red-300 text-sm">Error: {status.error}</div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Actions Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>
          
          <div className="space-y-4">
            {/* Connect Button */}
            <Button
              variant="primary"
              onClick={connectMetaMask}
              disabled={isLoading || !status.isInstalled || status.isConnected}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Connecting...
                </>
              ) : (
                '🔗 Connect MetaMask'
              )}
            </Button>

            {/* Switch to Sepolia */}
            <Button
              variant="secondary"
              onClick={switchToSepolia}
              disabled={isLoading || !status.isConnected}
              className="w-full"
            >
              🔄 Switch to Sepolia
            </Button>

            {/* Disconnect */}
            <Button
              variant="secondary"
              onClick={disconnectMetaMask}
              disabled={!status.isConnected}
              className="w-full"
            >
              🔌 Disconnect
            </Button>

            {/* Refresh Status */}
            <Button
              variant="secondary"
              onClick={checkMetaMaskStatus}
              disabled={isLoading}
              className="w-full"
            >
              🔄 Refresh Status
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Debug Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Debug Information</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Window Ethereum:</span>
              <span className={typeof window !== 'undefined' && window.ethereum ? 'text-green-400' : 'text-red-400'}>
                {typeof window !== 'undefined' && window.ethereum ? '✅ Available' : '❌ Not Available'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Is MetaMask:</span>
              <span className={typeof window !== 'undefined' && window.ethereum?.isMetaMask ? 'text-green-400' : 'text-red-400'}>
                {typeof window !== 'undefined' && window.ethereum?.isMetaMask ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Providers Count:</span>
              <span className="text-blue-400">
                {typeof window !== 'undefined' && (window.ethereum as any)?.providers ? 
                  (window.ethereum as any).providers.length : '0'}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
} 