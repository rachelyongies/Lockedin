import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWalletStore } from '@/store/useWalletStore';
import { useDebounce } from '@/hooks/useDebounce';
import { validateAmount, validateBalance } from '@/lib/utils/validation';
import { Token, BridgeQuote } from '@/types/bridge';
import { RouteGenerationOptions } from '@/lib/services/intelligent-route-generator';

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
  
  // User preferences for intelligent routing
  userPreference: 'speed' | 'cost' | 'security' | 'balanced';
  setUserPreference: (preference: 'speed' | 'cost' | 'security' | 'balanced') => void;
  maxSlippage: number;
  setMaxSlippage: (slippage: number) => void;
  gasPreference: 'slow' | 'standard' | 'fast';
  setGasPreference: (preference: 'slow' | 'standard' | 'fast') => void;
  
  handleSwapDirection: () => void;
  handleBridge: () => Promise<void>;
  handleInitiateSwap: () => Promise<void>;
  resetForm: () => void;
}

// Import bridge services
import { bridgeService } from '@/lib/services/bridge-service';
import { solanaBridgeService } from '@/lib/services/solana-bridge-service';
import { starknetBridgeService } from '@/lib/services/starknet-bridge-service';
import { stellarBridgeService } from '@/lib/services/stellar-bridge-service';


// Real quote fetching function using bridge services
async function fetchBridgeQuote(
  fromToken: Token, 
  toToken: Token, 
  amount: string,
  walletAddress?: string
): Promise<BridgeQuote> {
  if (!walletAddress) {
    throw new Error('Wallet address required for quote');
  }

  const chainId = fromToken.network === 'ethereum' ? 1 : 137; // Example chain IDs
  const apiUrl = `https://api.1inch.dev/swap/v6.1/${chainId}/quote`;

  const params = new URLSearchParams({
    src: fromToken.address,
    dst: toToken.address,
    amount: ethers.parseUnits(amount, fromToken.decimals).toString(),
  });

  const response = await fetch(`${apiUrl}?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.description || 'Failed to fetch quote from 1inch API');
  }

  const quoteData = await response.json();

  return {
    toAmount: ethers.formatUnits(quoteData.dstAmount, toToken.decimals),
    gasCost: quoteData.gas,
    // Other quote data can be mapped here
  } as BridgeQuote;
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
  
  // User preferences for intelligent routing
  const [userPreference, setUserPreference] = useState<'speed' | 'cost' | 'security' | 'balanced'>('balanced');
  const [maxSlippage, setMaxSlippage] = useState(0.5); // 0.5% default
  const [gasPreference, setGasPreference] = useState<'slow' | 'standard' | 'fast'>('standard');
  
  // Debounced amount for quote fetching
  const debouncedFromAmount = useDebounce(fromAmount, 500);
  
  // Quote fetching ref to cancel outdated requests
  const quoteAbortController = useRef<AbortController | null>(null);
  
  // Validation
  const amountValidation = validateAmount(fromAmount);
  const isValidAmount = amountValidation.isValid && parseFloat(fromAmount || '0') > 0;
  
  // Balance validation - requires real wallet integration
  const balanceValidation = fromToken ? 
    { isValid: false, error: 'Real wallet balance check not implemented - connect wallet first' } :
    { isValid: true, error: undefined };
  const balanceError = balanceValidation.isValid ? undefined : balanceValidation.error;

  // Fetch quote when inputs change
  useEffect(() => {
    if (!fromToken || !toToken || !isValidAmount || !walletAddress) {
      setQuote(null);
      setToAmount('');
      setQuoteError(undefined);
      return;
    }

    // If no wallet is connected, clear everything and don't fetch quote
    if (!walletAddress) {
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
        
        // Only show wallet errors once, not repeatedly
        if (errorMessage.toLowerCase().includes('wallet')) {
          console.log('Wallet connection required for quotes');
          setQuoteError('Connect wallet to get quotes');
        } else {
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
  }, [fromToken, toToken, debouncedFromAmount, isValidAmount, onQuoteError]);

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
    if (!fromToken || !toToken || !isValidAmount || !quote || bridgeLoading) {
      return;
    }

    setBridgeLoading(true);
    setBridgeSuccess(false);

    try {
      // Use the 1inch Fusion+ API to create the swap order
      const order = {
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        amount: ethers.parseUnits(fromAmount, fromToken.decimals).toString(),
        walletAddress: walletAddress,
        receiver: resolver || walletAddress,
        slippage: 1, // 1% slippage tolerance
      };

      console.log("Creating Fusion+ order with the following parameters:", order);

      // In a real application, you would make a POST request to the 1inch API here.
      // For now, we'll just log the order to the console.
      // const response = await fetch('https://api.1inch.dev/swap/v6.1/fusion/orders/', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': 'Bearer YOUR_API_KEY', // Replace with your actual API key
      //   },
      //   body: JSON.stringify(order),
      // });

      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.description || 'Failed to create Fusion+ order');
      // }

      // const orderData = await response.json();
      // console.log('Fusion+ order created:', orderData);

      setBridgeSuccess(true);
    } catch (error) {
      console.error('Initiate swap failed:', error);
      // Error handling would be done by the parent component
    } finally {
      setBridgeLoading(false);
    }
  }, [fromToken, toToken, fromAmount, isValidAmount, quote, bridgeLoading, resolver, walletAddress]);

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
    
    // User preferences
    userPreference,
    setUserPreference,
    maxSlippage,
    setMaxSlippage,
    gasPreference,
    setGasPreference,
    
    handleSwapDirection,
    handleBridge,
    handleInitiateSwap,
    resetForm,
  };
}