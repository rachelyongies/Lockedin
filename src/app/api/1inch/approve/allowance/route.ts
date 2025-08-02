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
    const walletAddress = searchParams.get('walletAddress');
    
    console.log('🔥 1inch Approve Allowance API - Request');
    console.log('📋 Parameters:', { chainId, tokenAddress, walletAddress });

    if (!tokenAddress || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: tokenAddress, walletAddress' },
        { status: 400 }
      );
    }

    // Build query parameters
    const apiParams = new URLSearchParams({
      tokenAddress,
      walletAddress,
    });

    const endpoint = `${APPROVE_API_CONFIG.baseUrl}/${chainId}/approve/allowance?${apiParams}`;
    console.log('🎯 1inch Approve Allowance API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${APPROVE_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(APPROVE_API_CONFIG.timeout),
    });

    console.log('📊 1inch Approve Allowance API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Approve Allowance API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Approve Allowance API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Approve Allowance API Success - Allowance data received');

    // Enhance response with allowance analysis
    const allowanceAmount = data.allowance ? parseInt(data.allowance) : 0;
    const enhancedData = {
      ...data,
      chainId: parseInt(chainId),
      tokenAddress,
      walletAddress,
      analysis: {
        hasAllowance: allowanceAmount > 0,
        isUnlimited: allowanceAmount >= (2**255 - 1), // Max uint256 check
        needsApproval: (requiredAmount: string) => {
          const required = parseInt(requiredAmount);
          return allowanceAmount < required;
        },
        recommendedAction: getAllowanceRecommendation(allowanceAmount)
      },
      timestamp: Date.now()
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('❌ 1inch Approve Allowance API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Approve Allowance API' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔥 1inch Approve Allowance API - Request (POST)');
    console.log('📋 Request body:', body);

    const chainId = body.chainId || 1;
    const tokenAddress = body.tokenAddress;
    const walletAddress = body.walletAddress;

    if (!tokenAddress || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: tokenAddress, walletAddress' },
        { status: 400 }
      );
    }

    // Build query parameters
    const apiParams = new URLSearchParams({
      tokenAddress,
      walletAddress,
    });

    const endpoint = `${APPROVE_API_CONFIG.baseUrl}/${chainId}/approve/allowance?${apiParams}`;
    console.log('🎯 1inch Approve Allowance API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${APPROVE_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(APPROVE_API_CONFIG.timeout),
    });

    console.log('📊 1inch Approve Allowance API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Approve Allowance API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Approve Allowance API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Approve Allowance API Success - Allowance data received');

    // Enhance response with allowance analysis
    const allowanceAmount = data.allowance ? parseInt(data.allowance) : 0;
    const enhancedData = {
      ...data,
      chainId: parseInt(chainId),
      tokenAddress,
      walletAddress,
      analysis: {
        hasAllowance: allowanceAmount > 0,
        isUnlimited: allowanceAmount >= (2**255 - 1), // Max uint256 check
        needsApproval: (requiredAmount: string) => {
          const required = parseInt(requiredAmount);
          return allowanceAmount < required;
        },
        recommendedAction: getAllowanceRecommendation(allowanceAmount)
      },
      timestamp: Date.now()
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('❌ 1inch Approve Allowance API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Approve Allowance API' },
      { status: 500 }
    );
  }
}

// Helper function for allowance recommendations
function getAllowanceRecommendation(allowanceAmount: number): string {
  if (allowanceAmount === 0) {
    return 'NO_ALLOWANCE - Approval required before swapping';
  } else if (allowanceAmount >= (2**255 - 1)) {
    return 'UNLIMITED_ALLOWANCE - No further approvals needed (convenient but less secure)';
  } else if (allowanceAmount > 1000000) {
    return 'SUFFICIENT_ALLOWANCE - Good for multiple transactions';
  } else {
    return 'LIMITED_ALLOWANCE - May need additional approval for large swaps';
  }
}