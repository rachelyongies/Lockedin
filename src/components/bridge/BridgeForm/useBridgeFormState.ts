import { useState, useCallback, useEffect, useRef } from 'react';
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
  resetForm: () => void;
}

// Mock quote fetching function - replace with actual API call
async function fetchBridgeQuote(
  fromToken: Token, 
  toToken: Token, 
  amount: string
): Promise<BridgeQuote> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
  
  // Mock exchange rate calculation
  const mockRate = fromToken.symbol === 'BTC' ? 0.065 : 15.4;
  const fromAmountNum = parseFloat(amount);
  const toAmountNum = fromAmountNum * mockRate;
  
  // Mock fees
  const networkFee = fromAmountNum * 0.001; // 0.1%
  const protocolFee = fromAmountNum * 0.0025; // 0.25%
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    fromToken,
    toToken,
    fromAmount: amount,
    toAmount: toAmountNum.toString(),
    exchangeRate: mockRate.toString(),
    networkFee: networkFee.toString(),
    protocolFee: protocolFee.toString(),
    totalFee: (networkFee + protocolFee).toString(),
    estimatedTime: '5-10 minutes',
    minimumReceived: (toAmountNum * 0.97).toString(), // 3% slippage tolerance
    priceImpact: '0.12',
    expiresAt: Date.now() + 30000, // 30 seconds
  };
}

export function useBridgeFormState({ 
  onBridge, 
  onQuoteError 
}: UseBridgeFormStateProps = {}): BridgeFormState {
  // Core form state
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  
  // UI state
  const [isSwapping, setIsSwapping] = useState(false);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeSuccess, setBridgeSuccess] = useState(false);
  
  // Quote state
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | undefined>();
  
  // Debounced amount for quote fetching
  const debouncedFromAmount = useDebounce(fromAmount, 500);
  
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

    fetchBridgeQuote(fromToken, toToken, debouncedFromAmount)
      .then((newQuote) => {
        if (signal.aborted) return;
        
        setQuote(newQuote);
        setToAmount(newQuote.toAmount);
        setQuoteError(undefined);
      })
      .catch((error) => {
        if (signal.aborted) return;
        
        const errorMessage = error?.message || 'Failed to fetch quote';
        setQuoteError(errorMessage);
        setQuote(null);
        setToAmount('');
        onQuoteError?.(errorMessage);
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
    resetForm,
  };
}