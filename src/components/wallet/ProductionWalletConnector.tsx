// 🚀 PRODUCTION WALLET CONNECTOR
// Integrates multi-wallet manager with bridge interface for true deployment

'use client';

import React, { useState, useEffect } from 'react';
import { multiWalletManager, PRODUCTION_WALLETS, WalletConfig } from '@/lib/wallets/multi-wallet-manager';
import { NetworkManager, ETHEREUM_NETWORKS, BITCOIN_NETWORKS, SOLANA_NETWORKS } from '@/config/networks';

interface ConnectedWallet {
  name: string;
  type: string;
  address: string;
  chainId: number;
}

interface ProductionWalletConnectorProps {
  onWalletConnect?: (wallet: ConnectedWallet) => void;
  onWalletDisconnect?: (walletName: string) => void;
  requiredChains?: number[];
}

export function ProductionWalletConnector({
  onWalletConnect,
  onWalletDisconnect,
  requiredChains = [1, 11155111] // Ethereum mainnet, Sepolia by default
}: ProductionWalletConnectorProps) {
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([]);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<number>(11155111); // Default to Sepolia
  const [availableWallets, setAvailableWallets] = useState<WalletConfig[]>([]);

  // Update available wallets when chain changes
  useEffect(() => {
    const wallets = multiWalletManager.getAvailableWallets(selectedChain);
    setAvailableWallets(wallets);
  }, [selectedChain, connectedWallets]);

  // Get connected wallets on mount
  useEffect(() => {
    const wallets = multiWalletManager.getConnectedWallets();
    setConnectedWallets(wallets);
  }, []);

  // Connect wallet function
  const handleConnectWallet = async (walletName: string) => {
    setConnectingWallet(walletName);

    try {
      const result = await multiWalletManager.connectWallet(walletName, selectedChain);
      
      if (result.success && result.address) {
        const newWallet: ConnectedWallet = {
          name: walletName,
          type: PRODUCTION_WALLETS.find(w => w.name === walletName)?.type || 'evm',
          address: result.address,
          chainId: selectedChain
        };

        setConnectedWallets(prev => [...prev, newWallet]);
        onWalletConnect?.(newWallet);
      } else {
        alert(result.error || 'Failed to connect wallet');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Failed to connect wallet');
    } finally {
      setConnectingWallet(null);
    }
  };

  // Disconnect wallet function
  const handleDisconnectWallet = async (walletName: string) => {
    try {
      const success = await multiWalletManager.disconnectWallet(walletName);
      
      if (success) {
        setConnectedWallets(prev => prev.filter(w => w.name !== walletName));
        onWalletDisconnect?.(walletName);
      }
    } catch (error) {
      console.error('Wallet disconnection error:', error);
    }
  };

  // Get network info
  const getNetworkInfo = (chainId: number) => {
    return NetworkManager.getNetworkById(chainId);
  };

  // Get enabled networks for chain selector
  const getEnabledNetworks = () => {
    return NetworkManager.getEnabledNetworks().filter(network => 
      requiredChains.includes(network.id)
    );
  };

  return (
    <div className="production-wallet-connector">
      {/* Chain Selector */}
      <div className="chain-selector mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Network
        </label>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {getEnabledNetworks().map((network) => (
            <option key={network.id} value={network.id}>
              {network.name} ({network.type})
            </option>
          ))}
        </select>
      </div>

      {/* Connected Wallets */}
      {connectedWallets.length > 0 && (
        <div className="connected-wallets mb-6">
          <h3 className="text-lg font-semibold mb-3">Connected Wallets</h3>
          <div className="space-y-2">
            {connectedWallets.map((wallet) => {
              const networkInfo = getNetworkInfo(wallet.chainId);
              return (
                <div
                  key={`${wallet.name}-${wallet.chainId}`}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {wallet.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{wallet.name}</div>
                      <div className="text-sm text-gray-600">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {networkInfo?.name || `Chain ${wallet.chainId}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnectWallet(wallet.name)}
                    className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                  >
                    Disconnect
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Wallets */}
      <div className="available-wallets">
        <h3 className="text-lg font-semibold mb-3">
          Available Wallets for {getNetworkInfo(selectedChain)?.name}
        </h3>
        
        {availableWallets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No compatible wallets found for this network.</p>
            <p className="text-sm mt-2">
              Please install a supported wallet extension.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableWallets.map((wallet) => {
              const isConnected = connectedWallets.some(
                cw => cw.name === wallet.name && cw.chainId === selectedChain
              );
              const isConnecting = connectingWallet === wallet.name;

              return (
                <div
                  key={wallet.name}
                  className="wallet-option p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-600">
                          {wallet.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{wallet.name}</div>
                        <div className="text-sm text-gray-500 capitalize">
                          {wallet.type} wallet
                        </div>
                      </div>
                    </div>
                    
                    {isConnected ? (
                      <span className="px-3 py-1 text-sm text-green-600 bg-green-100 rounded">
                        Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConnectWallet(wallet.name)}
                        disabled={isConnecting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isConnecting ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                  
                  {!wallet.isInstalled() && wallet.downloadUrl && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-red-600 mb-2">
                        Wallet not installed
                      </p>
                      <a
                        href={wallet.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Download {wallet.name} →
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Production Status */}
      <div className="production-status mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
            <span className="text-white text-xs">🚀</span>
          </div>
          <div>
            <div className="font-medium text-blue-900">Production Ready</div>
            <div className="text-sm text-blue-700">
              Multi-wallet support active. Connected wallets: {connectedWallets.length}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Network: {getNetworkInfo(selectedChain)?.type === 'mainnet' ? 'Mainnet' : 'Testnet'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}