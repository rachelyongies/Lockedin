import { parseUnits as ethersParseUnits, formatUnits as ethersFormatUnits } from 'ethers';

// Chain Types
export type EthereumChainId = 1 | 5 | 11155111; // Mainnet, Goerli, Sepolia
export type BitcoinChainId = 'mainnet' | 'testnet' | 'regtest';
export type SolanaChainId = 'mainnet-beta' | 'devnet' | 'testnet';
export type StarknetChainId = 'mainnet' | 'goerli' | 'sepolia';
export type StellarChainId = 'public' | 'testnet';
export type Network = 'ethereum' | 'bitcoin' | 'solana' | 'starknet' | 'stellar';

// Amount handling with automatic sync
export interface Amount {
  raw: string; // User input format
  bn: bigint; // For calculations (using native bigint instead of BigNumber)
  decimals: number;
  formatted: string; // Display format
}

// Helper functions for Amount
export function createAmount(value: string | bigint, decimals: number): Amount {
  if (typeof value === 'string') {
    const bn = ethersParseUnits(value, decimals);
    return {
      raw: value,
      bn,
      decimals,
      formatted: ethersFormatUnits(bn, decimals)
    };
  } else {
    const formatted = ethersFormatUnits(value, decimals);
    return {
      raw: formatted,
      bn: value,
      decimals,
      formatted
    };
  }
}

// Utility functions for amount parsing - reserved for future use
// function parseUnits(value: string, decimals: number): bigint { ... }
// function formatUnits(value: bigint, decimals: number): string { ... }

// Base Token Interface
interface BaseToken {
  id: string; // Unique identifier across all networks
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
  coingeckoId: string;
  
  // Wrapped token relationships
  isWrapped: boolean;
  nativeEquivalent?: string; // Symbol of native token (e.g., WETH -> ETH)
  wrappedEquivalent?: string; // Symbol of wrapped token (e.g., ETH -> WETH, BTC -> WBTC)
  
  // UX Metadata
  explorerUrl?: string; // Link to block explorer for this token
  wrappedSymbol?: string; // For consistent symbol display (e.g., WBTC shows as BTC)
  verified: boolean; // Show verification checkmark (required for safety)
  deprecationNotice?: string; // Optional warning message
  displayPrecision: number; // Default decimal places to show (required for UX consistency)
  description: string; // Short description for tooltips (required for accessibility)
  tags: string[]; // Tags like ['stablecoin', 'wrapped', 'native'] (required)
}

// Ethereum-specific Token
export interface EthereumToken extends BaseToken {
  network: 'ethereum';
  chainId: EthereumChainId;
  address: string; // 0x0000...0000 for native ETH
  isNative: boolean;
}

// Bitcoin-specific Token
export interface BitcoinToken extends BaseToken {
  network: 'bitcoin';
  chainId: BitcoinChainId;
  isNative: true; // Bitcoin is always native
  address?: never;
}

// Solana-specific Token
export interface SolanaToken extends BaseToken {
  network: 'solana';
  chainId: SolanaChainId;
  address?: string; // Optional SPL token address
  isNative: boolean;
}

// Starknet-specific Token
export interface StarknetToken extends BaseToken {
  network: 'starknet';
  chainId: StarknetChainId;
  address?: string; // Optional contract address
  isNative: boolean;
}

// Stellar-specific Token
export interface StellarToken extends BaseToken {
  network: 'stellar';
  chainId: StellarChainId;
  assetCode?: string; // For non-native assets (e.g., USDC, BTC)
  assetIssuer?: string; // For non-native assets
  isNative: boolean;
}

// Union type for all tokens
export type Token = EthereumToken | BitcoinToken | SolanaToken | StarknetToken | StellarToken;

// Type guards
export const isEthereumToken = (token: Token): token is EthereumToken => 
  token.network === 'ethereum';

export const isBitcoinToken = (token: Token): token is BitcoinToken => 
  token.network === 'bitcoin';

export const isSolanaToken = (token: Token): token is SolanaToken => 
  token.network === 'solana';

export const isStarknetToken = (token: Token): token is StarknetToken => 
  token.network === 'starknet';

export const isStellarToken = (token: Token): token is StellarToken => 
  token.network === 'stellar';

// Check if bridging is actually just wrapping/unwrapping
export const isWrappingOperation = (from: Token, to: Token): boolean => {
  return (from.nativeEquivalent === to.symbol) || 
         (from.wrappedEquivalent === to.symbol);
};

// Token Balance with single source of truth
export interface TokenBalance {
  token: Token;
  amount: Amount;
  price: number;
  balanceUSD: number; // Will be computed when creating the balance
  lastUpdated: number;
}

// Helper to create token balance with computed USD value
export function createTokenBalance(token: Token, amount: Amount, price: number): TokenBalance {
  return {
    token,
    amount,
    price,
    balanceUSD: parseFloat(amount.raw) * price,
    lastUpdated: Date.now()
  };
}

// Fee Structure with computed total
export interface BridgeFees {
  network: {
    amount: Amount;
    amountUSD: number;
  };
  protocol: {
    amount: Amount;
    amountUSD: number;
    percent: number;
  };
  total: {
    amount: Amount;
    amountUSD: number;
  };
}

// Helper to create bridge fees with computed total
export function createBridgeFees(
  networkAmount: Amount,
  networkAmountUSD: number,
  protocolAmount: Amount,
  protocolAmountUSD: number,
  protocolPercent: number
): BridgeFees {
  const totalBN = networkAmount.bn + protocolAmount.bn;
  const totalAmount = createAmount(totalBN, networkAmount.decimals);
  
  return {
    network: {
      amount: networkAmount,
      amountUSD: networkAmountUSD
    },
    protocol: {
      amount: protocolAmount,
      amountUSD: protocolAmountUSD,
      percent: protocolPercent
    },
    total: {
      amount: totalAmount,
      amountUSD: networkAmountUSD + protocolAmountUSD
    }
  };
}

// Bridge Quote for real-time pricing
export interface BridgeQuote {
  id: string;
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  exchangeRate: string;
  networkFee: string;
  protocolFee: string;
  totalFee: string;
  estimatedTime: string;
  minimumReceived: string;
  priceImpact: string;
  expiresAt: number; // Timestamp when quote expires
  
  // HTLC-specific fields
  secretHash?: string;
  timelock?: number;
  isAtomicSwap?: boolean;
  contractAddress?: string;
  
  // 1inch Fusion+ specific fields
  fusionQuoteId?: string;
  fusionPreset?: 'fast' | 'medium' | 'slow';
  fusionData?: {
    // Raw response data
    srcTokenAmount: string;
    dstTokenAmount: string;
    presets: any; // Full presets object from API
    srcEscrowFactory: string;
    dstEscrowFactory: string;
    srcSafetyDeposit: string;
    dstSafetyDeposit: string;
    whitelist: string[];
    timeLocks: {
      srcWithdrawal: number;
      srcPublicWithdrawal: number;
      srcCancellation: number;
      srcPublicCancellation: number;
      dstWithdrawal: number;
      dstPublicWithdrawal: number;
      dstCancellation: number;
    };
    auctionDuration: number;
    secretsCount: number;
    // Market data
    prices?: {
      usd: {
        srcToken: string;
        dstToken: string;
      };
    };
    volume?: {
      usd: {
        srcToken: string;
        dstToken: string;
      };
    };
    autoK?: number;
    k?: number;
    mxK?: number;
  };
  
  // Fallback indicator
  isFallback?: boolean;
}

// Bridge Route with derived formatters
export interface BridgeRoute {
  from: Token;
  to: Token;
  
  // Single source of truth for amounts
  limits: {
    min: Amount;
    max: Amount;
  };
  
  // Time estimation
  estimatedTime: {
    minutes: number;
    blocks?: number;
  };
  
  // Fees and rates
  fees: BridgeFees;
  exchangeRate: number;
  inverseRate: number; // Will be computed as 1 / exchangeRate
  
  priceImpact: number; // Percentage
  available: boolean;
  warnings?: string[];
  
  // Special route types
  isWrapping: boolean;
  requiresApproval: boolean;
}

// Transaction Status
export type TransactionStatus = 
  'pending'
  | 'confirming'
  | 'confirmed'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

// Bridge Transaction
export interface BridgeTransaction {
  id: string;
  
  // Token info
  from: Token;
  to: Token;
  
  // Amounts as single source
  fromAmount: Amount;
  toAmount: Amount;
  
  // Addresses
  fromAddress: string;
  toAddress: string;
  
  // Status
  status: TransactionStatus;
  
  // Transaction identifiers (one will be populated based on network)
  txIdentifier: {
    ethereum?: string; // tx hash
    bitcoin?: string;  // tx id
    solana?: string;   // tx signature
    starknet?: string; // tx hash
    stellar?: string;  // tx hash
    htlc?: {
      id: string;
      preimage?: string; // Optional - only set when needed
      hash?: string;
      timelock?: number; // Absolute timestamp for HTLC expiry
      redeemed?: boolean;
      refunded?: boolean;
    };
  };
  
  // Confirmation tracking
  confirmations: number;
  requiredConfirmations: number;
  isConfirmed: boolean; // Will be computed
  
  // Timestamps
  timestamps: {
    created: number;
    updated: number;
    completed?: number;
  };
  
  // Duration in milliseconds (computed when transaction completes)
  duration?: number;
  
  // Fees paid
  fees: BridgeFees;
  
  // Error handling
  error?: {
    code: BridgeErrorCode;
    message: string;
    details?: unknown;
  };
  
  retryCount: number;
}

// Bridge State - Focused on essentials
export interface BridgeFormState {
  fromToken: Token | null;
  toToken: Token | null;
  amount: Amount | null; // Single amount that gets converted
  recipient?: string; // Optional different recipient
}

export interface BridgeSettings {
  slippage: number; // Percentage (0.5 = 0.5%)
  expertMode: boolean;
  infiniteApproval: boolean;
  customRPC?: string;
}

export interface BridgeState {
  form: BridgeFormState;
  settings: BridgeSettings;
  route: BridgeRoute | null;
  
  // Loading states
  loading: {
    route: boolean;
    prices: boolean;
    approval: boolean;
    bridge: boolean;
  };
  
  // Error handling
  error: BridgeError | null;
  warnings: string[];
  
  // Transaction tracking
  pendingTransaction: BridgeTransaction | null;
}

// Error Types
export interface BridgeError {
  code: BridgeErrorCode;
  message: string;
  details?: unknown;
}

export enum BridgeErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  
  // Wallet errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WRONG_NETWORK = 'WRONG_NETWORK',
  USER_REJECTED = 'USER_REJECTED',
  
  // Bridge errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  AMOUNT_TOO_LOW = 'AMOUNT_TOO_LOW',
  AMOUNT_TOO_HIGH = 'AMOUNT_TOO_HIGH',
  NO_ROUTE_FOUND = 'NO_ROUTE_FOUND',
  SLIPPAGE_EXCEEDED = 'SLIPPAGE_EXCEEDED',
  
  // Transaction errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  APPROVAL_FAILED = 'APPROVAL_FAILED',
  TIMEOUT = 'TIMEOUT',
  
  // Unknown
  UNKNOWN = 'UNKNOWN'
}

// Exchange Rate
export interface ExchangeRate {
  pair: {
    from: Token;
    to: Token;
  };
  rate: number;
  lastUpdated: number;
  source: 'chainlink' | 'uniswap' | 'coingecko' | 'aggregate';
  confidence: 'high' | 'medium' | 'low';
}

// Supported token pairs for the bridge
export const SUPPORTED_PAIRS = [
  { from: 'BTC', to: 'WBTC' },
  { from: 'WBTC', to: 'BTC' },
  { from: 'ETH', to: 'WETH' },
  { from: 'WETH', to: 'ETH' },
  { from: 'SOL', to: 'WSOL' },
  { from: 'WSOL', to: 'SOL' },
  { from: 'STARK', to: 'WSTARK' },
  { from: 'WSTARK', to: 'STARK' },
  { from: 'XLM', to: 'WXLM' },
  { from: 'WXLM', to: 'XLM' },
  { from: 'BTC', to: 'ETH' },
  { from: 'ETH', to: 'BTC' },
  { from: 'ETH', to: 'SOL' },
  { from: 'SOL', to: 'ETH' },
  { from: 'ETH', to: 'STARK' },
  { from: 'STARK', to: 'ETH' },
  { from: 'ETH', to: 'XLM' },
  { from: 'XLM', to: 'ETH' },
  { from: 'BTC', to: 'SOL' },
  { from: 'SOL', to: 'BTC' },
  { from: 'BTC', to: 'STARK' },
  { from: 'STARK', to: 'BTC' },
  { from: 'BTC', to: 'XLM' },
  { from: 'XLM', to: 'BTC' },
] as const;

export type SupportedPair = typeof SUPPORTED_PAIRS[number];