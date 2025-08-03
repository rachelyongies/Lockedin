'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Clock, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { IntelligentRouterToken, IntelligentRouterChainId } from '@/types/intelligent-router';
import { getIntelligentRouterNetworkInfo } from '@/config/intelligent-router-tokens';

// Utility function to format token amounts with proper decimals
const formatTokenAmount = (amount: string, decimals: number = 18): string => {
  try {
    // Handle both string and number inputs
    const amountStr = typeof amount === 'string' ? amount : amount.toString();
    
    // If it's already a decimal number (contains dot), return as is with formatting
    if (amountStr.includes('.')) {
      const num = parseFloat(amountStr);
      if (num < 0.0001) return '< 0.0001';
      if (num < 1) return num.toFixed(4);
      if (num < 1000) return num.toFixed(3);
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    
    // If it's a large integer (wei format), convert from wei to token amount
    const bigIntAmount = BigInt(amountStr);
    const divisor = BigInt(10 ** decimals);
    const wholePart = bigIntAmount / divisor;
    const fractionalPart = bigIntAmount % divisor;
    
    // Convert to decimal
    const wholeNumber = Number(wholePart);
    const fractionalNumber = Number(fractionalPart) / (10 ** decimals);
    const totalAmount = wholeNumber + fractionalNumber;
    
    // Format based on size
    if (totalAmount < 0.0001) return '< 0.0001';
    if (totalAmount < 1) return totalAmount.toFixed(4);
    if (totalAmount < 1000) return totalAmount.toFixed(3);
    return totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 });
    
  } catch (error) {
    console.warn('Error formatting token amount:', amount, error);
    return amount.toString();
  }
};

// Utility function to format gas estimates 
const formatGasEstimate = (gasEstimate: string): string => {
  try {
    const gasNumber = parseInt(gasEstimate);
    
    // If it's a reasonable gas limit (21000 - 500000), show as gas limit
    if (gasNumber >= 21000 && gasNumber <= 500000) {
      return `${gasNumber.toLocaleString()} gas`;
    }
    
    // If it's a large number (wei), convert to ETH
    if (gasNumber > 1000000) {
      const ethAmount = gasNumber / 1e18;
      if (ethAmount < 0.001) {
        return `< 0.001 ETH`;
      }
      return `${ethAmount.toFixed(4)} ETH`;
    }
    
    // Default case
    return gasEstimate;
  } catch (error) {
    return gasEstimate;
  }
};

interface RouteStep {
  type: 'swap' | 'bridge' | 'wrap';
  fromToken: IntelligentRouterToken;
  toToken: IntelligentRouterToken;
  protocol: string;
  estimatedGas: string;
  estimatedTime: number;
  network: IntelligentRouterChainId;
}

interface RouteFlowProps {
  fromToken: IntelligentRouterToken;
  toToken: IntelligentRouterToken;
  amount: string;
  estimatedOutput: string;
  routeType: 'same-chain' | 'cross-chain' | 'multi-hop';
  steps?: RouteStep[];
  gasEstimate?: string;
  timeEstimate?: number;
  priceImpact?: string;
  confidence?: number;
  protocol?: string; // Add protocol prop
  className?: string;
}

// Network Icons
const NetworkIcon: React.FC<{ chainId: IntelligentRouterChainId; size?: number }> = ({ 
  chainId, 
  size = 20 
}) => {
  const style = { width: size, height: size };
  
  switch (chainId) {
    case 1:
      return (
        <div 
          style={style} 
          className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
        >
          Ξ
        </div>
      );
    case 137:
      return (
        <div 
          style={style} 
          className="rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold"
        >
          ⬟
        </div>
      );
    case 42161:
      return (
        <div 
          style={style} 
          className="rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold"
        >
          ◈
        </div>
      );
    case 56:
      return (
        <div 
          style={style} 
          className="rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-xs font-bold"
        >
          ◆
        </div>
      );
    default:
      return <div style={style} className="rounded-full bg-gray-500" />;
  }
};

// Route Type Badge
const RouteTypeBadge: React.FC<{ routeType: string }> = ({ routeType }) => {
  const getRouteConfig = () => {
    switch (routeType) {
      case 'same-chain':
        return {
          icon: Zap,
          label: 'Same Chain',
          color: 'bg-green-500/20 text-green-300 border-green-500/30',
          description: 'Direct swap on single network'
        };
      case 'cross-chain':
        return {
          icon: Shield,
          label: 'Cross Chain',
          color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          description: 'Bridge between networks'
        };
      case 'multi-hop':
        return {
          icon: ArrowRight,
          label: 'Multi Hop',
          color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          description: 'Multiple swaps for optimal rate'
        };
      default:
        return {
          icon: AlertTriangle,
          label: 'Complex',
          color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
          description: 'Advanced routing strategy'
        };
    }
  };

  const config = getRouteConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.color}`}>
      <Icon size={14} />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
};

// Token Display
const TokenDisplay: React.FC<{ 
  token: IntelligentRouterToken; 
  amount?: string; 
  isOutput?: boolean;
  showNetwork?: boolean;
}> = ({ token, amount, isOutput = false, showNetwork = true }) => {
  const networkInfo = getIntelligentRouterNetworkInfo(token.chainId);

  return (
    <div className="flex items-center gap-3">
      {/* Token Icon */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold text-lg">
          {token.symbol.charAt(0)}
        </div>
        {showNetwork && (
          <div className="absolute -bottom-1 -right-1">
            <NetworkIcon chainId={token.chainId} size={16} />
          </div>
        )}
      </div>

      {/* Token Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{token.symbol}</span>
          {amount && (
            <span className={`text-lg font-bold ${isOutput ? 'text-green-400' : 'text-blue-400'}`}>
              {formatTokenAmount(amount, token.decimals)}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-400">{token.name}</div>
        {showNetwork && (
          <div className="text-xs text-gray-500">{networkInfo?.name}</div>
        )}
      </div>
    </div>
  );
};

// Route Step Component
const RouteStepDisplay: React.FC<{ step: RouteStep; stepNumber: number }> = ({ step, stepNumber }) => {
  const getStepIcon = () => {
    switch (step.type) {
      case 'swap': return Zap;
      case 'bridge': return Shield;
      case 'wrap': return ArrowRight;
      default: return ArrowRight;
    }
  };

  const Icon = getStepIcon();
  const networkInfo = getIntelligentRouterNetworkInfo(step.network);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: stepNumber * 0.1 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Icon size={16} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white capitalize">
            {step.type} via {step.protocol}
          </div>
          <div className="text-xs text-gray-400">
            On {networkInfo?.name} • ~{step.estimatedTime}s • {step.estimatedGas} gas
          </div>
        </div>
        <NetworkIcon chainId={step.network} size={18} />
      </div>
    </motion.div>
  );
};

export const RouteFlowVisualization: React.FC<RouteFlowProps> = ({
  fromToken,
  toToken,
  amount,
  estimatedOutput,
  routeType,
  steps = [],
  gasEstimate,
  timeEstimate,
  priceImpact,
  confidence = 0.85,
  protocol,
  className = ''
}) => {
  const isCrossChain = fromToken.chainId !== toToken.chainId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-white">Route Analysis</h3>
          <RouteTypeBadge routeType={routeType} />
        </div>
        
        {/* Confidence Score */}
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-green-400" />
          <span className="text-sm text-gray-300">
            {Math.round(confidence * 100)}% Confidence
          </span>
        </div>
      </div>

      {/* Token Flow */}
      <div className="space-y-6">
        {/* From Token */}
        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-2">From</div>
          <TokenDisplay token={fromToken} amount={amount} showNetwork={isCrossChain} />
        </div>

        {/* Route Steps or Simple Arrow */}
        {steps.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <ArrowRight size={16} />
              Route Steps ({steps.length})
            </div>
            {steps.map((step, index) => (
              <RouteStepDisplay key={index} step={step} stepNumber={index} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <motion.div
              animate={{ x: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-4 text-blue-400"
            >
              <ArrowRight size={24} />
              <span className="text-sm font-medium">
                {protocol ? `Direct swap via ${protocol}` : 
                 isCrossChain ? 'Cross-chain routing' : 'Direct swap'}
              </span>
              <ArrowRight size={24} />
            </motion.div>
          </div>
        )}

        {/* To Token */}
        <div className="bg-gray-700/30 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-2">To (Estimated)</div>
          <TokenDisplay token={toToken} amount={estimatedOutput} isOutput showNetwork={isCrossChain} />
        </div>
      </div>

      {/* Route Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
        {gasEstimate && (
          <div className="text-center">
            <DollarSign size={20} className="mx-auto text-green-400 mb-1" />
            <div className="text-sm text-gray-400">Gas Cost</div>
            <div className="text-white font-medium">{formatGasEstimate(gasEstimate)}</div>
          </div>
        )}
        
        {timeEstimate && (
          <div className="text-center">
            <Clock size={20} className="mx-auto text-blue-400 mb-1" />
            <div className="text-sm text-gray-400">Est. Time</div>
            <div className="text-white font-medium">{timeEstimate}s</div>
          </div>
        )}
        
        {priceImpact && (
          <div className="text-center">
            <ArrowRight size={20} className="mx-auto text-purple-400 mb-1" />
            <div className="text-sm text-gray-400">Price Impact</div>
            <div className="text-white font-medium">{priceImpact}%</div>
          </div>
        )}
        
        <div className="text-center">
          <CheckCircle size={20} className="mx-auto text-green-400 mb-1" />
          <div className="text-sm text-gray-400">Confidence</div>
          <div className="text-white font-medium">{Math.round(confidence * 100)}%</div>
        </div>
      </div>

      {/* Cross-chain Warning */}
      {isCrossChain && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
        >
          <div className="flex items-center gap-2 text-yellow-300 text-sm">
            <AlertTriangle size={16} />
            <span className="font-medium">Cross-chain Route</span>
          </div>
          <div className="text-xs text-yellow-200/80 mt-1">
            This route involves bridging between networks. Additional fees and time may apply.
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};