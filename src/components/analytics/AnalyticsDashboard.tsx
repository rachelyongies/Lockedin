'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Zap,
  Activity,
  Download,
  Calendar,
  DollarSign,
  Users,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { AnalyticsEngine, RoutePerformance, TimeSeriesData, TokenPairAnalytics } from '@/lib/analytics/analytics-engine';
import { cn } from '@/lib/utils/helpers';

interface PlatformStats {
  totalVolume: number;
  totalTransactions: number;
  averageSuccessRate: number;
  averageGasUsed: number;
  averageSlippage: number;
  activeUsers: number;
  gassSaved: number;
  uniqueUsers: number;
  favoriteToken: string;
}

interface SlippageData {
  range: string;
  count: number;
  percentage: number;
}

export function AnalyticsDashboard() {
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [routePerformance, setRoutePerformance] = useState<RoutePerformance[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [tokenPairs, setTokenPairs] = useState<TokenPairAnalytics[]>([]);
  const [slippageDistribution, setSlippageDistribution] = useState<SlippageData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'gas' | 'slippage' | 'volume' | 'transactions'>('volume');
  const [selectedPeriod, setSelectedPeriod] = useState<'hour' | 'day' | 'week'>('day');
  const [isLoading, setIsLoading] = useState(true);

  const analytics = AnalyticsEngine.getInstance();

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [selectedMetric, selectedPeriod]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [stats, routes, timeSeries, pairs, slippage] = await Promise.all([
        analytics.getPlatformStats(),
        analytics.getRoutePerformance(),
        analytics.getTimeSeriesData(selectedMetric, selectedPeriod),
        analytics.getTokenPairAnalytics(),
        analytics.getSlippageDistribution()
      ]);

      // Map the stats to our interface, providing defaults for missing properties
      setPlatformStats({
        ...stats,
        averageGasUsed: (stats as Record<string, unknown>).gassSaved as number || 0,
        averageSlippage: 0.5, // default
        activeUsers: (stats as Record<string, unknown>).uniqueUsers as number || 0
      });
      setRoutePerformance(routes.slice(0, 5));
      setTimeSeriesData(timeSeries);
      setTokenPairs(pairs.slice(0, 5));
      setSlippageDistribution(slippage);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    const data = await analytics.exportAnalytics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatNumber = (num: number, decimals = 0) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
              <p className="text-gray-400">Real-time performance insights and metrics</p>
            </div>
          </div>
          
          <button
            onClick={exportData}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>

        {/* Platform Stats */}
        {platformStats && platformStats.totalTransactions > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <StatCard
              title="Total Volume"
              value={`$${formatNumber(platformStats.totalVolume, 1)}`}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Transactions"
              value={formatNumber(platformStats.totalTransactions)}
              icon={Activity}
              color="blue"
            />
            <StatCard
              title="Success Rate"
              value={`${platformStats.averageSuccessRate.toFixed(1)}%`}
              icon={TrendingUp}
              color="purple"
              trend={platformStats.averageSuccessRate > 95 ? 'up' : 'down'}
            />
            <StatCard
              title="Gas Saved"
              value={formatNumber(platformStats.gassSaved)}
              icon={Zap}
              color="orange"
            />
            <StatCard
              title="Active Users"
              value={formatNumber(platformStats.uniqueUsers)}
              icon={Users}
              color="pink"
            />
            <StatCard
              title="Top Token"
              value={platformStats.favoriteToken}
              icon={BarChart3}
              color="yellow"
            />
          </div>
        )}

        {/* Empty State */}
        {(!platformStats || platformStats.totalTransactions === 0) && !isLoading && (
          <div className="bg-gray-800/30 rounded-2xl p-12 text-center border border-gray-700/50">
            <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Analytics Data Yet</h3>
            <p className="text-gray-400">Start using the bridge to see performance analytics</p>
          </div>
        )}
      </div>

      {/* Charts Section */}
      {platformStats && platformStats.totalTransactions > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Time Series Chart */}
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
            <div className="flex items-center space-x-2">
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as 'gas' | 'slippage' | 'volume' | 'transactions')}
                className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
              >
                <option value="volume">Volume</option>
                <option value="transactions">Transactions</option>
                <option value="gas">Gas Usage</option>
                <option value="slippage">Slippage</option>
              </select>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as 'hour' | 'day' | 'week')}
                className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
              >
                <option value="hour">24 Hours</option>
                <option value="day">7 Days</option>
                <option value="week">4 Weeks</option>
              </select>
            </div>
          </div>
          
          <div className="h-64 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : (
              <SimpleLineChart data={timeSeriesData} metric={selectedMetric} />
            )}
          </div>
        </div>

        {/* Slippage Distribution */}
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Slippage Distribution</h3>
          <div className="space-y-3">
            {slippageDistribution.map((item) => (
              <div key={item.range} className="flex items-center space-x-3">
                <span className="text-sm text-gray-400 w-20">{item.range}</span>
                <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                </div>
                <span className="text-sm text-white w-12 text-right">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Tables Section */}
      {platformStats && platformStats.totalTransactions > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Route Performance */}
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Top Routes Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-3 text-sm font-medium text-gray-400">Route</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">Success</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">Avg Gas</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {routePerformance.map((route, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-3 text-sm text-white">{route.route}</td>
                    <td className="py-3 text-sm text-right">
                      <span className={cn(
                        "font-medium",
                        route.successRate > 95 ? "text-green-400" : "text-yellow-400"
                      )}>
                        {route.successRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-300 text-right">
                      {formatNumber(route.averageGas)}
                    </td>
                    <td className="py-3 text-sm text-gray-300 text-right">
                      ${formatNumber(route.totalVolume)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Token Pairs */}
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Popular Token Pairs</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="pb-3 text-sm font-medium text-gray-400">Pair</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">24h Vol</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">Txns</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">Gas Opt</th>
                </tr>
              </thead>
              <tbody>
                {tokenPairs.map((pair, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-3 text-sm text-white font-medium">{pair.pair}</td>
                    <td className="py-3 text-sm text-gray-300 text-right">
                      ${formatNumber(pair.volume24h)}
                    </td>
                    <td className="py-3 text-sm text-gray-300 text-right">
                      {pair.transactionCount}
                    </td>
                    <td className="py-3 text-sm text-right">
                      <span className="text-green-400 font-medium">
                        {pair.gasOptimization.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'pink' | 'yellow';
  trend?: 'up' | 'down';
}) {
  const colorClasses = {
    green: 'text-green-400 bg-green-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    pink: 'text-pink-400 bg-pink-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10'
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <p className="text-2xl font-bold text-white">{value}</p>
        {trend && (
          <div className={cn(
            "flex items-center",
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          )}>
            {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple Line Chart Component
function SimpleLineChart({ 
  data, 
  metric 
}: { 
  data: TimeSeriesData[]; 
  metric: string;
}) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="relative h-full flex flex-col">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400">
        <span>{formatValue(maxValue, metric)}</span>
        <span>{formatValue((maxValue + minValue) / 2, metric)}</span>
        <span>{formatValue(minValue, metric)}</span>
      </div>
      
      {/* Chart area */}
      <div className="flex-1 ml-12 relative">
        <svg className="w-full h-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((y) => (
            <line
              key={y}
              x1="0"
              y1={`${y * 100}%`}
              x2="100%"
              y2={`${y * 100}%`}
              stroke="rgba(156, 163, 175, 0.1)"
              strokeDasharray="5,5"
            />
          ))}
          
          {/* Line chart */}
          <polyline
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="2"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = ((maxValue - d.value) / range) * 100;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* Area fill */}
          <polygon
            fill="url(#areaGradient)"
            opacity="0.1"
            points={[
              ...data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100;
                const y = ((maxValue - d.value) / range) * 100;
                return `${x},${y}`;
              }),
              '100,100',
              '0,100'
            ].join(' ')}
          />
          
          {/* Gradients */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 ml-12 text-xs text-gray-400">
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function formatValue(value: number, metric: string): string {
  switch (metric) {
    case 'gas':
      return `${(value / 1000).toFixed(0)}k`;
    case 'slippage':
      return `${value.toFixed(2)}%`;
    case 'volume':
      return `$${formatNumber(value)}`;
    case 'transactions':
      return formatNumber(value);
    default:
      return value.toFixed(0);
  }
}

function formatNumber(num: number, decimals = 0): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
  return num.toFixed(decimals);
}