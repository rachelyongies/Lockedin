'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface DebugInfo {
  metamaskInstalled: boolean;
  walletConnected: boolean;
  walletAddress: string;
  chainId: number;
  networkName: string;
  isTestnet: boolean;
  rpcUrl: string;
  balance: string;
  balanceError: string;
  rpcTestResult: string;
}

export function BridgeDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    metamaskInstalled: false,
    walletConnected: false,
    walletAddress: '',
    chainId: 0,
    networkName: 'Unknown',
    isTestnet: false,
    rpcUrl: '',
    balance: '',
    balanceError: '',
    rpcTestResult: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  // Check MetaMask installation
  useEffect(() => {
    const checkMetaMask = () => {
      const installed = typeof window !== 'undefined' && !!window.ethereum;
      setDebugInfo(prev => ({ ...prev, metamaskInstalled: installed }));
    };
    checkMetaMask();
  }, []);

  // Check wallet connection
  const checkWalletConnection = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      const connected = accounts && accounts.length > 0;
      
      setDebugInfo(prev => ({
        ...prev,
        walletConnected: connected,
        walletAddress: connected ? accounts[0] : ''
      }));

      if (connected) {
        await checkNetworkInfo();
        await fetchBalance(accounts[0]);
      }
    } catch (error) {
      console.error('Wallet connection check failed:', error);
      setDebugInfo(prev => ({ ...prev, balanceError: `Connection error: ${error}` }));
    }
  };

  // Check network information
  const checkNetworkInfo = async () => {
    if (!window.ethereum) return;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      const networkId = parseInt(chainId, 16);
      
      const networks: Record<number, { name: string; isTestnet: boolean; rpcUrl: string }> = {
        1: { name: 'Ethereum Mainnet', isTestnet: false, rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo' },
        11155111: { name: 'Sepolia Testnet', isTestnet: true, rpcUrl: 'https://eth-sepolia.g.alchemy.com/public' },
        137: { name: 'Polygon Mainnet', isTestnet: false, rpcUrl: 'https://polygon-rpc.com' },
        80001: { name: 'Mumbai Testnet', isTestnet: true, rpcUrl: 'https://rpc-mumbai.maticvigil.com' }
      };

      const network = networks[networkId] || { name: 'Unknown', isTestnet: false, rpcUrl: '' };

      setDebugInfo(prev => ({
        ...prev,
        chainId: networkId,
        networkName: network.name,
        isTestnet: network.isTestnet,
        rpcUrl: network.rpcUrl
      }));
    } catch (error) {
      console.error('Network check failed:', error);
      setDebugInfo(prev => ({ ...prev, balanceError: `Network error: ${error}` }));
    }
  };

  // Fetch balance
  const fetchBalance = async (address: string) => {
    if (!window.ethereum) return;

    try {
      const balanceHex = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      }) as string;
      const balanceWei = parseInt(balanceHex, 16);
      const balanceEth = balanceWei / Math.pow(10, 18);
      
      setDebugInfo(prev => ({
        ...prev,
        balance: balanceEth.toFixed(6),
        balanceError: ''
      }));
    } catch (error) {
      console.error('Balance fetch failed:', error);
      setDebugInfo(prev => ({ ...prev, balanceError: `Balance error: ${error}` }));
    }
  };

  // Test RPC connection
  const testRPCConnection = async () => {
    if (!debugInfo.rpcUrl) return;

    setIsLoading(true);
    try {
      const response = await fetch(debugInfo.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setDebugInfo(prev => ({ ...prev, rpcTestResult: `✅ Connected! Block: ${blockNumber}` }));
      } else {
        setDebugInfo(prev => ({ ...prev, rpcTestResult: `❌ Failed: ${JSON.stringify(data)}` }));
      }
    } catch (error) {
      setDebugInfo(prev => ({ ...prev, rpcTestResult: `❌ Error: ${error}` }));
    } finally {
      setIsLoading(false);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) return;

    setIsLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (accounts && accounts.length > 0) {
        setDebugInfo(prev => ({
          ...prev,
          walletConnected: true,
          walletAddress: accounts[0]
        }));
        await checkNetworkInfo();
        await fetchBalance(accounts[0]);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setDebugInfo(prev => ({ ...prev, balanceError: `Connection failed: ${error}` }));
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = (...args: unknown[]) => {
        const chainId = args[0] as string;
        console.log('Chain changed:', chainId);
        checkWalletConnection();
      };

      const handleAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0] as string[];
        console.log('Accounts changed:', accounts);
        checkWalletConnection();
      };

      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);

      // Initial check
      checkWalletConnection();

      return () => {
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  return (
    <Card className="p-6 bg-gray-800 border-gray-700 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">Your connection</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      
        <div>
          <span className="text-gray-300">Wallet:</span>
          <span className={`ml-2 px-2 py-1 rounded text-sm ${debugInfo.walletConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {debugInfo.walletConnected ? '✅ Connected' : '❌ Disconnected'}
          </span>
        </div>
        
        <div>
          <span className="text-gray-300">Network:</span>
          <span className="ml-2 font-semibold text-white">{debugInfo.networkName}</span>
        </div>
        
        <div>
          <span className="text-gray-300">Chain ID:</span>
          <span className="ml-2 font-mono text-white">{debugInfo.chainId}</span>
        </div>
        
        <div>
          <span className="text-gray-300">Type:</span>
          <span className={`ml-2 px-2 py-1 rounded text-sm ${debugInfo.isTestnet ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
            {debugInfo.isTestnet ? '🧪 Testnet' : '🌐 Mainnet'}
          </span>
        </div>
        
        <div>
          <span className="text-gray-300">Balance:</span>
          <span className="ml-2 font-mono text-white">
            {debugInfo.balance ? `${debugInfo.balance} ETH` : 'Not loaded'}
          </span>
        </div>
      </div>

      {debugInfo.walletAddress && (
        <div className="mb-4">
          <span className="text-gray-300">Address:</span>
          <div className="mt-1 p-2 bg-gray-900 rounded font-mono text-sm text-white break-all">
            {debugInfo.walletAddress}
          </div>
        </div>
      )}

      {debugInfo.rpcUrl && (
        <div className="mb-4">
          <span className="text-gray-300">RPC URL:</span>
          <div className="mt-1 p-2 bg-gray-900 rounded font-mono text-sm text-gray-300 break-all">
            {debugInfo.rpcUrl}
          </div>
        </div>
      )}

      {debugInfo.balanceError && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          <strong>Error:</strong> {debugInfo.balanceError}
        </div>
      )}

      {debugInfo.rpcTestResult && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">
          <strong>RPC Test:</strong> {debugInfo.rpcTestResult}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={connectWallet}
          disabled={!debugInfo.metamaskInstalled || isLoading}
          size="sm"
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </Button>
        
        <Button
          onClick={testRPCConnection}
          disabled={!debugInfo.rpcUrl || isLoading}
          variant="secondary"
          size="sm"
        >
          Test RPC
        </Button>
        
        <Button
          onClick={checkWalletConnection}
          disabled={!debugInfo.metamaskInstalled}
          variant="secondary"
          size="sm"
        >
          Refresh
        </Button>
      </div>
    </Card>
  );
} 