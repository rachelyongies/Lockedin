import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coinId: string }> }
) {
  try {
    const { coinId } = await params;
    
    if (!coinId) {
      return NextResponse.json({ error: 'Coin ID is required' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }

    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`, {
      headers,
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`CoinGecko API error for ${coinId}: ${response.status}`);
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
    console.error('CoinGecko proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coin data' }, 
      { status: 500 }
    );
  }
}