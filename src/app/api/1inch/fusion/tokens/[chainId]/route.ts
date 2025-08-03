import { NextRequest, NextResponse } from 'next/server';

const TOKENS_API_CONFIG = {
  baseUrl: 'https://api.1inch.dev/swap/v6.0', // Use Aggregation API for tokens metadata
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

interface RouteParams {
  chainId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { chainId } = await params;
    console.log('🔥 1inch Aggregation API - Received tokens request for chain:', chainId);
    
    const response = await fetch(`${TOKENS_API_CONFIG.baseUrl}/${chainId}/tokens`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKENS_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(TOKENS_API_CONFIG.timeout),
    });

    console.log('📊 1inch Aggregation Tokens API Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 1inch Tokens API Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || `1inch Tokens API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Tokens API Success - Tokens retrieved');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch Fusion Tokens API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to get tokens from 1inch Fusion API' },
      { status: 500 }
    );
  }
}