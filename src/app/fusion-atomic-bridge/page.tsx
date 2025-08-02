'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftRight, 
  Wallet, 
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';

import { createAtomicHTLCSwapServiceWithContracts, AtomicSwapParams, AtomicSwapState } from '@/lib/services/atomic-htlc-eth-btc-with-contracts';
import { Token, createAmount } from '@/types/bridge';
import { CROSS_CHAIN_NETWORKS, NetworkKey, getSupportedCrossChainPairs } from '@/config/cross-chain-tokens';

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
  chainId: 'bitcoin-testnet', // Not an EVM chain - Bitcoin testnet
  isNative: true,
  isWrapped: false,
  verified: true,
  displayPrecision: 8,
  description: 'Native Bitcoin on Bitcoin testnet (not EVM)',
  tags: ['native', 'cross-chain']
};

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

  // Initialize atomic swap service with YOUR contracts + 1inch API
  const atomicSwapService = createAtomicHTLCSwapServiceWithContracts(
    process.env.NEXT_PUBLIC_ETH_RPC_URL || '',
    'sepolia', // Using your deployed contract on Sepolia
    'testnet',
    process.env.NEXT_PUBLIC_1INCH_API_KEY // Pass API key for real quotes
  );

  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
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

      console.log('Wallet connected:', {
        account: accounts[0],
        chainId: Number(network.chainId),
        balance: ethers.formatEther(bal)
      });

    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
    }
  }, []);

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
      setError('Please connect wallet and enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress('Getting REAL quote from 1inch Fusion+ API...');

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
    } catch (err: any) {
      console.error('Quote failed:', err);
      setError(err.message || 'Failed to get quote');
    } finally {
      setIsLoading(false);
    }
  }, [amount, account, atomicSwapService, sourceChain, destinationChain]);

  // Initiate swap
  const initiateSwap = useCallback(async () => {
    if (!signer || !account || !amount || parseFloat(amount) <= 0) {
      setError('Please connect wallet and enter a valid amount');
      return;
    }

    if (!participantAddress) {
      setError('Please enter Bitcoin participant address');
      return;
    }

    if (chainId !== 11155111) {
      setError('Please switch to Sepolia testnet');
      return;
    }

    const balanceNum = parseFloat(balance);
    const amountNum = parseFloat(amount);
    if (amountNum > balanceNum) {
      setError(`Insufficient balance. You have ${balance} ETH, trying to swap ${amount} ETH`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress('Initiating atomic swap...');

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

      const newSwapState = await atomicSwapService.initiateETHToBTC(
        swapParams,
        signer,
        setProgress
      );

      setSwapState(newSwapState);
      setProgress('Atomic swap initiated successfully!');

    } catch (err: any) {
      console.error('Swap initiation failed:', err);
      setError(err.message || 'Failed to initiate swap');
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, amount, participantAddress, chainId, balance, atomicSwapService]);

  // Reset form
  const resetForm = useCallback(() => {
    setAmount('0.01');
    setParticipantAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
    setSwapState(null);
    setError(null);
    setProgress('');
    setQuote(null);
  }, []);

  const isCorrectNetwork = chainId === 11155111;

  return (
    <div className="min-h-screen bg-background-dark p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            ETH ↔ BTC Atomic Bridge
          </h1>
          <p className="text-text-secondary">
            Trustless cross-chain swaps using YOUR deployed HTLC contracts
          </p>
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
                        {network.name} - WBTC: {network.tokens.WBTC || network.tokens.BTCB || 'N/A'}
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
                    placeholder="tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
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
            <h3 className="text-xl font-bold flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-success" />
              <span>Quote Ready</span>
            </h3>
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
                  <span>Expires:</span>
                  <span>{new Date(quote.expiresAt).toLocaleTimeString()}</span>
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
            <h3 className="text-xl font-bold">Atomic Swap Active</h3>
            <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success">
              <div className="font-medium mb-2">✅ Ethereum Escrow Created</div>
              <div className="text-sm">
                HTLC ID: <span className="font-mono">{swapState.ethHTLC?.htlcId?.slice(0, 20)}...</span>
              </div>
              <div className="text-sm">
                <a 
                  href={`https://sepolia.etherscan.io/tx/${swapState.ethHTLC?.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-primary-400 hover:text-primary-300"
                >
                  <span>View on Etherscan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning">
              <div className="font-medium mb-2">⏳ Bitcoin Escrow (Simulated)</div>
              <div className="text-sm">
                Address: <span className="font-mono">{swapState.btcHTLC?.address}</span>
              </div>
              <div className="text-sm">
                Status: Waiting for participant funding
              </div>
            </div>

            <div className="p-4 rounded-lg bg-background-secondary border border-border-color">
              <div className="font-medium mb-2">🔐 Secret Information</div>
              <div className="text-sm space-y-1">
                <div>Hash: <span className="font-mono text-xs">{swapState.secretHash?.slice(0, 40)}...</span></div>
                <div>Timelock: {new Date(swapState.timelock * 1000).toLocaleString()}</div>
              </div>
            </div>
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
                <div className="font-medium text-white">Start Atomic Swap</div>
                <div>This creates an Ethereum HTLC escrow using YOUR deployed contract</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded bg-success/10 border border-success/20 text-success text-sm">
            <strong>✅ Using YOUR Contracts:</strong> This bridge uses your deployed HTLC1inchEscrow contract on Sepolia testnet.
          </div>
        </div>
      </div>
    </div>
  );
}