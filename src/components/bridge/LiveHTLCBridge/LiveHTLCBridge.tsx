'use client';

import React, { useState, useEffect } from 'react';
import { createHTLCBridge, HTLCBridgeRequest, HTLCBridgeResult } from '@/lib/services/htlc-bridge-frontend';
import { getNetworkConfig, CONTRACT_ADDRESSES } from '@/config/contracts';
import { ethers } from 'ethers';

interface Token {
  symbol: string;
  address: string;
  decimals: number;
  logo?: string;
}

const TOKENS: Record<string, Token[]> = {
  sepolia: [
    { symbol: 'ETH', address: ethers.ZeroAddress, decimals: 18 },
    { symbol: 'WBTC', address: CONTRACT_ADDRESSES.sepolia.WBTC, decimals: 8 },
    { symbol: 'WETH', address: CONTRACT_ADDRESSES.sepolia.WETH, decimals: 18 },
    { symbol: 'USDC', address: CONTRACT_ADDRESSES.sepolia.USDC, decimals: 6 },
  ],
  mainnet: [
    { symbol: 'ETH', address: ethers.ZeroAddress, decimals: 18 },
    { symbol: 'WBTC', address: CONTRACT_ADDRESSES.mainnet.WBTC, decimals: 8 },
    { symbol: 'WETH', address: CONTRACT_ADDRESSES.mainnet.WETH, decimals: 18 },
    { symbol: 'USDC', address: CONTRACT_ADDRESSES.mainnet.USDC, decimals: 6 },
  ]
};

export default function LiveHTLCBridge() {
  const [network, setNetwork] = useState('sepolia');
  const [fromToken, setFromToken] = useState<Token>(TOKENS.sepolia[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS.sepolia[1]);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HTLCBridgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const bridge = createHTLCBridge(network);

  // Connect wallet
  const connectWallet = async () => {
    try {
      await bridge.connectWallet();
      const signer = await bridge['signer'];
      const address = await signer.getAddress();
      setWalletAddress(address);
    } catch (err) {
      setError('Failed to connect wallet: ' + (err as Error).message);
    }
  };

  // Create bridge
  const createBridge = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request: HTLCBridgeRequest = {
        fromToken: fromToken.address,
        toToken: toToken.address,
        amount,
        fromNetwork: network,
        toNetwork: network, // For now, same network
        timelock: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      };

      const result = await bridge.createBridge(request);
      setResult(result);
    } catch (err) {
      setError('Bridge creation failed: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute HTLC
  const executeHTLC = async () => {
    if (!result) return;

    setIsLoading(true);
    setError(null);

    try {
      const txHash = await bridge.executeHTLC(result.htlcId, result.secret);
      setResult({ ...result, status: 'executed', txHash });
    } catch (err) {
      setError('HTLC execution failed: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Refund HTLC
  const refundHTLC = async () => {
    if (!result) return;

    setIsLoading(true);
    setError(null);

    try {
      const txHash = await bridge.refundHTLC(result.htlcId);
      setResult({ ...result, status: 'refunded', txHash });
    } catch (err) {
      setError('HTLC refund failed: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update tokens when network changes
  useEffect(() => {
    setFromToken(TOKENS[network][0]);
    setToToken(TOKENS[network][1]);
  }, [network]);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8">Live HTLC Bridge</h1>
      
      {/* Network Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Network</label>
        <select 
          value={network} 
          onChange={(e) => setNetwork(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg"
        >
          <option value="sepolia">Sepolia Testnet</option>
          <option value="mainnet">Ethereum Mainnet</option>
        </select>
        <p className="text-sm text-gray-600 mt-1">
          Contract: {getNetworkConfig(network).contractAddress}
        </p>
      </div>

      {/* Wallet Connection */}
      {!walletAddress ? (
        <button
          onClick={connectWallet}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 mb-6"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
        </div>
      )}

      {/* Bridge Form */}
      <div className="space-y-4 mb-6">
        {/* From Token */}
        <div>
          <label className="block text-sm font-medium mb-2">From Token</label>
          <select 
            value={fromToken.address} 
            onChange={(e) => setFromToken(TOKENS[network].find(t => t.address === e.target.value)!)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          >
            {TOKENS[network].map(token => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
        </div>

        {/* To Token */}
        <div>
          <label className="block text-sm font-medium mb-2">To Token</label>
          <select 
            value={toToken.address} 
            onChange={(e) => setToToken(TOKENS[network].find(t => t.address === e.target.value)!)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          >
            {TOKENS[network].map(token => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create Bridge Button */}
      <button
        onClick={createBridge}
        disabled={isLoading || !walletAddress}
        className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 mb-6"
      >
        {isLoading ? 'Creating Bridge...' : 'Create HTLC Bridge'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold mb-2">HTLC Bridge Created!</h3>
          <div className="space-y-2 text-sm">
            <p><strong>HTLC ID:</strong> {result.htlcId}</p>
            <p><strong>Secret:</strong> {result.secret}</p>
            <p><strong>Secret Hash:</strong> {result.secretHash}</p>
            <p><strong>Timelock:</strong> {new Date(result.timelock * 1000).toLocaleString()}</p>
            <p><strong>Status:</strong> <span className="capitalize">{result.status}</span></p>
            <p><strong>Transaction:</strong> 
              <a 
                href={`${getNetworkConfig(network).explorer}/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                View on Explorer
              </a>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-x-2">
            <button
              onClick={executeHTLC}
              disabled={isLoading || result.status !== 'pending'}
              className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              Execute HTLC
            </button>
            <button
              onClick={refundHTLC}
              disabled={isLoading || result.status !== 'pending'}
              className="bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 disabled:bg-gray-400"
            >
              Refund HTLC
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 