import { NextRequest, NextResponse } from 'next/server';

const FUSION_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_FUSION_API_URL || 'https://api.1inch.dev/fusion',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

interface RouteParams {
  orderId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { orderId } = await params;
    console.log('🔥 1inch Fusion API Proxy - Received order status request for:', orderId);
    
    const response = await fetch(`${FUSION_API_CONFIG.baseUrl}/order/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FUSION_API_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
    });

    console.log('📊 1inch Order Status API Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 1inch Order Status API Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || `1inch Order Status API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Order Status API Success - Status retrieved');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch Fusion Order Status API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to get order status from 1inch Fusion API' },
      { status: 500 }
    );
  }
}