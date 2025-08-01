import { NextRequest, NextResponse } from 'next/server';

const GAS_TRACKER_API_CONFIG = {
  baseUrl: 'https://api.1inch.dev/gas-price/v1.2',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '1';
    
    console.log('🔥 1inch Gas Tracker API - Request');
    console.log('📋 Chain ID:', chainId);

    const endpoint = `${GAS_TRACKER_API_CONFIG.baseUrl}/${chainId}`;
    console.log('🎯 1inch Gas Tracker API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GAS_TRACKER_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(GAS_TRACKER_API_CONFIG.timeout),
    });

    console.log('📊 1inch Gas Tracker API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Gas Tracker API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Gas Tracker API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Gas Tracker API Success - Gas data received');

    // Enhance response with additional analysis
    const enhancedData = {
      ...data,
      analysis: {
        recommendation: getGasRecommendation(data),
        trend: analyzeGasTrend(data),
        optimalTiming: getOptimalTiming(data)
      },
      timestamp: Date.now()
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('❌ 1inch Gas Tracker API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Gas Tracker API' },
      { status: 500 }
    );
  }
}

// Helper functions for gas analysis
interface GasData {
  baseFee?: string;
  fast?: string;
  standard?: string;
  slow?: string;
}

function getGasRecommendation(gasData: GasData): string {
  if (!gasData.baseFee) return 'Use standard gas price';
  
  const baseFee = parseInt(gasData.baseFee);
  const fast = gasData.fast ? parseInt(gasData.fast) : baseFee * 1.2;
  
  if (fast < baseFee * 1.1) {
    return 'EXECUTE_NOW - Gas prices are very low';
  } else if (fast < baseFee * 1.3) {
    return 'GOOD_TIME - Gas prices are reasonable';
  } else if (fast < baseFee * 2.0) {
    return 'CONSIDER_WAITING - Gas prices are high';
  } else {
    return 'WAIT - Gas prices are extremely high';
  }
}

function analyzeGasTrend(gasData: GasData): string {
  // Simple trend analysis based on current vs historical
  if (gasData.standard && gasData.fast) {
    const standardGas = parseInt(gasData.standard);
    const fastGas = parseInt(gasData.fast);
    const ratio = fastGas / standardGas;
    
    if (ratio < 1.2) {
      return 'STABLE - Low network congestion';
    } else if (ratio < 1.5) {
      return 'MODERATE - Normal network activity';
    } else {
      return 'VOLATILE - High network congestion';
    }
  }
  
  return 'UNKNOWN - Insufficient data';
}

function getOptimalTiming(_gasData: GasData): string {
  const currentHour = new Date().getUTCHours();
  
  // General patterns: gas is usually lower during UTC off-hours (2-8 AM)
  if (currentHour >= 2 && currentHour <= 8) {
    return 'OPTIMAL - Off-peak hours';
  } else if (currentHour >= 14 && currentHour <= 18) {
    return 'PEAK - High activity period, consider waiting';
  } else {
    return 'NORMAL - Standard network activity';
  }
}