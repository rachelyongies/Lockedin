'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Star, Shield, TrendingUp, ExternalLink } from 'lucide-react';
import { IntelligentRouterToken, IntelligentRouterChainId } from '@/types/intelligent-router';
import { getIntelligentRouterNetworkInfo } from '@/config/intelligent-router-tokens';

interface EnhancedTokenSelectorProps {
  selectedToken: IntelligentRouterToken | null;
  availableTokens: IntelligentRouterToken[];
  onTokenSelect: (token: IntelligentRouterToken) => void;
  label: string;
  placeholder?: string;
  className?: string;
  showNetworkBadge?: boolean;
  showPopularTokens?: boolean;
  showBalances?: boolean;
  recentTokens?: IntelligentRouterToken[];
  favoriteTokens?: IntelligentRouterToken[];
  disabled?: boolean;
}

// Network Icons Component
const NetworkIcon: React.FC<{ chainId: IntelligentRouterChainId; size?: number }> = ({ 
  chainId, 
  size = 16 
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

// Token Badge Component
const TokenBadge: React.FC<{ token: IntelligentRouterToken }> = ({ token }) => {
  const getBadgeInfo = () => {
    if (token.isNative) {
      return { icon: Star, text: 'Native', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
    }
    if (token.tags.includes('stablecoin')) {
      return { icon: Shield, text: 'Stable', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
    }
    if (token.tags.includes('wrapped')) {
      return { icon: TrendingUp, text: 'Wrapped', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
    return null;
  };

  const badgeInfo = getBadgeInfo();
  if (!badgeInfo) return null;

  const Icon = badgeInfo.icon;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${badgeInfo.color}`}>
      <Icon size={10} />
      {badgeInfo.text}
    </div>
  );
};

export const EnhancedTokenSelector: React.FC<EnhancedTokenSelectorProps> = ({
  selectedToken,
  availableTokens,
  onTokenSelect,
  label,
  placeholder = "Select a token",
  className = '',
  showNetworkBadge = true,
  showPopularTokens = true,
  showBalances = false,
  recentTokens = [],
  favoriteTokens = [],
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter tokens based on search
  const filteredTokens = availableTokens.filter(token => 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Improved token grouping based on Jumper.exchange patterns
  const groupedTokens = {
    // Show favorites and recent at the top (like Jumper)
    favorites: favoriteTokens.filter(token => 
      filteredTokens.some(ft => ft.id === token.id)
    ),
    recent: recentTokens.filter(token => 
      filteredTokens.some(ft => ft.id === token.id) &&
      !favoriteTokens.some(fav => fav.id === token.id)
    ).slice(0, 5),
    
    // Popular tokens (high TVL, commonly used)
    popular: filteredTokens.filter(token => {
      const isPopular = token.isNative || 
        token.tags.includes('stablecoin') ||
        ['WETH', 'USDC', 'USDT', 'DAI', 'WBTC'].includes(token.symbol);
      const notInFavorites = !favoriteTokens.some(fav => fav.id === token.id);
      const notInRecent = !recentTokens.some(rec => rec.id === token.id);
      return isPopular && notInFavorites && notInRecent;
    }).slice(0, 6),
    
    // Categorized tokens
    stablecoins: filteredTokens.filter(token => 
      token.tags.includes('stablecoin') &&
      !favoriteTokens.some(fav => fav.id === token.id) &&
      !recentTokens.some(rec => rec.id === token.id) &&
      !['USDC', 'USDT', 'DAI'].includes(token.symbol) // Already in popular
    ),
    native: filteredTokens.filter(token => 
      token.isNative &&
      !favoriteTokens.some(fav => fav.id === token.id) &&
      !recentTokens.some(rec => rec.id === token.id)
    ),
    wrapped: filteredTokens.filter(token => 
      token.tags.includes('wrapped') &&
      !favoriteTokens.some(fav => fav.id === token.id) &&
      !recentTokens.some(rec => rec.id === token.id) &&
      !['WETH', 'WBTC'].includes(token.symbol) // Already in popular
    ),
    other: filteredTokens.filter(token => {
      const notInOtherCategories = !token.isNative && 
        !token.tags.includes('stablecoin') && 
        !token.tags.includes('wrapped');
      const notInFavorites = !favoriteTokens.some(fav => fav.id === token.id);
      const notInRecent = !recentTokens.some(rec => rec.id === token.id);
      const notInPopular = !['WETH', 'USDC', 'USDT', 'DAI', 'WBTC'].includes(token.symbol);
      return notInOtherCategories && notInFavorites && notInRecent && notInPopular;
    })
  };

  const TokenOption: React.FC<{ token: IntelligentRouterToken; isSelected: boolean }> = ({ 
    token, 
    isSelected 
  }) => {
    const networkInfo = getIntelligentRouterNetworkInfo(token.chainId);
    
    return (
      <motion.button
        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          onTokenSelect(token);
          setIsOpen(false);
          setSearchQuery('');
        }}
        className={`
          w-full p-3 rounded-lg text-left transition-all duration-200 flex items-center gap-3
          ${isSelected ? 'bg-blue-500/20 border border-blue-500/30' : 'hover:bg-gray-700/50'}
        `}
      >
        {/* Token Icon Placeholder */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-sm font-bold">
          {token.symbol.charAt(0)}
        </div>

        {/* Token Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{token.symbol}</span>
            {showNetworkBadge && (
              <div className="flex items-center gap-1">
                <NetworkIcon chainId={token.chainId} size={14} />
                <span className="text-xs text-gray-400">{networkInfo?.name}</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-400 truncate">{token.name}</div>
          <div className="flex items-center justify-between mt-1">
            <TokenBadge token={token} />
            {showBalances && (
              <div className="text-xs text-gray-500">
                {/* Placeholder for balance - would integrate with wallet */}
                0.00
              </div>
            )}
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </motion.button>
    );
  };

  const TokenGroup: React.FC<{ title: string; tokens: IntelligentRouterToken[] }> = ({ 
    title, 
    tokens 
  }) => {
    if (tokens.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">
          {title}
        </div>
        <div className="space-y-1">
          {tokens.map(token => (
            <TokenOption
              key={token.id}
              token={token}
              isSelected={selectedToken?.id === token.id}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="text-sm font-medium text-gray-300 mb-2 block">
        {label}
      </label>

      {/* Selected Token Display */}
      <motion.button
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
          ${disabled 
            ? 'border-gray-600 bg-gray-700/30 cursor-not-allowed opacity-50' 
            : isOpen 
              ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/20' 
              : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700/70'
          }
        `}
      >
        {selectedToken ? (
          <div className="flex items-center gap-3">
            {/* Token Icon */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold">
              {selectedToken.symbol.charAt(0)}
            </div>

            {/* Token Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{selectedToken.symbol}</span>
                {showNetworkBadge && (
                  <div className="flex items-center gap-1">
                    <NetworkIcon chainId={selectedToken.chainId} size={16} />
                    <span className="text-xs text-gray-400">
                      {getIntelligentRouterNetworkInfo(selectedToken.chainId)?.name}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-400 truncate">{selectedToken.name}</div>
            </div>

            {/* Chevron */}
            <ChevronDown 
              size={20} 
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">{placeholder}</span>
            <ChevronDown 
              size={20} 
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden"
          >
            {/* Search */}
            <div className="p-3 border-b border-gray-700">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Token List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-3">
              {searchQuery === '' ? (
                <>
                  {/* Favorites - Always at top */}
                  {groupedTokens.favorites.length > 0 && (
                    <TokenGroup title="⭐ Favorites" tokens={groupedTokens.favorites} />
                  )}
                  
                  {/* Recent - Second priority */}
                  {groupedTokens.recent.length > 0 && (
                    <TokenGroup title="🕒 Recent" tokens={groupedTokens.recent} />
                  )}
                  
                  {/* Popular - Like Jumper's top tokens */}
                  {showPopularTokens && groupedTokens.popular.length > 0 && (
                    <TokenGroup title="🔥 Popular" tokens={groupedTokens.popular} />
                  )}

                  {/* Categorized tokens */}
                  <TokenGroup title="💰 Stablecoins" tokens={groupedTokens.stablecoins} />
                  <TokenGroup title="🪙 Native Tokens" tokens={groupedTokens.native} />
                  <TokenGroup title="🎁 Wrapped Tokens" tokens={groupedTokens.wrapped} />
                  {groupedTokens.other.length > 0 && (
                    <TokenGroup title="📊 Other Tokens" tokens={groupedTokens.other} />
                  )}
                </>
              ) : (
                <TokenGroup title="🔍 Search Results" tokens={filteredTokens} />
              )}

              {filteredTokens.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  <div className="font-medium">No tokens found</div>
                  <div className="text-sm mt-1">Try adjusting your search terms</div>
                  <div className="text-xs mt-2 text-gray-500">
                    Search by symbol or name (e.g., "ETH" or "Ethereum")
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};