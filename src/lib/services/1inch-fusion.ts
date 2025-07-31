import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';

const FUSION_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_FUSION_API_URL || 'https://api.1inch.dev/fusion',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000, // set min time out 
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// 1inch Fusion API Types
export interface FusionQuoteRequest {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  walletAddress: string;
  source?: string; // Your app identifier
  enableEstimate?: boolean;
  permit?: string;
  fee?: number;
  gasPrice?: string;
  complexityLevel?: 'low' | 'medium' | 'high';
  connectorTokens?: string[];
  chiGasToken?: string;
  allowPartialFill?: boolean;
}

export interface FusionQuoteResponse {
  fromToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
    logoURI: string;
    tags: string[];
  };
  toToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
    logoURI: string;
    tags: string[];
  };
  toTokenAmount: string;
  fromTokenAmount: string;
  protocols: Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>;
  estimatedGas: number;
  gasCostUSD: string;
  gasCost: string;
  priceImpact: string;
  blockNumber: number;
  data: string;
  value: string;
  gasPrice: string;
  gas: string;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasPrice: string;
    gas: string;
  };
}

export interface FusionOrderRequest {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  walletAddress: string;
  source?: string;
  permit?: string;
  fee?: number;
  gasPrice?: string;
  complexityLevel?: 'low' | 'medium' | 'high';
  connectorTokens?: string[];
  chiGasToken?: string;
  allowPartialFill?: boolean;
  quoteId?: string;
}

export interface FusionOrderResponse {
  orderId: string;
  orderStatus: 'pending' | 'open' | 'filled' | 'cancelled' | 'expired' | 'failed';
  fromToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
    logoURI: string;
  };
  toToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
    logoURI: string;
  };
  fromTokenAmount: string;
  toTokenAmount: string;
  txHash?: string;
  blockNumber?: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  priceImpact: string;
  estimatedGas: number;
  gasCostUSD: string;
  gasCost: string;
  protocols: Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>;
}

export interface FusionOrderStatusResponse {
  orderId: string;
  orderStatus: 'pending' | 'open' | 'filled' | 'cancelled' | 'expired' | 'failed';
  txHash?: string;
  blockNumber?: number;
  updatedAt: number;
  error?: string;
}

// Error handling
class FusionAPIError extends Error {
  constructor(
    message: string,
    public code: BridgeErrorCode,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'FusionAPIError';
  }
}

// Utility functions
function createFusionAPIError(error: unknown): FusionAPIError {
  if (error instanceof FusionAPIError) {
    return error;
  }

  // Handle different error types
  const errorObj = error as Record<string, unknown>;
  
  if (errorObj?.status === 429) {
    return new FusionAPIError(
      'Rate limit exceeded. Please try again later.',
      BridgeErrorCode.NETWORK_ERROR,
      errorObj.status as number
    );
  }

  if (typeof errorObj?.status === 'number' && errorObj.status >= 500) {
    return new FusionAPIError(
      '1inch Fusion service is temporarily unavailable.',
      BridgeErrorCode.NETWORK_ERROR,
      errorObj.status
    );
  }

  if (errorObj?.status === 400) {
    return new FusionAPIError(
      'Invalid request parameters.',
      BridgeErrorCode.AMOUNT_TOO_LOW,
      errorObj.status as number,
      errorObj.details as Record<string, unknown>
    );
  }

  return new FusionAPIError(
    typeof errorObj?.message === 'string' ? errorObj.message : 'Unknown error occurred',
    BridgeErrorCode.UNKNOWN,
    typeof errorObj?.status === 'number' ? errorObj.status : undefined,
    errorObj?.details as Record<string, unknown> | undefined
  );
}

// HTTP client with retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = FUSION_API_CONFIG.retryAttempts
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${FUSION_API_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new FusionAPIError(
        errorData.message || `HTTP ${response.status}`,
        BridgeErrorCode.NETWORK_ERROR,
        response.status,
        errorData
      );
    }

    return response;
  } catch (error) {
    if (retries > 0 && (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError'))) {
      await new Promise(resolve => setTimeout(resolve, FUSION_API_CONFIG.retryDelay));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Token address mapping for 1inch
const TOKEN_ADDRESS_MAP: Record<string, string> = {
  // Ethereum Mainnet - Use the correct native ETH address for 1inch
  'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
  'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  'USDC': '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
  
  // Testnet addresses (if needed)
  'ETH_GOERLI': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
  'WETH_GOERLI': '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  'WBTC_GOERLI': '0x45AC1a6661fD0D4ec7Bf9aE58a9F63A7E2b51e73',
};

// Convert amount to wei (smallest unit) for API calls
function toWei(amount: string, decimals: number = 18): string {
  const [integer, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
  return (integer + paddedDecimal).replace(/^0+/, '') || '0';
}

// Convert our token to 1inch token address
function getTokenAddress(token: Token): string {
  // Handle native ETH - always use the correct 1inch address
  if (token.symbol === 'ETH' || token.address === '0x0000000000000000000000000000000000000000') {
    return TOKEN_ADDRESS_MAP['ETH'];
  }
  
  if (token.network === 'bitcoin') {
    // For Bitcoin, we need to use WBTC on Ethereum
    return TOKEN_ADDRESS_MAP['WBTC'];
  }
  
  const key = `${token.symbol}_${token.network === 'ethereum' ? (token.chainId === 1 ? '' : 'GOERLI') : ''}`;
  return TOKEN_ADDRESS_MAP[key] || ('address' in token ? token.address || '' : '');
}

// Main Fusion API Service
export class FusionAPIService {
  private static instance: FusionAPIService;

  static getInstance(): FusionAPIService {
    if (!FusionAPIService.instance) {
      FusionAPIService.instance = new FusionAPIService();
    }
    return FusionAPIService.instance;
  }

  // Get quote for token swap
  async getQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    try {
      console.log('🔥 1inch Fusion API - Starting quote request');
      console.log('📋 Request parameters:', {
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount,
        walletAddress: walletAddress?.slice(0, 6) + '...' + walletAddress?.slice(-4),
        network: fromToken.network
      });

      const fromTokenAddress = getTokenAddress(fromToken);
      const toTokenAddress = getTokenAddress(toToken);
      
      console.log('🏷️ Token addresses:', {
        fromTokenAddress,
        toTokenAddress,
        fromTokenMapped: fromTokenAddress !== fromToken.symbol,
        toTokenMapped: toTokenAddress !== toToken.symbol
      });

      // Convert amount to wei for API call
      const fromTokenDecimals = fromToken.symbol === 'WBTC' ? 8 : 18;
      const amountInWei = toWei(amount, fromTokenDecimals);
      
      console.log('💰 Amount conversion:', {
        originalAmount: amount,
        decimals: fromTokenDecimals,
        amountInWei,
        tokenSymbol: fromToken.symbol
      });

      const request: FusionQuoteRequest = {
        fromTokenAddress,
        toTokenAddress,
        amount: amountInWei,
        walletAddress: walletAddress,
        source: 'chaincrossing-bridge',
        enableEstimate: true,
        complexityLevel: 'medium',
        allowPartialFill: false,
      };

      console.log('📡 1inch Fusion API - Sending request to proxy:', '/api/1inch/fusion/quote');
      console.log('🔑 API Key configured:', !!FUSION_API_CONFIG.apiKey && FUSION_API_CONFIG.apiKey !== 'demo_api_key');
      console.log('📦 Request payload:', JSON.stringify(request, null, 2));

      // Use local API proxy to avoid CORS issues
      const response = await fetch('/api/1inch/fusion/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new FusionAPIError(
          errorData.error || `HTTP ${response.status}`,
          BridgeErrorCode.NETWORK_ERROR,
          response.status,
          errorData
        );
      }

      console.log('✅ 1inch Fusion API - Response received');
      console.log('📊 Response status:', response.status, response.statusText);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      const data: FusionQuoteResponse = await response.json();
      
      console.log('🎯 1inch Fusion API - Response data received');
      console.log('📈 Quote data:', {
        fromTokenAmount: data.fromTokenAmount,
        toTokenAmount: data.toTokenAmount,
        estimatedGas: data.estimatedGas,
        gasCostUSD: data.gasCostUSD,
        priceImpact: data.priceImpact,
        protocolsUsed: data.protocols?.length || 0,
        protocols: data.protocols?.map(p => p.name).join(', ') || 'none'
      });

      // Convert 1inch response to our BridgeQuote format
      const bridgeQuote = {
        id: Math.random().toString(36).substr(2, 9), // Generate unique ID
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: data.toTokenAmount,
        exchangeRate: (parseFloat(data.toTokenAmount) / parseFloat(amount)).toString(),
        networkFee: data.gasCost,
        protocolFee: '0', // 1inch doesn't charge protocol fees
        totalFee: data.gasCost,
        estimatedTime: '2-5 minutes',
        minimumReceived: data.toTokenAmount, // No slippage in quotes
        priceImpact: data.priceImpact,
        expiresAt: Date.now() + 30000, // 30 seconds
      };

      console.log('🎉 1inch Fusion API - Quote successfully converted');
      console.log('💰 Final quote:', {
        id: bridgeQuote.id,
        exchangeRate: bridgeQuote.exchangeRate,
        toAmount: bridgeQuote.toAmount,
        networkFee: bridgeQuote.networkFee,
        priceImpact: bridgeQuote.priceImpact,
        estimatedTime: bridgeQuote.estimatedTime
      });
      
      return bridgeQuote;
    } catch (error) {
      console.error('❌ 1inch Fusion API - Quote request failed');
      console.error('Error details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        apiUrl: `${FUSION_API_CONFIG.baseUrl}/quote`
      });
      throw createFusionAPIError(error);
    }
  }

  // Create order for token swap
  async createOrder(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string,
    quoteId?: string
  ): Promise<FusionOrderResponse> {
    try {
      const request: FusionOrderRequest = {
        fromTokenAddress: getTokenAddress(fromToken),
        toTokenAddress: getTokenAddress(toToken),
        amount: amount,
        walletAddress: walletAddress,
        source: 'chaincrossing-bridge',
        complexityLevel: 'medium',
        allowPartialFill: false,
        quoteId,
      };

      // Use local API proxy to avoid CORS issues
      const response = await fetch('/api/1inch/fusion/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createFusionAPIError({
          message: errorData.error || `HTTP ${response.status}`,
          status: response.status,
          details: errorData
        });
      }

      return await response.json();
    } catch (error) {
      throw createFusionAPIError(error);
    }
  }

  // Get order status
  async getOrderStatus(orderId: string): Promise<FusionOrderStatusResponse> {
    try {
      // Use local API proxy to avoid CORS issues
      const response = await fetch(`/api/1inch/fusion/order/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createFusionAPIError({
          message: errorData.error || `HTTP ${response.status}`,
          status: response.status,
          details: errorData
        });
      }

      return await response.json();
    } catch (error) {
      throw createFusionAPIError(error);
    }
  }

  // Get supported tokens
  async getSupportedTokens(chainId: number = 1): Promise<Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
  }>> {
    try {
      // Use local API proxy to avoid CORS issues
      const response = await fetch(`/api/1inch/fusion/tokens/${chainId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createFusionAPIError({
          message: errorData.error || `HTTP ${response.status}`,
          status: response.status,
          details: errorData
        });
      }

      return await response.json();
    } catch (error) {
      throw createFusionAPIError(error);
    }
  }

  // Get token prices
  async getTokenPrices(tokenAddresses: string[]): Promise<Record<string, number>> {
    try {
      // Use local API proxy to avoid CORS issues
      const response = await fetch(`/api/1inch/fusion/prices?tokens=${tokenAddresses.join(',')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createFusionAPIError({
          message: errorData.error || `HTTP ${response.status}`,
          status: response.status,
          details: errorData
        });
      }

      const data = await response.json();
      return data.prices || {};
    } catch (error) {
      throw createFusionAPIError(error);
    }
  }
}

// Export singleton instance
export const fusionAPI = FusionAPIService.getInstance(); 