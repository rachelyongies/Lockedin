import { IndexedDBHelper } from '@/lib/storage/indexeddb-helper';
import { StorageManager } from '@/lib/storage/storage-manager';

export interface RoutePerformance {
  route: string;
  successRate: number;
  averageGas: number;
  averageSlippage: number;
  totalTransactions: number;
  totalVolume: number;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface HeatmapData {
  hour: number;
  dayOfWeek: number;
  value: number;
  count: number;
}

export interface TokenPairAnalytics {
  pair: string;
  volume24h: number;
  transactionCount: number;
  averageSize: number;
  successRate: number;
  bestRoute: string;
  gasOptimization: number;
}

export class AnalyticsEngine {
  private static instance: AnalyticsEngine;
  private indexedDB: IndexedDBHelper;
  private storage: StorageManager;

  static getInstance(): AnalyticsEngine {
    if (!AnalyticsEngine.instance) {
      AnalyticsEngine.instance = new AnalyticsEngine();
    }
    return AnalyticsEngine.instance;
  }

  private constructor() {
    this.indexedDB = IndexedDBHelper.getInstance();
    this.storage = StorageManager.getInstance();
    this.indexedDB.init();
  }

  // Get route performance analytics
  async getRoutePerformance(): Promise<RoutePerformance[]> {
    const metrics = await this.indexedDB.getPerformanceMetrics();
    
    if (metrics.length === 0) {
      return [];
    }
    
    const routeMap: Record<string, {
      successCount: number;
      totalCount: number;
      totalGas: number;
      totalSlippage: number;
      volume: number;
    }> = {};

    metrics.forEach(metric => {
      if (!routeMap[metric.route]) {
        routeMap[metric.route] = {
          successCount: 0,
          totalCount: 0,
          totalGas: 0,
          totalSlippage: 0,
          volume: 0
        };
      }

      const stats = routeMap[metric.route];
      stats.totalCount++;
      if (metric.success) stats.successCount++;
      stats.totalGas += metric.gasUsed;
      stats.totalSlippage += metric.slippage;
      stats.volume += parseFloat(metric.tokenPair.split('-')[1] || '0');
    });

    return Object.entries(routeMap).map(([route, stats]) => ({
      route,
      successRate: (stats.successCount / stats.totalCount) * 100,
      averageGas: stats.totalGas / stats.totalCount,
      averageSlippage: stats.totalSlippage / stats.totalCount,
      totalTransactions: stats.totalCount,
      totalVolume: stats.volume
    })).sort((a, b) => b.totalTransactions - a.totalTransactions);
  }

  // Get time series data for various metrics
  async getTimeSeriesData(
    metric: 'gas' | 'slippage' | 'volume' | 'transactions',
    period: 'hour' | 'day' | 'week' = 'day'
  ): Promise<TimeSeriesData[]> {
    const metrics = await this.indexedDB.getPerformanceMetrics();
    
    if (metrics.length === 0) {
      return [];
    }
    
    const now = Date.now();
    const periodMs = period === 'hour' ? 3600000 : period === 'day' ? 86400000 : 604800000;
    const periods = period === 'hour' ? 24 : period === 'day' ? 7 : 4;

    const data: TimeSeriesData[] = [];
    
    for (let i = periods - 1; i >= 0; i--) {
      const periodStart = now - (i + 1) * periodMs;
      const periodEnd = now - i * periodMs;
      
      const periodMetrics = metrics.filter(m => 
        m.timestamp >= periodStart && m.timestamp < periodEnd
      );

      let value = 0;
      switch (metric) {
        case 'gas':
          value = periodMetrics.reduce((sum, m) => sum + m.gasUsed, 0) / (periodMetrics.length || 1);
          break;
        case 'slippage':
          value = periodMetrics.reduce((sum, m) => sum + m.slippage, 0) / (periodMetrics.length || 1);
          break;
        case 'volume':
          value = periodMetrics.reduce((sum, m) => sum + parseFloat(m.tokenPair.split('-')[1] || '0'), 0);
          break;
        case 'transactions':
          value = periodMetrics.length;
          break;
      }

      data.push({
        timestamp: periodEnd,
        value,
        label: this.formatPeriodLabel(periodEnd, period)
      });
    }

    return data;
  }

  // Get heatmap data for optimal trading times
  async getOptimalTradingTimes(): Promise<HeatmapData[]> {
    const metrics = await this.indexedDB.getPerformanceMetrics();
    const heatmap: Record<string, HeatmapData> = {};

    metrics.forEach(metric => {
      const date = new Date(metric.timestamp);
      const hour = date.getUTCHours();
      const dayOfWeek = date.getUTCDay();
      const key = `${hour}-${dayOfWeek}`;

      if (!heatmap[key]) {
        heatmap[key] = {
          hour,
          dayOfWeek,
          value: 0,
          count: 0
        };
      }

      // Calculate efficiency score (lower gas + lower slippage + success = better)
      const efficiency = metric.success ? 
        (1 / (metric.gasUsed / 100000 + metric.slippage + 0.1)) : 0;
      
      heatmap[key].value += efficiency;
      heatmap[key].count++;
    });

    // Normalize values
    return Object.values(heatmap).map(cell => ({
      ...cell,
      value: cell.count > 0 ? cell.value / cell.count : 0
    }));
  }

  // Get token pair analytics
  async getTokenPairAnalytics(): Promise<TokenPairAnalytics[]> {
    const metrics = await this.indexedDB.getPerformanceMetrics();
    const transactions = await this.indexedDB.getTransactions();
    
    if (metrics.length === 0 && transactions.length === 0) {
      return [];
    }
    
    const pairMap: Record<string, {
      volume: number;
      count: number;
      successCount: number;
      totalGas: number;
      routes: Record<string, number>;
    }> = {};

    // Aggregate metrics by token pair
    metrics.forEach(metric => {
      if (!pairMap[metric.tokenPair]) {
        pairMap[metric.tokenPair] = {
          volume: 0,
          count: 0,
          successCount: 0,
          totalGas: 0,
          routes: {}
        };
      }

      const stats = pairMap[metric.tokenPair];
      stats.count++;
      if (metric.success) stats.successCount++;
      stats.totalGas += metric.gasUsed;
      stats.routes[metric.route] = (stats.routes[metric.route] || 0) + 1;
    });

    // Add volume data from transactions
    transactions.forEach(tx => {
      const pair = `${tx.fromToken}-${tx.toToken}`;
      if (pairMap[pair]) {
        pairMap[pair].volume += parseFloat(tx.fromAmount) || 0;
      }
    });

    // Convert to analytics format
    return Object.entries(pairMap).map(([pair, stats]) => {
      const bestRoute = Object.entries(stats.routes)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Direct';

      return {
        pair,
        volume24h: stats.volume,
        transactionCount: stats.count,
        averageSize: stats.volume / (stats.count || 1),
        successRate: (stats.successCount / (stats.count || 1)) * 100,
        bestRoute,
        gasOptimization: this.calculateGasOptimization(stats.totalGas, stats.count)
      };
    }).sort((a, b) => b.volume24h - a.volume24h);
  }

  // Calculate overall platform statistics
  async getPlatformStats(): Promise<{
    totalTransactions: number;
    totalVolume: number;
    averageSuccessRate: number;
    gassSaved: number;
    uniqueUsers: number;
    favoriteToken: string;
  }> {
    const transactions = await this.indexedDB.getTransactions();
    const metrics = await this.indexedDB.getPerformanceMetrics();
    
    const uniqueAddresses = new Set(transactions.map(tx => tx.from));
    const tokenCounts: Record<string, number> = {};
    
    let totalVolume = 0;
    transactions.forEach(tx => {
      totalVolume += parseFloat(tx.fromAmount) || 0;
      tokenCounts[tx.fromToken] = (tokenCounts[tx.fromToken] || 0) + 1;
    });

    const successCount = metrics.filter(m => m.success).length;
    const averageSuccessRate = (successCount / (metrics.length || 1)) * 100;
    
    // Calculate gas saved through optimization
    const baselineGas = 150000; // Average standard swap gas
    const actualGas = metrics.reduce((sum, m) => sum + m.gasUsed, 0) / (metrics.length || 1);
    const gassSaved = Math.max(0, (baselineGas - actualGas) * metrics.length);

    const favoriteToken = Object.entries(tokenCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'ETH';

    return {
      totalTransactions: transactions.length,
      totalVolume,
      averageSuccessRate,
      gassSaved,
      uniqueUsers: uniqueAddresses.size,
      favoriteToken
    };
  }

  // Get slippage distribution
  async getSlippageDistribution(): Promise<{
    range: string;
    count: number;
    percentage: number;
  }[]> {
    const metrics = await this.indexedDB.getPerformanceMetrics();
    const ranges = [
      { min: 0, max: 0.1, label: '0-0.1%' },
      { min: 0.1, max: 0.5, label: '0.1-0.5%' },
      { min: 0.5, max: 1, label: '0.5-1%' },
      { min: 1, max: 2, label: '1-2%' },
      { min: 2, max: 5, label: '2-5%' },
      { min: 5, max: Infinity, label: '>5%' }
    ];

    const distribution = ranges.map(range => {
      const count = metrics.filter(m => 
        m.slippage >= range.min && m.slippage < range.max
      ).length;
      
      return {
        range: range.label,
        count,
        percentage: (count / (metrics.length || 1)) * 100
      };
    });

    return distribution;
  }

  // Private helper methods
  private formatPeriodLabel(timestamp: number, period: 'hour' | 'day' | 'week'): string {
    const date = new Date(timestamp);
    
    switch (period) {
      case 'hour':
        return date.toLocaleTimeString('en-US', { hour: 'numeric' });
      case 'day':
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      case 'week':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      default:
        return '';
    }
  }

  private calculateGasOptimization(totalGas: number, count: number): number {
    if (count === 0) return 0;
    const averageGas = totalGas / count;
    const standardGas = 150000; // Baseline
    return Math.max(0, ((standardGas - averageGas) / standardGas) * 100);
  }

  // Export analytics data
  async exportAnalytics(): Promise<string> {
    const [platformStats, routePerformance, tokenPairs] = await Promise.all([
      this.getPlatformStats(),
      this.getRoutePerformance(),
      this.getTokenPairAnalytics()
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      platformStats,
      routePerformance: routePerformance.slice(0, 10),
      tokenPairs: tokenPairs.slice(0, 10)
    };

    return JSON.stringify(exportData, null, 2);
  }
}