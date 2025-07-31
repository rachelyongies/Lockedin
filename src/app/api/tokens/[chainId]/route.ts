// API proxy for 1inch tokens to avoid CORS issues
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { chainId: string } }
) {
  const { chainId } = await params;
  
  if (!chainId) {
    return NextResponse.json({ error: 'Invalid chainId parameter' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_1INCH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: '1inch API key not configured' }, { status: 500 });
  }

  const url = `https://api.1inch.dev/swap/v5.0/${chainId}/tokens`;
  
  try {
    console.log(`🔍 Proxying 1inch tokens request for chain ${chainId}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ 1inch API error (${response.status}):`, errorText);
      return NextResponse.json({ 
        error: `1inch API error: ${response.status}`,
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Return the data with caching headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch from 1inch API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}