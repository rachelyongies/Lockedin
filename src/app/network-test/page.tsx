'use client';

import React, { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface NetworkInfo {
  chainId: number;
  name: string;
  isTestnet: boolean;
  rpcUrl: string;
  explorer: string;
  currency: string;
}

const NETWORKS: Record<number, NetworkInfo> = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    isTestnet: false,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    explorer: 'https://etherscan.io',
    currency: 'ETH'
  },
  137: {
    chainId: 137,
    name: 'Polygon Mainnet',
    isTestnet: false,
    rpcUrl: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    currency: 'MATIC'
  },
  56: {
    chainId: 56,
    name: 'BSC Mainnet',
    isTestnet: false,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    currency: 'BNB'
  },
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    isTestnet: true,
    rpcUrl: 'https://eth-sepolia.public.blastapi.io',
    explorer: 'https://sepolia.etherscan.io',
    currency: 'ETH'
  },
  80001: {
    chainId: 80001,
    name: 'Mumbai Testnet',
    isTestnet: true,
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    explorer: 'https://mumbai.polygonscan.com',
    currency: 'MATIC'
  },
  97: {
    chainId: 97,
    name: 'BSC Testnet',
    isTestnet: true,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com',
    currency: 'BNB'
  }
};

export default function NetworkTestPage() {
  const [currentNetwork, setCurrentNetwork] = useState<NetworkInfo | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Not connected');
  const { addToast } = useToast();

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && window.ethereum;

  // Detect current network on mount
  useEffect(() => {
    if (isMetaMaskInstalled) {
      detectCurrentNetwork();
    }
  }, [isMetaMaskInstalled]);

  // Listen for network changes
  useEffect(() => {
    if (isMetaMaskInstalled && window.ethereum) {
      window.ethereum.on('chainChanged', (...args: unknown[]) => {
        const chainId = args[0] as string;
        const newChainId = parseInt(chainId, 16);
        setCurrentNetwork(NETWORKS[newChainId] || null);
        addToast({
          title: 'Network Changed',
          message: `Network changed to: ${NETWORKS[newChainId]?.name || 'Unknown'}`,
          type: 'info'
        });
      });

      window.ethereum.on('accountsChanged', (...args: unknown[]) => {
        const accounts = args[0] as string[];
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          fetchBalance(accounts[0]);
        } else {
          setWalletAddress('');
          setBalance('');
          setConnectionStatus('Disconnected');
        }
      });
    }
  }, [isMetaMaskInstalled, addToast]);

  const detectCurrentNetwork = async () => {
    try {
      const chainId = await window.ethereum!.request({ method: 'eth_chainId' });
      const networkId = parseInt(chainId as string, 16);
      const network = NETWORKS[networkId];
      
      setCurrentNetwork(network || null);
      
      if (network) {
        addToast({
          title: 'Network Detected',
          message: `Detected: ${network.name}`,
          type: 'success'
        });
      } else {
        addToast({
          title: 'Unknown Network',
          message: `Unknown network: Chain ID ${networkId}`,
          type: 'warning'
        });
      }
    } catch (error) {
      addToast({
        title: 'Detection Failed',
        message: `Failed to detect network: ${error}`,
        type: 'error'
      });
    }
  };

  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      addToast({
        title: 'Wallet Not Found',
        message: 'MetaMask not installed',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    try {
      const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setConnectionStatus('Connected');
        await fetchBalance(accounts[0]);
        addToast({
          title: 'Wallet Connected',
          message: `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
          type: 'success'
        });
      }
    } catch (error) {
      addToast({
        title: 'Connection Failed',
        message: `Connection failed: ${error}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalance = async (address: string) => {
    try {
      const balanceHex = await window.ethereum!.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      }) as string;
      const balanceWei = parseInt(balanceHex, 16);
      const balanceEth = balanceWei / Math.pow(10, 18);
      setBalance(balanceEth.toFixed(6));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setBalance('Error');
    }
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!isMetaMaskInstalled) return;

    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        const network = NETWORKS[targetChainId];
        if (network) {
          try {
            await window.ethereum!.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: network.name,
                nativeCurrency: {
                  name: network.currency,
                  symbol: network.currency,
                  decimals: 18
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.explorer]
              }],
            });
          } catch (addError) {
            addToast({
              title: 'Network Add Failed',
              message: `Failed to add network: ${addError}`,
              type: 'error'
            });
          }
        }
      } else {
        addToast({
          title: 'Network Switch Failed',
          message: `Failed to switch network: ${switchError}`,
          type: 'error'
        });
      }
    }
  };

  const testRPCConnection = async () => {
    if (!currentNetwork) return;

    setIsLoading(true);
    try {
      const response = await fetch(currentNetwork.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      
      if (data.result) {
        const blockNumber = parseInt(data.result, 16);
        addToast({
          title: 'RPC Test Success',
          message: `RPC Connected! Latest block: ${blockNumber}`,
          type: 'success'
        });
      } else {
        addToast({
          title: 'RPC Test Failed',
          message: 'RPC test failed',
          type: 'error'
        });
      }
    } catch (error) {
      addToast({
        title: 'RPC Test Error',
        message: `RPC test failed: ${error}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Network Detection Test"
      description="Test network detection, RPC connections, and wallet integration"
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Network Detection & RPC Test</h1>

        {/* MetaMask Status */}
        <Card className="p-6 mb-6 bg-gray-800 border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">MetaMask Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-300">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${isMetaMaskInstalled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isMetaMaskInstalled ? '✅ Installed' : '❌ Not Installed'}
              </span>
            </div>
            <div>
              <span className="text-gray-300">Connection:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${walletAddress ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {connectionStatus}
              </span>
            </div>
          </div>
          
          {!isMetaMaskInstalled && (
            <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded">
              Please install MetaMask to test network detection
            </div>
          )}
        </Card>

        {/* Current Network Info */}
        {currentNetwork && (
          <Card className="p-6 mb-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Current Network</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-300">Network:</span>
                <span className="ml-2 font-semibold text-white">{currentNetwork.name}</span>
              </div>
              <div>
                <span className="text-gray-300">Chain ID:</span>
                <span className="ml-2 font-mono text-white">{currentNetwork.chainId}</span>
              </div>
              <div>
                <span className="text-gray-300">Type:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${currentNetwork.isTestnet ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {currentNetwork.isTestnet ? '🧪 Testnet' : '🌐 Mainnet'}
                </span>
              </div>
              <div>
                <span className="text-gray-300">Currency:</span>
                <span className="ml-2 font-semibold text-white">{currentNetwork.currency}</span>
              </div>
            </div>
            
            <div className="mt-4">
              <span className="text-gray-300">RPC URL:</span>
              <div className="mt-1 p-2 bg-gray-900 rounded font-mono text-sm text-gray-300 break-all">
                {currentNetwork.rpcUrl}
              </div>
            </div>
            
            <div className="mt-4">
              <span className="text-gray-300">Explorer:</span>
              <div className="mt-1 p-2 bg-gray-900 rounded font-mono text-sm text-gray-300 break-all">
                {currentNetwork.explorer}
              </div>
            </div>
          </Card>
        )}

        {/* Wallet Info */}
        {walletAddress && (
          <Card className="p-6 mb-6 bg-gray-800 border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Wallet Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-300">Address:</span>
                <div className="mt-1 p-2 bg-gray-900 rounded font-mono text-sm text-white">
                  {walletAddress}
                </div>
              </div>
              <div>
                <span className="text-gray-300">Balance:</span>
                <div className="mt-1 p-2 bg-gray-900 rounded font-mono text-sm text-white">
                  {balance} {currentNetwork?.currency}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <Card className="p-6 mb-6 bg-gray-800 border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={connectWallet}
              disabled={!isMetaMaskInstalled || isLoading}
              className="w-full"
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
            
            <Button
              onClick={detectCurrentNetwork}
              disabled={!isMetaMaskInstalled}
              variant="secondary"
              className="w-full"
            >
              Detect Network
            </Button>
            
            <Button
              onClick={testRPCConnection}
              disabled={!currentNetwork || isLoading}
              variant="secondary"
              className="w-full"
            >
              Test RPC Connection
            </Button>
          </div>
        </Card>

        {/* Network Switching */}
        <Card className="p-6 bg-gray-800 border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Switch Networks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(NETWORKS).map((network) => (
              <Button
                key={network.chainId}
                onClick={() => switchNetwork(network.chainId)}
                disabled={!isMetaMaskInstalled}
                variant={currentNetwork?.chainId === network.chainId ? "primary" : "secondary"}
                className="w-full"
              >
                <div className="text-left">
                  <div className="font-semibold">{network.name}</div>
                  <div className="text-xs opacity-75">
                    {network.isTestnet ? '🧪 Testnet' : '🌐 Mainnet'}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
} 