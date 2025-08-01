import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getCachedResponse, setCachedResponse, getClientId, performCleanup } from '@/lib/utils/rate-limit-cache';

const SPOT_PRICE_API_CONFIG = {
  baseUrl: 'https://api.1inch.dev/price/v1.1',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

function getCacheKey(chainId: string, addresses: string): string {
  return `spot_price_${chainId}_${addresses}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    const { params: routeParams } = await params;
    const [chainId, addresses] = routeParams;
    
    if (!chainId || !addresses) {
      return NextResponse.json(
        { error: 'Missing chainId or addresses parameter' },
        { status: 400 }
      );
    }

    // Perform periodic cleanup
    performCleanup();
    
    // Get client ID for rate limiting
    const clientId = getClientId(request);
    
    // Check rate limiting
    const rateLimitResult = checkRateLimit(clientId);
    if (rateLimitResult.isLimited) {
      console.log('⚠️ Rate limit exceeded for client:', clientId);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before making more requests.' },
        { 
          status: 429, 
          headers: { 
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': '15',
            'X-RateLimit-Remaining': '0'
          } 
        }
      );
    }
    
    console.log('🔥 1inch Spot Price API - Request');
    console.log('📋 Chain ID:', chainId);
    console.log('📋 Addresses:', addresses);
    
    // Check cache first
    const cacheKey = getCacheKey(chainId, addresses);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log('📦 Returning cached spot price data');
      return NextResponse.json(cachedResponse);
    }

    // Validate addresses format
    const addressList = addresses.split(',').map(addr => addr.trim());
    const validAddresses = addressList.filter(addr => {
      return addr.startsWith('0x') && addr.length === 42;
    });

    if (validAddresses.length === 0) {
      return NextResponse.json(
        { error: 'No valid Ethereum addresses provided' },
        { status: 400 }
      );
    }

    const endpoint = `${SPOT_PRICE_API_CONFIG.baseUrl}/${chainId}/${validAddresses.join(',')}`;
    console.log('🎯 1inch Spot Price API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SPOT_PRICE_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(SPOT_PRICE_API_CONFIG.timeout),
    });

    console.log('📊 1inch Spot Price API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Spot Price API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Spot Price API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Spot Price API Success - Prices retrieved');
    console.log('📊 Price data:', data);

    // Cache the response for 30 seconds
    setCachedResponse(cacheKey, data, 30000);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch Spot Price API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Spot Price API' },
      { status: 500 }
    );
  }
}