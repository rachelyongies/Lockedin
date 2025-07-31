import { NextRequest, NextResponse } from 'next/server';

const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    if (!ETHERSCAN_API_KEY) {
      return NextResponse.json(
        { error: 'Etherscan API key not configured' },
        { status: 500 }
      );
    }

    // Build URL with all query parameters
    const url = new URL(ETHERSCAN_API_URL);
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    url.searchParams.append('apikey', ETHERSCAN_API_KEY);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Etherscan API error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Etherscan returns status in response body
    if (data.status === '0' && data.message !== 'No transactions found') {
      return NextResponse.json(
        { error: data.result || 'Etherscan API error' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Etherscan proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}