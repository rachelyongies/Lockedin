import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }

    const response = await fetch('https://api.coingecko.com/api/v3/global', {
      headers,
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`CoinGecko global API error: ${response.status}`);
      return NextResponse.json(
        { error: `CoinGecko API error: ${response.status}` }, 
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
    console.error('CoinGecko global proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch global market data' }, 
      { status: 500 }
    );
  }
}