import { NextRequest, NextResponse } from 'next/server';

const FUSION_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_FUSION_API_URL || 'https://api.1inch.dev/fusion',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

// Also try the standard 1inch aggregation API as fallback
const AGGREGATION_API_CONFIG = {
  baseUrl: 'https://api.1inch.dev/swap/v6.0/1', // Ethereum mainnet
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 1inch Fusion API Proxy - Received quote request');
    
    const body = await request.json();
    console.log('📋 Request body:', body);
    
    // Use the correct v2.0 Fusion API endpoint structure (GET method with query params)
    const chainId = 1; // Ethereum mainnet for now
    
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
      
      const fallbackResponse = await fetch(`${AGGREGATION_API_CONFIG.baseUrl}/quote?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AGGREGATION_API_CONFIG.apiKey}`,
        },
        signal: AbortSignal.timeout(AGGREGATION_API_CONFIG.timeout),
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
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch APIs' },
      { status: 500 }
    );
  }
}