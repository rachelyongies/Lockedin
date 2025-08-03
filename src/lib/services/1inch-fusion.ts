import { Token, BridgeQuote, BridgeTransaction, BridgeError, BridgeErrorCode } from '@/types/bridge';

const FUSION_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_FUSION_API_URL || 'https://api.1inch.dev/fusion',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || '',
  timeout: 30000,  
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// 1inch Fusion API Types
export interface FusionQuoteRequest {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  walletAddress: string;
  source?: string; 
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
  'ETH': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  'USDC': '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
  'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  'LINK': '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  'UNI': '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  'AAVE': '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  'CRV': '0xD533a949740bb3306d119CC777fa900bA034cd52',
  'COMP': '0xc00e94Cb662C3520282E6f5717214004A7f26888',
  
  // Ethereum Testnet (Goerli)
  'ETH_GOERLI': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
  'WETH_GOERLI': '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
  'WBTC_GOERLI': '0x45AC1a6661fD0D4ec7Bf9aE58a9F63A7E2b51e73',
  'USDC_GOERLI': '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
  'USDT_GOERLI': '0x110a13FC3efE6A245B50102D2d529B3d88A5F3c4',
  
  // Ethereum Testnet (Sepolia)
  'ETH_SEPOLIA': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE',
  'WETH_SEPOLIA': '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  'USDC_SEPOLIA': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
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
  if (token.symbol === 'ETH' || ('address' in token && token.address === '0x0000000000000000000000000000000000000000')) {
    return TOKEN_ADDRESS_MAP['ETH'];
  }
  
  // Handle Bitcoin network - use WBTC on Ethereum
  if (token.network === 'bitcoin') {
    return TOKEN_ADDRESS_MAP['WBTC'];
  }
  
  // Handle different Ethereum networks
  if (token.network === 'ethereum') {
    let networkSuffix = '';
    
    if (token.chainId === 1) {
      networkSuffix = ''; // Mainnet
    } else if (token.chainId === 5) {
      networkSuffix = '_GOERLI';
    } else if (token.chainId === 11155111) {
      networkSuffix = '_SEPOLIA';
    }
    
    const key = `${token.symbol}${networkSuffix}`;
    const address = TOKEN_ADDRESS_MAP[key];
    
    if (address) {
      return address;
    }
  }
  
  // Fallback to token's own address if available
  if ('address' in token && token.address) {
    return token.address;
  }
  
  // Final fallback - try mainnet address
  return TOKEN_ADDRESS_MAP[token.symbol] || '';
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

  // Get token prices using 1inch Spot Price API with proper token metadata
  async getTokenPrices(tokenAddresses: string[]): Promise<Record<string, number>> {
    try {
      console.log('🔥 1inch Token Pricing - Step 1: Get token metadata');
      
      // Filter out non-Ethereum addresses and validate
      const validAddresses = tokenAddresses.filter(addr => {
        const isValid = addr.startsWith('0x') && addr.length === 42;
        if (!isValid) {
          console.warn(`⚠️ Invalid Ethereum address for 1inch: ${addr}`);
        }
        return isValid;
      });

      if (validAddresses.length === 0) {
        console.warn('⚠️ No valid Ethereum addresses for 1inch API');
        return {};
      }

      // Step 1: Get token metadata from 1inch Aggregation API
      const tokensMetadata = await this.getTokensMetadata(1); // Ethereum mainnet
      console.log('✅ Token metadata fetched from 1inch Aggregation API');

      // Step 2: Get spot prices from 1inch
      const response = await fetch(`/api/1inch/spot-price/1/${validAddresses.join(',')}`, {
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

      const spotData = await response.json();
      console.log('✅ 1inch Spot Price API response:', spotData);
      
      // Step 3: Get real ETH price from CoinGecko for USD conversion
      let ethPriceUSD = 3200; // Updated fallback
      try {
        const ethPriceResponse = await fetch('/api/coingecko/simple/price?ids=ethereum&vs_currencies=usd');
        if (ethPriceResponse.ok) {
          const ethPriceData = await ethPriceResponse.json();
          if (ethPriceData.ethereum && ethPriceData.ethereum.usd) {
            ethPriceUSD = ethPriceData.ethereum.usd;
            console.log(`✅ Real ETH price from CoinGecko: $${ethPriceUSD.toLocaleString()}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to get real ETH price, using fallback:', ethPriceUSD);
      }
      
      // Step 4: Convert 1inch ratios to USD prices using metadata
      const convertedPrices: Record<string, number> = {};
      const ethAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      
      console.log('🔥 1inch Token Analysis with Metadata:');
      
      for (const [address, priceWei] of Object.entries(spotData)) {
        if (typeof priceWei === 'string') {
          const addressLower = address.toLowerCase();
          const tokenMeta = tokensMetadata.tokens?.[addressLower];
          
          // Convert wei to ETH ratio (divide by 1e18)
          const priceRatioInEth = parseFloat(priceWei) / 1e18;
          // Convert to USD using real ETH price
          const priceInUSD = priceRatioInEth * ethPriceUSD;
          
          convertedPrices[address] = priceInUSD;
          
          // Enhanced logging with token metadata
          const tokenSymbol = tokenMeta?.symbol || 'UNKNOWN';
          const tokenName = tokenMeta?.name || 'Unknown Token';
          
          if (addressLower === '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599') {
            console.log(`🏆 ${tokenSymbol} (${tokenName}): ${priceWei} wei = ${priceRatioInEth.toFixed(6)} ETH = $${priceInUSD.toLocaleString()} USD`);
            console.log(`   → 1 ${tokenSymbol} = ${priceRatioInEth.toFixed(6)} ETH (${(priceInUSD/ethPriceUSD).toFixed(6)}x ETH)`);
          } else if (addressLower === ethAddress) {
            console.log(`🏆 ${tokenSymbol} (${tokenName}): ${priceWei} wei = ${priceRatioInEth.toFixed(6)} ETH = $${priceInUSD.toLocaleString()} USD`);
          } else {
            console.log(`💰 ${tokenSymbol}: ${priceWei} wei = ${priceRatioInEth.toFixed(6)} ETH = $${priceInUSD.toFixed(2)} USD`);
          }
        }
      }
      
      console.log('🔄 Final USD prices with 1inch metadata:', convertedPrices);
      return convertedPrices;
    } catch (error) {
      console.error('❌ 1inch Token Pricing error:', error);
      throw createFusionAPIError(error);
    }
  }

  // Get token metadata from 1inch Aggregation API
  private async getTokensMetadata(chainId: number = 1): Promise<{ tokens: Record<string, { symbol: string; name: string; decimals: number; logoURI?: string }> }> {
    try {
      const response = await fetch(`/api/1inch/fusion/tokens/${chainId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
      });

      if (!response.ok) {
        throw new Error(`Tokens metadata API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('⚠️ Failed to get token metadata:', error);
      return { tokens: {} };
    }
  }
}

// Export singleton instance
export const fusionAPI = FusionAPIService.getInstance(); 