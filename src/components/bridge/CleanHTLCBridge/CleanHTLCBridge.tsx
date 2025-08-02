'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
// import { createCleanHTLCIntegration, HTLCIntegrationResult } from '@/lib/services/clean-htlc-integration';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';

export default function CleanHTLCBridge() {
  const [integration, setIntegration] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HTLCIntegrationResult | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [executing, setExecuting] = useState(false);

  // Form state
  const [swapRequest, setSwapRequest] = useState({
    fromChain: 'evm' as const,
    toChain: 'bitcoin' as const,
    fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe', // ETH
    toToken: 'BTC',
    amount: '0.1',
    userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    slippage: 1
  });

  // Contract configuration
  const [contractAddress, setContractAddress] = useState('0xYourDeployedContractAddress');

  useEffect(() => {
    // Initialize integration when component mounts
    const initIntegration = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/public');
        const signer = await provider.getSigner();
        
        const htlcIntegration = createCleanHTLCIntegration(
          contractAddress,
          provider,
          signer,
          'your_1inch_api_key'
        );
        
        setIntegration(htlcIntegration);
      } catch (err) {
        console.error('❌ Failed to initialize integration:', err);
        setError('Failed to initialize integration');
      }
    };

    initIntegration();
  }, [contractAddress]);

  const createHTLC = async () => {
    if (!integration) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Creating complete HTLC:', swapRequest);
      const htlcResult = await integration.createCompleteHTLC(swapRequest);
      
      console.log('✅ HTLC created:', htlcResult);
      setResult(htlcResult);
      
    } catch (err) {
      console.error('❌ Failed to create HTLC:', err);
      setError(err instanceof Error ? err.message : 'Failed to create HTLC');
    } finally {
      setLoading(false);
    }
  };

  const executeHTLC = async () => {
    if (!integration || !result || !secret) return;

    try {
      setExecuting(true);
      setError(null);

      console.log('🚀 Executing HTLC:', result.contractHTLCId);
      
      // Execute on contract
      const contractTxHash = await integration.executeHTLC(
        result.contractHTLCId,
        secret,
        result.fusionOrder.takerAmount
      );

      // Execute Fusion+ order
      const fusionTxHash = await integration.executeFusionHTLC(
        result.fusionOrderHash,
        secret
      );

      console.log('✅ HTLC executed:', { contractTxHash, fusionTxHash });
      alert(`HTLC Executed!\nContract TX: ${contractTxHash}\nFusion TX: ${fusionTxHash}`);
      
    } catch (err) {
      console.error('❌ Failed to execute HTLC:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute HTLC');
    } finally {
      setExecuting(false);
    }
  };

  const getEscrowFactory = async () => {
    if (!integration) return;

    try {
      setLoading(true);
      const address = await integration.getEscrowFactoryAddress(11155111);
      console.log('✅ Escrow factory address:', address);
      alert(`Escrow Factory Address: ${address}`);
    } catch (err) {
      console.error('❌ Failed to get escrow factory:', err);
      setError('Failed to get escrow factory address');
    } finally {
      setLoading(false);
    }
  };

  const getFusionOrders = async () => {
    if (!integration) return;

    try {
      setLoading(true);
      const orders = await integration.getFusionOrders(11155111);
      console.log('✅ Fusion+ orders:', orders);
      alert(`Found ${orders.length} Fusion+ orders`);
    } catch (err) {
      console.error('❌ Failed to get Fusion+ orders:', err);
      setError('Failed to get Fusion+ orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Clean Fusion+ HTLC Bridge
        </h1>
        <p className="text-gray-400">
          Simplified integration using real 1inch Fusion+ SDK
        </p>
      </div>

      {/* Contract Configuration */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Contract Configuration</h2>
        
        <div className="mb-4">
          <label className="text-white font-medium">Contract Address</label>
          <Input
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="0xYourDeployedHTLC1inchEscrowContract"
            className="mt-1"
          />
        </div>

        <div className="flex gap-4">
          <Button
            onClick={getEscrowFactory}
            disabled={loading || !integration}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            🏭 Get Escrow Factory
          </Button>
          
          <Button
            onClick={getFusionOrders}
            disabled={loading || !integration}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            📋 Get Fusion+ Orders
          </Button>
        </div>
      </Card>

      {/* Create HTLC Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Create Cross-Chain HTLC</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-white font-medium">From Chain</label>
            <select
              value={swapRequest.fromChain}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, fromChain: e.target.value as 'evm' | 'bitcoin' }))}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 mt-1"
            >
              <option value="evm">Ethereum (EVM)</option>
              <option value="bitcoin">Bitcoin</option>
            </select>
          </div>
          
          <div>
            <label className="text-white font-medium">To Chain</label>
            <select
              value={swapRequest.toChain}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, toChain: e.target.value as 'evm' | 'bitcoin' }))}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 mt-1"
            >
              <option value="bitcoin">Bitcoin</option>
              <option value="evm">Ethereum (EVM)</option>
            </select>
          </div>
          
          <div>
            <label className="text-white font-medium">From Token</label>
            <Input
              value={swapRequest.fromToken}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, fromToken: e.target.value }))}
              placeholder="Token address or symbol"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-white font-medium">To Token</label>
            <Input
              value={swapRequest.toToken}
              onChange={(e) => setSwapRequest(prev => ({ ...prev, toToken: e.target.value }))}
              placeholder="Token address or symbol"
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
        </div>

        <Button
          onClick={createHTLC}
          disabled={loading || !integration}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? <Spinner size="sm" /> : '🔒 Create Complete HTLC'}
        </Button>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-6 border-red-500 bg-red-900/20">
          <h3 className="text-red-400 font-semibold mb-2">Error</h3>
          <p className="text-red-300">{error}</p>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">HTLC Created Successfully</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-400">Contract HTLC ID</h4>
              <p className="text-white font-mono text-sm truncate">
                {result.contractHTLCId}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Fusion+ Order Hash</h4>
              <p className="text-white font-mono text-sm truncate">
                {result.fusionOrderHash}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Secret Hash</h4>
              <p className="text-white font-mono text-sm truncate">
                {result.secretHash}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Contract TX Hash</h4>
              <p className="text-white font-mono text-sm truncate">
                {result.contractTxHash}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Timelock</h4>
              <p className="text-white text-sm">
                {new Date(result.timelock * 1000).toLocaleString()}
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-400">Status</h4>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-300">
                Active
              </span>
            </div>
          </div>

          {/* Execute HTLC */}
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-white mb-4">Execute HTLC</h3>
            
            <div className="mb-4">
              <label className="text-white font-medium">Secret (for execution)</label>
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter the secret to execute the HTLC"
                className="mt-1"
              />
            </div>

            <Button
              onClick={executeHTLC}
              disabled={executing || !secret}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {executing ? <Spinner size="sm" /> : '🚀 Execute HTLC'}
            </Button>
          </div>
        </Card>
      )}

      {/* Architecture Info */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Clean Architecture</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p><strong>Fusion+ SDK:</strong> Real 1inch Fusion+ API integration</p>
          <p><strong>Contract Integration:</strong> Your HTLC1inchEscrow contract</p>
          <p><strong>No Duplication:</strong> Single source of truth for each function</p>
          <p><strong>Clean Separation:</strong> SDK handles Fusion+, Contract handles escrow</p>
        </div>
      </Card>
    </div>
  );
} 