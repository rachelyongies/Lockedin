import { NextRequest, NextResponse } from 'next/server';

// Helper to fetch current gas prices from 1inch gas tracker
async function getCurrentGasPrice(preset: string | null, chainId: string): Promise<string> {
  try {
    const response = await fetch(`http://localhost:3000/api/1inch/gas-tracker?chainId=${chainId}`);
    if (!response.ok) {
      throw new Error('Gas tracker failed');
    }
    
    const gasData = await response.json();
    console.log('📊 Fetched gas data for price:', { preset, gasData });
    
    // Map presets to 1inch gas tracker response
    switch (preset) {
      case 'fast':
      case 'high':
        return gasData.high?.maxFeePerGas || '896184789';
      case 'standard':
      case 'medium':
        return gasData.medium?.maxFeePerGas || '895829892';
      case 'slow':
      case 'low':
        return gasData.low?.maxFeePerGas || '895711593';
      case 'instant':
        return gasData.instant?.maxFeePerGas || '1792369578';
      default:
        // If it's already a number string, validate and return it
        if (preset) {
          const numericPrice = parseInt(preset);
          if (!isNaN(numericPrice) && numericPrice >= 0) {
            return preset;
          }
        }
        // Default to medium
        return gasData.medium?.maxFeePerGas || '895829892';
    }
  } catch (error) {
    console.error('Failed to fetch gas price, using fallback:', error);
    // Fallback values if gas tracker fails
    switch (preset) {
      case 'fast':
      case 'high':
        return '896184789';
      case 'standard':
      case 'medium':
        return '895829892';
      case 'slow':
      case 'low':
        return '895711593';
      case 'instant':
        return '1792369578';
      default:
        return '895829892'; // medium fallback
    }
  }
}

// Helper to normalize token addresses for 1inch
function normalizeTokenAddress(address: string): string {
  // Convert zero address to 1inch native ETH format
  if (address === '0x0000000000000000000000000000000000000000') {
    return '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  }
  // Convert mixed case ETH address to lowercase
  if (address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    return '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  }
  return address;
}

const AGGREGATION_API_CONFIG = {
  baseUrl: 'https://api.1inch.dev/swap/v6.0',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '1';
    
    console.log('🔥 1inch Aggregation API - Quote request');
    console.log('📋 Query params:', Object.fromEntries(searchParams.entries()));

    // Required parameters for 1inch Aggregation API
    const src = searchParams.get('src');
    const dst = searchParams.get('dst'); 
    const amount = searchParams.get('amount');

    if (!src || !dst || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: src, dst, amount' },
        { status: 400 }
      );
    }

    // Normalize token addresses
    const normalizedSrc = normalizeTokenAddress(src);
    const normalizedDst = normalizeTokenAddress(dst);
    
    // Process gas price
    const rawGasPrice = searchParams.get('gasPrice');
    const processedGasPrice = await getCurrentGasPrice(rawGasPrice, chainId);
    console.log('⛽ Gas price processing:', { raw: rawGasPrice, processed: processedGasPrice });
    
    // Build query parameters for 1inch API
    const apiParams = new URLSearchParams({
      src: normalizedSrc,
      dst: normalizedDst,
      amount,
      fee: searchParams.get('fee') || '0',
      gasPrice: processedGasPrice,
      complexityLevel: searchParams.get('complexityLevel') || '0',
      connectorTokens: searchParams.get('connectorTokens') || '',
      gasLimit: searchParams.get('gasLimit') || '750000',
      mainRouteParts: searchParams.get('mainRouteParts') || '10',
      parts: searchParams.get('parts') || '50',
      includeTokensInfo: 'true',
      includeProtocols: 'true',
      includeGas: 'true'
    });

    const endpoint = `${AGGREGATION_API_CONFIG.baseUrl}/${chainId}/quote?${apiParams}`;
    console.log('🎯 1inch Aggregation API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AGGREGATION_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(AGGREGATION_API_CONFIG.timeout),
    });

    console.log('📊 1inch Aggregation API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Aggregation API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Aggregation API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Aggregation API Success - Quote received');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch Aggregation API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Aggregation API' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔥 1inch Aggregation API - Quote request (POST)');
    console.log('📋 Request body:', body);

    const chainId = body.chainId || 1;

    // Normalize token addresses
    const srcAddress = body.src || body.fromTokenAddress;
    const dstAddress = body.dst || body.toTokenAddress;
    const normalizedSrc = normalizeTokenAddress(srcAddress);
    const normalizedDst = normalizeTokenAddress(dstAddress);
    
    // Process gas price
    const rawGasPrice = body.gasPrice;
    const processedGasPrice = await getCurrentGasPrice(rawGasPrice, chainId.toString());
    console.log('⛽ Gas price processing (POST):', { raw: rawGasPrice, processed: processedGasPrice });
    
    // Build query parameters from POST body
    const apiParams = new URLSearchParams({
      src: normalizedSrc,
      dst: normalizedDst,
      amount: body.amount,
      fee: body.fee || '0',
      gasPrice: processedGasPrice,
      complexityLevel: body.complexityLevel || '0',
      connectorTokens: body.connectorTokens || '',
      gasLimit: body.gasLimit || '750000',
      mainRouteParts: body.mainRouteParts || '10',
      parts: body.parts || '50',
      includeTokensInfo: 'true',
      includeProtocols: 'true',
      includeGas: 'true'
    });

    const endpoint = `${AGGREGATION_API_CONFIG.baseUrl}/${chainId}/quote?${apiParams}`;
    console.log('🎯 1inch Aggregation API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AGGREGATION_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(AGGREGATION_API_CONFIG.timeout),
    });

    console.log('📊 1inch Aggregation API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Aggregation API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Aggregation API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Aggregation API Success - Quote received');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ 1inch Aggregation API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Aggregation API' },
      { status: 500 }
    );
  }
}