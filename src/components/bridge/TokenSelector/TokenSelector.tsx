'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, CheckIcon, ExternalLinkIcon, SearchIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { cn, formatCryptoAmount } from '@/lib/utils/helpers';
import { Token, TokenBalance } from '@/types/bridge';
import { getDisplaySymbol, formatTokenAmount, getTokenExplorerLink } from '@/config/tokens';

interface TokenSelectorProps {
  selectedToken: Token | null;
  availableTokens: Token[];
  balances?: TokenBalance[];
  onTokenSelect: (token: Token) => void;
  disabled?: boolean;
  placeholder?: string;
  descriptionMaxWidth?: string;
  searchDebounceMs?: number;
}

// Utility to check if element is fully visible in container
function isElementFullyVisible(element: HTMLElement, container: HTMLElement): boolean {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  return (
    elementRect.top >= containerRect.top &&
    elementRect.bottom <= containerRect.bottom &&
    elementRect.left >= containerRect.left &&
    elementRect.right <= containerRect.right
  );
}

// Custom hook for debounced search
function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  availableTokens,
  balances = [],
  onTokenSelect,
  disabled = false,
  placeholder = "Select Token",
  descriptionMaxWidth = "max-w-48 sm:max-w-64",
  searchDebounceMs = 200
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const tokenListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounced(searchQuery, searchDebounceMs);

  // Filter tokens based on debounced search with safe tag checking
  const filteredTokens = useMemo(() => 
    availableTokens.filter(token => {
      const query = debouncedSearchQuery.toLowerCase();
      return (
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        getDisplaySymbol(token).toLowerCase().includes(query) ||
        (token.tags?.some(tag => tag.toLowerCase().includes(query)) ?? false)
      );
    }), [availableTokens, debouncedSearchQuery]
  );

  const getTokenBalance = useCallback((token: Token): TokenBalance | undefined => {
    return balances.find(balance => balance.token.id === token.id);
  }, [balances]);

  const handleTokenSelect = useCallback((token: Token) => {
    onTokenSelect(token);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
    // Return focus to trigger button
    setTimeout(() => {
      triggerButtonRef.current?.focus();
    }, 100);
  }, [onTokenSelect]);

  const handleModalOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setFocusedIndex(-1); // Reset focus
    // Focus search input when modal opens
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, [disabled]);

  const handleModalClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
    // Return focus to trigger button
    setTimeout(() => {
      triggerButtonRef.current?.focus();
    }, 100);
  }, []);

  // Handle focus trap - close modal if focus escapes entirely
  const handleModalBlur = useCallback((e: React.FocusEvent) => {
    // Check if the new focus target is outside the modal
    if (modalRef.current && !modalRef.current.contains(e.relatedTarget as Node)) {
      // Small delay to avoid conflicts with other focus events
      setTimeout(() => {
        if (isOpen) {
          handleModalClose();
        }
      }, 100);
    }
  }, [isOpen, handleModalClose]);

  // Reset focused index when filtered tokens change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredTokens.length]);

  // Smart scroll focused item into view (only if not fully visible)
  useEffect(() => {
    if (focusedIndex >= 0 && tokenListRef.current) {
      const focusedElement = tokenListRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement && tokenListRef.current) {
        if (!isElementFullyVisible(focusedElement, tokenListRef.current)) {
          focusedElement.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
          });
        }
      }
    }
  }, [focusedIndex]);

  // Get focused token for aria-activedescendant
  const focusedToken = focusedIndex >= 0 ? filteredTokens[focusedIndex] : null;

  return (
    <>
      {/* Token Selector Button */}
      <Button
        ref={triggerButtonRef}
        variant="secondary"
        size="md"
        onClick={handleModalOpen}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 min-w-[120px]',
          'bg-card-background hover:bg-background-secondary',
          'border-border-color hover:border-border-color-hover',
          'focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
          selectedToken && 'justify-between',
          'transition-all duration-200'
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={selectedToken ? `Selected token: ${getDisplaySymbol(selectedToken)}` : placeholder}
      >
        {selectedToken ? (
          <>
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6">
                <Image
                  src={selectedToken.logoUrl}
                  alt={selectedToken.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                {selectedToken.verified && (
                  <CheckIcon className="absolute -top-1 -right-1 w-3 h-3 text-success bg-background rounded-full" />
                )}
              </div>
              <span className="font-medium text-sm">
                {getDisplaySymbol(selectedToken)}
              </span>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDownIcon className="w-4 h-4 text-text-tertiary" />
            </motion.div>
          </>
        ) : (
          <>
            <span className="text-text-secondary">{placeholder}</span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDownIcon className="w-4 h-4 text-text-tertiary" />
            </motion.div>
          </>
        )}
      </Button>

      {/* Token Selection Modal */}
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        size="md"
      >
        <ModalContent
          ref={modalRef}
          role="dialog"
          aria-labelledby="token-selector-title"
          aria-describedby="token-selector-description"
          onBlur={handleModalBlur}
        >
          <ModalHeader>
            <ModalTitle id="token-selector-title">Select Token</ModalTitle>
            <p id="token-selector-description" className="sr-only">
              Choose a token from the list below. Use arrow keys to navigate and Enter to select. 
              {filteredTokens.length} tokens available.
            </p>
          </ModalHeader>
          
          <div className="p-6 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0.5, x: -2 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
              >
                <SearchIcon className="w-4 h-4 text-text-tertiary" />
              </motion.div>
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name, symbol, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10"
                aria-label="Search tokens"
                aria-describedby="search-status"
              />
              {/* Live search status for screen readers */}
              <div id="search-status" className="sr-only" aria-live="polite">
                {debouncedSearchQuery && `${filteredTokens.length} tokens found for "${debouncedSearchQuery}"`}
              </div>
            </div>

            {/* Token List */}
            <div 
              ref={tokenListRef}
              className="max-h-96 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-border-color scrollbar-track-transparent"
              role="listbox"
              aria-label="Available tokens"
              aria-activedescendant={focusedToken ? `token-${focusedToken.id}` : undefined}
            >
              <AnimatePresence mode="popLayout">
                {filteredTokens.map((token, index) => {
                  const balance = getTokenBalance(token);
                  const isSelected = selectedToken?.id === token.id;
                  const isFocused = focusedIndex === index;
                  const explorerLink = getTokenExplorerLink(token);

                  return (
                    <motion.button
                      key={token.id}
                      id={`token-${token.id}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.1) }}
                      onClick={() => handleTokenSelect(token)}
                      className={cn(
                        'w-full p-3 rounded-lg border transition-all duration-200',
                        'flex items-center justify-between text-left',
                        'hover:bg-background-secondary hover:border-border-color-hover',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
                        isSelected && 'bg-primary-500/10 border-primary-500/30 ring-1 ring-primary-500/20',
                        isFocused && !isSelected && 'bg-background-secondary border-border-color-hover ring-1 ring-border-color-hover/50',
                        !isSelected && !isFocused && 'bg-card-background border-border-color'
                      )}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={isFocused ? 0 : -1}
                      aria-describedby={`token-${token.id}-description`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative flex-shrink-0">
                          <Image
                            src={token.logoUrl}
                            alt={token.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                          {token.verified && (
                            <CheckIcon 
                              className="absolute -top-1 -right-1 w-4 h-4 text-success bg-background rounded-full p-0.5" 
                              aria-label="Verified token"
                            />
                          )}
                        </div>
                        
                        <div className="text-left min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-text-primary">
                              {getDisplaySymbol(token)}
                            </span>
                            {token.tags?.includes('testnet') && (
                              <span className="px-1.5 py-0.5 text-xs bg-warning/20 text-warning rounded whitespace-nowrap">
                                Testnet
                              </span>
                            )}
                            {token.tags?.includes('wrapped') && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded whitespace-nowrap">
                                Wrapped
                              </span>
                            )}
                            {token.tags?.includes('native') && (
                              <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded whitespace-nowrap">
                                Native
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-text-secondary truncate">
                              {token.name}
                            </span>
                            {explorerLink && (
                              <a
                                href={explorerLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  'p-0.5 text-text-tertiary hover:text-text-secondary transition-colors',
                                  'focus:outline-none focus:ring-1 focus:ring-primary-500/50 rounded',
                                  'flex-shrink-0'
                                )}
                                aria-label={`View ${token.symbol} on block explorer`}
                                tabIndex={-1} // Prevent tab focus in modal
                              >
                                <ExternalLinkIcon className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <p 
                            id={`token-${token.id}-description`}
                            className={cn(
                              'text-xs text-text-tertiary mt-0.5 truncate',
                              descriptionMaxWidth
                            )}
                            title={token.description} // Show full description on hover
                          >
                            {token.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right ml-3 flex-shrink-0">
                        {balance ? (
                          <>
                            <div className="font-medium text-text-primary">
                              {formatTokenAmount(balance.amount.raw, token)}
                            </div>
                            <div className="text-sm text-text-secondary">
                              ${formatCryptoAmount(balance.balanceUSD.toString(), undefined, 2)}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-text-tertiary">
                            No balance
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {filteredTokens.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center py-8 text-text-secondary"
                >
                  <SearchIcon className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
                  <p>No tokens found matching &ldquo;{debouncedSearchQuery}&rdquo;</p>
                  <p className="text-sm text-text-tertiary mt-1">
                    Try searching by name, symbol, or tag
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer Info */}
            <div className="border-t pt-4 text-xs text-text-tertiary space-y-1">
              <p>• Only tokens with available bridge routes are shown</p>
              <p>• Verified tokens show a ✓ checkmark</p>
              <p>• Use ↑↓ arrow keys to navigate, Enter to select, Esc to close</p>
              {debouncedSearchQuery !== searchQuery && (
                <p className="text-primary-400">• Searching...</p>
              )}
            </div>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
};