'use client';

import React, { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { BridgeForm } from '@/components/bridge/BridgeForm';
import { useToast } from '@/components/ui/Toast';
import { useWalletStore } from '@/store/useWalletStore';
import { Token } from '@/types/bridge';
import { solanaBridgeService } from '@/lib/services/solana-bridge-service';
import { SOLANA_TEST_CONFIG } from '@/config/solana-test';
import { SOL, ETH, BTC } from '@/config/tokens';

export default function SolanaTestPage() {
  // Wallet state
  const { isConnected, account, walletType, connect, disconnect } = useWalletStore();
  
  // Toast notifications
  const toast = useToast();
  
  // Test result interface
  interface TestResult {
    id: number;
    test: string;
    status: 'success' | 'error';
    message: string;
    data?: unknown;
    timestamp: number;
  }

  // Test state
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  // Add test result
  const addTestResult = (test: string, status: 'success' | 'error', message: string, data?: unknown) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      data,
      timestamp: Date.now()
    }]);
  };

  // Test Solana wallet connection
  const testWalletConnection = async () => {
    try {
      addTestResult('Wallet Connection', 'success', 'Testing wallet connection...');
      
      if (walletType === 'phantom') {
        addTestResult('Phantom Wallet', 'success', 'Phantom wallet detected and connected');
      } else {
        addTestResult('Wallet Type', 'error', `Expected Phantom wallet, got: ${walletType || 'none'}`);
      }
      
      if (account?.address) {
        addTestResult('Wallet Address', 'success', `Connected to: ${account.address}`);
      } else {
        addTestResult('Wallet Address', 'error', 'No wallet address found');
      }
    } catch (error) {
      addTestResult('Wallet Connection', 'error', `Connection failed: ${error}`);
    }
  };

  // Test Solana bridge quote
  const testBridgeQuote = async () => {
    try {
      addTestResult('Bridge Quote', 'success', 'Testing bridge quote generation...');
      
      const quote = await solanaBridgeService.getQuote(
        ETH,
        SOL,
        '1.0',
        SOLANA_TEST_CONFIG.testWalletAddress
      );
      
      addTestResult('Quote Generation', 'success', 'Quote generated successfully', {
        fromAmount: quote.fromAmount,
        toAmount: quote.toAmount,
        exchangeRate: quote.exchangeRate,
        fees: quote.totalFee
      });
    } catch (error) {
      addTestResult('Bridge Quote', 'error', `Quote failed: ${error}`);
    }
  };

  // Test Solana bridge execution
  const testBridgeExecution = async () => {
    try {
      addTestResult('Bridge Execution', 'success', 'Testing bridge execution...');
      
      const transaction = await solanaBridgeService.executeBridge(
        ETH,
        SOL,
        '0.1', // Small amount for testing
        SOLANA_TEST_CONFIG.testWalletAddress,
        undefined,
        (status, data) => {
          addTestResult('Bridge Progress', 'success', `Status: ${status}`, data);
        }
      );
      
      addTestResult('Bridge Transaction', 'success', 'Bridge transaction created', {
        id: transaction.id,
        status: transaction.status,
        fromAmount: transaction.fromAmount.formatted,
        toAmount: transaction.toAmount.formatted
      });
    } catch (error) {
      addTestResult('Bridge Execution', 'error', `Execution failed: ${error}`);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    try {
      await testWalletConnection();
      await testBridgeQuote();
      await testBridgeExecution();
      
      toast.success('Success', 'All tests completed!');
    } catch (error) {
      toast.error('Error', 'Some tests failed');
    } finally {
      setIsTesting(false);
    }
  };

  // Handle bridge
  const handleBridge = async (fromToken: Token, toToken: Token, amount: string) => {
    try {
      toast.info('Info', `Bridging ${amount} ${fromToken.symbol} to ${toToken.symbol}...`);
      
      const transaction = await solanaBridgeService.executeBridge(
        fromToken,
        toToken,
        amount,
        SOLANA_TEST_CONFIG.testWalletAddress,
        undefined,
        (status, data) => {
          console.log('Bridge progress:', status, data);
        }
      );
      
      toast.success('Bridge Successful', `Successfully bridged ${amount} ${fromToken.symbol} to ${toToken.symbol}!`, 7000);
      
      addTestResult('Manual Bridge', 'success', 'Manual bridge executed successfully', {
        transactionId: transaction.id,
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bridge failed';
      toast.error('Error', errorMessage);
      addTestResult('Manual Bridge', 'error', errorMessage);
    }
  };

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Solana Bridge Test
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Testing Solana bridge integration with your testnet wallet
            </p>
            
            {/* Test Wallet Info */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.5 20.5L12.5 16.5L8.5 12.5H23.5L19.5 16.5L23.5 20.5H8.5Z"/>
                  </svg>
                </div>
                <span className="font-semibold text-purple-800">Test Wallet</span>
              </div>
              <p className="text-sm text-purple-700 font-mono">
                {SOLANA_TEST_CONFIG.testWalletAddress}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Network: Devnet | Balance: {getTestBalance('SOL')} SOL
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bridge Form */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Bridge Interface</h2>
                <BridgeForm
                  onBridge={handleBridge}
                  onQuoteError={(error) => toast.error('Error', error )}
                  onError={(message) => toast.error('Error', message )}
                  onSuccess={(message) => toast.success('Success', message )}
                />
              </div>
            </div>

            {/* Test Results */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Test Results</h2>
                  <button
                    onClick={runAllTests}
                    disabled={isTesting}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isTesting ? 'Running Tests...' : 'Run All Tests'}
                  </button>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {testResults.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No test results yet. Click &quot;Run All Tests&quot; to start.</p>
                  ) : (
                    testResults.map((result) => (
                      <div
                        key={result.id}
                        className={`p-3 rounded-lg border ${
                          result.status === 'success' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${
                            result.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="font-semibold text-sm">{result.test}</span>
                        </div>
                        <p className="text-sm text-gray-700">{result.message}</p>
                        {result.data !== undefined && (
                          <pre className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
                            {String(JSON.stringify(result.data, null, 2))}
                          </pre>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Test Buttons */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Tests</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={testWalletConnection}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Test Wallet Connection
                  </button>
                  <button
                    onClick={testBridgeQuote}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Test Bridge Quote
                  </button>
                  <button
                    onClick={testBridgeExecution}
                    className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    Test Bridge Execution
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast notifications are handled by ToastProvider */}
    </PageWrapper>
  );
}

// Helper function to get test balance
function getTestBalance(symbol: string): string {
  return SOLANA_TEST_CONFIG.testData.mockBalances[symbol as keyof typeof SOLANA_TEST_CONFIG.testData.mockBalances] || '0';
} 