import { NextRequest, NextResponse } from 'next/server';

const FUSION_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_FUSION_API_URL || 'https://api.1inch.dev/fusion',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

// Multi-chain support configuration
const SUPPORTED_CHAINS = {
  1: 'Ethereum',
  137: 'Polygon', 
  42161: 'Arbitrum',
  10: 'Optimism',
  56: 'BSC'
};

const getAggregationApiConfig = (chainId: number) => ({
  baseUrl: `https://api.1inch.dev/swap/v6.0/${chainId}`,
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || '',
  timeout: 30000,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 1inch Fusion API Proxy - Received quote request');
    
    const body = await request.json();
    console.log('📋 Request body:', body);
    
    // Validate addresses before proceeding
    const addresses = {
      fromTokenAddress: body.fromTokenAddress,
      toTokenAddress: body.toTokenAddress,
      walletAddress: body.walletAddress
    };
    
    console.log('🔍 Address validation:', {
      fromToken: `${addresses.fromTokenAddress} (length: ${addresses.fromTokenAddress?.length || 0})`,
      toToken: `${addresses.toTokenAddress} (length: ${addresses.toTokenAddress?.length || 0})`,
      wallet: `${addresses.walletAddress} (length: ${addresses.walletAddress?.length || 0})`
    });
    
    // Check for valid Ethereum address format (0x + 40 hex chars = 42 total)
    const isValidAddress = (addr: string) => addr && /^0x[0-9a-fA-F]{40}$/.test(addr);
    const addressValidation = {
      fromToken: isValidAddress(addresses.fromTokenAddress),
      toToken: isValidAddress(addresses.toTokenAddress),
      wallet: isValidAddress(addresses.walletAddress)
    };
    
    console.log('✅ Address format validation:', addressValidation);
    
    if (!addressValidation.fromToken || !addressValidation.toToken || !addressValidation.wallet) {
      console.error('❌ Invalid address format detected:', {
        fromToken: !addressValidation.fromToken ? addresses.fromTokenAddress : 'valid',
        toToken: !addressValidation.toToken ? addresses.toTokenAddress : 'valid', 
        wallet: !addressValidation.wallet ? addresses.walletAddress : 'valid'
      });
    }
    
    // Support multi-chain requests
    const chainId = body.chainId || 1;
    
    // Validate chain support
    if (!SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS]) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}. Supported chains: ${Object.keys(SUPPORTED_CHAINS).join(', ')}` },
        { status: 400 }
      );
    }
    
    console.log(`🌐 Processing request for ${SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS]} (Chain ID: ${chainId})`);
    
    // Convert POST body to GET query parameters for Fusion API
    const fusionParams = new URLSearchParams({
      srcTokenAddress: body.fromTokenAddress,
      dstTokenAddress: body.toTokenAddress,
      amount: body.amount,
      walletAddress: body.walletAddress,
      enableEstimate: body.enableEstimate ? 'true' : 'false',
      complexityLevel: body.complexityLevel || 'medium'
    });
    
    const fusionEndpoint = `https://api.1inch.dev/fusion/quoter/v2.0/${chainId}/quote/receive?${fusionParams}`;
    
    console.log('🎯 Trying Fusion API v2.0 endpoint:', fusionEndpoint);
    
    const response = await fetch(fusionEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FUSION_API_CONFIG.apiKey}`,
      },
      signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
    });

    console.log('📊 1inch Fusion API Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Fusion API Error:', errorText);
      
      // Try fallback to standard aggregation API
      console.log('🔄 Trying fallback to 1inch Aggregation API');
      
      // Fix native ETH address for aggregation API fallback
      const srcToken = body.fromTokenAddress === '0x0000000000000000000000000000000000000000' 
        ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' 
        : body.fromTokenAddress;
      const dstToken = body.toTokenAddress === '0x0000000000000000000000000000000000000000' 
        ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' 
        : body.toTokenAddress;
      
      const queryParams = new URLSearchParams({
        src: srcToken,
        dst: dstToken, 
        amount: body.amount,
        from: body.walletAddress,
        slippage: '1', // 1% slippage
        disableEstimate: 'false',
        allowPartialFill: 'false'
      });
      
      const aggregationConfig = getAggregationApiConfig(chainId);
      const fallbackResponse = await fetch(`${aggregationConfig.baseUrl}/quote?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${aggregationConfig.apiKey}`,
        },
        signal: AbortSignal.timeout(aggregationConfig.timeout),
      });
      
      if (!fallbackResponse.ok) {
        const fallbackError = await fallbackResponse.text();
        console.error('❌ 1inch Aggregation API Error:', fallbackError);
        return NextResponse.json(
          { error: `Both APIs failed. Fusion: ${errorText}, Aggregation: ${fallbackError}` },
          { status: response.status }
        );
      }
      
      const fallbackData = await fallbackResponse.json();
      console.log('✅ 1inch Aggregation API Success - Using fallback');
      return NextResponse.json(fallbackData);
    }

    const data = await response.json();
    console.log('✅ 1inch Fusion API Success - Quote received');
    
    // Enhanced diagnostics for Fusion API response
    console.log('🔍 [FUSION DIAGNOSTICS] Response analysis:', {
      hasToAmount: !!(data.toAmount || data.toTokenAmount || data.dstAmount),
      toAmount: data.toAmount || data.toTokenAmount || data.dstAmount || 'undefined',
      hasFromAmount: !!(data.fromAmount || data.fromTokenAmount || data.srcAmount),
      fromAmount: data.fromAmount || data.fromTokenAmount || data.srcAmount || 'undefined',
      responseKeys: Object.keys(data),
      requestParams: {
        srcToken: body.fromTokenAddress,
        dstToken: body.toTokenAddress,
        amount: body.amount,
        walletAddress: body.walletAddress
      }
    });
    
    // Check for zero output and investigate potential causes
    const outputAmount = data.toAmount || data.toTokenAmount || data.dstAmount;
    if (!outputAmount || outputAmount === '0' || outputAmount === 0) {
      console.warn('⚠️ [FUSION ZERO OUTPUT] Fusion API returned 0 output amount:');
      console.warn('📋 Detailed investigation:', {
        rawResponse: JSON.stringify(data, null, 2),
        possibleCauses: [
          'Insufficient liquidity for token pair',
          'Amount too small or too large',
          'Token addresses invalid or not supported',
          'Fusion not available for this pair',
          'Request parameters malformed'
        ],
        requestValidation: {
          hasValidSrcToken: body.fromTokenAddress && body.fromTokenAddress.length === 42,
          hasValidDstToken: body.toTokenAddress && body.toTokenAddress.length === 42,
          hasValidAmount: body.amount && parseFloat(body.amount) > 0,
          hasValidWallet: body.walletAddress && body.walletAddress.length === 42
        },
        recommendations: [
          'Check token pair is supported by Fusion',
          'Verify amount is within reasonable limits',
          'Try aggregation API as fallback',
          'Check if tokens are properly approved'
        ]
      });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch APIs' },
      { status: 500 }
    );
  }
}