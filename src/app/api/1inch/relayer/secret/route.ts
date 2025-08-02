import { NextRequest, NextResponse } from 'next/server';

const FUSION_PLUS_RELAYER_BASE = 'https://api.1inch.dev/fusion-plus/relayer/v1.0';
const API_KEY = process.env.NEXT_PUBLIC_1INCH_API_KEY;

if (!API_KEY) {
  throw new Error('1inch API key not found. Please set NEXT_PUBLIC_1INCH_API_KEY environment variable.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderHash, secret, chainId } = body;

    // Validate required parameters
    if (!orderHash || !secret || !chainId) {
      return NextResponse.json(
        { error: 'Missing required parameters: orderHash, secret, chainId' },
        { status: 400 }
      );
    }

    const url = `${FUSION_PLUS_RELAYER_BASE}/submit/secret`;
    
    console.log('🔍 Relayer secret submission request:', {
      url,
      orderHash,
      chainId,
      secretLength: secret.length
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderHash,
        secret,
        chainId: parseInt(chainId)
      })
    });

    console.log('📡 1inch Relayer API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('1inch Relayer API Error:', response.status, errorData);
      return NextResponse.json(
        { error: `1inch Relayer API Error: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Relayer secret submission successful:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Relayer Secret Submission Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'GET method not supported. Use POST to submit secrets.' },
    { status: 405 }
  );
} 