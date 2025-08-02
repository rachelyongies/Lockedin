import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Import services dynamically to avoid SSR issues
    const { AIAgentBridgeService } = await import('@/lib/services/ai-agent-bridge-service');
    const { CacheService } = await import('@/lib/services/CacheService');
    const { HttpConnectionManager } = await import('@/lib/services/HttpConnectionManager');

    // Get performance metrics from various services
    const aiService = AIAgentBridgeService.getInstance();
    const cacheService = CacheService.getInstance();
    const connectionManager = HttpConnectionManager.getInstance();

    const performanceData = {
      timestamp: new Date().toISOString(),
      
      // AI Agent performance
      aiAgent: aiService.getPerformanceMetrics(),
      
      // Cache performance
      cache: cacheService.getStats(),
      
      // HTTP connection performance
      connections: connectionManager.getStats(),
      
      // System-level metrics
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      
      // Performance optimizations summary
      optimizations: {
        parallelAgentExecution: true,
        smartCaching: true,
        connectionPooling: true,
        performanceMonitoring: true,
        healthCheckOptimization: true
      }
    };

    // Add performance benchmarks
    const benchmarks = {
      targetResponseTime: '< 400ms (1inch benchmark)',
      targetSuccessRate: '> 95%',
      targetCacheHitRate: '> 60%',
      currentStatus: {
        responseTime: performanceData.aiAgent.averageResponseTime,
        successRate: performanceData.aiAgent.successRate * 100,
        cacheHitRate: performanceData.cache.hitRate * 100
      }
    };

    return NextResponse.json({
      ...performanceData,
      benchmarks
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}