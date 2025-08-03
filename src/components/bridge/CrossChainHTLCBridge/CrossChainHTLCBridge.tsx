'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  createOneInchFusionSDK, 
  CrossChainSwapRequest, 
  CrossChainSwapResult,
  HTLCEscrow 
} from '@/lib/services/1inch-fusion-sdk';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';

export default function CrossChainHTLCBridge() {
  const [sdk, setSdk] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapResult, setSwapResult] = useState<CrossChainSwapResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [refunding, setRefunding] = useState(false);

  // Form state
  const [swapRequest, setSwapRequest] = useState<CrossChainSwapRequest>({
    fromChain: 'ethereum',
    toChain: 'bitcoin',
    fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe', // ETH
    toToken: 'BTC',
    amount: '0.1',
    userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    recipientAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    timelock: 3600 // 1 hour
  });

  // Test data
  const [testData, setTestData] = useState({
    escrowFactoryAddress: '',
    activeOrders: [] as any[],
    supportedTokens: [] as any[]
  });

  useEffect(() => {
    // Initialize SDK
    const initSDK = async () => {
      try {
        const fusionSDK = createOneInchFusionSDK();
        setSdk(fusionSDK);
        console.log('✅ 1inch Fusion+ SDK initialized');
      } catch (err) {
        console.error('❌ Failed to initialize SDK:', err);
        setError('Failed to initialize SDK');
      }
    };

    initSDK();
  }, []);

  const createCrossChainSwap = async () => {
    if (!sdk) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Creating cross-chain swap:', swapRequest);
      const result = await sdk.createCrossChainSwap(swapRequest);
      
      console.log('✅ Cross-chain swap created:', result);
      setSwapResult(result);
      
    } catch (err) {
      console.error('❌ Failed to create cross-chain swap:', err);
      setError(err instanceof Error ? err.message : 'Failed to create cross-chain swap');
    } finally {
      setLoading(false);
    }
  };

  const executeHTLC = async () => {
    if (!sdk || !swapResult) return;

    try {
      setExecuting(true);
      setError(null);

      console.log('🚀 Executing HTLC:', swapResult.htlcEscrow.orderHash);
      const result = await sdk.executeHTLC(swapResult.htlcEscrow);
      
      console.log('✅ HTLC executed:', result);
      alert(`HTLC Executed!\nSource TX: ${result.sourceTxHash}\nDestination TX: ${result.destinationTxHash || 'N/A'}`);
      
      // Update status
      swapResult.htlcEscrow.status = 'completed';
      setSwapResult({ ...swapResult });
      
    } catch (err) {
      console.error('❌ Failed to execute HTLC:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute HTLC');
    } finally {
      setExecuting(false);
    }
  };

  const refundHTLC = async () => {
    if (!sdk || !swapResult) return;

    try {
      setRefunding(true);
      setError(null);

      console.log('💸 Refunding HTLC:', swapResult.htlcEscrow.orderHash);
      const result = await sdk.refundHTLC(swapResult.htlcEscrow);
      
      console.log('✅ HTLC refunded:', result);
      alert(`HTLC Refunded!\nSource TX: ${result.sourceTxHash}\nDestination TX: ${result.destinationTxHash || 'N/A'}`);
      
      // Update status
      swapResult.htlcEscrow.status = 'refunded';
      setSwapResult({ ...swapResult });
      
    } catch (err) {
      console.error('❌ Failed to refund HTLC:', err);
      setError(err instanceof Error ? err.message : 'Failed to refund HTLC');
    } finally {
      setRefunding(false);
    }
  };

  const getEscrowFactoryAddress = async () => {
    if (!sdk) return;

    try {
      setLoading(true);
      const address = await sdk.getEscrowFactoryAddress(1);
      console.log('✅ Escrow factory address:', address);
      setTestData(prev => ({ ...prev, escrowFactoryAddress: address }));
    } catch (err) {
      console.error('❌ Failed to get escrow factory:', err);
      setError('Failed to get escrow factory address');
    } finally {
      setLoading(false);
    }
  };

  const getActiveOrders = async () => {
    if (!sdk) return;

    try {
      setLoading(true);
      const orders = await sdk.getActiveOrders(1);
      console.log('✅ Active orders:', orders);
      setTestData(prev => ({ ...prev, activeOrders: orders }));
    } catch (err) {
      console.error('❌ Failed to get active orders:', err);
      setError('Failed to get active orders');
    } finally {
      setLoading(false);
    }
  };

  const getSupportedTokens = async () => {
    if (!sdk) return;

    try {
      setLoading(true);
      const tokens = await sdk.getSupportedTokens(1);
      console.log('✅ Supported tokens:', tokens);
      setTestData(prev => ({ ...prev, supportedTokens: tokens.slice(0, 10) })); // Show first 10
    } catch (err) {
      console.error('❌ Failed to get supported tokens:', err);
      setError('Failed to get supported tokens');
    } finally {
      setLoading(false);
    }
  };

  const testWorkingEndpoint = async () => {
    try {
      setLoading(true);
      console.log('🧪 Testing working cURL endpoint...');
      
      // Test the exact endpoint from the working cURL
      const response = await fetch('/api/1inch?path=/fusion-plus/orders/v1.0/order/escrow&chainId=1');
      const data = await response.json();
      
      console.log('✅ Working endpoint response:', data);
      alert(`Working endpoint test successful!\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      console.error('❌ Working endpoint test failed:', err);
      setError('Working endpoint test failed');
    } finally {
      setLoading(false);
    }
  };

  const isHTLCExpired = swapResult ? sdk?.isHTLCExpired(swapResult.htlcEscrow) : false;
  const timeUntilExpiry = swapResult ? sdk?.getTimeUntilExpiry(swapResult.htlcEscrow) : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Cross-Chain HTLC Bridge
        </h1>
        <p className="text-gray-400">
          ETH ↔ BTC bridging using 1inch Fusion+ HTLC escrows
        </p>
      </div>

      {/* SDK Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">SDK Status</h2>
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${sdk ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-white">
            {sdk ? '✅ 1inch Fusion+ SDK Ready' : '❌ SDK Not Initialized'}
          </span>
        </div>
      </Card>

      {/* Test API Endpoints */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Test API Endpoints</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Button
            onClick={getEscrowFactoryAddress}
            disabled={loading || !sdk}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            🏭 Get Escrow Factory
          </Button>
          
          <Button
            onClick={getActiveOrders}
            disabled={loading || !sdk}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            📋 Get Active Orders
          </Button>
          
          <Button
            onClick={getSupportedTokens}
            disabled={loading || !sdk}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            🪙 Get Supported Tokens
          </Button>
        </div>

        <div className="mb-4">
          <Button
            onClick={testWorkingEndpoint}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            🧪 Test Working cURL Endpoint
          </Button>
        </div>

        {/* Test Results */}
        {testData.escrowFactoryAddress && (
          <div className="mb-4 p-4 bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Escrow Factory Address</h4>
            <p className="text-white font-mono text-sm break-all">
              {testData.escrowFactoryAddress}
            </p>
          </div>
        )}

        {testData.activeOrders.length > 0 && (
          <div className="mb-4 p-4 bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Active Orders ({testData.activeOrders.length})</h4>
            <div className="space-y-2">
              {testData.activeOrders.slice(0, 3).map((order, index) => (
                <div key={index} className="text-white text-sm">
                  <span className="font-mono">{order.orderHash.substring(0, 20)}...</span>
                  <span className="ml-2 text-gray-400">({order.status})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {testData.supportedTokens.length > 0 && (
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Supported Tokens ({testData.supportedTokens.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {testData.supportedTokens.map((token, index) => (
                <div key={index} className="text-white text-sm">
                  {token.symbol}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Create Cross-Chain Swap Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Create Cross-Chain HTLC Swap</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-white font-medium">From Chain</label>
            <select
              value={swapRequest.fromChain}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, fromChain: e.target.value as 'ethereum' | 'bitcoin' }))}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 mt-1"
            >
              <option value="ethereum">Ethereum (Mainnet)</option>
              <option value="bitcoin">Bitcoin</option>
            </select>
          </div>
          
          <div>
            <label className="text-white font-medium">To Chain</label>
            <select
              value={swapRequest.toChain}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, toChain: e.target.value as 'ethereum' | 'bitcoin' }))}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 mt-1"
            >
              <option value="bitcoin">Bitcoin</option>
              <option value="ethereum">Ethereum (Mainnet)</option>
            </select>
          </div>
          
          <div>
            <label className="text-white font-medium">From Token</label>
            <Input
              value={swapRequest.fromToken}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, fromToken: e.target.value }))}
              placeholder="Token address"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-white font-medium">To Token</label>
            <Input
              value={swapRequest.toToken}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, toToken: e.target.value }))}
              placeholder="Token symbol"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-white font-medium">Amount</label>
            <Input
              value={swapRequest.amount}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.1"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-white font-medium">User Address</label>
            <Input
              value={swapRequest.userAddress}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, userAddress: e.target.value }))}
              placeholder="0x..."
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-white font-medium">Recipient Address</label>
            <Input
              value={swapRequest.recipientAddress || ''}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, recipientAddress: e.target.value }))}
              placeholder="0x... (optional)"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-white font-medium">Timelock (seconds)</label>
            <Input
              value={swapRequest.timelock?.toString() || '3600'}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, timelock: parseInt(e.target.value) || 3600 }))}
              placeholder="3600"
              className="mt-1"
            />
          </div>
        </div>

        <Button
          onClick={createCrossChainSwap}
          disabled={loading || !sdk}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? <Spinner size="sm" /> : '🔒 Create Cross-Chain HTLC'}
        </Button>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-6 border-red-500 bg-red-900/20">
          <h3 className="text-red-400 font-semibold mb-2">Error</h3>
          <p className="text-red-300">{error}</p>
        </Card>
      )}

      {/* Swap Results Display */}
      {swapResult && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Cross-Chain HTLC Created</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-400">Source Order Hash</h4>
              <p className="text-white font-mono text-sm truncate">
                {swapResult.sourceOrder.orderHash}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Secret Hash</h4>
              <p className="text-white font-mono text-sm truncate">
                {swapResult.htlcEscrow.secretHash}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Source Chain</h4>
              <p className="text-white text-sm capitalize">
                {swapResult.htlcEscrow.sourceChain}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Destination Chain</h4>
              <p className="text-white text-sm capitalize">
                {swapResult.htlcEscrow.destinationChain}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Timelock</h4>
              <p className="text-white text-sm">
                {new Date(swapResult.htlcEscrow.expiresAt).toLocaleString()}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Status</h4>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                swapResult.htlcEscrow.status === 'completed' ? 'bg-green-900 text-green-300' :
                swapResult.htlcEscrow.status === 'refunded' ? 'bg-red-900 text-red-300' :
                isHTLCExpired ? 'bg-yellow-900 text-yellow-300' :
                'bg-blue-900 text-blue-300'
              }`}>
                {isHTLCExpired ? 'Expired' : swapResult.htlcEscrow.status}
              </span>
            </div>
          </div>

          {/* Time until expiry */}
          {!isHTLCExpired && timeUntilExpiry > 0 && (
            <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
              <h4 className="text-yellow-400 font-medium mb-2">Time Until Expiry</h4>
              <p className="text-yellow-300">
                {Math.floor(timeUntilExpiry / 60)} minutes {Math.floor(timeUntilExpiry % 60)} seconds
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {swapResult.htlcEscrow.status === 'pending' && !isHTLCExpired && (
              <Button
                onClick={executeHTLC}
                disabled={executing || !sdk}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {executing ? <Spinner size="sm" /> : '🚀 Execute HTLC'}
              </Button>
            )}
            
            {swapResult.htlcEscrow.status === 'pending' && isHTLCExpired && (
              <Button
                onClick={refundHTLC}
                disabled={refunding || !sdk}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {refunding ? <Spinner size="sm" /> : '💸 Refund HTLC'}
              </Button>
            )}
            
            {swapResult.htlcEscrow.status === 'completed' && (
              <div className="text-green-400 font-medium">
                ✅ HTLC Successfully Executed
              </div>
            )}
            
            {swapResult.htlcEscrow.status === 'refunded' && (
              <div className="text-red-400 font-medium">
                💸 HTLC Successfully Refunded
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Architecture Info */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Cross-Chain HTLC Architecture</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p><strong>1. HTLC Creation:</strong> Generate secret hash, create escrows on both chains</p>
          <p><strong>2. Auction Data:</strong> Generate salt and suffix using 1inch Fusion+ SDK</p>
          <p><strong>3. Order Creation:</strong> Create HTLC orders with same secret hash</p>
          <p><strong>4. Secret Submission:</strong> Submit secret to execute both escrows atomically</p>
          <p><strong>5. Cross-Chain:</strong> ETH ↔ BTC bridging with same HTLC hash</p>
        </div>
      </Card>
    </div>
  );
} 