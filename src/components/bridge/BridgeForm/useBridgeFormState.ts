import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWalletStore } from '@/store/useWalletStore';
import { useDebounce } from '@/hooks/useDebounce';
import { validateAmount, validateBalance } from '@/lib/utils/validation';
import { Token, BridgeQuote } from '@/types/bridge';

interface UseBridgeFormStateProps {
  onBridge?: (fromToken: Token, toToken: Token, amount: string) => Promise<void>;
  onQuoteError?: (error: string) => void;
}

interface BridgeFormState {
  fromToken: Token | null;
  setFromToken: (token: Token | null) => void;
  toToken: Token | null;
  setToToken: (token: Token | null) => void;
  fromAmount: string;
  setFromAmount: (amount: string) => void;
  toAmount: string;
  resolver: string;
  setResolver: (resolver: string) => void;
  timelock: number;
  setTimelock: (timelock: number) => void;
  htlcId: string | null;
  setHtlcId: (htlcId: string | null) => void;
  isValidAmount: boolean;
  balanceError: string | undefined;
  isSwapping: boolean;
  quote: BridgeQuote | null;
  quoteLoading: boolean;
  quoteError: string | undefined;
  bridgeLoading: boolean;
  bridgeSuccess: boolean;
  handleSwapDirection: () => void;
  handleBridge: () => Promise<void>;
  handleInitiateSwap: () => Promise<void>;
  resetForm: () => void;
}

// Import bridge service
import { bridgeService } from '@/lib/services/bridge-service';
// Removed direct import to avoid SSR issues - will load dynamically when needed

// Real quote fetching function using 1inch Fusion API
async function fetchBridgeQuote(
  fromToken: Token, 
  toToken: Token, 
  amount: string,
  walletAddress?: string
): Promise<BridgeQuote> {
  // Get appropriate wallet address based on token type
  let effectiveWalletAddress = walletAddress;
  
  // If dealing with Bitcoin, get Bitcoin wallet address
  if (fromToken.network === 'bitcoin' || toToken.network === 'bitcoin') {
    // Dynamic import to avoid SSR issues
    const { simpleBitcoinWallet } = await import('@/lib/services/phantom-btc-simple');
    const btcAddress = simpleBitcoinWallet.getCurrentAddress();
    if (!btcAddress) {
      throw new Error('Bitcoin wallet not connected. Please connect a Bitcoin wallet.');
    }
    
    // For cross-chain, we need both addresses
    if (fromToken.network === 'bitcoin' && toToken.network === 'ethereum') {
      // BTC -> ETH: Need both BTC source and ETH destination
      if (!walletAddress) {
        throw new Error('Ethereum wallet address required for BTC->ETH swap');
      }
      effectiveWalletAddress = walletAddress; // Use ETH address for quote
    } else if (fromToken.network === 'ethereum' && toToken.network === 'bitcoin') {
      // ETH -> BTC: Need both ETH source and BTC destination  
      if (!walletAddress) {
        throw new Error('Ethereum wallet address required for ETH->BTC swap');
      }
      effectiveWalletAddress = walletAddress; // Use ETH address for quote
    }
  }
  
  if (!effectiveWalletAddress) {
    throw new Error('Wallet address required for quote');
  }

  // Check if pair is supported
  if (!bridgeService.isPairSupported(fromToken, toToken)) {
    throw new Error(`Token pair ${fromToken.symbol}-${toToken.symbol} not supported`);
  }

  // Get quote from 1inch Fusion
  return await bridgeService.getQuote(fromToken, toToken, amount, effectiveWalletAddress);
}

export function useBridgeFormState({ 
  onBridge, 
  onQuoteError,
  walletAddress 
}: UseBridgeFormStateProps & { walletAddress?: string } = {}): BridgeFormState {
  // Core form state
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [resolver, setResolver] = useState('');
  const [timelock, setTimelock] = useState(3600); // Default to 1 hour
  const [htlcId, setHtlcId] = useState<string | null>(null);
  
  // UI state
  const [isSwapping, setIsSwapping] = useState(false);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeSuccess, setBridgeSuccess] = useState(false);
  
  // Quote state
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | undefined>();
  
  // Debounced amount for quote fetching (longer delay to let user finish typing)
  const debouncedFromAmount = useDebounce(fromAmount, 1200);
  
  // Quote fetching ref to cancel outdated requests
  const quoteAbortController = useRef<AbortController | null>(null);
  
  // Validation
  const amountValidation = validateAmount(fromAmount);
  const isValidAmount = amountValidation.isValid && parseFloat(fromAmount || '0') > 0;
  
  // Balance validation (mock balance for now)
  const mockBalance = fromToken ? '10.5' : '0';
  const balanceValidation = validateBalance(fromAmount, mockBalance);
  const balanceError = balanceValidation.isValid ? undefined : balanceValidation.error;

  // Fetch quote when inputs change
  useEffect(() => {
    if (!fromToken || !toToken || !isValidAmount) {
      setQuote(null);
      setToAmount('');
      setQuoteError(undefined);
      return;
    }

    // Cancel previous request
    if (quoteAbortController.current) {
      quoteAbortController.current.abort();
    }

    // Create new abort controller
    quoteAbortController.current = new AbortController();
    const signal = quoteAbortController.current.signal;

    setQuoteLoading(true);
    setQuoteError(undefined);

    fetchBridgeQuote(fromToken, toToken, debouncedFromAmount, walletAddress)
      .then((newQuote) => {
        if (signal.aborted) return;
        
        setQuote(newQuote);
        setToAmount(newQuote.toAmount);
        setQuoteError(undefined);
      })
      .catch((error) => {
        if (signal.aborted) return;
        
        const errorMessage = error?.message || 'Failed to fetch quote';
        
        // Don't show quote errors for amounts that look incomplete (user still typing)
        const isIncompleteAmount = debouncedFromAmount === '0' || 
                                  debouncedFromAmount.endsWith('.') || 
                                  debouncedFromAmount === '0.';
        
        if (!isIncompleteAmount) {
          setQuoteError(errorMessage);
          onQuoteError?.(errorMessage);
        }
        
        setQuote(null);
        setToAmount('');
      })
      .finally(() => {
        if (!signal.aborted) {
          setQuoteLoading(false);
        }
      });

    return () => {
      quoteAbortController.current?.abort();
    };
  }, [fromToken, toToken, debouncedFromAmount, isValidAmount, onQuoteError, walletAddress]);

  // Handle swap direction
  const handleSwapDirection = useCallback(async () => {
    if (isSwapping || !fromToken || !toToken) return;
    
    setIsSwapping(true);
    
    // Clear current quote and amounts
    setQuote(null);
    setQuoteError(undefined);
    setToAmount('');
    
    // Swap tokens and clear from amount
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount(''); // Clear amount to force new input
    
    // Reset animation state
    setTimeout(() => setIsSwapping(false), 300);
  }, [fromToken, toToken, isSwapping]);

  // Handle bridge execution
  const handleBridge = useCallback(async () => {
    if (!fromToken || !toToken || !isValidAmount || !quote || bridgeLoading) {
      return;
    }

    setBridgeLoading(true);
    setBridgeSuccess(false);

    try {
      await onBridge?.(fromToken, toToken, fromAmount);
      setBridgeSuccess(true);
    } catch (error) {
      console.error('Bridge failed:', error);
      // Error handling would be done by the parent component
    } finally {
      setBridgeLoading(false);
    }
  }, [fromToken, toToken, fromAmount, isValidAmount, quote, bridgeLoading, onBridge]);

  // Handle HTLC initiation
  const handleInitiateSwap = useCallback(async () => {
    if (!fromToken || !toToken || !isValidAmount || !resolver || bridgeLoading) {
      return;
    }

    const { provider } = useWalletStore.getState();

    if (!provider) {
      console.error('Ethereum provider not found.');
      return;
    }

    setBridgeLoading(true);
    setBridgeSuccess(false);

    try {
      // Load contract address from deployment info or environment
      let contractAddress: string;
      try {
        // Try to load from deployment file
        const deploymentInfo = await import('@/../deployments/fusion-bridge-sepolia.json');
        contractAddress = deploymentInfo.contractAddress;
      } catch {
        // Fallback to environment variable
        contractAddress = process.env.NEXT_PUBLIC_HTLC_CONTRACT_ADDRESS || '';
        if (!contractAddress) {
          throw new Error('Contract address not found. Please set NEXT_PUBLIC_HTLC_CONTRACT_ADDRESS or ensure deployment file exists.');
        }
      }
      
      const contractABI = [
        // Only include the initiate function ABI for now
        "function initiate(bytes32 id, address resolver, bytes32 hash, uint256 timelock) payable"
      ];

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      console.log('Signer Debug:', {
        signerAddress,
        contractAddress,
        expectedAddress: 'Check if this matches your MetaMask address'
      });

      // In a real application, the hash and id would be generated from a secret preimage
      // For now, we'll use a simple hash and a random ID
      const preimage = ethers.randomBytes(32);
      const hash = ethers.sha256(preimage);
      const id = ethers.keccak256(ethers.toUtf8Bytes(Date.now().toString())); // Simple unique ID

      const amountInWei = ethers.parseEther(fromAmount); // Convert amount to Wei
      
      console.log('HTLC Transaction Debug:', {
        fromAmount,
        amountInWei: amountInWei.toString(),
        amountInEth: ethers.formatEther(amountInWei),
        resolver,
        timelock
      });

      const transaction = await contract.initiate(id, resolver, hash, timelock, {
        value: amountInWei,
      });

      console.log('Transaction sent:', transaction.hash);
      await transaction.wait();
      console.log('Transaction confirmed!');

      setHtlcId(id);
      setBridgeSuccess(true);
    } catch (error) {
      console.error('Initiate swap failed:', error);
      // Error handling would be done by the parent component
    } finally {
      setBridgeLoading(false);
    }
  }, [fromToken, toToken, fromAmount, isValidAmount, resolver, timelock, bridgeLoading, setHtlcId]);

  // Reset form after successful bridge
  useEffect(() => {
    if (bridgeSuccess) {
      const timer = setTimeout(() => {
        setFromAmount('');
        setToAmount('');
        setQuote(null);
        setQuoteError(undefined);
        setBridgeSuccess(false);
      }, 2000); // Reset after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [bridgeSuccess]);

  // Manual form reset function
  const resetForm = useCallback(() => {
    setFromToken(null);
    setToToken(null);
    setFromAmount('');
    setToAmount('');
    setQuote(null);
    setQuoteError(undefined);
    setBridgeSuccess(false);
    setBridgeLoading(false);
    setIsSwapping(false);
  }, []);

  return {
    fromToken,
    setFromToken,
    toToken,
    setToToken,
    fromAmount,
    setFromAmount,
    toAmount,
    resolver,
    setResolver,
    timelock,
    setTimelock,
    htlcId,
    setHtlcId,
    isValidAmount,
    balanceError,
    isSwapping,
    quote,
    quoteLoading,
    quoteError,
    bridgeLoading,
    bridgeSuccess,
    handleSwapDirection,
    handleBridge,
    handleInitiateSwap,
    resetForm,
  };
}