'use client';
import React, { useState, useEffect } from 'react';
import { FusionAPIService } from '@/lib/services/1inch-fusion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export default function OneInchEscrowTest() {
  const [escrowOrders, setEscrowOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number>(1);

  const oneInchService = FusionAPIService.getInstance();

  const fetchEscrowOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching supported tokens for chain:', chainId);
      const tokens = await oneInchService.getSupportedTokens(chainId);
      setEscrowOrders(tokens.slice(0, 10)); // Show first 10 tokens as example
      console.log('✅ Tokens fetched:', tokens);
    } catch (err) {
      console.error('❌ Error fetching tokens:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testQuote = async () => {
    try {
      console.log('🔍 Testing 1inch quote...');
      const quote = await oneInchService.getQuote(
        { symbol: 'ETH', name: 'Ethereum', decimals: 18, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe' },
        { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C' },
        '1000000000000000000', // 1 ETH in wei
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      );
      console.log('✅ Quote received:', quote);
    } catch (err) {
      console.error('❌ Quote error:', err);
    }
  };

  const testActiveOrders = async () => {
    try {
      console.log('🔍 Testing supported tokens...');
      const tokens = await oneInchService.getSupportedTokens(chainId);
      console.log('✅ Supported tokens:', tokens);
    } catch (err) {
      console.error('❌ Tokens error:', err);
    }
  };

  const testTokens = async () => {
    try {
      console.log('🔍 Testing token prices...');
      const prices = await oneInchService.getTokenPrices([
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe',
        '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C'
      ]);
      console.log('✅ Token prices:', prices);
    } catch (err) {
      console.error('❌ Token prices error:', err);
    }
  };

  useEffect(() => {
    // Auto-fetch on component mount
    fetchEscrowOrders();
  }, [chainId]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          1inch Fusion+ API Test
        </h1>
        <p className="text-gray-400">
          Test the 1inch Fusion+ API integration with quotes, tokens, and prices
        </p>
      </div>

      {/* Chain Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-white font-medium">Chain ID:</label>
          <select
            value={chainId}
            onChange={(e) => setChainId(Number(e.target.value))}
            className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
          >
            <option value={1}>Ethereum Mainnet (1)</option>
            <option value={11155111}>Sepolia Testnet (11155111)</option>
          </select>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Button
            onClick={fetchEscrowOrders}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Spinner size="sm" /> : '🔄 Refresh Escrow Orders'}
          </Button>
          
          <Button
            onClick={testQuote}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            📊 Test Quote
          </Button>
          
          <Button
            onClick={testActiveOrders}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            📋 Test Active Orders
          </Button>
          
          <Button
            onClick={testTokens}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            🪙 Test Tokens
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

      {/* Results Display */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          Escrow Factory Orders ({escrowOrders.length})
        </h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
            <span className="ml-3 text-gray-400">Loading escrow orders...</span>
          </div>
        ) : escrowOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No escrow orders found for chain {chainId}
          </div>
        ) : (
          <div className="space-y-4">
            {escrowOrders.map((order, index) => (
              <div
                key={order.orderId || index}
                className="border border-gray-700 rounded-lg p-4 bg-gray-800/50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Order ID</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {order.orderId}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Status</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-900 text-green-300' :
                      order.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Escrow Address</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {order.escrowAddress}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">From Token</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {order.fromToken}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">To Token</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {order.toToken}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Wallet Address</h4>
                    <p className="text-white font-mono text-sm truncate">
                      {order.walletAddress}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">From Amount</h4>
                    <p className="text-white text-sm">
                      {order.fromAmount}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">To Amount</h4>
                    <p className="text-white text-sm">
                      {order.toAmount}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Created</h4>
                    <p className="text-white text-sm">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* API Info */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">API Information</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p><strong>Base URL:</strong> https://api.1inch.dev/fusion-plus</p>
          <p><strong>Endpoint:</strong> /orders/v1.0/order/escrow</p>
          <p><strong>Method:</strong> GET</p>
          <p><strong>Parameters:</strong> chainId</p>
          <p><strong>Headers:</strong> Authorization: Bearer {oneInchService['apiKey'].substring(0, 10)}...</p>
        </div>
      </Card>
    </div>
  );
} 