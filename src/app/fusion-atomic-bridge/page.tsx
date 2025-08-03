'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header/Header';
import { 
  ArrowLeftRight, 
  Wallet, 
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

import { createAtomicHTLCSwapServiceWithContracts, AtomicSwapParams, AtomicSwapState } from '@/lib/services/atomic-htlc-eth-btc-with-contracts';
import { createHTLCResolverService, ResolverConfig } from '@/lib/services/htlc-resolver-service';
import { createAtomicSwapCompletionService } from '@/lib/services/atomic-swap-completion';
import { Token, createAmount } from '@/types/bridge';
import { CROSS_CHAIN_NETWORKS, NetworkKey, getSupportedCrossChainPairs } from '@/config/cross-chain-tokens';
import { useToast, getErrorDetails } from '@/components/ui/Toast';

const ETH_TOKEN: Token = {
  id: 'eth',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  logoUrl: '/images/tokens/eth.svg',
  coingeckoId: 'ethereum',
  network: 'ethereum',
  chainId: 11155111, // Sepolia
  address: '0x0000000000000000000000000000000000000000',
  isNative: true,
  isWrapped: false,
  verified: true,
  displayPrecision: 6,
  description: 'Native Ethereum token',
  tags: ['native']
};

const BTC_TOKEN: Token = {
  id: 'btc',
  symbol: 'BTC',
  name: 'Bitcoin',
  decimals: 8,
  logoUrl: '/images/tokens/btc.svg',
  coingeckoId: 'bitcoin',
  network: 'bitcoin',
  chainId: 'mainnet', // Using mainnet as placeholder for Bitcoin (not an EVM chain)
  isNative: true,
  isWrapped: false,
  verified: true,
  displayPrecision: 8,
  description: 'Native Bitcoin on Bitcoin testnet (not EVM)',
  tags: ['native', 'cross-chain']
};

// Create resolver instance outside component to prevent recreation
const resolverConfig: ResolverConfig = {
  ethereumRpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL || '',
  bitcoinNetwork: 'testnet',
  oneInchApiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || '',
  resolverPrivateKey: process.env.NEXT_PUBLIC_RESOLVER_BITCOIN_PRIVATE_KEY || '', // Uses environment variable
  fundingAmount: 5000, // Reduced to 0.00005 BTC (5,000 satoshis) to fit your balance
  // Configurable token addresses and chain ID (no hardcoded values!)
  ethTokenAddress: process.env.NEXT_PUBLIC_ETH_TOKEN_ADDRESS, // Optional: override default ETH address
  wbtcTokenAddress: process.env.NEXT_PUBLIC_WBTC_TOKEN_ADDRESS, // Optional: override default WBTC address
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) : undefined, // Optional: override default chain ID
};

const htlcResolver = createHTLCResolverService(resolverConfig);

export default function FusionAtomicBridgePage() {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number>(0);
  const [balance, setBalance] = useState<string>('0');
  
  const [amount, setAmount] = useState<string>('0.01');
  const [participantAddress, setParticipantAddress] = useState<string>('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
  const [swapState, setSwapState] = useState<AtomicSwapState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [quote, setQuote] = useState<any>(null);
  const [sourceChain, setSourceChain] = useState<NetworkKey>('ethereum');
  const [destinationChain, setDestinationChain] = useState<NetworkKey>('polygon');
  const [showDetailedQuote, setShowDetailedQuote] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [showEscrowDetails, setShowEscrowDetails] = useState(false);
  const [resolverStatus, setResolverStatus] = useState<any>(null);
  const [isResolverRunning, setIsResolverRunning] = useState(false);
  const [recipientBitcoinAddress, setRecipientBitcoinAddress] = useState<string>('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
  const [recipientBitcoinPrivateKey, setRecipientBitcoinPrivateKey] = useState<string>('');
  const [isCompletingSwap, setIsCompletingSwap] = useState(false);
  const [swapCompletionResult, setSwapCompletionResult] = useState<any>(null);
  const [resolverActivity, setResolverActivity] = useState<string[]>([]);
  const [lastResolverCheck, setLastResolverCheck] = useState<number>(0);
  
  const toast = useToast();

  // Initialize atomic swap service with YOUR contracts + 1inch API
  const atomicSwapService = createAtomicHTLCSwapServiceWithContracts(
    process.env.NEXT_PUBLIC_ETH_RPC_URL || '',
    'sepolia', // Using your deployed contract on Sepolia
    'testnet',
    process.env.NEXT_PUBLIC_1INCH_API_KEY // Pass API key for real quotes
  );
  
  const swapCompletionService = createAtomicSwapCompletionService('testnet');

  // Monitor resolver activity with real data only
  useEffect(() => {
    if (isResolverRunning && swapState) {
      const interval = setInterval(() => {
        const now = Date.now();
        setLastResolverCheck(now);
        
        // Only track real events from actual swap state
        if (swapState.btcHTLC?.funded && !resolverActivity.includes('Bitcoin HTLC funded')) {
          setResolverActivity(prev => [...prev, `✅ Bitcoin HTLC funded at ${new Date(now).toLocaleTimeString()}`]);
        }
        
        // Check if swap is ready for completion based on real state
        if (swapCompletionService.canCompleteSwap(swapState) && !resolverActivity.includes('Swap ready for completion')) {
          setResolverActivity(prev => [...prev, `🎯 Swap ready for completion at ${new Date(now).toLocaleTimeString()}`]);
        }
        
        // Monitor real timelock from actual swap
        const timeLeft = swapState.timelock - Math.floor(now / 1000);
        if (timeLeft <= 300 && timeLeft > 0 && !resolverActivity.includes('Timelock expiring soon')) {
          setResolverActivity(prev => [...prev, `⏰ Timelock expiring in ${Math.floor(timeLeft / 60)} minutes`]);
        }
        
        if (timeLeft <= 0 && !resolverActivity.includes('Timelock expired')) {
          setResolverActivity(prev => [...prev, `⏰ Timelock expired at ${new Date(now).toLocaleTimeString()}`]);
        }
      }, 5000); // Check every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [isResolverRunning, swapState, resolverActivity, swapCompletionService]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        const errorDetails = getErrorDetails('MetaMask not installed. Please install MetaMask to continue.');
        toast.error(errorDetails.title, errorDetails.message);
        setError('MetaMask not installed. Please install MetaMask to continue.');
        return;
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const walletSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      
      setProvider(browserProvider);
      setSigner(walletSigner);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));

      // Get balance
      const bal = await browserProvider.getBalance(accounts[0]);
      setBalance(ethers.formatEther(bal));

      // Clear any previous errors
      setError(null);
      
      // Show success toast
      toast.success('Wallet Connected', `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);

      console.log('Wallet connected:', {
        account: accounts[0],
        chainId: Number(network.chainId),
        balance: ethers.formatEther(bal)
      });

    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      const errorDetails = getErrorDetails(err);
      toast.error(errorDetails.title, errorDetails.message);
      setError(err.message || 'Failed to connect wallet');
    }
  }, [toast]);

  // Switch to Sepolia
  const switchToSepolia = useCallback(async () => {
    try {
      if (!window.ethereum) return;

      await (window.ethereum as any).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xAA36A7' }] // Sepolia chainId
      });
    } catch (err: any) {
      if (err.code === 4902) {
        // Chain not added, add it
        try {
          await (window.ethereum as any).request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xAA36A7',
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/']
            }]
          });
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
        }
      } else {
        console.error('Failed to switch to Sepolia:', err);
      }
    }
  }, []);

  // Listen for account/network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0] as string[];
        if (accounts.length === 0) {
          setAccount('');
          setProvider(null);
          setSigner(null);
        } else {
          setAccount(accounts[0]);
        }
      };

      const handleChainChanged = (...args: unknown[]) => {
        const chainId = args[0] as string;
        setChainId(parseInt(chainId, 16));
        window.location.reload(); // Reload on network change
      };

      (window.ethereum as any).on('accountsChanged', handleAccountsChanged);
      (window.ethereum as any).on('chainChanged', handleChainChanged);

      return () => {
        (window.ethereum as any).removeListener('accountsChanged', handleAccountsChanged);
        (window.ethereum as any).removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Get quote
  const getQuote = useCallback(async () => {
    if (!account || !amount || parseFloat(amount) <= 0) {
      const errorMsg = 'Please connect wallet and enter a valid amount';
      toast.warning('Invalid Input', errorMsg);
      setError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress('Getting quote from 1inch...');

    try {
      const quoteResult = await atomicSwapService.getAtomicSwapQuote(
        ETH_TOKEN,
        BTC_TOKEN,
        amount,
        account,
        sourceChain,
        destinationChain
      );

      setQuote(quoteResult);
      setProgress('Quote received successfully!');
      
      // Show success toast with quote details
      toast.success(
        'Quote Retrieved',
        `${amount} ETH → ${parseFloat(quoteResult.toAmount).toFixed(8)} BTC`,
        3000
      );
      
    } catch (err: any) {
      console.error('Quote failed:', err);
      const errorDetails = getErrorDetails(err);
      toast.error(errorDetails.title, errorDetails.message);
      setError(err.message || 'Failed to get quote');
    } finally {
      setIsLoading(false);
    }
  }, [amount, account, atomicSwapService, sourceChain, destinationChain, toast]);

  // Initiate swap
  const initiateSwap = useCallback(async () => {
    // Validation with specific error messages
    if (!signer || !account || !amount || parseFloat(amount) <= 0) {
      const errorMsg = 'Please connect wallet and enter a valid amount';
      toast.warning('Invalid Input', errorMsg);
      setError(errorMsg);
      return;
    }

    if (!participantAddress) {
      const errorMsg = 'Please enter Bitcoin participant address';
      toast.warning('Missing Address', errorMsg);
      setError(errorMsg);
      return;
    }

    if (chainId !== 11155111) {
      const errorMsg = 'Please switch to Sepolia testnet';
      toast.warning('Wrong Network', errorMsg, 0);
      setError(errorMsg);
      return;
    }

    const balanceNum = parseFloat(balance);
    const amountNum = parseFloat(amount);
    if (amountNum > balanceNum) {
      const errorMsg = `Insufficient balance. You have ${balance} ETH, trying to swap ${amount} ETH`;
      toast.error('Insufficient Balance', errorMsg);
      setError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress('Initiating atomic swap...');
    setCurrentStage('');
    setShowEscrowDetails(false);

    try {
      const amountObj = createAmount(amount, ETH_TOKEN.decimals);
      
      const swapParams: AtomicSwapParams = {
        fromNetwork: 'ethereum',
        toNetwork: 'bitcoin',
        fromToken: ETH_TOKEN,
        toToken: BTC_TOKEN,
        amount: amountObj,
        initiatorAddress: account,
        participantAddress,
        timelock: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      };

      // Validate parameters
      const isValid = atomicSwapService.validateSwapParams(swapParams);
      if (!isValid) {
        throw new Error('Invalid swap parameters');
      }

      // Show info toast for transaction
      toast.info('Transaction Initiated', 'Please confirm the transaction in your wallet');

      const newSwapState = await atomicSwapService.initiateETHToBTC(
        swapParams,
        signer,
        (status) => {
          setProgress(status);
          
          // Track current stage
          if (status.includes('Converting ETH to WETH')) {
            setCurrentStage('weth-conversion');
          } else if (status.includes('ETH successfully converted to WETH')) {
            setCurrentStage('weth-complete');
          } else if (status.includes('Creating HTLC on Ethereum')) {
            setCurrentStage('htlc-creation');
          } else if (status.includes('HTLC created with ID')) {
            setCurrentStage('htlc-created');
            setShowEscrowDetails(true); // Show escrow details after HTLC creation
          } else if (status.includes('Generating Bitcoin HTLC escrow')) {
            setCurrentStage('bitcoin-escrow');
          } else if (status.includes('Atomic swap initiated')) {
            setCurrentStage('completed');
          }
          
          // Show progress as info toasts for major steps
          if (status.includes('✅') || status.includes('🎉')) {
            toast.success('Step Complete', status);
          }
        }
      );

      setSwapState(newSwapState);
      setProgress('Atomic swap initiated successfully!');
      
      // Register swap with resolver for auto-funding
      console.log('🔧 Attempting to register swap with resolver...');
      console.log('Swap state:', newSwapState);
      console.log('Swap ID:', newSwapState.id);
      console.log('Swap status:', newSwapState.status);
      console.log('BTC HTLC address:', newSwapState.btcHTLC?.address);
      
      try {
        htlcResolver.registerSwap(newSwapState);
        console.log('✅ Swap registration successful!');
      } catch (error) {
        console.error('❌ Swap registration failed:', error);
      }
      
      // Show success toast with swap details
      toast.success(
        'Atomic Swap Initiated',
        `HTLC created with ID: ${newSwapState.ethHTLC?.htlcId?.slice(0, 8)}...`,
        5000
      );

    } catch (err: any) {
      console.error('Swap initiation failed:', err);
      const errorDetails = getErrorDetails(err);
      toast.error(errorDetails.title, errorDetails.message);
      setError(err.message || 'Failed to initiate swap');
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, amount, participantAddress, chainId, balance, atomicSwapService, toast, switchToSepolia]);

  // Complete atomic swap
  const completeSwap = useCallback(async () => {
    if (!swapState || !signer) {
      toast.error('No active swap or wallet not connected');
      return;
    }

    if (!recipientBitcoinPrivateKey) {
      toast.error('Please enter your Bitcoin private key');
      return;
    }

    setIsCompletingSwap(true);
    setError(null);

    try {
      const result = await swapCompletionService.completeSwap({
        swapState,
        recipientBitcoinAddress,
        recipientBitcoinPrivateKey,
        ethereumSigner: signer
      });

      if (result.success) {
        setSwapCompletionResult(result);
        setSwapState(prev => prev ? { ...prev, status: 'completed' } : null);
        toast.success('Swap Completed!', `Bitcoin TX: ${result.bitcoinTxId?.slice(0, 8)}... | ETH TX: ${result.ethereumTxHash?.slice(0, 8)}...`);
      } else {
        setError(result.error || 'Swap completion failed');
        toast.error('Swap Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Swap completion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete swap';
      setError(errorMessage);
      toast.error('Swap Failed', errorMessage);
    } finally {
      setIsCompletingSwap(false);
    }
  }, [swapState, signer, recipientBitcoinAddress, recipientBitcoinPrivateKey, swapCompletionService, toast]);

  // Refund swap
  const refundSwap = useCallback(async () => {
    if (!swapState || !signer) {
      toast.error('No active swap or wallet not connected');
      return;
    }

    setIsCompletingSwap(true);
    setError(null);

    try {
      const result = await swapCompletionService.refundSwap(
        swapState,
        signer,
        recipientBitcoinPrivateKey || undefined
      );

      if (result.success) {
        setSwapCompletionResult(result);
        setSwapState(prev => prev ? { ...prev, status: 'refunded' } : null);
        toast.success('Swap Refunded!', `Bitcoin TX: ${result.bitcoinTxId?.slice(0, 8)}... | ETH TX: ${result.ethereumTxHash?.slice(0, 8)}...`);
      } else {
        setError(result.error || 'Swap refund failed');
        toast.error('Refund Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Swap refund error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refund swap';
      setError(errorMessage);
      toast.error('Refund Failed', errorMessage);
    } finally {
      setIsCompletingSwap(false);
    }
  }, [swapState, signer, recipientBitcoinPrivateKey, swapCompletionService, toast]);

  // Reset form
  const resetForm = useCallback(() => {
    setAmount('0.01');
    setParticipantAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
    setSwapState(null);
    setError(null);
    setProgress('');
    setQuote(null);
    setSwapCompletionResult(null);
    toast.info('Form Reset', 'Form has been reset to default values');
  }, [toast]);

  const isCorrectNetwork = chainId === 11155111;

  return (
    <div className="min-h-screen bg-background-dark">
      <Header />
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            ETH ↔ BTC Bridge
          </h1>
          
        </div>

        {/* HTLC Resolver Service */}
        <div className="card-base">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">🔧 HTLC Resolver Service</h3>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isResolverRunning ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm">{isResolverRunning ? 'Running' : 'Stopped'}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Resolver Infrastructure Info */}
            <div className="p-3 bg-gray-800 rounded-lg text-sm">
              <div className="grid grid-cols-1 gap-2 mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Network:</span>
                  <span className="font-mono text-orange-400">Bitcoin Testnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Resolver Address:</span>
                  <span className="font-mono text-blue-400 text-xs">
                  {resolverStatus?.resolverAddress || 'Deriving from private key...'}
                </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Available Balance:</span>
                  <span className="font-mono text-green-400">0.0001 tBTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Auto-Funding:</span>
                  <span className="font-mono text-green-400">Enabled</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={async () => {
                  try {
                    await htlcResolver.startResolver();
                    setIsResolverRunning(true);
                    setResolverStatus(htlcResolver.getStatus());
                    toast.success('Resolver Started', 'HTLC resolver service is now running');
                  } catch (error) {
                    toast.error('Failed to start resolver', error instanceof Error ? error.message : 'Unknown error');
                  }
                }}
                disabled={isResolverRunning}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Start Resolver
              </button>
              
              <button
                onClick={() => {
                  htlcResolver.stopResolver();
                  setIsResolverRunning(false);
                  toast.info('Resolver Stopped', 'HTLC resolver service has been stopped');
                }}
                disabled={!isResolverRunning}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Stop Resolver
              </button>
              
              <button
                onClick={() => {
                  const status = htlcResolver.getStatus();
                  setResolverStatus(status);
                  toast.info('Resolver Status', `Active swaps: ${status?.activeSwaps || 0}`);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Check Status
              </button>
              
              <button
                onClick={async () => {
                  if (swapState && !swapState.btcHTLC?.funded) {
                    try {
                      // Use mock funding (set to true for testing)
                      const success = await htlcResolver.autoFundBitcoinHTLC(swapState, true);
                      if (success) {
                        // Update local swap state to reflect the mock funding
                        setSwapState(prevState => {
                          if (!prevState) return null;
                          return {
                            ...prevState,
                            btcHTLC: {
                              ...prevState.btcHTLC!,
                              funded: true,
                              txId: swapState.btcHTLC?.txId || 'mock-tx-id',
                              fundingAmount: swapState.btcHTLC?.fundingAmount || 10000
                            },
                            status: 'participant_funded'
                          };
                        });
                        toast.success('Mock Funding Complete', 'Bitcoin HTLC has been mock-funded successfully!');
                        setResolverActivity(prev => [...prev, `✅ Mock funding completed at ${new Date().toLocaleTimeString()}`]);
                      } else {
                        toast.error('Mock Funding Failed', 'Failed to mock fund the Bitcoin HTLC');
                      }
                    } catch (error) {
                      toast.error('Funding Failed', error instanceof Error ? error.message : 'Unknown error');
                    }
                  } else {
                    toast.info('No Action', 'HTLC already funded or no active swap');
                  }
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Force Fund HTLC
              </button>
            </div>
            
            {!resolverConfig.resolverPrivateKey && (
              <div className="mt-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded">
                <div className="text-yellow-200 text-xs">
                  ⚠️ No Bitcoin private key configured. Resolver cannot auto-fund HTLCs.
                  <br />
                  Set NEXT_PUBLIC_RESOLVER_BITCOIN_PRIVATE_KEY environment variable.
                </div>
              </div>
            )}
            
            {/* Resolver Activity Log */}
            {resolverActivity.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-gray-300 font-medium mb-2">Resolver Activity:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {resolverActivity.slice(-5).map((activity, index) => (
                    <div key={index} className="text-xs text-gray-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      {activity}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="card-base">
          {!account ? (
            <div className="text-center space-y-4">
              <Wallet className="w-12 h-12 mx-auto text-primary-400" />
              <h3 className="text-xl font-bold">Connect Your Wallet</h3>
              <p className="text-text-secondary">Connect MetaMask to start atomic swapping</p>
              <button
                onClick={connectWallet}
                className="btn-primary"
              >
                Connect MetaMask
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Connected Account</div>
                  <div className="text-sm text-text-secondary font-mono">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{parseFloat(balance).toFixed(4)} ETH</div>
                  <div className="text-sm text-text-secondary">
                    {isCorrectNetwork ? 'Sepolia Testnet' : `Chain ID: ${chainId}`}
                  </div>
                </div>
              </div>
              
              {!isCorrectNetwork && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Wrong Network</div>
                      <div className="text-sm">Please switch to Sepolia testnet</div>
                    </div>
                    <button
                      onClick={switchToSepolia}
                      className="btn-secondary text-sm"
                    >
                      Switch to Sepolia
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bridge Form */}
        {account && isCorrectNetwork && (
          <div className="card-base space-y-6">
            <h2 className="text-2xl font-bold">Atomic Swap</h2>
            
            {/* Chain Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cross-Chain Quote Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Source Chain (for pricing)</label>
                  <select
                    value={sourceChain}
                    onChange={(e) => setSourceChain(e.target.value as NetworkKey)}
                    className="w-full p-3 rounded-lg border border-border-color bg-background-secondary text-white"
                    disabled={isLoading}
                  >
                    {Object.entries(CROSS_CHAIN_NETWORKS).map(([key, network]) => (
                      <option key={key} value={key}>
                        {network.name} ({network.symbol})
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-text-secondary">
                    Source chain for ETH price reference
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Destination Chain (for WBTC pricing)</label>
                  <select
                    value={destinationChain}
                    onChange={(e) => setDestinationChain(e.target.value as NetworkKey)}
                    className="w-full p-3 rounded-lg border border-border-color bg-background-secondary text-white"
                    disabled={isLoading}
                  >
                    {Object.entries(CROSS_CHAIN_NETWORKS).map(([key, network]) => (
                      <option key={key} value={key}>
                        {network.name} - WBTC: {(network.tokens as any).WBTC || (network.tokens as any).BTCB || 'N/A'}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-text-secondary">
                    Chain with WBTC for price reference (actual BTC is on Bitcoin testnet)
                  </div>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-info/10 border border-info/20 text-info text-sm">
                <strong>💡 Quote Setup:</strong> {CROSS_CHAIN_NETWORKS[sourceChain].name} {CROSS_CHAIN_NETWORKS[sourceChain].symbol} → {CROSS_CHAIN_NETWORKS[destinationChain].name} WBTC for real market pricing via 1inch Fusion+
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border-color bg-background-secondary">
                  <img src={ETH_TOKEN.logoUrl} alt="ETH" className="w-8 h-8" />
                  <div>
                    <div className="font-medium">Ethereum</div>
                    <div className="text-sm text-text-secondary">Sepolia Testnet</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Amount (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={balance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-color bg-background-secondary text-white"
                    disabled={isLoading}
                    placeholder="0.01"
                  />
                  <div className="text-xs text-text-secondary">
                    Balance: {parseFloat(balance).toFixed(4)} ETH
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <ArrowLeftRight className="w-8 h-8 text-primary-400" />
              </div>

              {/* To */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border-color bg-background-secondary">
                  <img src={BTC_TOKEN.logoUrl} alt="BTC" className="w-8 h-8" />
                  <div>
                    <div className="font-medium">Bitcoin</div>
                    <div className="text-sm text-text-secondary">Bitcoin Testnet (Real BTC)</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">
                    Bitcoin Address (Testnet)
                  </label>
                  <input
                    type="text"
                    value={participantAddress}
                    onChange={(e) => setParticipantAddress(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-color bg-background-secondary text-white text-sm"
                    disabled={isLoading}
                    placeholder="tb1......."
                  />
                  <div className="text-xs text-text-secondary">
                    Enter Bitcoin testnet address (tb1... or 2N...)
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={getQuote}
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                className="btn-secondary disabled:opacity-50"
              >
                {isLoading ? 'Getting Quote...' : 'Get Quote'}
              </button>
              
              <button
                onClick={initiateSwap}
                disabled={isLoading || !amount || !participantAddress || parseFloat(amount) <= 0}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {isLoading ? 'Initiating...' : 'Start Atomic Swap'}
              </button>
              
              <button
                onClick={resetForm}
                disabled={isLoading}
                className="btn-secondary disabled:opacity-50"
              >
                Reset
              </button>
            </div>

            {/* Progress */}
            <AnimatePresence>
              {progress && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-lg bg-info/10 border border-info/20 text-info flex items-center space-x-2"
                >
                  <Clock className="w-5 h-5" />
                  <span>{progress}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-lg bg-error/10 border border-error/20 text-error flex items-center space-x-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Quote Display */}
        {quote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-base space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <CheckCircle className="w-6 h-6 text-success" />
                <span>Quote</span>
                {quote.fusionPreset && (
                  <span className="text-sm px-2 py-1 rounded bg-primary-500/20 text-primary-300">
                    {quote.fusionPreset.toUpperCase()}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowDetailedQuote(!showDetailedQuote)}
                className="flex items-center space-x-1 text-sm text-primary-400 hover:text-primary-300"
              >
                <span>{showDetailedQuote ? 'Hide' : 'Show'} Details</span>
                {showDetailedQuote ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Basic Quote Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>You Send:</span>
                  <span className="font-medium">{quote.fromAmount} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>You Receive:</span>
                  <span className="font-medium">{parseFloat(quote.toAmount).toFixed(8)} BTC</span>
                </div>
                <div className="flex justify-between">
                  <span>Exchange Rate:</span>
                  <span>1 ETH = {parseFloat(quote.exchangeRate).toFixed(8)} BTC</span>
                </div>
                <div className="flex justify-between">
                  <span>Price Impact:</span>
                  <span className={`${parseFloat(quote.priceImpact) > 1 ? 'text-warning' : 'text-success'}`}>
                    {parseFloat(quote.priceImpact).toFixed(3)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Network Fee:</span>
                  <span>{parseFloat(quote.networkFee).toFixed(6)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Time:</span>
                  <span>{quote.estimatedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum Received:</span>
                  <span>{parseFloat(quote.minimumReceived).toFixed(8)} BTC</span>
                </div>
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span>{new Date(quote.expiresAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Detailed Quote Info */}
            <AnimatePresence>
              {showDetailedQuote && quote.fusionData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Raw Response Data */}
                  <div className="p-4 rounded-lg bg-background-secondary border border-border-color">
                    <h4 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                      <Info className="w-5 h-5 text-primary-400" />
                      <span>Complete 1inch Fusion+ Response</span>
                    </h4>
                    
                    {/* Quote Metadata */}
                    <div className="mb-4">
                      <h5 className="text-md font-semibold text-primary-300 mb-2">Quote Metadata</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>Quote ID:</span>
                          <span className="font-mono text-primary-400">{quote.fusionQuoteId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recommended Preset:</span>
                          <span className="font-medium">{quote.fusionPreset}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Source Token Amount:</span>
                          <span className="font-mono">{quote.fusionData?.srcTokenAmount || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Destination Token Amount:</span>
                          <span className="font-mono">{quote.fusionData?.dstTokenAmount || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Auction Presets */}
                    <div className="mb-4">
                      <h5 className="text-md font-semibold text-primary-300 mb-2">Auction Presets</h5>
                      <div className="space-y-3">
                        {quote.fusionData?.presets && Object.entries(quote.fusionData.presets).map(([presetName, preset]: [string, any]) => (
                          <div key={presetName} className="p-3 rounded bg-background-dark/50 border border-border-color/50">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-semibold text-sm capitalize">{presetName}</h6>
                              {presetName === quote.fusionPreset && (
                                <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">Recommended</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>Duration:</span>
                                <span>{preset.auctionDuration}s ({Math.ceil(preset.auctionDuration / 60)}m)</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Start Amount:</span>
                                <span className="font-mono">{preset.startAmount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>End Amount:</span>
                                <span className="font-mono">{preset.auctionEndAmount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Cost in Dst:</span>
                                <span className="font-mono">{preset.costInDstToken}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gas Price:</span>
                                <span>{preset.gasCost.gasPriceEstimate} gwei</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Secrets:</span>
                                <span>{preset.secretsCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Partial Fills:</span>
                                <span>{preset.allowPartialFills ? '✅' : '❌'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Multiple Fills:</span>
                                <span>{preset.allowMultipleFills ? '✅' : '❌'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Rate Bump:</span>
                                <span>{preset.initialRateBump}</span>
                              </div>
                            </div>
                            {preset.points && preset.points.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-text-secondary">Auction Points:</span>
                                <div className="flex space-x-2 text-xs">
                                  {preset.points.map((point: any, idx: number) => (
                                    <span key={idx} className="font-mono bg-background-dark px-1 rounded">
                                      {point.delay}s: {point.coefficient}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Time Locks */}
                    <div className="mb-4">
                      <h5 className="text-md font-semibold text-primary-300 mb-2">Time Locks (seconds)</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {quote.fusionData?.timeLocks && Object.entries(quote.fusionData.timeLocks).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="font-mono">{value}s</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Escrow and Safety */}
                    <div className="mb-4">
                      <h5 className="text-md font-semibold text-primary-300 mb-2">Escrow & Safety</h5>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>Source Escrow Factory:</span>
                          <span className="font-mono text-primary-400">{quote.fusionData?.srcEscrowFactory}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Destination Escrow Factory:</span>
                          <span className="font-mono text-primary-400">{quote.fusionData?.dstEscrowFactory}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Source Safety Deposit:</span>
                          <span className="font-mono">{quote.fusionData?.srcSafetyDeposit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Destination Safety Deposit:</span>
                          <span className="font-mono">{quote.fusionData?.dstSafetyDeposit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Whitelist */}
                    <div className="mb-4">
                      <h5 className="text-md font-semibold text-primary-300 mb-2">Whitelisted Resolvers ({quote.fusionData?.whitelist?.length || 0})</h5>
                      <div className="space-y-1">
                        {quote.fusionData?.whitelist?.map((address: string, idx: number) => (
                          <div key={idx} className="text-xs font-mono text-primary-400 bg-background-dark/50 p-2 rounded">
                            {address}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing Info */}
                    <div className="mb-4">
                      <h5 className="text-md font-semibold text-primary-300 mb-2">Market Data</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {quote.fusionData?.prices && (
                          <>
                            <div className="flex justify-between">
                              <span>ETH Price:</span>
                              <span className="font-mono">${parseFloat(quote.fusionData.prices.usd.srcToken).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>WBTC Price:</span>
                              <span className="font-mono">${parseFloat(quote.fusionData.prices.usd.dstToken).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {quote.fusionData?.volume && (
                          <>
                            <div className="flex justify-between">
                              <span>ETH Volume:</span>
                              <span className="font-mono">${quote.fusionData.volume.usd.srcToken}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>WBTC Volume:</span>
                              <span className="font-mono">${quote.fusionData.volume.usd.dstToken}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span>Price Impact:</span>
                          <span className={`font-mono ${parseFloat(quote.priceImpact) > 1 ? 'text-warning' : 'text-success'}`}>
                            {parseFloat(quote.priceImpact).toFixed(3)}%
                          </span>
                        </div>
                        {quote.fusionData?.autoK && (
                          <>
                            <div className="flex justify-between">
                              <span>Auto K:</span>
                              <span className="font-mono">{quote.fusionData.autoK}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>K:</span>
                              <span className="font-mono">{quote.fusionData.k}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Max K:</span>
                              <span className="font-mono">{quote.fusionData.mxK}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {quote.isFallback && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
                ⚠️ Using simulated quote - 1inch API unavailable
              </div>
            )}
          </motion.div>
        )}

        {/* Progress Stages */}
        {(isLoading || currentStage) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base space-y-4"
          >
            <h3 className="text-xl font-bold">Atomic Swap Progress</h3>
            
            <div className="space-y-3">
              {/* Stage 1: WETH Conversion */}
              <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
                currentStage === 'weth-conversion' ? 'bg-info/10 border-info/20 text-info' :
                currentStage === 'weth-complete' || ['htlc-creation', 'htlc-created', 'bitcoin-escrow', 'completed'].includes(currentStage) ? 'bg-success/10 border-success/20 text-success' :
                'bg-gray-100 border-gray-200 text-gray-500'
              }`}>
                {currentStage === 'weth-conversion' ? (
                  <div className="animate-spin w-5 h-5 border-2 border-info border-t-transparent rounded-full"></div>
                ) : ['weth-complete', 'htlc-creation', 'htlc-created', 'bitcoin-escrow', 'completed'].includes(currentStage) ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                <div>
                  <div className="font-medium">1. Convert ETH to WETH</div>
                  <div className="text-sm opacity-80">Wrapping ETH for ERC20 compatibility</div>
                </div>
              </div>

              {/* Stage 2: HTLC Creation */}
              <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
                currentStage === 'htlc-creation' ? 'bg-info/10 border-info/20 text-info' :
                ['htlc-created', 'bitcoin-escrow', 'completed'].includes(currentStage) ? 'bg-success/10 border-success/20 text-success' :
                'bg-gray-100 border-gray-200 text-gray-500'
              }`}>
                {currentStage === 'htlc-creation' ? (
                  <div className="animate-spin w-5 h-5 border-2 border-info border-t-transparent rounded-full"></div>
                ) : ['htlc-created', 'bitcoin-escrow', 'completed'].includes(currentStage) ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                <div>
                  <div className="font-medium">2. Create Ethereum Escrow</div>
                  <div className="text-sm opacity-80">Deploy HTLC contract on Sepolia</div>
                </div>
              </div>

              {/* Stage 3: Bitcoin Escrow */}
              <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
                currentStage === 'bitcoin-escrow' ? 'bg-info/10 border-info/20 text-info' :
                currentStage === 'completed' ? 'bg-success/10 border-success/20 text-success' :
                'bg-gray-100 border-gray-200 text-gray-500'
              }`}>
                {currentStage === 'bitcoin-escrow' ? (
                  <div className="animate-spin w-5 h-5 border-2 border-info border-t-transparent rounded-full"></div>
                ) : currentStage === 'completed' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                <div>
                  <div className="font-medium">3. Generate Bitcoin Escrow</div>
                  <div className="text-sm opacity-80">Create Bitcoin HTLC address</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Escrow Contract Details */}
        {showEscrowDetails && swapState && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Escrow Contract Details</h3>
              <button
                onClick={() => setShowEscrowDetails(!showEscrowDetails)}
                className="text-primary-400 hover:text-primary-300"
              >
                {showEscrowDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {/* Ethereum HTLC */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Ethereum HTLC Contract
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Contract:</span>
                    <div className="font-mono text-black text-xs break-all">{swapState.ethHTLC?.contractAddress}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">HTLC ID:</span>
                    <div className="font-mono text-black text-xs break-all">{swapState.ethHTLC?.htlcId}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
                  </div>
                  <div>
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${swapState.ethHTLC?.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                    >
                      <span>View Transaction</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Bitcoin HTLC */}
              <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  Bitcoin HTLC Address
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">P2WSH Address:</span>
                    <div className="font-mono text-white text-xs break-all">{swapState.btcHTLC?.address}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 px-2 py-1 text-white bg-yellow-100 text-yellow-800 rounded-full text-xs">Awaiting Funding</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Network:</span>
                    <span className="ml-2 text-white">Bitcoin Testnet</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Swap Parameters */}
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Swap Parameters</h4>
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div>
                  <span className="text-gray-600">Secret Hash:</span>
                  <div className="font-mono text-xs break-all">{swapState.secretHash?.slice(0, 20)}...</div>
                </div>
                <div>
                  <span className="text-gray-600">Timelock:</span>
                  <div className="text-xs">{new Date(swapState.timelock * 1000).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <div className="font-semibold">{amount} ETH</div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-info/10 border border-info/20 text-info text-sm">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Next Steps:</div>
                  <div>The Bitcoin participant needs to fund the Bitcoin HTLC address to continue the atomic swap.</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Swap State */}
        {swapState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-base space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">Atomic Swap Active</h3>
                {swapState && (
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      swapState.status === 'completed' ? 'bg-green-500' :
                      swapState.status === 'participant_funded' ? 'bg-yellow-500' :
                      swapState.status === 'refunded' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}></span>
                    <span className="text-sm font-medium capitalize">
                      {swapState.status === 'participant_funded' ? 'Ready to Complete' :
                       swapState.status === 'completed' ? 'Completed' :
                       swapState.status === 'refunded' ? 'Refunded' :
                       'In Progress'}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowEscrowDetails(!showEscrowDetails)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors"
              >
                {showEscrowDetails ? 'Hide Details' : 'Show Details'}
                {showEscrowDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Swap Progress Indicator */}
            {swapState && (
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white">Swap Progress</h4>
                  <span className="text-xs text-gray-400">
                    {swapCompletionService.getSwapStatus(swapState).timeLeft > 0 
                      ? `${Math.floor(swapCompletionService.getSwapStatus(swapState).timeLeft / 60)}m ${swapCompletionService.getSwapStatus(swapState).timeLeft % 60}s left`
                      : 'Timelock expired'
                    }
                  </span>
                </div>
                
                <div className="space-y-2">
                  {/* Stage 1: Ethereum HTLC Created */}
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Ethereum HTLC Created</div>
                      <div className="text-xs text-gray-400">ETH locked in smart contract</div>
                    </div>
                  </div>
                  
                  {/* Stage 2: Bitcoin HTLC Funding */}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      swapState.btcHTLC?.funded ? 'bg-green-500' : 'bg-yellow-500'
                    }`}>
                      {swapState.btcHTLC?.funded ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <Clock className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Bitcoin HTLC Funding</div>
                      <div className="text-xs text-gray-400">
                        {swapState.btcHTLC?.funded 
                          ? `Funded with ${swapState.btcHTLC.fundingAmount} satoshis`
                          : 'Waiting for resolver to fund...'
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Stage 3: Swap Completion */}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      swapState.status === 'completed' ? 'bg-green-500' :
                      swapCompletionService.canCompleteSwap(swapState) ? 'bg-blue-500' : 'bg-gray-500'
                    }`}>
                      {swapState.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : swapCompletionService.canCompleteSwap(swapState) ? (
                        <ArrowLeftRight className="w-4 h-4 text-white" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Swap Completion</div>
                      <div className="text-xs text-gray-400">
                        {swapState.status === 'completed' ? 'Swap completed successfully' :
                         swapCompletionService.canCompleteSwap(swapState) ? 'Ready to complete - click "Complete Swap"' :
                         'Waiting for Bitcoin funding...'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <AnimatePresence>
              {showEscrowDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-6"
                >
                  {/* Ethereum HTLC Contract */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-2 border-blue-400/30 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <h4 className="text-lg font-bold text-white">Ethereum HTLC Contract</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-blue-200 font-medium">Contract:</span>
                        <div className="font-mono text-white text-sm bg-black/30 p-2 rounded mt-1 break-all">
                          {swapState.ethHTLC?.contractAddress || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-200 font-medium">HTLC ID:</span>
                        <div className="font-mono text-white text-sm bg-black/30 p-2 rounded mt-1 break-all">
                          {swapState.ethHTLC?.htlcId || 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full">
                          ✅ Active
                        </span>
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${swapState.ethHTLC?.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 font-medium transition-colors"
                        >
                          <span>View Transaction</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bitcoin HTLC Address */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-2 border-orange-400/30 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                      <h4 className="text-lg font-bold text-white">Bitcoin HTLC Address</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-orange-200 font-medium">P2WSH Address:</span>
                        <div className="font-mono text-black text-sm bg-black/30 p-2 rounded mt-1 break-all">
                          {swapState.btcHTLC?.address || 'N/A'}
                        </div>
                      </div>
                      {swapState.btcHTLC?.txId && (
                        <div>
                          <span className="text-orange-200 font-medium">Transaction ID:</span>
                          <div className="font-mono text-black text-sm bg-black/30 p-2 rounded mt-1 break-all">
                            {swapState.btcHTLC.txId}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                          swapState.btcHTLC?.funded 
                            ? 'bg-green-500 text-white' 
                            : 'bg-yellow-500 text-black'
                        }`}>
                          {swapState.btcHTLC?.funded ? '✅ Auto-Funded' : '⏳ Awaiting Funding'}
                        </span>
                        <span className="text-orange-200 text-sm">Network: Bitcoin Testnet</span>
                      </div>
                      {swapState.btcHTLC?.funded && (
                        <div className="text-green-200 text-sm">
                          💰 Amount: {swapState.btcHTLC.fundingAmount} satoshis
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Swap Parameters */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 border-2 border-gray-400/30 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <h4 className="text-lg font-bold text-white">Swap Parameters</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-gray-200 font-medium">Secret Hash:</span>
                        <div className="font-mono text-black text-sm bg-black/30 p-2 rounded mt-1 break-all">
                          {swapState.secretHash || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-200 font-medium">Timelock:</span>
                        <div className="text-black text-sm bg-black/30 p-2 rounded mt-1">
                          {new Date(swapState.timelock * 1000).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-200 font-medium">Amount:</span>
                        <div className="text-black text-sm bg-black/30 p-2 rounded mt-1 font-medium">
                          {amount} ETH
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Swap Actions */}
                  {swapState && swapState.btcHTLC?.funded && (
                    <div className="p-6 rounded-xl bg-gradient-to-br from-green-600/30 to-green-700/30 border-2 border-green-500/40 backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-200" />
                        <h4 className="text-lg font-bold text-white">Complete Swap:</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-green-200 font-medium">Bitcoin Recipient Address:</label>
                          <input
                            type="text"
                            value={recipientBitcoinAddress}
                            onChange={(e) => setRecipientBitcoinAddress(e.target.value)}
                            className="w-full mt-1 p-2 bg-black/30 border border-green-400/30 rounded text-white font-mono text-sm"
                            placeholder="tb........."
                          />
                        </div>
                        
                        <div>
                          <label className="text-green-200 font-medium">Bitcoin Private Key (for claiming):</label>
                          <input
                            type="password"
                            value={recipientBitcoinPrivateKey}
                            onChange={(e) => setRecipientBitcoinPrivateKey(e.target.value)}
                            className="w-full mt-1 p-2 bg-black/30 border border-green-400/30 rounded text-white font-mono text-sm"
                            placeholder="Enter your Bitcoin private key"
                          />
                        </div>
                        
                        <div className="flex gap-3">
                          <button
                            onClick={completeSwap}
                            disabled={isCompletingSwap || !recipientBitcoinPrivateKey}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            {isCompletingSwap ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Completing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Complete Swap
                              </>
                            )}
                          </button>
                          
                          {swapCompletionService.canRefundSwap(swapState) && (
                            <button
                              onClick={refundSwap}
                              disabled={isCompletingSwap}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                              Refund Swap
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Swap Completion Result */}
                  {swapCompletionResult && (
                    <div className="p-6 rounded-xl bg-gradient-to-br from-purple-600/30 to-purple-700/30 border-2 border-purple-500/40 backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-5 h-5 text-purple-200" />
                        <h4 className="text-lg font-bold text-white">Swap Result:</h4>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {swapCompletionResult.bitcoinTxId && (
                          <div>
                            <span className="text-purple-200 font-medium">Bitcoin TX:</span>
                            <div className="font-mono text-white bg-black/30 p-2 rounded mt-1 break-all">
                              {swapCompletionResult.bitcoinTxId}
                            </div>
                          </div>
                        )}
                        
                        {swapCompletionResult.ethereumTxHash && (
                          <div>
                            <span className="text-purple-200 font-medium">Ethereum TX:</span>
                            <div className="font-mono text-white bg-black/30 p-2 rounded mt-1 break-all">
                              {swapCompletionResult.ethereumTxHash}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-blue-600/30 to-blue-700/30 border-2 border-blue-500/40 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <Info className="w-5 h-5 text-blue-200" />
                      <h4 className="text-lg font-bold text-white">Next Steps:</h4>
                    </div>
                    <p className="text-blue-100 mt-2 text-base">
                      {swapState?.btcHTLC?.funded 
                        ? 'Both escrows are funded! You can now complete the swap or wait for the timelock to expire for refund.'
                        : 'The Bitcoin participant needs to fund the Bitcoin HTLC address to continue the atomic swap.'
                      }
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Instructions */}
        <div className="card-base">
          <h3 className="text-lg font-bold mb-4">Instructions</h3>
          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center mt-0.5">1</div>
              <div>
                <div className="font-medium text-white">Get Sepolia ETH</div>
                <div>Get testnet ETH from <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Sepolia Faucet</a></div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center mt-0.5">2</div>
              <div>
                <div className="font-medium text-white">Enter Amount & Address</div>
                <div>Enter how much ETH to swap and a Bitcoin testnet address</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center mt-0.5">3</div>
              <div>
                <div className="font-medium text-white">Automatic ETH → WETH Conversion</div>
                <div>The system will automatically wrap your ETH to WETH for contract compatibility</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center mt-0.5">4</div>
              <div>
                <div className="font-medium text-white">Start Atomic Swap</div>
                <div>This creates an Ethereum HTLC escrow using YOUR deployed contract</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="p-3 rounded bg-info/10 border border-info/20 text-info text-sm">
              <strong>🔄 WETH Integration:</strong> Your contract requires ERC20 tokens, so ETH is automatically converted to WETH (Wrapped Ethereum) during the swap process.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}