import { NextRequest, NextResponse } from 'next/server';

const PATHS_API_CONFIG = {
  baseUrl: 'https://api.1inch.dev/swap/v6.0',
  apiKey: process.env.NEXT_PUBLIC_1INCH_API_KEY || 'demo_api_key',
  timeout: 30000,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '1';
    const fromTokenAddress = searchParams.get('fromTokenAddress');
    const toTokenAddress = searchParams.get('toTokenAddress');
    
    console.log('🔥 1inch Paths API - Request');
    console.log('📋 Parameters:', { chainId, fromTokenAddress, toTokenAddress });

    if (!fromTokenAddress || !toTokenAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromTokenAddress, toTokenAddress' },
        { status: 400 }
      );
    }

    // Build query parameters
    const apiParams = new URLSearchParams({
      fromTokenAddress,
      toTokenAddress,
    });

    const endpoint = `${PATHS_API_CONFIG.baseUrl}/${chainId}/liquidity-sources`;
    console.log('🎯 1inch Paths API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PATHS_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(PATHS_API_CONFIG.timeout),
    });

    console.log('📊 1inch Paths API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Paths API Error:', errorText);
      
      // Fallback: Create synthetic paths analysis
      const fallbackPaths = generateFallbackPaths(fromTokenAddress, toTokenAddress);
      return NextResponse.json(fallbackPaths);
    }

    const data = await response.json();
    console.log('✅ 1inch Paths API Success - Paths received');

    // Enhance response with path analysis
    const enhancedData = {
      ...data,
      analysis: {
        totalPaths: data.paths ? data.paths.length : 0,
        pathComplexity: analyzePathComplexity(data.paths),
        recommendations: getPathRecommendations(data.paths),
        optimalPath: findOptimalPath(data.paths)
      },
      timestamp: Date.now()
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('❌ 1inch Paths API Proxy Error:', error);
    
    // Fallback: Create synthetic paths analysis
    const fromTokenAddress = new URL(request.url).searchParams.get('fromTokenAddress');
    const toTokenAddress = new URL(request.url).searchParams.get('toTokenAddress');
    const fallbackPaths = generateFallbackPaths(fromTokenAddress, toTokenAddress);
    
    return NextResponse.json(fallbackPaths);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔥 1inch Paths API - Request (POST)');
    console.log('📋 Request body:', body);

    const chainId = body.chainId || 1;
    const fromTokenAddress = body.fromTokenAddress;
    const toTokenAddress = body.toTokenAddress;

    if (!fromTokenAddress || !toTokenAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromTokenAddress, toTokenAddress' },
        { status: 400 }
      );
    }

    // Build query parameters
    const apiParams = new URLSearchParams({
      fromTokenAddress,
      toTokenAddress,
    });

    const endpoint = `${PATHS_API_CONFIG.baseUrl}/${chainId}/liquidity-sources`;
    console.log('🎯 1inch Paths API endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PATHS_API_CONFIG.apiKey}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(PATHS_API_CONFIG.timeout),
    });

    console.log('📊 1inch Paths API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch Paths API Error:', errorText);
      
      // Fallback: Create synthetic paths analysis
      const fallbackPaths = generateFallbackPaths(fromTokenAddress, toTokenAddress);
      return NextResponse.json(fallbackPaths);
    }

    const data = await response.json();
    console.log('✅ 1inch Paths API Success - Paths received');

    // Enhance response with path analysis
    const enhancedData = {
      ...data,
      analysis: {
        totalPaths: data.paths ? data.paths.length : 0,
        pathComplexity: analyzePathComplexity(data.paths),
        recommendations: getPathRecommendations(data.paths),
        optimalPath: findOptimalPath(data.paths)
      },
      timestamp: Date.now()
    };

    return NextResponse.json(enhancedData);
  } catch (error) {
    console.error('❌ 1inch Paths API Proxy Error:', error);
    
    // Fallback: Create synthetic paths analysis
    const fallbackPaths = generateFallbackPaths(null, null);
    
    return NextResponse.json(fallbackPaths);
  }
}

// Helper functions for path analysis
interface PathInfo {
  path?: unknown[];
  protocols?: unknown[];
  [key: string]: unknown;
}

interface ComplexityAnalysis {
  score: number;
  description: string;
  distribution: {
    simple: number;
    moderate: number;
    complex: number;
  };
}

function analyzePathComplexity(paths: PathInfo[]): ComplexityAnalysis {
  if (!paths || paths.length === 0) {
    return { 
      score: 0, 
      description: 'No paths available',
      distribution: { simple: 0, moderate: 0, complex: 0 }
    };
  }

  const complexityScores = paths.map(path => {
    const hopsCount = path.path ? path.path.length : 1;
    const protocolsCount = path.protocols ? path.protocols.length : 1;
    return hopsCount + protocolsCount;
  });

  const avgComplexity = complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;
  
  return {
    score: Math.round(avgComplexity),
    description: avgComplexity < 2 ? 'Simple direct paths' :
                 avgComplexity < 4 ? 'Moderate complexity' :
                 'Complex multi-hop paths',
    distribution: {
      simple: complexityScores.filter(s => s < 3).length,
      moderate: complexityScores.filter(s => s >= 3 && s < 6).length,
      complex: complexityScores.filter(s => s >= 6).length
    }
  };
}

function getPathRecommendations(paths: PathInfo[]): string[] {
  if (!paths || paths.length === 0) {
    return ['No direct paths found - may require bridge or alternative routing'];
  }

  const recommendations: string[] = [];
  
  if (paths.length === 1) {
    recommendations.push('Single path available - limited routing options');
  } else if (paths.length < 5) {
    recommendations.push(`${paths.length} paths found - good routing flexibility`);
  } else {
    recommendations.push(`${paths.length} paths available - excellent routing options`);
  }

  // Analyze path types
  const directPaths = paths.filter(p => !p.path || p.path.length <= 2);
  const multiHopPaths = paths.filter(p => p.path && p.path.length > 2);

  if (directPaths.length > 0) {
    recommendations.push(`${directPaths.length} direct paths for minimal slippage`);
  }
  
  if (multiHopPaths.length > 0) {
    recommendations.push(`${multiHopPaths.length} multi-hop paths for potentially better rates`);
  }

  return recommendations;
}

interface OptimalPath {
  index: number;
  score: number;
  reasoning: string;
}

function findOptimalPath(paths: PathInfo[]): OptimalPath | null {
  if (!paths || paths.length === 0) {
    return null;
  }

  // Simple scoring: prefer fewer hops but consider other factors
  const scoredPaths = paths.map((path, index) => ({
    index,
    path,
    score: calculatePathScore(path)
  }));

  const optimalPath = scoredPaths.reduce((best, current) => 
    current.score > best.score ? current : best
  );

  return {
    index: optimalPath.index,
    score: optimalPath.score,
    reasoning: generatePathReasoning(optimalPath.path)
  };
}

function calculatePathScore(path: PathInfo): number {
  let score = 100;
  
  // Penalize for more hops
  const hops = path.path ? path.path.length : 1;
  score -= (hops - 1) * 10;
  
  // Bonus for known protocols
  if (path.protocols) {
    const knownProtocols = path.protocols.filter((p: unknown) => {
      const protocol = p as { name?: string };
      return ['Uniswap', 'SushiSwap', 'Curve', 'Balancer'].includes(protocol.name || '');
    });
    score += knownProtocols.length * 5;
  }
  
  return Math.max(0, score);
}

function generatePathReasoning(path: PathInfo): string {
  const hops = path.path ? path.path.length : 1;
  
  if (hops === 1) {
    return 'Direct swap - lowest gas cost and slippage';
  } else if (hops === 2) {
    return 'Single intermediate token - good balance of cost and rate';
  } else {
    return `Multi-hop path (${hops} steps) - may offer better rates but higher gas costs`;
  }
}

interface FallbackPaths {
  fromTokenAddress: string | null;
  toTokenAddress: string | null;
  paths: never[];
  analysis: {
    totalPaths: number;
    pathComplexity: { score: number; description: string };
    recommendations: string[];
    optimalPath: null;
  };
  timestamp: number;
  fallback: boolean;
}

function generateFallbackPaths(fromToken: string | null, toToken: string | null): FallbackPaths {
  return {
    fromTokenAddress: fromToken,
    toTokenAddress: toToken,
    paths: [],
    analysis: {
      totalPaths: 0,
      pathComplexity: { score: 0, description: 'API unavailable - using fallback analysis' },
      recommendations: ['1inch Paths API unavailable', 'Using alternative routing logic'],
      optimalPath: null
    },
    timestamp: Date.now(),
    fallback: true
  };
}