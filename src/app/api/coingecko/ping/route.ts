import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/ping', {
      next: { revalidate: 60 } // Cache for 1 minute
    });

    if (!response.ok) {
      console.error(`CoinGecko ping API error: ${response.status}`);
      return NextResponse.json(
        { error: `CoinGecko ping API error: ${response.status}` }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });

  } catch (error) {
    console.error('CoinGecko ping proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to ping CoinGecko API' }, 
      { status: 500 }
    );
  }
}