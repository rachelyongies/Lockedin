'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Info, 
  ExternalLink, 
  Zap, 
  Shield, 
  X,
  ArrowRight
} from 'lucide-react';
import { ChainSupportService, ChainSupportInfo } from '@/lib/services/chain-support-config';

interface ChainSupportWarningProps {
  chainId: number;
  fromTokenSymbol?: string;
  toTokenSymbol?: string;
  isVisible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export const ChainSupportWarning: React.FC<ChainSupportWarningProps> = ({
  chainId,
  fromTokenSymbol,
  toTokenSymbol,
  isVisible = true,
  onDismiss,
  className = ''
}) => {
  const chainConfig = ChainSupportService.getChainConfig(chainId);
  const routeRecommendation = ChainSupportService.getRouteRecommendation(chainId);
  const warningMessage = ChainSupportService.getFusionWarningMessage(chainId);
  
  // Don't show warning if chain fully supports all 1inch services
  if (!chainConfig || (chainConfig.fusionSupported && chainConfig.aggregationSupported)) {
    return null;
  }

  const getWarningLevel = (): 'info' | 'warning' | 'error' => {
    if (chainConfig.aggregationSupported) return 'info'; // Aggregation available
    if (chainConfig.fallbackStrategy === 'bridge-required') return 'warning'; // Bridge needed
    return 'error'; // Unsupported
  };

  const getWarningColors = () => {
    const level = getWarningLevel();
    switch (level) {
      case 'info':
        return {
          bg: 'bg-blue-500/10 border-blue-500/20',
          text: 'text-blue-300',
          icon: 'text-blue-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/20',
          text: 'text-yellow-300',
          icon: 'text-yellow-400'
        };
      case 'error':
        return {
          bg: 'bg-red-500/10 border-red-500/20',
          text: 'text-red-300',
          icon: 'text-red-400'
        };
    }
  };

  const colors = getWarningColors();
  const warningLevel = getWarningLevel();

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className={`rounded-xl border p-4 ${colors.bg} ${className}`}
      >
        <div className="flex items-start gap-3">
          {/* Warning Icon */}
          <div className={`mt-0.5 ${colors.icon}`}>
            {warningLevel === 'error' ? (
              <AlertTriangle size={20} />
            ) : warningLevel === 'warning' ? (
              <Info size={20} />
            ) : (
              <Zap size={20} />
            )}
          </div>

          {/* Warning Content */}
          <div className="flex-1 space-y-3">
            {/* Title */}
            <div className={`font-medium ${colors.text}`}>
              {warningLevel === 'error' 
                ? `${chainConfig?.name || 'This Chain'} Not Supported`
                : warningLevel === 'warning'
                ? `Limited 1inch Support on ${chainConfig?.name}`
                : `1inch Fusion Unavailable on ${chainConfig?.name}`
              }
            </div>

            {/* Warning Message */}
            {warningMessage && (
              <div className={`text-sm ${colors.text} opacity-90`}>
                {warningMessage}
              </div>
            )}

            {/* Service Availability */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Shield size={14} className={chainConfig?.fusionSupported ? 'text-green-400' : 'text-gray-500'} />
                <span className={chainConfig?.fusionSupported ? 'text-green-300' : 'text-gray-400'}>
                  Fusion {chainConfig?.fusionSupported ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={14} className={chainConfig?.aggregationSupported ? 'text-green-400' : 'text-gray-500'} />
                <span className={chainConfig?.aggregationSupported ? 'text-green-300' : 'text-gray-400'}>
                  Aggregation {chainConfig?.aggregationSupported ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <div className={`text-sm font-medium ${colors.text}`}>
                Recommendation: {routeRecommendation.reasoning}
              </div>

              {/* Alternative Providers */}
              {routeRecommendation.alternatives && routeRecommendation.alternatives.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Alternative DEXs on {chainConfig?.name}:</div>
                  <div className="flex flex-wrap gap-1">
                    {routeRecommendation.alternatives.map((alt, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700/50 text-xs text-gray-300 rounded-md"
                      >
                        {alt}
                        <ExternalLink size={10} />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bridge Suggestion */}
              {routeRecommendation.recommendation === 'bridge' && (
                <div className="flex items-center gap-2 text-xs bg-gray-700/30 rounded-lg p-2">
                  <ArrowRight size={12} className="text-gray-400" />
                  <span className="text-gray-300">
                    Consider bridging {fromTokenSymbol || 'tokens'} to{' '}
                    <span className="text-blue-300 font-medium">
                      {ChainSupportService.getFusionSupportedChains()[0]?.name || 'Ethereum'}
                    </span>{' '}
                    for full 1inch services
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dismiss Button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-300 transition-colors mt-0.5"
              aria-label="Dismiss warning"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChainSupportWarning;