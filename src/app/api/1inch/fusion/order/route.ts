import { NextRequest, NextResponse } from 'next/server';

const FUSION_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_FUSION_API_URL || 'https://api.1inch.dev/fusion',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 1inch Fusion API Proxy - Received order creation request');
    
    const body = await request.json();
    console.log('📋 Order request body:', body);
    
    const response = await fetch(`${FUSION_API_CONFIG.baseUrl}/order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FUSION_API_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FUSION_API_CONFIG.timeout),
    });

    console.log('📊 1inch Order API Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 1inch Order API Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || `1inch Order API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Order API Success - Order created');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch Fusion Order API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to create order with 1inch Fusion API' },
      { status: 500 }
    );
  }
}