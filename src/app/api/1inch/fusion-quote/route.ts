import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_1INCH_API_KEY;

if (!API_KEY) {
  throw new Error('1inch API key not found. Please set NEXT_PUBLIC_1INCH_API_KEY environment variable.');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Log incoming parameters for debugging
    console.log('📥 Incoming request parameters:', Object.fromEntries(searchParams.entries()));
    
    // Validate required parameters
    const requiredParams = ['srcChain', 'dstChain', 'srcTokenAddress', 'dstTokenAddress', 'amount', 'walletAddress'];
    const missingParams = requiredParams.filter(param => !searchParams.get(param));
    
    if (missingParams.length > 0) {
      console.error('❌ Missing required parameters:', missingParams);
      return NextResponse.json(
        { 
          error: 'Missing required parameters', 
          message: `Missing: ${missingParams.join(', ')}`,
          requiredParams: requiredParams,
          receivedParams: Object.fromEntries(searchParams.entries())
        },
        { status: 400 }
      );
    }
    
    // Forward all query parameters to 1inch API
    const queryString = searchParams.toString();
    
    const fusionApiUrl = `https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/receive?${queryString}`;
    
    console.log('🔄 Forwarding quote request to 1inch:', fusionApiUrl);
    console.log('🔑 Using API key:', API_KEY ? `${API_KEY.substring(0, 8)}...` : 'NOT SET');

    const response = await fetch(fusionApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.text();
    
    if (!response.ok) {
      console.error('❌ 1inch API error:', response.status, data);
      
      // Try to parse error response for better error messages
      let errorMessage = data;
      try {
        const errorData = JSON.parse(data);
        errorMessage = errorData.message || errorData.error || data;
      } catch {
        // Keep original error message if not JSON
      }
      
      return NextResponse.json(
        { 
          error: `Fusion+ API error: ${response.status}`, 
          message: errorMessage,
          status: response.status
        },
        { status: response.status }
      );
    }

    // Parse and return the JSON response
    const jsonData = JSON.parse(data);
    console.log('✅ Successfully forwarded 1inch quote');
    
    return NextResponse.json(jsonData);
  } catch (error) {
    console.error('❌ Server error forwarding quote:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}