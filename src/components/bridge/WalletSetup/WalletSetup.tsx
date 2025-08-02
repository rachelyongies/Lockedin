'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { 
  getWalletAddress, 
  isValidEthereumAddress, 
  formatAddress,
  DEFAULT_RPC_URLS,
  NETWORK_CONFIGS,
  switchToNetwork,
  checkWalletBalance,
  createCustomRPC,
  WalletConfig
} from '@/lib/utils/wallet-setup';

interface SetupState {
  walletAddress: string;
  selectedNetwork: 'SEPOLIA' | 'GOERLI';
  selectedRPC: 'PUBLIC' | 'INFURA' | 'ALCHEMY' | 'QUICKNODE' | 'CUSTOM';
  customRPCUrl: string;
  balance: string;
  isLoading: boolean;
  isConnected: boolean;
}

export default function WalletSetup() {
  const [setupState, setSetupState] = useState<SetupState>({
    walletAddress: '',
    selectedNetwork: 'SEPOLIA',
    selectedRPC: 'PUBLIC',
    customRPCUrl: '',
    balance: '0',
    isLoading: false,
    isConnected: false
  });

  const { addToast } = useToast();

  // Auto-detect wallet on mount
  useEffect(() => {
    detectWallet();
  }, []);

  // Detect wallet address
  const detectWallet = async () => {
    setSetupState(prev => ({ ...prev, isLoading: true }));

    try {
      const address = await getWalletAddress();
      
      if (address) {
        setSetupState(prev => ({ 
          ...prev, 
          walletAddress: address,
          isConnected: true,
          isLoading: false 
        }));
        
        addToast({
          message: `✅ Wallet detected: ${formatAddress(address)}`,
          type: 'success'
        });

        // Check balance
        await checkBalance(address);
      } else {
        setSetupState(prev => ({ ...prev, isLoading: false }));
        addToast({
          message: '❌ No wallet detected. Please connect MetaMask.',
          type: 'warning'
        });
      }
    } catch (error) {
      setSetupState(prev => ({ ...prev, isLoading: false }));
      addToast({
        message: `❌ Error detecting wallet: ${error}`,
        type: 'error'
      });
    }
  };

  // Connect wallet manually
  const connectWallet = async () => {
    setSetupState(prev => ({ ...prev, isLoading: true }));

    try {
      // Check if MetaMask is installed
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask first.');
      }

      // Request accounts from MetaMask
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask and try again.');
      }

      const address = accounts[0];
      
      setSetupState(prev => ({ 
        ...prev, 
        walletAddress: address,
        isConnected: true,
        isLoading: false 
      }));
      
      addToast({
        message: `✅ Wallet connected: ${formatAddress(address)}`,
        type: 'success'
      });

      // Check balance
      await checkBalance(address);
    } catch (error) {
      setSetupState(prev => ({ ...prev, isLoading: false }));
      addToast({
        message: `❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  // Check wallet balance
  const checkBalance = async (address?: string) => {
    const walletAddress = address || setupState.walletAddress;
    
    if (!walletAddress || !isValidEthereumAddress(walletAddress)) {
      addToast({
        message: '❌ Invalid wallet address',
        type: 'error'
      });
      return;
    }

    setSetupState(prev => ({ ...prev, isLoading: true }));

    try {
      // Get RPC URL
      let rpcUrl = '';
      
      if (setupState.selectedRPC === 'CUSTOM') {
        rpcUrl = setupState.customRPCUrl;
      } else {
        rpcUrl = DEFAULT_RPC_URLS[setupState.selectedNetwork][setupState.selectedRPC];
      }

      if (!rpcUrl) {
        throw new Error('Invalid RPC URL');
      }

      const result = await checkWalletBalance(walletAddress, rpcUrl);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setSetupState(prev => ({ 
        ...prev, 
        balance: result.balance,
        isLoading: false 
      }));

      addToast({
        message: `✅ Balance: ${result.balance} ETH`,
        type: 'success'
      });
    } catch (error) {
      setSetupState(prev => ({ ...prev, isLoading: false }));
      addToast({
        message: `❌ Balance check failed: ${error}`,
        type: 'error'
      });
    }
  };

  // Switch network
  const switchNetwork = async () => {
    setSetupState(prev => ({ ...prev, isLoading: true }));

    try {
      const success = await switchToNetwork(setupState.selectedNetwork);
      
      if (success) {
        addToast({
          message: `✅ Switched to ${NETWORK_CONFIGS[setupState.selectedNetwork].name}`,
          type: 'success'
        });

        // Re-check balance after network switch
        if (setupState.walletAddress) {
          await checkBalance();
        }
      } else {
        addToast({
          message: `❌ Failed to switch to ${setupState.selectedNetwork}`,
          type: 'error'
        });
      }
    } catch (error) {
      addToast({
        message: `❌ Network switch error: ${error}`,
        type: 'error'
      });
    } finally {
      setSetupState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Copy wallet config
  const copyWalletConfig = () => {
    const config: WalletConfig = createCustomRPC(
      setupState.selectedNetwork,
      setupState.selectedRPC === 'CUSTOM' 
        ? setupState.customRPCUrl 
        : DEFAULT_RPC_URLS[setupState.selectedNetwork][setupState.selectedRPC],
      setupState.walletAddress
    );

    const configText = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(configText);
    
    addToast({
      message: '📋 Wallet configuration copied to clipboard!',
      type: 'success'
    });
  };

  // Get RPC URL options
  const getRPCOptions = () => {
    const network = setupState.selectedNetwork;
    const rpcUrls = DEFAULT_RPC_URLS[network];
    
    return [
      { value: 'PUBLIC', label: 'Public RPC (Free)' },
      { value: 'INFURA', label: 'Infura (Requires API Key)' },
      { value: 'ALCHEMY', label: 'Alchemy (Requires API Key)' },
      { value: 'QUICKNODE', label: 'QuickNode (Requires API Key)' },
      { value: 'CUSTOM', label: 'Custom RPC URL' }
    ];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">Wallet Setup for 1inch Testing</h1>
        <p className="text-gray-300">
          Configure your wallet address and RPC settings for testing the 1inch integration
        </p>
      </motion.div>

      {/* Wallet Connection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">1. Wallet Connection</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Address
                </label>
                <Input
                  value={setupState.walletAddress}
                  onChange={(e) => setSetupState(prev => ({ ...prev, walletAddress: e.target.value }))}
                  placeholder="0x..."
                  className="font-mono"
                />
              </div>
              <Button
                variant="primary"
                onClick={connectWallet}
                disabled={setupState.isLoading}
              >
                {setupState.isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Connecting...
                  </>
                ) : (
                  '🔗 Connect Wallet'
                )}
              </Button>
            </div>

            {setupState.walletAddress && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-300">Connected Address:</div>
                    <div className="font-mono text-white">
                      {formatAddress(setupState.walletAddress)}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    setupState.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {setupState.isConnected ? '✅ Connected' : '❌ Not Connected'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Network Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">2. Network Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Network
              </label>
              <Select
                value={setupState.selectedNetwork}
                onValueChange={(value: string) => {
                  if (typeof value === 'string') {
                    setSetupState(prev => ({ 
                      ...prev, 
                      selectedNetwork: value as 'SEPOLIA' | 'GOERLI' 
                    }));
                  }
                }}
                options={[
                  { value: 'SEPOLIA', label: 'Sepolia Testnet (Recommended)' },
                  { value: 'GOERLI', label: 'Goerli Testnet' }
                ]}
              />
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">Network Info:</h3>
              <div className="text-xs text-blue-200 space-y-1">
                <div>Name: {NETWORK_CONFIGS[setupState.selectedNetwork].name}</div>
                <div>Chain ID: {NETWORK_CONFIGS[setupState.selectedNetwork].chainId}</div>
                <div>Explorer: {NETWORK_CONFIGS[setupState.selectedNetwork].explorer}</div>
                <div>Faucet: {NETWORK_CONFIGS[setupState.selectedNetwork].faucet}</div>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={switchNetwork}
              disabled={setupState.isLoading}
            >
              🔄 Switch to {setupState.selectedNetwork}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* RPC Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">3. RPC Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                RPC Provider
              </label>
              <Select
                value={setupState.selectedRPC}
                onValueChange={(value: string) => {
                  if (typeof value === 'string') {
                    setSetupState(prev => ({ 
                      ...prev, 
                      selectedRPC: value as 'PUBLIC' | 'INFURA' | 'ALCHEMY' | 'QUICKNODE' | 'CUSTOM' 
                    }));
                  }
                }}
                options={getRPCOptions()}
              />
            </div>

            {setupState.selectedRPC === 'CUSTOM' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Custom RPC URL
                </label>
                <Input
                  value={setupState.customRPCUrl}
                  onChange={(e) => setSetupState(prev => ({ ...prev, customRPCUrl: e.target.value }))}
                  placeholder="https://your-rpc-endpoint.com"
                />
              </div>
            )}

            {setupState.selectedRPC !== 'CUSTOM' && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-2">RPC URL:</div>
                <div className="font-mono text-xs text-gray-400 break-all">
                  {DEFAULT_RPC_URLS[setupState.selectedNetwork][setupState.selectedRPC]}
                </div>
              </div>
            )}

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-300 mb-2">💡 RPC Options:</h3>
              <div className="text-xs text-yellow-200 space-y-1">
                <div>• <strong>Public RPC:</strong> Free, but may be slow or unreliable</div>
                <div>• <strong>Infura/Alchemy/QuickNode:</strong> Faster, more reliable (requires API key)</div>
                <div>• <strong>Custom RPC:</strong> Your own RPC endpoint</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Balance Check */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">4. Balance Check</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">Current Balance:</div>
                  <div className="text-lg font-semibold text-white">
                    {setupState.balance} ETH
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => checkBalance()}
                  disabled={setupState.isLoading || !setupState.walletAddress}
                >
                  🔄 Refresh
                </Button>
              </div>
            </div>

            {parseFloat(setupState.balance) < 0.01 && setupState.walletAddress && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-300 mb-2">⚠️ Low Balance:</h3>
                <div className="text-xs text-red-200 space-y-1">
                  <div>You need at least 0.01 ETH for testing.</div>
                  <div>Get test tokens from: <a 
                    href={NETWORK_CONFIGS[setupState.selectedNetwork].faucet} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-red-100"
                  >
                    {NETWORK_CONFIGS[setupState.selectedNetwork].faucet}
                  </a></div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Configuration Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">5. Configuration Summary</h2>
          
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-300 mb-2">✅ Ready for Testing:</h3>
              <div className="text-xs text-green-200 space-y-1">
                <div>Wallet: {setupState.walletAddress ? formatAddress(setupState.walletAddress) : 'Not connected'}</div>
                <div>Network: {NETWORK_CONFIGS[setupState.selectedNetwork].name}</div>
                <div>RPC: {setupState.selectedRPC}</div>
                <div>Balance: {setupState.balance} ETH</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={copyWalletConfig}
                disabled={!setupState.walletAddress}
                className="flex-1"
              >
                📋 Copy Config
              </Button>
              
              <Button
                variant="secondary"
                onClick={() => window.open('/htlc-1inch-test', '_blank')}
                disabled={!setupState.walletAddress || parseFloat(setupState.balance) < 0.01}
                className="flex-1"
              >
                🚀 Start Testing
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* RPC Setup Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">🔧 How to Create Your Own RPC</h2>
          
          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">Option 1: Infura (Recommended)</h3>
              <div className="text-xs text-blue-200 space-y-1">
                <div>1. Go to <a href="https://infura.io" target="_blank" rel="noopener noreferrer" className="underline">infura.io</a></div>
                <div>2. Create a free account</div>
                <div>3. Create a new project</div>
                <div>4. Copy your project ID</div>
                <div>5. Use: https://sepolia.infura.io/v3/YOUR_PROJECT_ID</div>
              </div>
            </div>

            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-300 mb-2">Option 2: Alchemy</h3>
              <div className="text-xs text-purple-200 space-y-1">
                <div>1. Go to <a href="https://alchemy.com" target="_blank" rel="noopener noreferrer" className="underline">alchemy.com</a></div>
                <div>2. Create a free account</div>
                <div>3. Create a new app</div>
                <div>4. Copy your API key</div>
                <div>5. Use: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY</div>
              </div>
            </div>

            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-orange-300 mb-2">Option 3: QuickNode</h3>
              <div className="text-xs text-orange-200 space-y-1">
                <div>1. Go to <a href="https://quicknode.com" target="_blank" rel="noopener noreferrer" className="underline">quicknode.com</a></div>
                <div>2. Create a free account</div>
                <div>3. Create a new endpoint</div>
                <div>4. Copy your endpoint URL</div>
                <div>5. Use the provided endpoint URL directly</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
} 