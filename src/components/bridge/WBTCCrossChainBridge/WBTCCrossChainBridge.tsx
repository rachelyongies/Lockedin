'use client';

import React, { useState, useEffect } from 'react';
import { createOneInchFusionSDK, CrossChainSwapRequest, CrossChainSwapResult } from '@/lib/services/1inch-fusion-sdk';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

// Supported chains with proper configuration
const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', network: 'ethereum' },
  { id: 11155111, name: 'Sepolia', symbol: 'ETH', network: 'sepolia' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', network: 'polygon' },
  { id: 80001, name: 'Mumbai', symbol: 'MATIC', network: 'mumbai' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', network: 'arbitrum' },
  { id: 421614, name: 'Arbitrum Sepolia', symbol: 'ETH', network: 'arbitrum-sepolia' },
  { id: 10, name: 'Optimism', symbol: 'ETH', network: 'optimism' },
  { id: 11155420, name: 'Optimism Sepolia', symbol: 'ETH', network: 'optimism-sepolia' },
  { id: 8453, name: 'Base', symbol: 'ETH', network: 'base' },
  { id: 84532, name: 'Base Sepolia', symbol: 'ETH', network: 'base-sepolia' },
  { id: 56, name: 'BSC', symbol: 'BNB', network: 'bsc' },
  { id: 97, name: 'BSC Testnet', symbol: 'BNB', network: 'bsc-testnet' }
];

// WBTC token addresses for each chain
const WBTC_ADDRESSES = {
  1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // Ethereum
  11155111: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C', // Sepolia (test WBTC)
  137: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // Polygon
  80001: '0x0d787a4f154424d8b4b6b6b6b6b6b6b6b6b6b6b', // Mumbai (placeholder - no WBTC on Mumbai)
  42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // Arbitrum
  421614: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C', // Arbitrum Sepolia (test WBTC)
  10: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', // Optimism
  11155420: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C', // Optimism Sepolia (test WBTC)
  8453: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', // Base
  84532: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C', // Base Sepolia (test WBTC)
  56: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BSC
  97: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C' // BSC Testnet (test WBTC)
};

// Wrapped native token addresses (1inch Fusion+ requires wrapped tokens)
const WRAPPED_NATIVE_ADDRESSES = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH on Sepolia
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC on Polygon
  80001: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', // WMATIC on Mumbai
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
  421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // WETH on Arbitrum Sepolia
  10: '0x4200000000000000000000000000000000000006', // WETH on Optimism
  11155420: '0x4200000000000000000000000000000000000006', // WETH on Optimism Sepolia
  8453: '0x4200000000000000000000000000000000000006', // WETH on Base
  84532: '0x4200000000000000000000000000000000000006', // WETH on Base Sepolia
  56: '0xbb4CdB9CBd36B01bD1cBaEF60aF814a3f6Fb8F5a', // WBNB on BSC
  97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd' // WBNB on BSC Testnet
};

interface Token {
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
  network: string;
}

export default function WBTCCrossChainBridge() {
  const [fromChain, setFromChain] = useState(11155111); // Sepolia (testnet)
  const [toChain, setToChain] = useState(80001); // Mumbai (testnet)
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CrossChainSwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [quote, setQuote] = useState<any>(null);

  const fusionSDK = createOneInchFusionSDK();

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        setError(null);
      } else {
        throw new Error('MetaMask not found');
      }
    } catch (err) {
      setError('Failed to connect wallet: ' + (err as Error).message);
    }
  };

  // Get quote for cross-chain swap
  const getQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    const fromTokenAddress = WRAPPED_NATIVE_ADDRESSES[fromChain as keyof typeof WRAPPED_NATIVE_ADDRESSES];
    const toTokenAddress = WBTC_ADDRESSES[toChain as keyof typeof WBTC_ADDRESSES];

    if (!fromTokenAddress || !toTokenAddress) {
      setError('Invalid token configuration for selected chains');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Getting quote with params:', {
        srcChainId: fromChain,
        dstChainId: toChain,
        srcTokenAddress: fromTokenAddress,
        dstTokenAddress: toTokenAddress,
        amount: ethers.parseUnits(amount, 18).toString(),
        walletAddress
      });

      const quoteResult = await fusionSDK.getQuote({
        srcChainId: fromChain,
        dstChainId: toChain,
        srcTokenAddress: fromTokenAddress,
        dstTokenAddress: toTokenAddress,
        amount: ethers.parseUnits(amount, 18).toString(),
        walletAddress
      });

      setQuote(quoteResult);
      console.log('Quote received:', quoteResult);
    } catch (err) {
      console.error('Quote error:', err);
      setError('Failed to get quote: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute cross-chain swap
  const executeSwap = async () => {
    if (!quote || !walletAddress) {
      setError('Please get a quote first and connect wallet');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fromChainName = SUPPORTED_CHAINS.find(c => c.id === fromChain)?.name.toLowerCase() || 'ethereum';
      const toChainName = SUPPORTED_CHAINS.find(c => c.id === toChain)?.name.toLowerCase() || 'polygon';
      const fromTokenSymbol = SUPPORTED_CHAINS.find(c => c.id === fromChain)?.symbol || 'ETH';
      const toTokenSymbol = 'WBTC';

      const request: CrossChainSwapRequest = {
        fromChain: fromChainName,
        toChain: toChainName,
        fromToken: fromTokenSymbol,
        toToken: toTokenSymbol,
        amount,
        walletAddress
      };

      const result = await fusionSDK.createCrossChainSwap(request);
      setResult(result);
    } catch (err) {
      setError('Swap execution failed: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            WBTC Cross-Chain Bridge
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Bridge native tokens to Wrapped Bitcoin (WBTC) across multiple chains using 1inch Fusion+
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            {/* Wallet Connection */}
            {!walletAddress ? (
              <div className="text-center mb-6">
                <Button
                  onClick={connectWallet}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg"
                >
                  Connect Wallet
                </Button>
              </div>
            ) : (
              <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 text-center">
                  Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              </div>
            )}

            {/* Bridge Form */}
            <div className="space-y-4">
              {/* From Chain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Chain
                </label>
                <select 
                  value={fromChain} 
                  onChange={(e) => setFromChain(Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                >
                  {SUPPORTED_CHAINS.map(chain => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name} ({chain.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* To Chain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Chain
                </label>
                <select 
                  value={toChain} 
                  onChange={(e) => setToChain(Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                >
                  {SUPPORTED_CHAINS.map(chain => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name} (WBTC)
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ({SUPPORTED_CHAINS.find(c => c.id === fromChain)?.symbol})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mt-6">
              <Button
                onClick={getQuote}
                disabled={isLoading || !walletAddress || !amount}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Spinner className="w-4 h-4 mr-2" />
                    Getting Quote...
                  </div>
                ) : (
                  'Get Quote'
                )}
              </Button>

              {quote && (
                <Button
                  onClick={executeSwap}
                  disabled={isLoading || !walletAddress}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Spinner className="w-4 h-4 mr-2" />
                      Executing Swap...
                    </div>
                  ) : (
                    'Execute Cross-Chain Swap'
                  )}
                </Button>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Quote Display */}
            {quote && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900">Quote Details</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>From:</strong> {amount} {SUPPORTED_CHAINS.find(c => c.id === fromChain)?.symbol} on {SUPPORTED_CHAINS.find(c => c.id === fromChain)?.name}</p>
                  <p><strong>To:</strong> ~{quote.dstAmount || 'Calculating...'} WBTC on {SUPPORTED_CHAINS.find(c => c.id === toChain)?.name}</p>
                  <p><strong>Fee:</strong> {quote.fee || 'Calculating...'}</p>
                  <p><strong>Estimated Time:</strong> {quote.estimatedTime || 'Calculating...'}</p>
                </div>
              </div>
            )}

            {/* Result Display */}
            {result && (
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold mb-2 text-gray-900">Cross-Chain Swap Executed!</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>Order ID:</strong> {result.orderId}</p>
                  <p><strong>Secret:</strong> {result.secret}</p>
                  <p><strong>Secret Hash:</strong> {result.secretHash}</p>
                  <p><strong>Status:</strong> <span className="capitalize">{result.status}</span></p>
                  <p><strong>Source TX:</strong> 
                    <a 
                      href={`https://etherscan.io/tx/${result.sourceTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      View on Explorer
                    </a>
                  </p>
                  {result.destinationTxHash && (
                    <p><strong>Destination TX:</strong> 
                      <a 
                        href={`https://polygonscan.com/tx/${result.destinationTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-1"
                      >
                        View on Explorer
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Supported Routes Info */}
          <Card className="mt-8 p-6">
            <h3 className="font-semibold mb-4 text-gray-900">Supported Cross-Chain Routes</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700">
              <div>
                <h4 className="font-medium mb-2 text-gray-900">From Native Tokens:</h4>
                <ul className="space-y-1">
                  <li>• ETH (Ethereum)</li>
                  <li>• MATIC (Polygon)</li>
                  <li>• ETH (Arbitrum)</li>
                  <li>• ETH (Optimism)</li>
                  <li>• ETH (Base)</li>
                  <li>• BNB (BSC)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-gray-900">To WBTC:</h4>
                <ul className="space-y-1">
                  <li>• WBTC (Ethereum)</li>
                  <li>• WBTC (Polygon)</li>
                  <li>• WBTC (Arbitrum)</li>
                  <li>• WBTC (Optimism)</li>
                  <li>• WBTC (Base)</li>
                  <li>• WBTC (BSC)</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 