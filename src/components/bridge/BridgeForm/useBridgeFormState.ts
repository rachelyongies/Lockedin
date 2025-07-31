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

  // Check bridge type based on token networks
  const isSolanaBridge = fromToken.network === 'solana' || toToken.network === 'solana';
  const isStarknetBridge = fromToken.network === 'starknet' || toToken.network === 'starknet';
  const isStellarBridge = fromToken.network === 'stellar' || toToken.network === 'stellar';
  
  if (isSolanaBridge) {
    // Use Solana bridge service
    if (!solanaBridgeService.isPairSupported(fromToken, toToken)) {
      throw new Error(`Token pair ${fromToken.symbol}-${toToken.symbol} not supported for Solana bridge`);
    }
    return await solanaBridgeService.getQuote(fromToken, toToken, amount, walletAddress);
  } else if (isStarknetBridge) {
    // Use Starknet bridge service
    if (!starknetBridgeService.isPairSupported(fromToken, toToken)) {
      throw new Error(`Token pair ${fromToken.symbol}-${toToken.symbol} not supported for Starknet bridge`);
    }
    return await starknetBridgeService.getQuote(fromToken, toToken, amount, walletAddress);
  } else if (isStellarBridge) {
    // Use Stellar bridge service
    if (!stellarBridgeService.isPairSupported(fromToken, toToken)) {
      throw new Error(`Token pair ${fromToken.symbol}-${toToken.symbol} not supported for Stellar bridge`);
    }
    return await stellarBridgeService.getQuote(fromToken, toToken, amount, walletAddress);
  } else {
    // Use regular bridge service for Ethereum/Bitcoin
    if (!bridgeService.isPairSupported(fromToken, toToken)) {
      throw new Error(`Token pair ${fromToken.symbol}-${toToken.symbol} not supported`);
    }
    return await bridgeService.getQuote(fromToken, toToken, amount, walletAddress);
  }
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
    if (!fromToken || !toToken || !isValidAmount) {
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
      // ✅ REAL DEPLOYED CONTRACT - Sepolia Testnet
      const contractAddress = "0x342EB13550e171606BEdcE6492E549Fc19678435"; 
      const contractABI = [
        // Only include the initiate function ABI for now
        "function initiate(bytes32 id, address resolver, bytes32 hash, uint256 timelock) payable"
      ];

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // In a real application, the hash and id would be generated from a secret preimage
      // For now, we'll use a simple hash and a random ID
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const preimage = bytes;
      const hash = ethers.sha256(preimage);
      const id = ethers.keccak256(ethers.toUtf8Bytes(Date.now().toString())); // Simple unique ID

      const amountInWei = ethers.parseEther(fromAmount); // Convert amount to Wei

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