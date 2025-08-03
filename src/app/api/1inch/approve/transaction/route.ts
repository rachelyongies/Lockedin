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
    const tokenAddress = searchParams.get('tokenAddress');
    const amount = searchParams.get('amount');
    
    console.log('🔥 1inch Approve Transaction API - Request');
    console.log('📋 Parameters:', { chainId, tokenAddress, amount });

    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'Missing required parameter: tokenAddress' },
        { status: 400 }
      );
    }

    // Build query parameters
    const apiParams = new URLSearchParams({
      tokenAddress,
    });

    if (amount) {
      apiParams.append('amount', amount);
    }

    const endpoint = `${APPROVE_API_CONFIG.baseUrl}/${chainId}/approve/transaction?${apiParams}`;
    console.log('🎯 1inch Approve Transaction API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${APPROVE_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(APPROVE_API_CONFIG.timeout),
    });

    console.log('📊 1inch Approve Transaction API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Approve Transaction API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Approve Transaction API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Approve Transaction API Success - Transaction data received');

    // Enhance response with gas estimation and safety info
    const enhancedData = {
      ...data,
      chainId: parseInt(chainId),
      tokenAddress,
      approvalAmount: amount || 'unlimited',
      estimatedGas: data.gas ? parseInt(data.gas) : 50000,
      info: {
        description: 'Transaction data for token approval',
        warning: amount ? 'Limited approval - more secure' : 'Unlimited approval - convenient but less secure',
        recommendation: 'Consider using limited approvals for better security'
      },
      timestamp: Date.now()
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('❌ 1inch Approve Transaction API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Approve Transaction API' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔥 1inch Approve Transaction API - Request (POST)');
    console.log('📋 Request body:', body);

    const chainId = body.chainId || 1;
    const tokenAddress = body.tokenAddress;
    const amount = body.amount;

    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'Missing required parameter: tokenAddress' },
        { status: 400 }
      );
    }

    // Build query parameters
    const apiParams = new URLSearchParams({
      tokenAddress,
    });

    if (amount) {
      apiParams.append('amount', amount);
    }

    const endpoint = `${APPROVE_API_CONFIG.baseUrl}/${chainId}/approve/transaction?${apiParams}`;
    console.log('🎯 1inch Approve Transaction API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${APPROVE_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(APPROVE_API_CONFIG.timeout),
    });

    console.log('📊 1inch Approve Transaction API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Approve Transaction API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Approve Transaction API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Approve Transaction API Success - Transaction data received');

    // Enhance response with gas estimation and safety info
    const enhancedData = {
      ...data,
      chainId: parseInt(chainId),
      tokenAddress,
      approvalAmount: amount || 'unlimited',
      estimatedGas: data.gas ? parseInt(data.gas) : 50000,
      info: {
        description: 'Transaction data for token approval',
        warning: amount ? 'Limited approval - more secure' : 'Unlimited approval - convenient but less secure',
        recommendation: 'Consider using limited approvals for better security'
      },
      timestamp: Date.now()
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('❌ 1inch Approve Transaction API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Approve Transaction API' },
      { status: 500 }
    );
  }
}