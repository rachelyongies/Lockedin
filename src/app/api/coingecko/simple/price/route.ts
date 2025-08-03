import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const ids = searchParams.get('ids');
    const vs_currencies = searchParams.get('vs_currencies') || 'usd';
    const include_24hr_vol = searchParams.get('include_24hr_vol') || 'false';
    const include_24hr_change = searchParams.get('include_24hr_change') || 'false';

    if (!ids) {
      return NextResponse.json({ error: 'ids parameter is required' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
    }

    const params = new URLSearchParams({
      ids,
      vs_currencies,
      include_24hr_vol,
      include_24hr_change
    });

    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?${params}`, {
      headers,
      next: { revalidate: 60 } // Cache for 1 minute
    });

    if (!response.ok) {
      console.error(`CoinGecko price API error: ${response.status}`);
      return NextResponse.json(
        { error: `CoinGecko API error: ${response.status}` }, 
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
    console.error('CoinGecko price proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price data' }, 
      { status: 500 }
    );
  }
}