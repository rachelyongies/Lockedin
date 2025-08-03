import { NextRequest, NextResponse } from 'next/server';

const LIMIT_ORDER_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_LIMIT_ORDER_API_URL || 'https://api.1inch.dev/orderbook/v4.0',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || '',
  timeout: 30000,
};

interface LimitOrderRequest {
  chainId: number;
  makerAddress: string;
  takerAddress?: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
  salt?: string;
  expiration?: number;
  permit?: string;
  interaction?: string;
  receiver?: string;
  allowedSender?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 1inch Limit Order API - Creating limit order');
    
    const orderData: LimitOrderRequest = await request.json();
    console.log('📋 Order request:', orderData);

    // Validate required fields
    if (!orderData.chainId || !orderData.makerAddress || !orderData.makerAsset || 
        !orderData.takerAsset || !orderData.makingAmount || !orderData.takingAmount) {
      return NextResponse.json(
        { error: 'Missing required order parameters' },
        { status: 400 }
      );
    }

    const response = await fetch(`${LIMIT_ORDER_API_CONFIG.baseUrl}/${orderData.chainId}/order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LIMIT_ORDER_API_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
      signal: AbortSignal.timeout(LIMIT_ORDER_API_CONFIG.timeout),
    });

    console.log('📊 1inch Limit Order Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 1inch Limit Order Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || `Limit Order API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Limit Order Created Successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Limit Order API Error:', error);
    return NextResponse.json(
      { error: 'Failed to create limit order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');
    const makerAddress = searchParams.get('makerAddress');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '100';

    console.log('🔍 1inch Limit Order API - Fetching orders', { chainId, makerAddress });

    if (!chainId) {
      return NextResponse.json(
        { error: 'chainId parameter is required' },
        { status: 400 }
      );
    }

    const queryParams = new URLSearchParams({
      page,
      limit,
    });

    if (makerAddress) {
      queryParams.append('makerAddress', makerAddress);
    }

    const response = await fetch(
      `${LIMIT_ORDER_API_CONFIG.baseUrl}/${chainId}/orders?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LIMIT_ORDER_API_CONFIG.apiKey}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(LIMIT_ORDER_API_CONFIG.timeout),
      }
    );

    console.log('📊 1inch Orders Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 1inch Orders Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || `Orders API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Orders Retrieved Successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Orders API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}