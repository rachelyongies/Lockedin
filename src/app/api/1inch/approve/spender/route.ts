import { NextRequest, NextResponse } from 'next/server';

const APPROVE_API_CONFIG = {
  baseUrl: 'https://api.1inch.dev/swap/v6.0',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '1';
    
    console.log('🔥 1inch Approve Spender API - Request');
    console.log('📋 Chain ID:', chainId);

    const endpoint = `${APPROVE_API_CONFIG.baseUrl}/${chainId}/approve/spender`;
    console.log('🎯 1inch Approve Spender API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${APPROVE_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(APPROVE_API_CONFIG.timeout),
    });

    console.log('📊 1inch Approve Spender API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Approve Spender API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Approve Spender API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Approve Spender API Success - Spender address received');

    // Enhance response with additional info
    const enhancedData = {
      ...data,
      chainId: parseInt(chainId),
      info: {
        description: '1inch Router contract address for token approvals',
        usage: 'Use this address when approving tokens for 1inch swaps',
        security: 'Official 1inch contract - safe to approve'
      },
      timestamp: Date.now()
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('❌ 1inch Approve Spender API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Approve Spender API' },
      { status: 500 }
    );
  }
}