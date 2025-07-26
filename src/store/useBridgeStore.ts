import { create } from 'zustand';
import { Token, BridgeQuote } from '@/types/bridge';

export interface BridgeState {
  // Form state
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  toAmount: string;
  
  // Quote state
  quote: BridgeQuote | null;
  quoteLoading: boolean;
  quoteError?: string;
  
  // Transaction state
  bridgeLoading: boolean;
  bridgeSuccess: boolean;
  bridgeError?: string;
  
  // Approval state
  approvalNeeded: boolean;
  approvalLoading: boolean;
  approvalSuccess: boolean;
  approvalError?: string;
  
  // Actions
  setFromToken: (token: Token | null) => void;
  setToToken: (token: Token | null) => void;
  setFromAmount: (amount: string) => void;
  setToAmount: (amount: string) => void;
  swapTokens: () => void;
  
  // Quote actions
  setQuote: (quote: BridgeQuote | null) => void;
  setQuoteLoading: (loading: boolean) => void;
  setQuoteError: (error?: string) => void;
  
  // Transaction actions
  setBridgeLoading: (loading: boolean) => void;
  setBridgeSuccess: (success: boolean) => void;
  setBridgeError: (error?: string) => void;
  
  // Approval actions
  setApprovalNeeded: (needed: boolean) => void;
  setApprovalLoading: (loading: boolean) => void;
  setApprovalSuccess: (success: boolean) => void;
  setApprovalError: (error?: string) => void;
  
  // Reset
  resetForm: () => void;
  resetTransaction: () => void;
}

export const useBridgeStore = create<BridgeState>((set, get) => ({
  // Initial state
  fromToken: null,
  toToken: null,
  fromAmount: '',
  toAmount: '',
  
  quote: null,
  quoteLoading: false,
  quoteError: undefined,
  
  bridgeLoading: false,
  bridgeSuccess: false,
  bridgeError: undefined,
  
  approvalNeeded: false,
  approvalLoading: false,
  approvalSuccess: false,
  approvalError: undefined,
  
  // Form actions
  setFromToken: (token) => set({ fromToken: token }),
  setToToken: (token) => set({ toToken: token }),
  setFromAmount: (amount) => set({ fromAmount: amount }),
  setToAmount: (amount) => set({ toAmount: amount }),
  
  swapTokens: () => {
    const { fromToken, toToken } = get();
    set({
      fromToken: toToken,
      toToken: fromToken,
      fromAmount: '',
      toAmount: '',
      quote: null,
      quoteError: undefined,
    });
  },
  
  // Quote actions
  setQuote: (quote) => set({ quote }),
  setQuoteLoading: (loading) => set({ quoteLoading: loading }),
  setQuoteError: (error) => set({ quoteError: error }),
  
  // Transaction actions
  setBridgeLoading: (loading) => set({ bridgeLoading: loading }),
  setBridgeSuccess: (success) => set({ bridgeSuccess: success }),
  setBridgeError: (error) => set({ bridgeError: error }),
  
  // Approval actions
  setApprovalNeeded: (needed) => set({ approvalNeeded: needed }),
  setApprovalLoading: (loading) => set({ approvalLoading: loading }),
  setApprovalSuccess: (success) => set({ approvalSuccess: success }),
  setApprovalError: (error) => set({ approvalError: error }),
  
  // Reset functions
  resetForm: () => set({
    fromToken: null,
    toToken: null,
    fromAmount: '',
    toAmount: '',
    quote: null,
    quoteError: undefined,
    bridgeSuccess: false,
    bridgeError: undefined,
    approvalNeeded: false,
    approvalSuccess: false,
    approvalError: undefined,
  }),
  
  resetTransaction: () => set({
    bridgeLoading: false,
    bridgeSuccess: false,
    bridgeError: undefined,
    approvalLoading: false,
    approvalSuccess: false,
    approvalError: undefined,
  }),
}));