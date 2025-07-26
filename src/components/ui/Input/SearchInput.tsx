'use client';

import React, { useState, useCallback, useRef, useEffect, useId } from 'react';
import { Input, type InputProps } from './Input';
import { cn } from '@/lib/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  value: string;
}

export interface SearchInputProps extends Omit<InputProps, 'type' | 'results' | 'onSelect'> {
  results?: SearchResult[];
  onSearch?: (query: string) => Promise<void> | void;
  onResultSelect?: (result: SearchResult) => void;
  loading?: boolean;
  loadingText?: string;
  showClearButton?: boolean;
  debounceMs?: number;
  placeholder?: string;
  emptyStateText?: string;
  maxResults?: number;
  highlightMatch?: boolean;
  customSpinner?: React.ReactNode;
}

// Highlight matching text in search results
const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-primary-500/20 text-primary-400">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      results = [],
      onSearch,
      onResultSelect,
      loading = false,
      loadingText = 'Searching...',
      showClearButton = true,
      debounceMs = 300,
      placeholder = 'Search...',
      emptyStateText = 'No results found',
      maxResults = 10,
      highlightMatch = true,
      customSpinner,
      className,
      value,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [currentQuery, setCurrentQuery] = useState('');
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const resultsId = useId();
    
    // Sync with controlled value prop
    useEffect(() => {
      if (value !== undefined && value !== inputValue) {
        setInputValue(String(value));
      }
    }, [value, inputValue]);
    
    // Limit results to maxResults
    const limitedResults = results.slice(0, maxResults);

    // Debounced search with race condition protection
    const debouncedSearch = useCallback(
      (query: string) => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        
        debounceRef.current = setTimeout(async () => {
          // Guard against stale queries
          if (query === currentQuery) {
            await onSearch?.(query);
          }
        }, debounceMs);
      },
      [onSearch, debounceMs, currentQuery]
    );

    // Handle input changes
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setCurrentQuery(newValue);
        setSelectedIndex(-1);
        
        if (newValue.trim()) {
          debouncedSearch(newValue);
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
        
        onChange?.(e);
      },
      [onChange, debouncedSearch]
    );

    // Handle result selection
    const handleSelect = useCallback(
      (result: SearchResult) => {
        setInputValue(result.title);
        setIsOpen(false);
        setSelectedIndex(-1);
        onResultSelect?.(result);
      },
      [onResultSelect]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || limitedResults.length === 0) return;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < limitedResults.length - 1 ? prev + 1 : 0
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : limitedResults.length - 1
            );
            break;
          case 'Enter':
            e.preventDefault();
            if (selectedIndex >= 0 && limitedResults[selectedIndex]) {
              handleSelect(limitedResults[selectedIndex]);
            }
            break;
          case 'Escape':
            setIsOpen(false);
            setSelectedIndex(-1);
            break;
        }
      },
      [isOpen, limitedResults, selectedIndex, handleSelect]
    );

    // Handle clear button
    const handleClear = useCallback(() => {
      setInputValue('');
      setCurrentQuery('');
      setIsOpen(false);
      setSelectedIndex(-1);
      
      // Create properly typed synthetic event
      const inputElement = (ref as React.RefObject<HTMLInputElement>)?.current;
      if (inputElement && onChange) {
        const syntheticEvent = {
          target: inputElement,
          currentTarget: inputElement,
          preventDefault: () => {},
          stopPropagation: () => {},
          nativeEvent: new Event('change', { bubbles: true }),
          type: 'change',
          bubbles: true,
          cancelable: true,
          timeStamp: Date.now(),
          isTrusted: false,
          isDefaultPrevented: () => false,
          isPropagationStopped: () => false,
          persist: () => {}
        } as React.ChangeEvent<HTMLInputElement>;
        
        // Update the input element value
        inputElement.value = '';
        onChange(syntheticEvent);
      }
      
      onSearch?.('');
    }, [onChange, onSearch, ref]);

    // Handle focus
    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (inputValue.trim() && limitedResults.length > 0) {
          setIsOpen(true);
        }
        onFocus?.(e);
      },
      [inputValue, limitedResults.length, onFocus]
    );

    // Handle blur with delay to allow for result selection
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        // Use a longer delay to account for touch devices
        setTimeout(() => {
          setIsOpen(false);
          setSelectedIndex(-1);
        }, 200);
        onBlur?.(e);
      },
      [onBlur]
    );

    // Clean up debounce on unmount
    useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, []);

    const searchIcon = (
      <svg
        className="w-5 h-5 text-text-tertiary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    );

    const spinner = customSpinner || (
      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    );

    const rightElement = (
      <div className="flex items-center gap-2">
        {loading && (
          <div className="flex items-center gap-2">
            {spinner}
            {loadingText && (
              <span className="text-xs text-text-tertiary">{loadingText}</span>
            )}
          </div>
        )}
        
        {showClearButton && inputValue && !loading && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-background-secondary rounded transition-colors"
            title="Clear search"
            aria-label="Clear search"
          >
            <svg
              className="w-4 h-4 text-text-tertiary hover:text-text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );

    return (
      <div ref={containerRef} className="relative">
        <Input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          leftElement={searchIcon}
          rightElement={rightElement}
          placeholder={placeholder}
          className={cn('pr-20', className)}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? resultsId : undefined}
          aria-activedescendant={
            selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined
          }
          {...props}
        />

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id={resultsId}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card-background border border-border-color rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
              role="listbox"
              aria-label="Search results"
            >
              {limitedResults.length > 0 ? (
                <div className="py-2">
                  {limitedResults.map((result, index) => (
                    <motion.button
                      key={result.id}
                      id={`search-result-${index}`}
                      onMouseDown={() => handleSelect(result)} // Use onMouseDown for better touch UX
                      className={cn(
                        'w-full px-4 py-3 text-left flex items-center gap-3',
                        'hover:bg-background-secondary transition-colors',
                        'focus:bg-background-secondary focus:outline-none',
                        selectedIndex === index && 'bg-background-secondary'
                      )}
                      role="option"
                      aria-selected={selectedIndex === index}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.1 }}
                    >
                      {result.icon && (
                        <div className="flex-shrink-0 text-text-secondary">
                          {result.icon}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-text-primary font-medium truncate">
                          {highlightMatch 
                            ? highlightText(result.title, currentQuery)
                            : result.title
                          }
                        </div>
                        {result.subtitle && (
                          <div className="text-text-tertiary text-sm truncate">
                            {highlightMatch 
                              ? highlightText(result.subtitle, currentQuery)
                              : result.subtitle
                            }
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : inputValue.trim() && !loading ? (
                <div className="px-4 py-8 text-center text-text-tertiary">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-text-quaternary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {emptyStateText}
                </div>
              ) : loading ? (
                <div className="px-4 py-8 text-center text-text-tertiary">
                  <div className="flex items-center justify-center gap-3">
                    {spinner}
                    <span>{loadingText}</span>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';