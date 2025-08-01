import { NextRequest, NextResponse } from 'next/server';

const AGGREGATION_API_CONFIG = {
  baseUrl: 'https://api.1inch.dev/swap/v6.0',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '1';
    
    console.log('🔥 1inch Aggregation API - Quote request');
    console.log('📋 Query params:', Object.fromEntries(searchParams.entries()));

    // Required parameters for 1inch Aggregation API
    const src = searchParams.get('src');
    const dst = searchParams.get('dst'); 
    const amount = searchParams.get('amount');

    if (!src || !dst || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: src, dst, amount' },
        { status: 400 }
      );
    }

    // Build query parameters for 1inch API
    const apiParams = new URLSearchParams({
      src,
      dst,
      amount,
      fee: searchParams.get('fee') || '0',
      gasPrice: searchParams.get('gasPrice') || 'fast',
      complexityLevel: searchParams.get('complexityLevel') || '0',
      connectorTokens: searchParams.get('connectorTokens') || '',
      gasLimit: searchParams.get('gasLimit') || '750000',
      mainRouteParts: searchParams.get('mainRouteParts') || '10',
      parts: searchParams.get('parts') || '50',
      includeTokensInfo: 'true',
      includeProtocols: 'true',
      includeGas: 'true'
    });

    const endpoint = `${AGGREGATION_API_CONFIG.baseUrl}/${chainId}/quote?${apiParams}`;
    console.log('🎯 1inch Aggregation API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AGGREGATION_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(AGGREGATION_API_CONFIG.timeout),
    });

    console.log('📊 1inch Aggregation API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Aggregation API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Aggregation API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Aggregation API Success - Quote received');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch Aggregation API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Aggregation API' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔥 1inch Aggregation API - Quote request (POST)');
    console.log('📋 Request body:', body);

    const chainId = body.chainId || 1;

    // Build query parameters from POST body
    const apiParams = new URLSearchParams({
      src: body.src || body.fromTokenAddress,
      dst: body.dst || body.toTokenAddress,
      amount: body.amount,
      fee: body.fee || '0',
      gasPrice: body.gasPrice || 'fast',
      complexityLevel: body.complexityLevel || '0',
      connectorTokens: body.connectorTokens || '',
      gasLimit: body.gasLimit || '750000',
      mainRouteParts: body.mainRouteParts || '10',
      parts: body.parts || '50',
      includeTokensInfo: 'true',
      includeProtocols: 'true',
      includeGas: 'true'
    });

    const endpoint = `${AGGREGATION_API_CONFIG.baseUrl}/${chainId}/quote?${apiParams}`;
    console.log('🎯 1inch Aggregation API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AGGREGATION_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(AGGREGATION_API_CONFIG.timeout),
    });

    console.log('📊 1inch Aggregation API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Aggregation API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Aggregation API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Aggregation API Success - Quote received');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch Aggregation API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Aggregation API' },
      { status: 500 }
    );
  }
}