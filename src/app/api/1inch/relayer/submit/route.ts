import { NextRequest, NextResponse } from 'next/server';

const FUSION_PLUS_RELAYER_BASE = 'https://api.1inch.dev/fusion-plus/relayer/v1.0';
const API_KEY = process.env.NEXT_PUBLIC_1INCH_API_KEY;

if (!API_KEY) {
  throw new Error('1inch API key not found. Please set NEXT_PUBLIC_1INCH_API_KEY environment variable.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['order', 'srcChainId', 'signature', 'extension', 'quoteId', 'secretHashes'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const url = `${FUSION_PLUS_RELAYER_BASE}/submit`;
    
    console.log('🔍 Relayer order submission request:', {
      url,
      srcChainId: body.srcChainId,
      quoteId: body.quoteId,
      secretHashesCount: body.secretHashes?.length || 0
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
    console.log('✅ Relayer order submission successful:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Relayer Order Submission Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'GET method not supported. Use POST to submit orders.' },
    { status: 405 }
  );
} 