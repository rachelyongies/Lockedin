import { NextRequest, NextResponse } from 'next/server';

const FUSION_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_FUSION_API_URL || 'https://api.1inch.dev/fusion',
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
    console.log('🔥 1inch Fusion API Proxy - Received tokens request for chain:', chainId);
    
    const response = await fetch(`${FUSION_API_CONFIG.baseUrl}/tokens/${chainId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FUSION_API_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
    });

    console.log('📊 1inch Tokens API Response:', response.status, response.statusText);
    
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