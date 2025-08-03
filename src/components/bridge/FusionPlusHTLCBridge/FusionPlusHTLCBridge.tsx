'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { createFusionPlusCrossChainSDK, CrossChainSwapRequest } from '@/lib/services/fusion-plus-cross-chain-sdk';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';

export default function FusionPlusHTLCBridge() {
  const [orchestrator, setOrchestrator] = useState<FusionPlusOrchestrator | null>(null);
  const [activeHTLCs, setActiveHTLCs] = useState<FusionPlusHTLC[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHTLC, setSelectedHTLC] = useState<FusionPlusHTLC | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [executing, setExecuting] = useState(false);

  // Form state
  const [swapRequest, setSwapRequest] = useState<CrossChainSwapRequest>({
    fromChain: 'evm',
    toChain: 'bitcoin',
    fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe', // ETH
    toToken: 'BTC',
    amount: '0.1',
    userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    slippage: 1
  });

  useEffect(() => {
    // Initialize orchestrator
    const initOrchestrator = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/public');
        const orch = new FusionPlusOrchestrator(provider);
        setOrchestrator(orch);
        
        // Load active orders
        await loadActiveOrders(orch);
      } catch (err) {
        console.error('❌ Failed to initialize orchestrator:', err);
        setError('Failed to initialize orchestrator');
      }
    };

    initOrchestrator();

    return () => {
      // Cleanup WebSocket connection
      if (orchestrator) {
        orchestrator.disconnect();
      }
    };
  }, []);

  const loadActiveOrders = async (orch: FusionPlusOrchestrator) => {
    try {
      setLoading(true);
      const orders = await orch.getActiveOrders(11155111); // Sepolia
      setActiveHTLCs(orders);
      console.log('✅ Active HTLCs loaded:', orders);
    } catch (err) {
      console.error('❌ Failed to load active orders:', err);
      setError('Failed to load active orders');
    } finally {
      setLoading(false);
    }
  };

  const createHTLC = async () => {
    if (!orchestrator) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Creating HTLC swap:', swapRequest);
      const htlc = await orchestrator.createCrossChainSwap(swapRequest);
      
      console.log('✅ HTLC created:', htlc);
      setActiveHTLCs(prev => [htlc, ...prev]);
      
      // Auto-select the new HTLC
      setSelectedHTLC(htlc);
      
    } catch (err) {
      console.error('❌ Failed to create HTLC:', err);
      setError(err instanceof Error ? err.message : 'Failed to create HTLC');
    } finally {
      setLoading(false);
    }
  };

  const executeHTLC = async () => {
    if (!orchestrator || !selectedHTLC || !secret) return;

    try {
      setExecuting(true);
      setError(null);

      console.log('🚀 Executing HTLC:', selectedHTLC.orderHash);
      
      let txHash: string;
      if (selectedHTLC.nonEVMChainId === 'bitcoin') {
        txHash = await orchestrator.executeBitcoinHTLC(selectedHTLC, secret);
      } else {
        txHash = await orchestrator.executeEVMHTLC(selectedHTLC, secret);
      }
      
      console.log('✅ HTLC executed:', txHash);
      
      // Update HTLC status
      setActiveHTLCs(prev => prev.map(htlc => 
        htlc.orderHash === selectedHTLC.orderHash 
          ? { ...htlc, status: 'completed' as const }
          : htlc
      ));
      
      setSelectedHTLC(null);
      setSecret('');
      
    } catch (err) {
      console.error('❌ Failed to execute HTLC:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute HTLC');
    } finally {
      setExecuting(false);
    }
  };

  const getEscrowFactory = async () => {
    if (!orchestrator) return;

    try {
      setLoading(true);
      const address = await orchestrator.getEscrowFactoryAddress(11155111);
      console.log('✅ Escrow factory address:', address);
      alert(`Escrow Factory Address: ${address}`);
    } catch (err) {
      console.error('❌ Failed to get escrow factory:', err);
      setError('Failed to get escrow factory address');
    } finally {
      setLoading(false);
    }
  };

  const getOrderByHash = async (orderHash: string) => {
    if (!orchestrator) return;

    try {
      const order = await orchestrator.getOrderByHash(orderHash, 11155111);
      if (order) {
        console.log('✅ Order details:', order);
        setSelectedHTLC(order);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      console.error('❌ Failed to get order:', err);
      setError('Failed to get order details');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          1inch Fusion+ HTLC Bridge
        </h1>
        <p className="text-gray-400">
          Cross-chain HTLC swaps from EVM to Bitcoin using 1inch Fusion+ resolvers
        </p>
      </div>

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

        <div className="flex gap-4">
          <Button
            onClick={createHTLC}
            disabled={loading || !orchestrator}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Spinner size="sm" /> : '🔒 Create HTLC'}
          </Button>
          
          <Button
            onClick={getEscrowFactory}
            disabled={loading || !orchestrator}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            🏭 Get Escrow Factory
          </Button>
          
          <Button
            onClick={() => loadActiveOrders(orchestrator!)}
            disabled={loading || !orchestrator}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            🔄 Refresh Orders
          </Button>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-6 border-red-500 bg-red-900/20">
          <h3 className="text-red-400 font-semibold mb-2">Error</h3>
          <p className="text-red-300">{error}</p>
        </Card>
      )}

      {/* Active HTLCs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Active HTLC Orders ({activeHTLCs.length})
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
            <span className="ml-3 text-gray-400">Loading HTLC orders...</span>
          </div>
        ) : activeHTLCs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No active HTLC orders found
          </div>
        ) : (
          <div className="space-y-4">
            {activeHTLCs.map((htlc) => (
              <div
                key={htlc.orderHash}
                className={`border rounded-lg p-4 ${
                  selectedHTLC?.orderHash === htlc.orderHash 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Order Hash</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {htlc.orderHash}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Status</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      htlc.status === 'completed' ? 'bg-green-900 text-green-300' :
                      htlc.status === 'active' ? 'bg-blue-900 text-blue-300' :
                      htlc.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {htlc.status}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Maker</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {htlc.maker}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">From</h4>
                    <p className="text-white text-sm">
                      {htlc.makerAmount} {htlc.makerAsset}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">To</h4>
                    <p className="text-white text-sm">
                      {htlc.takerAmount} {htlc.takerAsset}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Escrow</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {htlc.escrowAddress}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Secret Hash</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {htlc.secretHash}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Auction Salt</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {htlc.auctionSalt}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Expires</h4>
                    <p className="text-white text-sm">
                      {new Date(htlc.expiresAt * 1000).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => setSelectedHTLC(htlc)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    Select
                  </Button>
                  
                  <Button
                    onClick={() => getOrderByHash(htlc.orderHash)}
                    className="bg-gray-600 hover:bg-gray-700 text-white text-sm"
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Execute HTLC */}
      {selectedHTLC && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Execute HTLC</h2>
          
          <div className="mb-4">
            <label className="text-white font-medium">Secret (for execution)</label>
            <Input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter the secret to execute the HTLC"
              className="mt-1"
            />
          </div>

          <div className="flex gap-4">
            <Button
              onClick={executeHTLC}
              disabled={executing || !secret}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {executing ? <Spinner size="sm" /> : '🚀 Execute HTLC'}
            </Button>
            
            <Button
              onClick={() => {
                setSelectedHTLC(null);
                setSecret('');
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* API Info */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Fusion+ API Integration</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p><strong>Core APIs:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>GET /fusion-plus/orders/v1.0/order/escrow - Get escrow factory orders</li>
            <li>GET /fusion-plus/orders/v1.0/escrow-factory - Get escrow factory address</li>
            <li>GET /fusion-plus/orders/v1.0/order/{'{orderHash}'} - Get order by hash</li>
            <li>POST /fusion-plus/orders/v1.0/order - Create HTLC order</li>
          </ul>
          
          <p className="mt-4"><strong>Resolver APIs:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>POST /fusion-plus/sdk/auction-salt - Generate auction salt</li>
            <li>POST /fusion-plus/sdk/auction-suffix - Generate auction suffix</li>
            <li>POST /fusion-plus/sdk/auction-calculator - Calculate auction parameters</li>
            <li>POST /fusion-plus/sdk/resolver-order - Create resolver order</li>
          </ul>
          
          <p className="mt-4"><strong>WebSocket:</strong> wss://api.1inch.dev/fusion-plus/ws</p>
        </div>
      </Card>
    </div>
  );
} 