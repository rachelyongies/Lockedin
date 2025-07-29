import { NextRequest, NextResponse } from 'next/server';

const FUSION_API_BASE_URL = 'https://api.1inch.dev/swap/v6.0/1';
const API_KEY = process.env.ONEINCH_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const src = searchParams.get('src');
    const dst = searchParams.get('dst');
    const amount = searchParams.get('amount');
    
    if (!src || !dst || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: src, dst, amount' },
        { status: 400 }
      );
    }
    
    const queryParams = new URLSearchParams({
      src,
      dst,
      amount,
    });
    
    const response = await fetch(`${FUSION_API_BASE_URL}/quote?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: errorData.message || `HTTP ${response.status}`,
          status: response.status,
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Fusion API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}