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
  Clock,
  Bitcoin,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

import { createAtomicHTLCSwapService, AtomicSwapParams, AtomicSwapState } from '@/lib/services/atomic-htlc-eth-btc';
import { createBitcoinHTLCService } from '@/lib/services/bitcoin-htlc-service';
import { Token, createAmount } from '@/types/bridge';

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
  chainId: 'testnet',
  isNative: true,
  isWrapped: false,
  verified: true,
  displayPrecision: 8,
  description: 'Native Bitcoin token',
  tags: ['native']
};

export default function RealBitcoinBridgePage() {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number>(0);
  const [balance, setBalance] = useState<string>('0');
  
  const [amount, setAmount] = useState<string>('0.001');
  const [btcAmount, setBtcAmount] = useState<string>('10000'); // satoshis
  const [swapState, setSwapState] = useState<AtomicSwapState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [quote, setQuote] = useState<any>(null);
  
  // Bitcoin-specific state
  const [bitcoinKeyPair, setBitcoinKeyPair] = useState<any>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [htlcFundingStatus, setHtlcFundingStatus] = useState<any>(null);

  // Initialize services
  const atomicSwapService = createAtomicHTLCSwapService(
    process.env.NEXT_PUBLIC_ETH_RPC_URL || '',
    process.env.NEXT_PUBLIC_1INCH_API_KEY || '',
    'testnet'
  );
  
  const bitcoinService = createBitcoinHTLCService('testnet');

  // Generate Bitcoin key pair on component mount
  useEffect(() => {
    const keyPair = bitcoinService.generateKeyPair();
    setBitcoinKeyPair(keyPair);
  }, []);

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

    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
    }
  }, []);

  // Switch to Sepolia
  const switchToSepolia = useCallback(async () => {
    try {
      if (!window.ethereum) return;

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xAA36A7' }] // Sepolia chainId
      });
    } catch (err: any) {
      if (err.code === 4902) {
        // Chain not added, add it
        try {
          await window.ethereum!.request({
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
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
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
    setProgress('Getting quote from 1inch Fusion+...');

    try {
      const quoteResult = await atomicSwapService.getAtomicSwapQuote(
        ETH_TOKEN,
        BTC_TOKEN,
        amount,
        account
      );

      setQuote(quoteResult);
      setProgress('Quote received successfully!');
    } catch (err: any) {
      console.error('Quote failed:', err);
      setError(err.message || 'Failed to get quote');
    } finally {
      setIsLoading(false);
    }
  }, [amount, account, atomicSwapService]);

  // Initiate atomic swap
  const initiateAtomicSwap = useCallback(async () => {
    if (!signer || !account || !amount || parseFloat(amount) <= 0) {
      setError('Please connect wallet and enter a valid amount');
      return;
    }

    if (!bitcoinKeyPair) {
      setError('Bitcoin key pair not generated');
      return;
    }

    if (chainId !== 11155111) {
      setError('Please switch to Sepolia testnet');
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
        participantAddress: bitcoinKeyPair.publicKey, // Use Bitcoin pubkey
        timelock: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      };

      const newSwapState = await atomicSwapService.initiateETHToBTC(
        swapParams,
        signer,
        setProgress
      );

      setSwapState(newSwapState);
      setProgress('Atomic swap initiated! Bitcoin HTLC created.');

    } catch (err: any) {
      console.error('Swap initiation failed:', err);
      setError(err.message || 'Failed to initiate swap');
    } finally {
      setIsLoading(false);
    }
  }, [signer, account, amount, bitcoinKeyPair, chainId, atomicSwapService]);

  // Fund Bitcoin HTLC
  const fundBitcoinHTLC = useCallback(async () => {
    if (!swapState || !bitcoinKeyPair) {
      setError('Swap not initiated or Bitcoin key pair missing');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress('Funding Bitcoin HTLC...');

    try {
      const updatedSwapState = await atomicSwapService.fundBitcoinHTLC(
        swapState,
        bitcoinKeyPair.privateKey,
        parseInt(btcAmount),
        setProgress
      );

      setSwapState(updatedSwapState);
      setProgress('Bitcoin HTLC funded successfully!');

    } catch (err: any) {
      console.error('Bitcoin HTLC funding failed:', err);
      setError(err.message || 'Failed to fund Bitcoin HTLC');
    } finally {
      setIsLoading(false);
    }
  }, [swapState, bitcoinKeyPair, btcAmount, atomicSwapService]);

  // Complete swap
  const completeSwap = useCallback(async () => {
    if (!swapState || !signer || !bitcoinKeyPair) {
      setError('Missing requirements for swap completion');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress('Completing atomic swap...');

    try {
      const completedSwapState = await atomicSwapService.completeSwap(
        swapState,
        signer,
        bitcoinKeyPair.privateKey,
        setProgress
      );

      setSwapState(completedSwapState);
      setProgress('Atomic swap completed successfully!');

    } catch (err: any) {
      console.error('Swap completion failed:', err);
      setError(err.message || 'Failed to complete swap');
    } finally {
      setIsLoading(false);
    }
  }, [swapState, signer, bitcoinKeyPair, atomicSwapService]);

  // Check HTLC funding status
  const checkHTLCFunding = useCallback(async () => {
    if (!swapState?.btcHTLC) return;

    try {
      const status = await bitcoinService.isHTLCFunded(swapState.btcHTLC.address);
      setHtlcFundingStatus(status);
    } catch (err) {
      console.error('Failed to check HTLC funding:', err);
    }
  }, [swapState, bitcoinService]);

  // Auto-check HTLC funding every 30 seconds
  useEffect(() => {
    if (swapState?.btcHTLC) {
      checkHTLCFunding();
      const interval = setInterval(checkHTLCFunding, 30000);
      return () => clearInterval(interval);
    }
  }, [swapState, checkHTLCFunding]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const isCorrectNetwork = chainId === 11155111;

  return (
    <div className="min-h-screen bg-background-dark p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            Real Bitcoin HTLC Bridge
          </h1>
          <p className="text-text-secondary">
            Atomic swaps with real Bitcoin testnet transactions using 1inch Fusion+ Protocol
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="card-base">
          {!account ? (
            <div className="text-center space-y-4">
              <Wallet className="w-12 h-12 mx-auto text-primary-400" />
              <h3 className="text-xl font-bold">Connect Your Wallet</h3>
              <p className="text-text-secondary">Connect MetaMask to start atomic swapping</p>
              <button onClick={connectWallet} className="btn-primary">
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
                    <button onClick={switchToSepolia} className="btn-secondary text-sm">
                      Switch to Sepolia
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bitcoin Key Pair */}
        {bitcoinKeyPair && (
          <div className="card-base">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Bitcoin className="w-6 h-6 text-warning" />
              <span>Bitcoin Testnet Wallet</span>
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Address</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-2 rounded border border-border-color bg-background-secondary font-mono text-xs">
                      {bitcoinKeyPair.address}
                    </div>
                    <button
                      onClick={() => copyToClipboard(bitcoinKeyPair.address)}
                      className="p-2 rounded border border-border-color hover:bg-background-secondary"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-text-secondary">Public Key</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-2 rounded border border-border-color bg-background-secondary font-mono text-xs">
                      {bitcoinKeyPair.publicKey?.slice(0, 20)}...
                    </div>
                    <button
                      onClick={() => copyToClipboard(bitcoinKeyPair.publicKey)}
                      className="p-2 rounded border border-border-color hover:bg-background-secondary"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Private Key</label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-2 rounded border border-border-color bg-background-secondary font-mono text-xs">
                    {showPrivateKey ? bitcoinKeyPair.privateKey : '•'.repeat(64)}
                  </div>
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="p-2 rounded border border-border-color hover:bg-background-secondary"
                  >
                    {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(bitcoinKeyPair.privateKey)}
                    className="p-2 rounded border border-border-color hover:bg-background-secondary"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-3 rounded bg-info/10 border border-info/20 text-info text-sm">
                💡 Get Bitcoin testnet coins from <a href="https://coinfaucet.eu/en/btc-testnet/" target="_blank" rel="noopener noreferrer" className="underline">Bitcoin Testnet Faucet</a>
              </div>
            </div>
          </div>
        )}

        {/* Bridge Form */}
        {account && isCorrectNetwork && bitcoinKeyPair && (
          <div className="card-base space-y-6">
            <h2 className="text-2xl font-bold">Atomic Swap Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border-color bg-background-secondary">
                  <img src={ETH_TOKEN.logoUrl} alt="ETH" className="w-8 h-8" />
                  <div>
                    <div className="font-medium">Ethereum → Bitcoin</div>
                    <div className="text-sm text-text-secondary">Sepolia to Testnet</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">ETH Amount</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={balance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-color bg-background-secondary text-white"
                    disabled={isLoading}
                    placeholder="0.001"
                  />
                  <div className="text-xs text-text-secondary">
                    Balance: {parseFloat(balance).toFixed(4)} ETH
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border-color bg-background-secondary">
                  <img src={BTC_TOKEN.logoUrl} alt="BTC" className="w-8 h-8" />
                  <div>
                    <div className="font-medium">Bitcoin HTLC</div>
                    <div className="text-sm text-text-secondary">Real Testnet Transaction</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">BTC Amount (satoshis)</label>
                  <input
                    type="number"
                    min="1000"
                    value={btcAmount}
                    onChange={(e) => setBtcAmount(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border-color bg-background-secondary text-white"
                    disabled={isLoading}
                    placeholder="10000"
                  />
                  <div className="text-xs text-text-secondary">
                    ≈ {(parseInt(btcAmount) / 100000000).toFixed(8)} BTC
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={getQuote}
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                className="btn-secondary disabled:opacity-50"
              >
                {isLoading ? 'Getting Quote...' : 'Get Quote'}
              </button>
              
              <button
                onClick={initiateAtomicSwap}
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                className="btn-primary disabled:opacity-50"
              >
                {isLoading ? 'Initiating...' : '1. Initiate Swap'}
              </button>
              
              {swapState && swapState.status === 'initiated' && (
                <button
                  onClick={fundBitcoinHTLC}
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {isLoading ? 'Funding...' : '2. Fund Bitcoin HTLC'}
                </button>
              )}
              
              {swapState && swapState.status === 'participant_funded' && (
                <button
                  onClick={completeSwap}
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {isLoading ? 'Completing...' : '3. Complete Swap'}
                </button>
              )}
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

        {/* Swap State Display */}
        {swapState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-base space-y-4"
          >
            <h3 className="text-xl font-bold">Atomic Swap Status</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ethereum HTLC */}
              {swapState.ethHTLC && (
                <div className="p-4 rounded-lg bg-primary-500/10 border border-primary-500/20">
                  <div className="font-medium text-primary-400 mb-3 flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Ethereum HTLC (1inch Fusion+)</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-text-secondary">Order Hash:</span>
                      <div className="font-mono text-xs break-all">{swapState.ethHTLC.htlcId}</div>
                    </div>
                    {swapState.ethHTLC.txHash && (
                      <div>
                        <span className="text-text-secondary">Transaction:</span>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${swapState.ethHTLC.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-primary-400 hover:text-primary-300 text-xs"
                        >
                          <span className="font-mono">{swapState.ethHTLC.txHash.slice(0, 20)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bitcoin HTLC */}
              {swapState.btcHTLC && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="font-medium text-warning mb-3 flex items-center space-x-2">
                    {swapState.btcHTLC.funded ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    <span>Bitcoin HTLC (Real Testnet)</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-text-secondary">HTLC Address:</span>
                      <div className="font-mono text-xs break-all">{swapState.btcHTLC.address}</div>
                    </div>
                    <div>
                      <span className="text-text-secondary">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        swapState.btcHTLC.funded ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                      }`}>
                        {swapState.btcHTLC.funded ? 'Funded' : 'Waiting for funding'}
                      </span>
                    </div>
                    {swapState.btcHTLC.fundingAmount && (
                      <div>
                        <span className="text-text-secondary">Amount:</span>
                        <span className="ml-2">{swapState.btcHTLC.fundingAmount} sats</span>
                      </div>
                    )}
                    {swapState.btcHTLC.txId && (
                      <div>
                        <span className="text-text-secondary">Transaction:</span>
                        <a
                          href={`https://mempool.space/testnet4/tx/${swapState.btcHTLC.txId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-warning hover:text-warning/80 text-xs"
                        >
                          <span className="font-mono">{swapState.btcHTLC.txId.slice(0, 20)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Secret Information */}
            <div className="p-4 rounded-lg bg-background-secondary border border-border-color">
              <div className="font-medium text-success mb-3">🔐 HTLC Secret Information</div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-text-secondary">Secret Hash:</span>
                  <div className="font-mono text-xs break-all">{swapState.secretHash}</div>
                </div>
                {swapState.secret && swapState.status === 'completed' && (
                  <div>
                    <span className="text-text-secondary">Revealed Secret:</span>
                    <div className="font-mono text-xs break-all text-success">{swapState.secret}</div>
                  </div>
                )}
                <div>
                  <span className="text-text-secondary">Timelock:</span>
                  <span className="ml-2">{new Date(swapState.timelock * 1000).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Overall Status */}
            <div className="p-4 rounded-lg bg-info/10 border border-info/20 text-center">
              <div className="font-medium text-info mb-2">Swap Status</div>
              <div className={`text-lg font-bold ${
                swapState.status === 'completed' ? 'text-success' :
                swapState.status === 'participant_funded' ? 'text-info' :
                swapState.status === 'initiated' ? 'text-warning' :
                'text-text-secondary'
              }`}>
                {swapState.status.toUpperCase().replace('_', ' ')}
              </div>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <div className="card-base">
          <h3 className="text-lg font-bold mb-4">Real Bitcoin HTLC Instructions</h3>
          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center mt-0.5">1</div>
              <div>
                <div className="font-medium text-white">Get Test Coins</div>
                <div>
                  • Sepolia ETH: <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Sepolia Faucet</a><br/>
                  • Bitcoin Testnet: <a href="https://coinfaucet.eu/en/btc-testnet/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Bitcoin Testnet Faucet</a>
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center mt-0.5">2</div>
              <div>
                <div className="font-medium text-white">Initiate Swap</div>
                <div>Creates 1inch Fusion+ order on Ethereum and Bitcoin HTLC address</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center mt-0.5">3</div>
              <div>
                <div className="font-medium text-white">Fund Bitcoin HTLC</div>
                <div>Creates and broadcasts real Bitcoin transaction to HTLC address</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center mt-0.5">4</div>
              <div>
                <div className="font-medium text-white">Complete Swap</div>
                <div>Reveals secret to claim funds from both chains atomically</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded bg-success/10 border border-success/20 text-success text-sm">
            <strong>✅ Real Implementation:</strong> This creates actual Bitcoin transactions on testnet!
            All Bitcoin operations use real testnet addresses, UTXOs, and transaction broadcasting.
          </div>
        </div>
      </div>
    </div>
  );
}