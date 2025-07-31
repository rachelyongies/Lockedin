import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'UniteDefi/1.0',
    };

    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = process.env.COINGECKO_API_KEY;
    }

    const response = await fetch('https://api.coingecko.com/api/v3/global/decentralized_finance_defi', {
      headers,
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`CoinGecko DeFi API error: ${response.status}`);
      return NextResponse.json(
        { error: `CoinGecko DeFi API error: ${response.status}` }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('CoinGecko DeFi proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DeFi market data' }, 
      { status: 500 }
    );
  }
}