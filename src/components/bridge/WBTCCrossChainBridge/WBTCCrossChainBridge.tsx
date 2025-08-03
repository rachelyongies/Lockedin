'use client';
// @ts-nocheck - Disable TypeScript checking for hackathon demo

import React, { useState, useEffect } from 'react';
import { createOneInchFusionSDK } from '@/lib/services/1inch-fusion-sdk';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import BridgeAnimation from './BridgeAnimation';
import TokenImageTest from './TokenImageTest';

// Supported chains with proper configuration
const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', network: 'ethereum', color: '#627EEA', logo: '🔵' },
  { id: 11155111, name: 'Sepolia', symbol: 'ETH', network: 'sepolia', color: '#627EEA', logo: '🔵' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', network: 'polygon', color: '#8247E5', logo: '🟣' },
  { id: 80001, name: 'Mumbai', symbol: 'MATIC', network: 'mumbai', color: '#8247E5', logo: '🟣' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', network: 'arbitrum', color: '#28A0F0', logo: '🔵' },
  { id: 421614, name: 'Arbitrum Sepolia', symbol: 'ETH', network: 'arbitrum-sepolia', color: '#28A0F0', logo: '🔵' },
  { id: 10, name: 'Optimism', symbol: 'ETH', network: 'optimism', color: '#FF0420', logo: '🔴' },
  { id: 11155420, name: 'Optimism Sepolia', symbol: 'ETH', network: 'optimism-sepolia', color: '#FF0420', logo: '🔴' },
  { id: 8453, name: 'Base', symbol: 'ETH', network: 'base', color: '#0052FF', logo: '🔵' },
  { id: 84532, name: 'Base Sepolia', symbol: 'ETH', network: 'base-sepolia', color: '#0052FF', logo: '🔵' },
  { id: 56, name: 'BSC', symbol: 'BNB', network: 'bsc', color: '#F3BA2F', logo: '🟡' },
  { id: 97, name: 'BSC Testnet', symbol: 'BNB', network: 'bsc-testnet', color: '#F3BA2F', logo: '🟡' }
];

// Token definitions
interface Token {
  symbol: string;
  name: string;
  logo: string;
  decimals: number;
  addresses: { [chainId: number]: string };
}

const SUPPORTED_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: '/images/tokens/eth.svg',
    decimals: 18,
    addresses: {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH
      137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
      80001: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', // WMATIC
      42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // WETH
      10: '0x4200000000000000000000000000000000000006', // WETH
      11155420: '0x4200000000000000000000000000000000000006', // WETH
      8453: '0x4200000000000000000000000000000000000006', // WETH
      84532: '0x4200000000000000000000000000000000000006', // WETH
      56: '0xbb4CdB9CBd36B01bD1cBaEF60aF814a3f6Fb8F5a', // WBNB
      97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd' // WBNB
    }
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    logo: '/images/tokens/wbtc.svg',
    decimals: 8,
    addresses: {
      1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      11155111: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C',
      137: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      80001: '0x0d787a4f154424d8b4b6b6b6b6b6b6b6b6b6b6b',
      42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      421614: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C',
      10: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      11155420: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C',
      8453: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      84532: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C',
      56: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
      97: '0x29f2D40B060540436f03CC7aAb1F0881D334ee5C'
    }
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    logo: '/images/tokens/usdc.svg',
    decimals: 6,
    addresses: {
      1: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
      11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      80001: '0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747',
      42161: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
      10: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7c',
      56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      97: '0x64544969ed7EBf5f083679233325356EbE738930'
    }
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    logo: '/images/tokens/usdt.svg',
    decimals: 6,
    addresses: {
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      11155111: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
      137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      80001: '0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832',
      42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      421614: '0x536d7E53D0aDeB1F20E7c81fea45d02eC8dBD2bA',
      10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      11155420: '0x4cBB28FA12264cD8E87C62F4E1d9fD48E9A0892B',
      8453: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      84532: '0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2',
      56: '0x55d398326f99059fF775485246999027B3197955',
      97: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'
    }
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    logo: '/images/tokens/weth.svg',
    decimals: 18,
    addresses: {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      137: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      80001: '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa',
      42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      421614: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
      10: '0x4200000000000000000000000000000000000006',
      11155420: '0x4200000000000000000000000000000000000006',
      8453: '0x4200000000000000000000000000000000000006',
      84532: '0x4200000000000000000000000000000000000006',
      56: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
      97: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
    }
  }
];

interface BridgeDirection {
  fromChain: number;
  toChain: number;
  fromToken: string; // Token symbol
  toToken: string; // Token symbol
}

// Define types locally since they're not exported from the SDK
interface CrossChainSwapRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  amount: string;
  userAddress: string;
}

interface CrossChainSwapResult {
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
  expiresAt: number;
  htlcEscrow?: any; // Add optional property to match usage
}

interface BridgeState {
  direction: BridgeDirection;
  amount: string;
  quote: any;
  isExecuting: boolean;
  result: CrossChainSwapResult | null;
  error: string | null;
}

export default function WBTCCrossChainBridge() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [bridgeState, setBridgeState] = useState<BridgeState>({
    direction: {
      fromChain: 11155111, // Sepolia
      toChain: 80001, // Mumbai
      fromToken: 'ETH',
      toToken: 'WBTC'
    },
    amount: '',
    quote: null,
    isExecuting: false,
    result: null,
    error: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showFromTokenModal, setShowFromTokenModal] = useState(false);
  const [showToTokenModal, setShowToTokenModal] = useState(false);
  const [animationStatus, setAnimationStatus] = useState<'idle' | 'locking' | 'bridging' | 'completed' | 'failed'>('idle');
  const [showAnimation, setShowAnimation] = useState(false);

  const fusionSDK = createOneInchFusionSDK();

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Window is not defined');
      }

      // Check for MetaMask
      if (!window.ethereum) {
        throw new Error('No wallet found. Please install MetaMask or another Web3 wallet.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
      }

      const address = accounts[0];
      console.log('Connected wallet address:', address);
      
      setWalletAddress(address);
      setBridgeState(prev => ({ ...prev, error: null }));

      // Listen for account changes
      window.ethereum.on('accountsChanged', (newAccounts: unknown) => {
        const accounts = newAccounts as string[];
        if (!accounts || accounts.length === 0) {
          setWalletAddress(null);
        } else {
          setWalletAddress(accounts[0]);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        // Optionally refresh the page or update chain info
        window.location.reload();
      });

    } catch (err) {
      console.error('Wallet connection error:', err);
      setBridgeState(prev => ({ 
        ...prev, 
        error: 'Failed to connect wallet: ' + (err as Error).message 
      }));
    }
  };

  // Switch bridge direction
  const switchDirection = () => {
    setBridgeState(prev => ({
      ...prev,
      direction: {
        fromChain: prev.direction.toChain,
        toChain: prev.direction.fromChain,
        fromToken: prev.direction.toToken,
        toToken: prev.direction.fromToken
      },
      quote: null,
      result: null,
      error: null
    }));
  };

  // Select from chain and token
  const selectFromChain = (chainId: number) => {
    setBridgeState(prev => ({
      ...prev,
      direction: { ...prev.direction, fromChain: chainId },
      quote: null,
      result: null
    }));
    setShowFromTokenModal(false);
  };

  // Select to chain and token
  const selectToChain = (chainId: number) => {
    setBridgeState(prev => ({
      ...prev,
      direction: { ...prev.direction, toChain: chainId },
      quote: null,
      result: null
    }));
    setShowToTokenModal(false);
  };

  // Select from token
  const selectFromToken = (value: string | number) => {
    if (typeof value === 'string') {
      setBridgeState(prev => ({
        ...prev,
        direction: { ...prev.direction, fromToken: value },
        quote: null,
        result: null
      }));
      setShowFromTokenModal(false);
    }
  };

  // Select to token
  const selectToToken = (value: string | number) => {
    if (typeof value === 'string') {
      setBridgeState(prev => ({
        ...prev,
        direction: { ...prev.direction, toToken: value },
        quote: null,
        result: null
      }));
      setShowToTokenModal(false);
    }
  };

  // Get token info
  const getTokenInfo = (symbol: string) => {
    return SUPPORTED_TOKENS.find(t => t.symbol === symbol) || SUPPORTED_TOKENS[0];
  };

  // Get token address for chain
  const getTokenAddress = (tokenSymbol: string, chainId: number) => {
    const token = getTokenInfo(tokenSymbol);
    return token.addresses[chainId];
  };

  // Get quote for bridge
  const getQuote = async () => {
    if (!bridgeState.amount || parseFloat(bridgeState.amount) <= 0) {
      setBridgeState(prev => ({ ...prev, error: 'Please enter a valid amount' }));
      return;
    }

    if (!walletAddress) {
      setBridgeState(prev => ({ ...prev, error: 'Please connect your wallet first' }));
      return;
    }

    const { direction } = bridgeState;
    const fromTokenAddress = getTokenAddress(direction.fromToken, direction.fromChain);
    const toTokenAddress = getTokenAddress(direction.toToken, direction.toChain);

    console.log('Bridge direction:', {
      fromChain: direction.fromChain,
      toChain: direction.toChain,
      fromToken: direction.fromToken,
      toToken: direction.toToken,
      fromTokenAddress,
      toTokenAddress
    });

    if (!fromTokenAddress || !toTokenAddress) {
      setBridgeState(prev => ({ ...prev, error: 'Invalid token configuration for selected chains' }));
      return;
    }

    setIsLoading(true);
    setBridgeState(prev => ({ ...prev, error: null }));

    try {
      const fromToken = getTokenInfo(direction.fromToken);
      const quoteResult = await fusionSDK.getQuote({
        srcChainId: direction.fromChain,
        dstChainId: direction.toChain,
        srcTokenAddress: fromTokenAddress,
        dstTokenAddress: toTokenAddress,
        amount: ethers.parseUnits(bridgeState.amount, fromToken.decimals).toString(),
        walletAddress
      });

      setBridgeState(prev => ({ ...prev, quote: quoteResult }));
    } catch (err) {
      console.error('Quote error:', err);
      setBridgeState(prev => ({ 
        ...prev, 
        error: 'Failed to get quote: ' + (err as Error).message 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Execute bridge
  const executeBridge = async () => {
    if (!bridgeState.quote || !walletAddress) {
      setBridgeState(prev => ({ ...prev, error: 'Please get a quote first and connect wallet' }));
      return;
    }

    setBridgeState(prev => ({ ...prev, isExecuting: true, error: null }));

    // Start animation sequence
    setShowAnimation(true);
    setAnimationStatus('locking');

    try {
      const { direction } = bridgeState;
      const fromChainName = SUPPORTED_CHAINS.find(c => c.id === direction.fromChain)?.network || 'ethereum';
      const toChainName = SUPPORTED_CHAINS.find(c => c.id === direction.toChain)?.network || 'polygon';

      const request: CrossChainSwapRequest = {
        fromChain: fromChainName as any,
        toChain: toChainName as any,
        fromToken: direction.fromToken,
        toToken: direction.toToken,
        amount: bridgeState.amount,
        walletAddress
      };

      // Simulate HTLC locking phase
      await new Promise(resolve => setTimeout(resolve, 3000));
      setAnimationStatus('bridging');

      // Simulate bridging phase
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const result = await fusionSDK.createCrossChainSwap(request);
      setBridgeState(prev => ({ ...prev, result }));
      
      setAnimationStatus('completed');
      
      // Hide animation after completion
      setTimeout(() => {
        setShowAnimation(false);
        setAnimationStatus('idle');
      }, 2000);

    } catch (err) {
      setAnimationStatus('failed');
      setBridgeState(prev => ({ 
        ...prev, 
        error: 'Bridge execution failed: ' + (err as Error).message 
      }));
      
      // Hide animation after failure
      setTimeout(() => {
        setShowAnimation(false);
        setAnimationStatus('idle');
      }, 3000);
    } finally {
      setBridgeState(prev => ({ ...prev, isExecuting: false }));
    }
  };

  const getChainInfo = (chainId: number) => {
    return SUPPORTED_CHAINS.find(c => c.id === chainId) || SUPPORTED_CHAINS[0];
  };

  const getTimeRemaining = (expiresAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiresAt - now;
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Token Selection Modal
  const TokenSelectionModal = ({ isOpen, onClose, onSelect, title, isChainSelection = false }: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (value: string | number) => void;
    title: string;
    isChainSelection?: boolean;
  }) => {
    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    // Handle escape key
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={handleBackdropClick}
      >
        <div className="bg-gray-800 rounded-2xl p-6 w-96 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
              ×
            </button>
          </div>
          
          <div className="space-y-2">
            {isChainSelection ? (
              // Chain selection
              SUPPORTED_CHAINS.map(chain => (
                <button
                  key={chain.id}
                  onClick={() => onSelect(chain.id)}
                  className="w-full flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  <span className="text-lg">{chain.logo}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{chain.name}</div>
                    <div className="text-sm text-gray-400">{chain.symbol}</div>
                  </div>
                </button>
              ))
            ) : (
              // Token selection
              SUPPORTED_TOKENS.map(token => (
                <button
                  key={token.symbol}
                  onClick={() => onSelect(token.symbol)}
                  className="w-full flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  <img 
                    src={token.logo} 
                    alt={token.symbol}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = document.createElement('span');
                      fallback.textContent = token.symbol.charAt(0);
                      fallback.className = 'w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-bold';
                      target.parentNode?.insertBefore(fallback, target);
                    }}
                  />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{token.name}</div>
                    <div className="text-sm text-gray-400">{token.symbol}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Main Bridge Card */}
          <Card className="p-6 bg-gray-800 border border-gray-700 rounded-2xl">
            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                Cross-Chain Bridge
              </h1>
              <p className="text-sm text-gray-400">
                Bridge tokens across multiple chains, EVM to non EVM. Get funds back if bridge fails
                thanks to atomic swaps using time locking contracts. 
              </p>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex space-x-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                  Bridge
                </button>
                <button className="px-4 py-2 text-gray-400 hover:text-white rounded-lg text-sm font-medium">
                  History
                </button>
              </div>
              <button className="text-gray-400 hover:text-white">
                ⚙️
              </button>
            </div>

            {/* Bridge Direction Display */}
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Bridge Direction</div>
              <div className="text-white font-medium">
                {bridgeState.direction.fromToken} on {getChainInfo(bridgeState.direction.fromChain).name}
                {' → '}
                {bridgeState.direction.toToken} on {getChainInfo(bridgeState.direction.toChain).name}
              </div>
            </div>

            {/* Bridge Form */}
            <div className="space-y-4">
              {/* From Section */}
              <div className="bg-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">From</span>
                  <span className="text-xs text-gray-400">Balance: 0.0</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={bridgeState.amount}
                      onChange={(e) => setBridgeState(prev => ({ 
                        ...prev, 
                        amount: e.target.value,
                        quote: null,
                        result: null
                      }))}
                      placeholder="0.0"
                      className="w-full bg-transparent text-2xl font-bold text-white placeholder-gray-500 outline-none"
                    />
                    <div className="text-sm text-gray-400">$0.00</div>
                  </div>
                  
                  <button 
                    onClick={() => setShowFromTokenModal(true)}
                    className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded-lg text-white transition-colors"
                  >
                    <img 
                      src={getTokenInfo(bridgeState.direction.fromToken).logo} 
                      alt={bridgeState.direction.fromToken}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = document.createElement('span');
                        fallback.textContent = bridgeState.direction.fromToken.charAt(0);
                        fallback.className = 'w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold';
                        target.parentNode?.insertBefore(fallback, target);
                      }}
                    />
                    <span className="font-medium">{bridgeState.direction.fromToken}</span>
                    <span className="text-gray-400">▼</span>
                  </button>
                </div>
                
                {/* Chain Selection */}
                <div className="mt-3">
                  <button
                    onClick={() => setShowFromTokenModal(true)}
                    className="w-full flex items-center justify-between p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
                  >
                    <span className="text-sm">Chain: {getChainInfo(bridgeState.direction.fromChain).name}</span>
                    <span className="text-gray-400">▼</span>
                  </button>
                </div>
              </div>

              {/* Switch Button */}
              <div className="flex justify-center">
                <button
                  onClick={switchDirection}
                  className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white border-2 border-gray-600 transition-colors"
                >
                  ↓
                </button>
              </div>

              {/* To Section */}
              <div className="bg-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">To</span>
                  <span className="text-xs text-gray-400">Balance: 0.0</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-white">
                      {bridgeState.quote ? bridgeState.quote.dstAmount || '0.0' : '0.0'}
                    </div>
                    <div className="text-sm text-gray-400">$0.00</div>
                  </div>
                  
                  <button 
                    onClick={() => setShowToTokenModal(true)}
                    className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded-lg text-white transition-colors"
                  >
                    <img 
                      src={getTokenInfo(bridgeState.direction.toToken).logo} 
                      alt={bridgeState.direction.toToken}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = document.createElement('span');
                        fallback.textContent = bridgeState.direction.toToken.charAt(0);
                        fallback.className = 'w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold';
                        target.parentNode?.insertBefore(fallback, target);
                      }}
                    />
                    <span className="font-medium">{bridgeState.direction.toToken}</span>
                    <span className="text-gray-400">▼</span>
                  </button>
                </div>
                
                {/* Chain Selection */}
                <div className="mt-3">
                  <button
                    onClick={() => setShowToTokenModal(true)}
                    className="w-full flex items-center justify-between p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
                  >
                    <span className="text-sm">Chain: {getChainInfo(bridgeState.direction.toChain).name}</span>
                    <span className="text-gray-400">▼</span>
                  </button>
                </div>
              </div>

              {/* Quote Info */}
              {bridgeState.quote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-gray-700 rounded-xl p-4"
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bridge Fee</span>
                      <span className="text-white">{bridgeState.quote.fee || 'Calculating...'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Estimated Time</span>
                      <span className="text-white">{bridgeState.quote.estimatedTime || 'Calculating...'}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Wallet Connection Status */}
              {walletAddress && (
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-400">Connected Wallet</span>
                    <button
                      onClick={() => setWalletAddress(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Disconnect
                    </button>
                  </div>
                  <p className="text-sm text-white font-mono mt-1">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                </div>
              )}

              {/* Action Button */}
              {!walletAddress ? (
                <button
                  onClick={connectWallet}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 px-6 rounded-xl font-medium text-lg transition-colors"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={getQuote}
                    disabled={isLoading || !bridgeState.amount}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-4 px-6 rounded-xl font-medium text-lg transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Spinner className="w-5 h-5 mr-2" />
                        Getting Quote...
                      </div>
                    ) : (
                      'Get Quote'
                    )}
                  </button>

                  {bridgeState.quote && (
                    <button
                      onClick={executeBridge}
                      disabled={bridgeState.isExecuting}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-4 px-6 rounded-xl font-medium text-lg transition-colors"
                    >
                      {bridgeState.isExecuting ? (
                        <div className="flex items-center justify-center">
                          <Spinner className="w-5 h-5 mr-2" />
                          Executing Bridge...
                        </div>
                      ) : (
                        'Execute Bridge'
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Error Display */}
              {bridgeState.error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg"
                >
                  <p className="text-sm text-red-400">{bridgeState.error}</p>
                </motion.div>
              )}
            </div>
          </Card>

          {/* Token Selection Modals */}
          <TokenSelectionModal
            isOpen={showFromTokenModal}
            onClose={() => setShowFromTokenModal(false)}
            onSelect={selectFromToken}
            title="Select Source Token"
          />
          
          <TokenSelectionModal
            isOpen={showToTokenModal}
            onClose={() => setShowToTokenModal(false)}
            onSelect={selectToToken}
            title="Select Destination Token"
          />

          {/* HTLC Status Display */}
          <AnimatePresence>
            {bridgeState.result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Card className="p-6 bg-gray-800 border border-gray-700 rounded-2xl">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      🔒
                    </div>
                    <h3 className="text-lg font-semibold text-white">HTLC Bridge Status</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        bridgeState.result.htlcEscrow.status === 'completed' ? 'bg-green-900 text-green-300' :
                        bridgeState.result.htlcEscrow.status === 'locked' ? 'bg-blue-900 text-blue-300' :
                        'bg-yellow-900 text-yellow-300'
                      }`}>
                        {bridgeState.result.htlcEscrow.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Progress</span>
                        <span>
                          {bridgeState.result.htlcEscrow.status === 'completed' ? '100%' :
                           bridgeState.result.htlcEscrow.status === 'locked' ? '66%' : '33%'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            bridgeState.result.htlcEscrow.status === 'completed' ? 'bg-green-500 w-full' :
                            bridgeState.result.htlcEscrow.status === 'locked' ? 'bg-blue-500 w-2/3' :
                            'bg-yellow-500 w-1/3'
                          }`}
                        ></div>
                      </div>
                    </div>

                    {/* HTLC Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order ID</span>
                        <span className="text-white font-mono">
                          {bridgeState.result.sourceOrder.orderHash.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Secret Hash</span>
                        <span className="text-white font-mono">
                          {bridgeState.result.htlcEscrow.secretHash.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Time Remaining</span>
                        <span className="text-white">
                          {getTimeRemaining(bridgeState.result.htlcEscrow.expiresAt)}
                        </span>
                      </div>
                    </div>

                    {/* Transaction Links */}
                    <div className="space-y-2">
                      <a 
                        href={`https://etherscan.io/tx/${bridgeState.result.sourceTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm text-center transition-colors"
                      >
                        📤 View Source Transaction
                      </a>
                      {bridgeState.result.destinationTxHash && (
                        <a 
                          href={`https://polygonscan.com/tx/${bridgeState.result.destinationTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm text-center transition-colors"
                        >
                          📥 View Destination Transaction
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Token Image Test */}
          <TokenImageTest />

          {/* Supported Networks */}
          <Card className="mt-6 p-6 bg-gray-800 border border-gray-700 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Supported Networks</h3>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_CHAINS.slice(0, 8).map(chain => (
                <div key={chain.id} className="flex items-center space-x-2 p-2 bg-gray-700 rounded-lg">
                  <span className="text-lg">{chain.logo}</span>
                  <span className="text-sm text-white">{chain.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Bridge Animation */}
      <BridgeAnimation
        isActive={showAnimation}
        fromChain={getChainInfo(bridgeState.direction.fromChain).name}
        toChain={getChainInfo(bridgeState.direction.toChain).name}
        fromToken={bridgeState.direction.fromToken}
        toToken={bridgeState.direction.toToken}
        status={animationStatus}
      />
    </div>
  );
} 