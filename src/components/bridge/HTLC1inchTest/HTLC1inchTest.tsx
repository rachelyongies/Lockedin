'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ethers } from 'ethers';
import { 
  getTokenAddress, 
  NETWORK_CHAIN_IDS, 
  COMMON_SWAP_PAIRS,
  createQuoteRequest 
} from '@/lib/utils/token-addresses';
import { 
  checkWalletBalance, 
  switchToTestnet, 
  getFaucetUrls,
  getTestnetConfig 
} from '@/lib/utils/testnet-faucets';
import { fusionAPI } from '@/lib/services/1inch-fusion';

interface TestState {
  step: 'setup' | 'connect' | 'balance' | 'quote' | 'swap' | 'complete';
  walletAddress: string;
  selectedNetwork: 'GOERLI' | 'SEPOLIA';
  selectedPair: { from: string; to: string; name: string };
  walletBalance: string;
  quoteAmount: string;
  quoteResult: any;
  isLoading: boolean;
}

export default function HTLC1inchTest() {
  const [testState, setTestState] = useState<TestState>({
    step: 'setup',
    walletAddress: '',
    selectedNetwork: 'SEPOLIA',
    selectedPair: { from: 'ETH', to: 'USDC', name: 'ETH → USDC' },
    walletBalance: '0',
    quoteAmount: '0.001',
    quoteResult: null,
    isLoading: false
  });
  
  const { addToast } = useToast();

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask;

  // Get available swap pairs for selected network
  const getAvailablePairs = () => {
    const chainId = testState.selectedNetwork === 'GOERLI' ? NETWORK_CHAIN_IDS.GOERLI : NETWORK_CHAIN_IDS.SEPOLIA;
    return COMMON_SWAP_PAIRS[testState.selectedNetwork] || [];
  };

  // Step 1: Connect wallet
  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      addToast({
        message: '❌ MetaMask is not installed. Please install MetaMask first.',
        type: 'error'
      });
      return;
    }

    setTestState(prev => ({ ...prev, isLoading: true }));

    try {
      const provider = new (window as any).ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setTestState(prev => ({ 
          ...prev, 
          walletAddress: address,
          step: 'balance',
          isLoading: false 
        }));
        
        addToast({
          message: `✅ Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`,
          type: 'success'
        });
      }
    } catch (error) {
      setTestState(prev => ({ ...prev, isLoading: false }));
      addToast({
        message: `❌ Failed to connect wallet: ${error}`,
        type: 'error'
      });
    }
  };

  // Step 2: Switch to testnet and check balance
  const switchNetworkAndCheckBalance = async () => {
    setTestState(prev => ({ ...prev, isLoading: true }));

    try {
      // Switch to testnet
      const switched = await switchToTestnet(testState.selectedNetwork);
      
      if (!switched) {
        addToast({
          message: `❌ Failed to switch to ${testState.selectedNetwork}`,
          type: 'error'
        });
        setTestState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Check balance
      const balanceResult = await checkWalletBalance(testState.walletAddress, testState.selectedNetwork);
      
      setTestState(prev => ({ 
        ...prev, 
        walletBalance: balanceResult.balance,
        step: balanceResult.hasBalance ? 'quote' : 'balance',
        isLoading: false 
      }));

      if (balanceResult.hasBalance) {
        addToast({
          message: `✅ Balance: ${balanceResult.balance} ETH on ${balanceResult.network}`,
          type: 'success'
        });
      } else {
        addToast({
          message: `⚠️ Low balance: ${balanceResult.balance} ETH. Get test tokens from faucet.`,
          type: 'warning'
        });
      }
    } catch (error) {
      setTestState(prev => ({ ...prev, isLoading: false }));
      addToast({
        message: `❌ Error: ${error}`,
        type: 'error'
      });
    }
  };

  // Step 3: Get quote
  const getQuote = async () => {
    if (!testState.walletAddress || !testState.quoteAmount) {
      addToast({
        message: '❌ Please enter wallet address and amount',
        type: 'error'
      });
      return;
    }

    setTestState(prev => ({ ...prev, isLoading: true }));

    try {
      const chainId = testState.selectedNetwork === 'GOERLI' ? NETWORK_CHAIN_IDS.GOERLI : NETWORK_CHAIN_IDS.SEPOLIA;
      
      const request = createQuoteRequest(
        testState.selectedPair.from,
        testState.selectedPair.to,
        ethers.parseUnits(testState.quoteAmount, 18).toString(),
        testState.walletAddress,
        chainId
      );

      console.log('Quote request:', request);

      const response = await fusionAPI.getQuote(request);
      
      setTestState(prev => ({ 
        ...prev, 
        quoteResult: response,
        step: 'swap',
        isLoading: false 
      }));

      addToast({
        message: `✅ Quote received: ${response.toTokenAmount} ${testState.selectedPair.to}`,
        type: 'success'
      });

      console.log('Quote response:', response);
    } catch (error) {
      setTestState(prev => ({ ...prev, isLoading: false }));
      addToast({
        message: `❌ Quote error: ${error}`,
        type: 'error'
      });
      console.error('Quote error:', error);
    }
  };

  // Step 4: Execute swap (simulated)
  const executeSwap = async () => {
    setTestState(prev => ({ ...prev, isLoading: true }));

    try {
      // Simulate swap execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTestState(prev => ({ 
        ...prev, 
        step: 'complete',
        isLoading: false 
      }));

      addToast({
        message: '✅ Swap executed successfully! (simulated)',
        type: 'success'
      });
    } catch (error) {
      setTestState(prev => ({ ...prev, isLoading: false }));
      addToast({
        message: `❌ Swap error: ${error}`,
        type: 'error'
      });
    }
  };

  // Reset test
  const resetTest = () => {
    setTestState({
      step: 'setup',
      walletAddress: '',
      selectedNetwork: 'SEPOLIA',
      selectedPair: { from: 'ETH', to: 'USDC', name: 'ETH → USDC' },
      walletBalance: '0',
      quoteAmount: '0.001',
      quoteResult: null,
      isLoading: false
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">1inch HTLC Integration Test</h1>
        <p className="text-gray-300">
          Test the 1inch API integration with real wallets and testnet tokens
        </p>
      </motion.div>

      {/* Progress Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Progress</h2>
          <div className="flex items-center justify-between mb-6">
            {['setup', 'connect', 'balance', 'quote', 'swap', 'complete'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  testState.step === step 
                    ? 'bg-blue-500 text-white' 
                    : index < ['setup', 'connect', 'balance', 'quote', 'swap', 'complete'].indexOf(testState.step)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {index + 1}
                </div>
                {index < 5 && (
                  <div className={`w-16 h-1 mx-2 ${
                    index < ['setup', 'connect', 'balance', 'quote', 'swap', 'complete'].indexOf(testState.step)
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-sm text-gray-400">
            Current step: {testState.step.toUpperCase()}
          </div>
        </Card>
      </motion.div>

      {/* Step 1: Setup */}
      {testState.step === 'setup' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Step 1: Setup</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Testnet Network
                </label>
                <Select
                  value={testState.selectedNetwork}
                  onValueChange={(value: string) => {
                    if (typeof value === 'string') {
                      setTestState(prev => ({ 
                        ...prev, 
                        selectedNetwork: value as 'GOERLI' | 'SEPOLIA',
                        selectedPair: { from: 'ETH', to: 'USDC', name: 'ETH → USDC' }
                      }));
                    }
                  }}
                  options={[
                    { value: 'SEPOLIA', label: 'Sepolia Testnet (Recommended)' },
                    { value: 'GOERLI', label: 'Goerli Testnet' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Swap Pair
                </label>
                <Select
                  value={testState.selectedPair.name}
                  onValueChange={(value: string) => {
                    if (typeof value === 'string') {
                      const pair = getAvailablePairs().find(p => p.name === value);
                      if (pair) {
                        setTestState(prev => ({ ...prev, selectedPair: pair }));
                      }
                    }
                  }}
                  options={getAvailablePairs().map(pair => ({
                    value: pair.name,
                    label: pair.name
                  }))}
                />
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">📋 Prerequisites:</h3>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>• MetaMask wallet installed</li>
                  <li>• Testnet tokens (get from faucet)</li>
                  <li>• 1inch API key configured</li>
                </ul>
              </div>

              <Button
                variant="primary"
                onClick={() => setTestState(prev => ({ ...prev, step: 'connect' }))}
                disabled={!isMetaMaskInstalled}
                className="w-full"
              >
                {!isMetaMaskInstalled ? '❌ MetaMask Not Installed' : 'Next: Connect Wallet'}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Connect Wallet */}
      {testState.step === 'connect' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Step 2: Connect Wallet</h2>
            
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-300 mb-2">⚠️ Important:</h3>
                <p className="text-xs text-yellow-200">
                  Make sure you have MetaMask installed and are ready to connect your wallet.
                  This will prompt MetaMask to request permission to connect.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={connectWallet}
                disabled={testState.isLoading}
                className="w-full"
              >
                {testState.isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Connecting...
                  </>
                ) : (
                  '🔗 Connect MetaMask Wallet'
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Check Balance */}
      {testState.step === 'balance' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Step 3: Check Balance</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-2">Wallet Address:</div>
                <div className="font-mono text-xs text-gray-400 break-all">
                  {testState.walletAddress}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-2">Current Balance:</div>
                <div className="text-lg font-semibold text-white">
                  {testState.walletBalance} ETH
                </div>
              </div>

              {parseFloat(testState.walletBalance) < 0.01 && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-300 mb-2">💧 Get Test Tokens:</h3>
                  <div className="space-y-2">
                    {getFaucetUrls(testState.selectedNetwork, 'ETH').map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-red-200 hover:text-red-100 underline"
                      >
                        Faucet {index + 1}: {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                onClick={switchNetworkAndCheckBalance}
                disabled={testState.isLoading}
                className="w-full"
              >
                {testState.isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Switching Network & Checking Balance...
                  </>
                ) : (
                  '🔄 Switch to Testnet & Check Balance'
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 4: Get Quote */}
      {testState.step === 'quote' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Step 4: Get Quote</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount to Swap ({testState.selectedPair.from})
                </label>
                <Input
                  type="number"
                  value={testState.quoteAmount}
                  onChange={(e) => setTestState(prev => ({ ...prev, quoteAmount: e.target.value }))}
                  placeholder="0.001"
                  min="0.0001"
                  max={testState.walletBalance}
                  step="0.0001"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Available: {testState.walletBalance} {testState.selectedPair.from}
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">📊 Swap Details:</h3>
                <div className="text-xs text-blue-200 space-y-1">
                  <div>From: {testState.selectedPair.from}</div>
                  <div>To: {testState.selectedPair.to}</div>
                  <div>Network: {getTestnetConfig(testState.selectedNetwork).name}</div>
                  <div>Amount: {testState.quoteAmount} {testState.selectedPair.from}</div>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={getQuote}
                disabled={testState.isLoading || parseFloat(testState.quoteAmount) <= 0}
                className="w-full"
              >
                {testState.isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Getting Quote...
                  </>
                ) : (
                  '💱 Get Quote from 1inch'
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 5: Execute Swap */}
      {testState.step === 'swap' && testState.quoteResult && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Step 5: Execute Swap</h2>
            
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-300 mb-2">✅ Quote Received:</h3>
                <div className="text-xs text-green-200 space-y-1">
                  <div>You will receive: {testState.quoteResult.toTokenAmount} {testState.selectedPair.to}</div>
                  <div>Price impact: {testState.quoteResult.priceImpact}%</div>
                  <div>Gas estimate: {testState.quoteResult.gas} gas</div>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-300 mb-2">⚠️ Note:</h3>
                <p className="text-xs text-yellow-200">
                  This is a simulation. In a real implementation, you would execute the swap
                  using the quote data and sign the transaction with your wallet.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={executeSwap}
                disabled={testState.isLoading}
                className="w-full"
              >
                {testState.isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Executing Swap...
                  </>
                ) : (
                  '🚀 Execute Swap (Simulated)'
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Step 6: Complete */}
      {testState.step === 'complete' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🎉 Test Complete!</h2>
            
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-300 mb-2">✅ Success:</h3>
                <div className="text-xs text-green-200 space-y-1">
                  <div>• Wallet connected successfully</div>
                  <div>• Network switched to {getTestnetConfig(testState.selectedNetwork).name}</div>
                  <div>• Quote received from 1inch API</div>
                  <div>• Swap executed (simulated)</div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">📊 Test Results:</h3>
                <div className="text-xs text-blue-200 space-y-1">
                  <div>Swap: {testState.quoteAmount} {testState.selectedPair.from} → {testState.quoteResult?.toTokenAmount} {testState.selectedPair.to}</div>
                  <div>Network: {getTestnetConfig(testState.selectedNetwork).name}</div>
                  <div>Wallet: {testState.walletAddress.slice(0, 6)}...{testState.walletAddress.slice(-4)}</div>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={resetTest}
                className="w-full"
              >
                🔄 Run Another Test
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Debug Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">MetaMask Installed:</span>
              <span className={isMetaMaskInstalled ? 'text-green-400' : 'text-red-400'}>
                {isMetaMaskInstalled ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Current Step:</span>
              <span className="text-blue-400">{testState.step.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Selected Network:</span>
              <span className="text-blue-400">{getTestnetConfig(testState.selectedNetwork).name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Swap Pair:</span>
              <span className="text-blue-400">{testState.selectedPair.name}</span>
            </div>
            {testState.walletAddress && (
              <div className="flex justify-between">
                <span className="text-gray-300">Wallet Address:</span>
                <span className="text-blue-400 font-mono text-xs">
                  {testState.walletAddress.slice(0, 6)}...{testState.walletAddress.slice(-4)}
                </span>
              </div>
            )}
            {testState.walletBalance && (
              <div className="flex justify-between">
                <span className="text-gray-300">Wallet Balance:</span>
                <span className="text-green-400">{testState.walletBalance} ETH</span>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
} 