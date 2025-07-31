import { NextRequest, NextResponse } from 'next/server';

const FUSION_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_FUSION_API_URL || 'https://api.1inch.dev/fusion',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokens = searchParams.get('tokens');
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'tokens parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔥 1inch Fusion API Proxy - Received prices request for tokens:', tokens);
    
    const response = await fetch(`${FUSION_API_CONFIG.baseUrl}/prices?tokens=${tokens}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FUSION_API_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
    });

    console.log('📊 1inch Prices API Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 1inch Prices API Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || `1inch Prices API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Prices API Success - Prices retrieved');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch Fusion Prices API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to get prices from 1inch Fusion API' },
      { status: 500 }
    );
  }
}