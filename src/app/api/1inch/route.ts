import { NextRequest, NextResponse } from 'next/server';

const FUSION_PLUS_BASE = 'https://api.1inch.dev/fusion-plus';
const API_KEY = process.env.NEXT_PUBLIC_1INCH_API_KEY;

if (!API_KEY) {
  throw new Error('1inch API key not found. Please set NEXT_PUBLIC_1INCH_API_KEY environment variable.');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const chainId = searchParams.get('chainId');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const maker = searchParams.get('maker');

    if (!path) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (chainId) queryParams.append('chainId', chainId);
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (maker) queryParams.append('maker', maker);

    const queryString = queryParams.toString();
    const url = `${FUSION_PLUS_BASE}${path.replace('/fusion-plus', '')}${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 Proxy request:', {
      originalUrl: request.url,
      path,
      chainId,
      page,
      limit,
      maker,
      constructedUrl: url
    });
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 1inch API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('1inch API Error:', response.status, errorData);
      return NextResponse.json(
        { error: `1inch API Error: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Proxy response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    const body = await request.json();
    const url = `${FUSION_PLUS_BASE}${path.replace('/fusion-plus', '')}`;
    
    console.log('🔍 Proxy POST request:', {
      path,
      constructedUrl: url,
      body: JSON.stringify(body, null, 2)
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log('📡 1inch API POST response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('1inch API Error:', response.status, errorData);
      return NextResponse.json(
        { error: `1inch API Error: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Proxy POST response data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 