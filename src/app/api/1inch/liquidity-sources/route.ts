import { NextRequest, NextResponse } from 'next/server';

const LIQUIDITY_SOURCES_API_CONFIG = {
  baseUrl: 'https://api.1inch.dev/swap/v6.0',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '1';
    
    console.log('🔥 1inch Liquidity Sources API - Request');
    console.log('📋 Chain ID:', chainId);

    const endpoint = `${LIQUIDITY_SOURCES_API_CONFIG.baseUrl}/${chainId}/liquidity-sources`;
    console.log('🎯 1inch Liquidity Sources API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LIQUIDITY_SOURCES_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(LIQUIDITY_SOURCES_API_CONFIG.timeout),
    });

    console.log('📊 1inch Liquidity Sources API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Liquidity Sources API Error:', errorText);
      return NextResponse.json(
        { error: `1inch Liquidity Sources API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch Liquidity Sources API Success - Liquidity sources received');

    // Enhance response with analysis
    const enhancedData = {
      ...data,
      analysis: {
        totalSources: data.protocols ? Object.keys(data.protocols).length : 0,
        topSources: analyzeTopSources(data.protocols),
        recommendations: getLiquidityRecommendations(data.protocols),
        coverage: analyzeCoverage(data.protocols)
      },
      timestamp: Date.now()
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('❌ 1inch Liquidity Sources API Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from 1inch Liquidity Sources API' },
      { status: 500 }
    );
  }
}

// Helper functions for liquidity analysis
interface ProtocolInfo {
  title?: string;
  [key: string]: unknown;
}

interface TopSource {
  id: string;
  title: string;
  type: string;
  tier: string;
}

function analyzeTopSources(protocols: Record<string, ProtocolInfo> | null | undefined): TopSource[] {
  if (!protocols) return [];
  
  const protocolArray = Object.entries(protocols).map(([key, value]) => ({
    id: key,
    title: value.title || key,
    ...value
  }));

  // Sort by volume or liquidity if available
  return protocolArray
    .filter(p => p.title && p.id)
    .slice(0, 10) // Top 10 sources
    .map(p => ({
      id: p.id,
      title: p.title,
      type: categorizeDEX(p.title),
      tier: getTier(p.title)
    }));
}

function getLiquidityRecommendations(protocols: Record<string, ProtocolInfo> | null | undefined): string[] {
  if (!protocols) return ['No liquidity data available'];
  
  const recommendations: string[] = [];
  const protocolCount = Object.keys(protocols).length;
  
  if (protocolCount > 50) {
    recommendations.push('EXCELLENT - Wide range of liquidity sources available');
  } else if (protocolCount > 20) {
    recommendations.push('GOOD - Solid liquidity options across major DEXs');
  } else if (protocolCount > 10) {
    recommendations.push('MODERATE - Limited but functional liquidity sources');
  } else {
    recommendations.push('LIMITED - Few liquidity sources, expect higher slippage');
  }

  // Check for major DEX presence
  const protocolNames = Object.values(protocols).map(p => p.title?.toLowerCase() || '');
  const majorDEXs = ['uniswap', 'sushiswap', 'curve', 'balancer', 'pancakeswap'];
  const presentMajorDEXs = majorDEXs.filter(dex => 
    protocolNames.some(name => name.includes(dex))
  );

  if (presentMajorDEXs.length >= 3) {
    recommendations.push('Major DEXs available: ' + presentMajorDEXs.join(', '));
  }

  return recommendations;
}

interface CoverageAnalysis {
  score: number;
  breakdown: {
    totalProtocols: number;
    amms: number;
    stablecoinDEXs: number;
    orderbooks: number;
  };
  description: string;
}

function analyzeCoverage(protocols: Record<string, ProtocolInfo> | null | undefined): CoverageAnalysis {
  if (!protocols) return { 
    score: 0, 
    description: 'No data',
    breakdown: { totalProtocols: 0, amms: 0, stablecoinDEXs: 0, orderbooks: 0 }
  };
  
  const protocolCount = Object.keys(protocols).length;
  const protocolNames = Object.values(protocols).map(p => p.title?.toLowerCase() || '');
  
  // Count different types of DEXs
  const amms = protocolNames.filter(name => 
    name.includes('uniswap') || name.includes('sushiswap') || name.includes('pancake')
  ).length;
  
  const curves = protocolNames.filter(name => 
    name.includes('curve') || name.includes('saddle')
  ).length;
  
  const orderbooks = protocolNames.filter(name => 
    name.includes('0x') || name.includes('dydx')
  ).length;

  const score = Math.min(100, (protocolCount * 2) + (amms * 5) + (curves * 3) + (orderbooks * 4));
  
  return {
    score,
    breakdown: {
      totalProtocols: protocolCount,
      amms,
      stablecoinDEXs: curves,
      orderbooks
    },
    description: score > 80 ? 'Excellent coverage' : 
                 score > 60 ? 'Good coverage' : 
                 score > 40 ? 'Moderate coverage' : 'Limited coverage'
  };
}

function categorizeDEX(title: string): string {
  const name = title.toLowerCase();
  
  if (name.includes('uniswap') || name.includes('sushiswap') || name.includes('pancake')) {
    return 'AMM';
  } else if (name.includes('curve') || name.includes('saddle')) {
    return 'Stablecoin DEX';
  } else if (name.includes('balancer')) {
    return 'Weighted Pool';
  } else if (name.includes('0x') || name.includes('dydx')) {
    return 'Order Book';
  } else {
    return 'Other';
  }
}

function getTier(title: string): 'Tier 1' | 'Tier 2' | 'Tier 3' {
  const name = title.toLowerCase();
  const tier1 = ['uniswap', 'sushiswap', 'curve', 'balancer', 'pancakeswap'];
  const tier2 = ['1inch', '0x', 'kyber', 'bancor', 'dodo'];
  
  if (tier1.some(dex => name.includes(dex))) {
    return 'Tier 1';
  } else if (tier2.some(dex => name.includes(dex))) {
    return 'Tier 2';
  } else {
    return 'Tier 3';
  }
}