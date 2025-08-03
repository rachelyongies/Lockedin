'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Network, Check } from 'lucide-react';
import { IntelligentRouterChainId } from '@/types/intelligent-router';
import { getIntelligentRouterNetworkInfo } from '@/config/intelligent-router-tokens';

interface NetworkOption {
  value: IntelligentRouterChainId | 'all';
  label: string;
  color: string;
  icon?: string;
  tokenCount?: number;
}

interface NetworkSelectorProps {
  selectedNetwork: IntelligentRouterChainId | 'all';
  onNetworkSelect: (network: IntelligentRouterChainId | 'all') => void;
  tokenCounts?: Record<IntelligentRouterChainId, number>;
  className?: string;
}

const NETWORK_OPTIONS: NetworkOption[] = [
  { value: 'all', label: 'All Networks', color: '#6B7280', tokenCount: 24 },
  { value: 1, label: 'Ethereum', color: '#627EEA', tokenCount: 6 },
  { value: 137, label: 'Polygon', color: '#8247E5', tokenCount: 6 },
  { value: 42161, label: 'Arbitrum', color: '#28A0F0', tokenCount: 6 },
  { value: 56, label: 'BSC', color: '#F3BA2F', tokenCount: 6 }
];

// Network Icons as React Components
const NetworkIcon: React.FC<{ network: IntelligentRouterChainId | 'all'; size?: number }> = ({ 
  network, 
  size = 20 
}) => {
  const style = { width: size, height: size };
  
  switch (network) {
    case 1: // Ethereum
      return (
        <div 
          style={style} 
          className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
        >
          Ξ
        </div>
      );
    case 137: // Polygon
      return (
        <div 
          style={style} 
          className="rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold"
        >
          ⬟
        </div>
      );
    case 42161: // Arbitrum
      return (
        <div 
          style={style} 
          className="rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold"
        >
          ◈
        </div>
      );
    case 56: // BSC
      return (
        <div 
          style={style} 
          className="rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-xs font-bold"
        >
          ◆
        </div>
      );
    default: // All networks
      return <Network size={size} className="text-gray-400" />;
  }
};

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  selectedNetwork,
  onNetworkSelect,
  tokenCounts,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
        <Network size={16} />
        Network Selection
      </label>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {NETWORK_OPTIONS.map((option) => {
          const isSelected = selectedNetwork === option.value;
          const networkInfo = option.value !== 'all' ? getIntelligentRouterNetworkInfo(option.value) : null;
          const actualTokenCount = tokenCounts?.[option.value as IntelligentRouterChainId] || option.tokenCount;
          
          return (
            <motion.button
              key={option.value}
              onClick={() => onNetworkSelect(option.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative p-3 rounded-xl border-2 transition-all duration-200 text-left
                ${isSelected 
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
                  : 'border-gray-600 bg-gray-700/30 hover:border-gray-500 hover:bg-gray-700/50'
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                >
                  <Check size={12} className="text-white" />
                </motion.div>
              )}
              
              {/* Network info */}
              <div className="flex items-center gap-3">
                <NetworkIcon network={option.value} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-400">
                    {actualTokenCount} tokens
                  </div>
                </div>
              </div>
              
              {/* Network color indicator */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl opacity-70"
                style={{ backgroundColor: option.color }}
              />
            </motion.button>
          );
        })}
      </div>
      
      {/* Selected network details */}
      {selectedNetwork !== 'all' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 border border-gray-700 rounded-lg p-3"
        >
          <div className="flex items-center gap-3">
            <NetworkIcon network={selectedNetwork} size={20} />
            <div>
              <div className="text-sm font-medium text-white">
                {getIntelligentRouterNetworkInfo(selectedNetwork)?.name} Selected
              </div>
              <div className="text-xs text-gray-400">
                Showing only {getIntelligentRouterNetworkInfo(selectedNetwork)?.name} tokens
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};