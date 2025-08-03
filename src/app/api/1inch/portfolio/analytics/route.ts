import { NextRequest, NextResponse } from 'next/server';

const PORTFOLIO_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_1INCH_PORTFOLIO_API_URL || 'https://api.1inch.dev/portfolio/v4.0',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || '',
  timeout: 30000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const addresses = searchParams.get('addresses');
    const chainId = searchParams.get('chainId') || '1';
    const timeframe = searchParams.get('timeframe') || '1d';

    console.log('📊 1inch Portfolio API - Fetching analytics', { addresses, chainId, timeframe });

    if (!addresses) {
      return NextResponse.json(
        { error: 'addresses parameter is required' },
        { status: 400 }
      );
    }

    const queryParams = new URLSearchParams({
      addresses,
      timeframe,
    });

    const response = await fetch(
      `${PORTFOLIO_API_CONFIG.baseUrl}/${chainId}/general/overview?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PORTFOLIO_API_CONFIG.apiKey}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(PORTFOLIO_API_CONFIG.timeout),
      }
    );

    console.log('📊 1inch Portfolio Analytics Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 1inch Portfolio Analytics Error:', errorData);
      return NextResponse.json(
        { error: errorData.message || `Portfolio Analytics API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Portfolio Analytics Retrieved Successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Portfolio Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio analytics' },
      { status: 500 }
    );
  }
}