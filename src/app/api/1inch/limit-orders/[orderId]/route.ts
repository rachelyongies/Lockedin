import { NextRequest, NextResponse } from 'next/server';

const LIMIT_ORDER_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_LIMIT_ORDER_API_URL || 'https://api.1inch.dev/orderbook/v4.0',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || '',
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
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');

    console.log('🔍 1inch Limit Order API - Getting order status:', orderId);

    if (!chainId) {
      return NextResponse.json(
        { error: 'chainId parameter is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${LIMIT_ORDER_API_CONFIG.baseUrl}/${chainId}/order/${orderId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LIMIT_ORDER_API_CONFIG.apiKey}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(LIMIT_ORDER_API_CONFIG.timeout),
      }
    );

    console.log('📊 1inch Order Status Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 1inch Order Status Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || `Order Status API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Order Status Retrieved Successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Order Status API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get order status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { orderId } = await params;
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');

    console.log('🗑️ 1inch Limit Order API - Cancelling order:', orderId);

    if (!chainId) {
      return NextResponse.json(
        { error: 'chainId parameter is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${LIMIT_ORDER_API_CONFIG.baseUrl}/${chainId}/order/${orderId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${LIMIT_ORDER_API_CONFIG.apiKey}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(LIMIT_ORDER_API_CONFIG.timeout),
      }
    );

    console.log('📊 1inch Order Cancellation Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 1inch Order Cancellation Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || `Order Cancellation API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Order Cancelled Successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Order Cancellation API Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}