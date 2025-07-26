'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';

const selectVariants = cva(
  [
    'relative w-full',
    'bg-card-background border border-border-color',
    'text-text-primary',
    'cursor-pointer',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        default: [
          'hover:border-border-color-hover',
          'focus:border-primary-500',
        ],
        glass: [
          'bg-glass-bg backdrop-blur-md',
          'border-glass-border',
          'hover:bg-glass-hover-bg',
          'focus:border-primary-500/50',
        ],
        filled: [
          'bg-background-tertiary',
          'border-transparent',
          'hover:bg-background-secondary',
          'focus:bg-background-secondary',
          'focus:border-primary-500',
        ],
      },
      size: {
        sm: 'h-8 text-sm rounded-md px-3',
        md: 'h-10 text-sm rounded-lg px-3',
        lg: 'h-12 text-base rounded-lg px-4',
        xl: 'h-14 text-lg rounded-xl px-4',
      },
      hasError: {
        true: 'border-error hover:border-error focus:border-error focus:ring-error/20',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hasError: false,
    },
  }
);

const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300, duration: 0.2 },
  },
  exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15, ease: 'easeIn' } },
};

const optionVariants: Variants = {
  rest: { backgroundColor: 'transparent' },
  hover: { backgroundColor: 'var(--background-secondary)', x: 4, transition: { duration: 0.1 } },
  selected: { backgroundColor: 'var(--background-secondary)', color: 'var(--primary-500)' },
};

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps extends VariantProps<typeof selectVariants> {
  options: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  placeholder?: string;
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  maxHeight?: number;
  className?: string;
  dropdownClassName?: string;
  label?: string;
  errorMessage?: string;
  helperText?: string;
  name?: string; // For form integration
  'aria-label'?: string;
  id?: string;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options = [],
      value,
      defaultValue,
      placeholder = 'Select an option',
      onValueChange,
      disabled = false,
      searchable = false,
      clearable = false,
      multiple = false,
      maxHeight = 256,
      className,
      dropdownClassName,
      label,
      errorMessage,
      helperText,
      name,
      variant,
      size,
      'aria-label': ariaLabel,
      id,
      ...props
    },
    ref
  ) => {
    // Initialize state based on multiple prop
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(() => {
      if (multiple) {
        return Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [];
      }
      return typeof value === 'string' ? value : typeof defaultValue === 'string' ? defaultValue : '';
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [typeAheadBuffer, setTypeAheadBuffer] = useState('');
    const [typeAheadTimeout, setTypeAheadTimeout] = useState<NodeJS.Timeout | null>(null);
    
    const selectRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    
    // Generate unique ID for accessibility
    const selectId = useMemo(() => {
      if (id) return id;
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return `select-${Math.random().toString(36).substr(2, 9)}`;
    }, [id]);
    
    const labelId = `${selectId}-label`;
    const listboxId = `${selectId}-listbox`;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    // Sync controlled value
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    // Filter options based on search
    const filteredOptions = useMemo(() => {
      if (!searchable || !searchTerm) return options.filter(opt => !opt.disabled || multiple);
      
      return options.filter(option => {
        if (option.disabled && !multiple) return false;
        return option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
               option.description?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }, [options, searchTerm, searchable, multiple]);

    // Group options if needed
    const groupedOptions = useMemo(() => {
      const groups: Record<string, SelectOption[]> = {};
      const ungrouped: SelectOption[] = [];

      filteredOptions.forEach(option => {
        if (option.group) {
          if (!groups[option.group]) {
            groups[option.group] = [];
          }
          groups[option.group].push(option);
        } else {
          ungrouped.push(option);
        }
      });

      return { groups, ungrouped };
    }, [filteredOptions]);

    // Find selected option(s)
    const selectedOptions = useMemo(() => {
      if (multiple) {
        const values = Array.isArray(selectedValue) ? selectedValue : [];
        return options.filter(option => values.includes(option.value));
      }
      return options.filter(option => option.value === selectedValue);
    }, [options, selectedValue, multiple]);

    // Handle selection
    const handleSelect = useCallback(
      (optionValue: string) => {
        if (multiple) {
          const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
          const newValues = currentValues.includes(optionValue)
            ? currentValues.filter(v => v !== optionValue)
            : [...currentValues, optionValue];
          
          setSelectedValue(newValues);
          onValueChange?.(newValues);
        } else {
          setSelectedValue(optionValue);
          onValueChange?.(optionValue);
          setIsOpen(false);
        }
        
        setSearchTerm('');
        setFocusedIndex(-1);
      },
      [multiple, selectedValue, onValueChange]
    );

    // Handle clear
    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        const newValue = multiple ? [] : '';
        setSelectedValue(newValue);
        onValueChange?.(newValue);
        setSearchTerm('');
      },
      [multiple, onValueChange]
    );

    // Type-ahead functionality
    const handleTypeAhead = useCallback(
      (char: string) => {
        if (typeAheadTimeout) {
          clearTimeout(typeAheadTimeout);
        }

        const newBuffer = typeAheadBuffer + char.toLowerCase();
        setTypeAheadBuffer(newBuffer);

        // Find matching option
        const matchingIndex = filteredOptions.findIndex(option =>
          option.label.toLowerCase().startsWith(newBuffer) && !option.disabled
        );

        if (matchingIndex >= 0) {
          setFocusedIndex(matchingIndex);
        }

        // Clear buffer after delay
        const timeout = setTimeout(() => {
          setTypeAheadBuffer('');
        }, 1000);
        setTypeAheadTimeout(timeout);
      },
      [typeAheadBuffer, filteredOptions, typeAheadTimeout]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
              const option = filteredOptions[focusedIndex];
              if (!option.disabled) {
                handleSelect(option.value);
              }
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else {
              let nextIndex = focusedIndex + 1;
              while (nextIndex < filteredOptions.length && filteredOptions[nextIndex]?.disabled) {
                nextIndex++;
              }
              setFocusedIndex(nextIndex < filteredOptions.length ? nextIndex : focusedIndex);
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (isOpen) {
              let prevIndex = focusedIndex - 1;
              while (prevIndex >= 0 && filteredOptions[prevIndex]?.disabled) {
                prevIndex--;
              }
              setFocusedIndex(prevIndex >= 0 ? prevIndex : focusedIndex);
            }
            break;
          case 'Escape':
            setIsOpen(false);
            setFocusedIndex(-1);
            setSearchTerm('');
            break;
          case 'Tab':
            setIsOpen(false);
            break;
          default:
            // Type-ahead for non-searchable selects
            if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              handleTypeAhead(e.key);
            }
            break;
        }
      },
      [disabled, isOpen, focusedIndex, filteredOptions, handleSelect, handleTypeAhead, searchable]
    );

    // Handle click outside
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus search input when opened
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    }, [isOpen, searchable]);

    // Cleanup type-ahead timeout
    useEffect(() => {
      return () => {
        if (typeAheadTimeout) {
          clearTimeout(typeAheadTimeout);
        }
      };
    }, [typeAheadTimeout]);

    const hasError = !!errorMessage;
    const hasSelection = multiple 
      ? Array.isArray(selectedValue) && selectedValue.length > 0
      : selectedValue !== '';

    // Build aria-label
    const computedAriaLabel = ariaLabel || 
      (selectedOptions.length > 0 ? `Selected: ${selectedOptions.map(o => o.label).join(', ')}` : placeholder);

    return (
      <div className="w-full">
        {/* Hidden input for form integration */}
        {name && (
          <input
            ref={hiddenInputRef}
            type="hidden"
            name={name}
            value={multiple ? JSON.stringify(selectedValue) : selectedValue as string}
          />
        )}

        {/* Label */}
        {label && (
          <label
            id={labelId}
            htmlFor={selectId}
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            {label}
          </label>
        )}

        {/* Select Container */}
        <div ref={selectRef} className="relative">
          <div
            ref={ref}
            id={selectId}
            className={cn(selectVariants({ variant, size, hasError }), className)}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={isOpen ? listboxId : undefined}
            aria-labelledby={label ? labelId : undefined}
            aria-label={computedAriaLabel}
            aria-invalid={hasError}
            aria-describedby={
              errorMessage ? errorId : helperText ? helperId : undefined
            }
            aria-activedescendant={
              isOpen && focusedIndex >= 0 ? `${selectId}-option-${focusedIndex}` : undefined
            }
            {...props}
          >
            {/* Selected Value Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {selectedOptions.length > 0 ? (
                  multiple ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedOptions.slice(0, 2).map((option) => (
                        <span
                          key={option.value}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/10 text-primary-500 rounded text-xs"
                        >
                          {option.icon && <span className="w-3 h-3">{option.icon}</span>}
                          {option.label}
                        </span>
                      ))}
                      {selectedOptions.length > 2 && (
                        <span className="inline-flex items-center px-2 py-1 bg-background-tertiary text-text-tertiary rounded text-xs">
                          +{selectedOptions.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      {selectedOptions[0].icon && (
                        <div className="flex-shrink-0 text-text-secondary">
                          {selectedOptions[0].icon}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">
                          {selectedOptions[0].label}
                        </div>
                        {selectedOptions[0].description && (
                          <div className="text-xs text-text-tertiary truncate">
                            {selectedOptions[0].description}
                          </div>
                        )}
                      </div>
                    </>
                  )
                ) : (
                  <span className="text-text-tertiary">{placeholder}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {clearable && hasSelection && !disabled && (
                  <motion.button
                    onClick={handleClear}
                    className="p-1 hover:bg-background-secondary rounded"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Clear selection"
                  >
                    <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                )}

                {/* Dropdown Arrow */}
                <motion.div
                  className="text-text-tertiary"
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  'absolute top-full left-0 right-0 mt-2 z-50',
                  'bg-card-background border border-border-color rounded-lg shadow-lg',
                  'overflow-hidden',
                  dropdownClassName
                )}
              >
                {/* Search Input */}
                {searchable && (
                  <div className="p-3 border-b border-border-color/50">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search options..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(
                        'w-full px-3 py-2 text-sm',
                        'bg-background-tertiary border border-border-color rounded-md',
                        'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50',
                        'placeholder:text-text-tertiary'
                      )}
                    />
                  </div>
                )}

                {/* Options List */}
                <div
                  id={listboxId}
                  role="listbox"
                  aria-labelledby={labelId}
                  aria-multiselectable={multiple}
                  className="overflow-y-auto"
                  style={{ maxHeight }}
                >
                  {filteredOptions.length === 0 ? (
                    <div className="px-3 py-8 text-center text-text-tertiary">
                      No options found
                    </div>
                  ) : (
                    <>
                      {/* Ungrouped Options */}
                      {groupedOptions.ungrouped.map((option, index) => (
                        <OptionItem
                          key={option.value}
                          option={option}
                          isSelected={multiple 
                            ? Array.isArray(selectedValue) && selectedValue.includes(option.value)
                            : option.value === selectedValue
                          }
                          isFocused={index === focusedIndex}
                          onSelect={handleSelect}
                          multiple={multiple}
                          optionId={`${selectId}-option-${index}`}
                        />
                      ))}

                      {/* Grouped Options */}
                      {Object.entries(groupedOptions.groups).map(([groupName, groupOptions]) => (
                        <div key={groupName}>
                          <div className="px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider bg-background-tertiary/50">
                            {groupName}
                          </div>
                          {groupOptions.map((option, index) => {
                            const globalIndex = groupedOptions.ungrouped.length + 
                              Object.entries(groupedOptions.groups)
                                .slice(0, Object.keys(groupedOptions.groups).indexOf(groupName))
                                .reduce((acc, [, opts]) => acc + opts.length, 0) + index;
                            
                            return (
                              <OptionItem
                                key={option.value}
                                option={option}
                                isSelected={multiple 
                                  ? Array.isArray(selectedValue) && selectedValue.includes(option.value)
                                  : option.value === selectedValue
                                }
                                isFocused={globalIndex === focusedIndex}
                                onSelect={handleSelect}
                                multiple={multiple}
                                optionId={`${selectId}-option-${globalIndex}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Helper Text / Error */}
        {(errorMessage || helperText) && (
          <div className="mt-2">
            {errorMessage && (
              <p id={errorId} className="text-sm text-error" role="alert">
                {errorMessage}
              </p>
            )}
            {helperText && !errorMessage && (
              <p id={helperId} className="text-sm text-text-tertiary">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Option Item Component
interface OptionItemProps {
  option: SelectOption;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: (value: string) => void;
  multiple: boolean;
  optionId: string;
}

const OptionItem = React.memo<OptionItemProps>(
  ({ option, isSelected, isFocused, onSelect, multiple, optionId }) => {
    const handleClick = useCallback(() => {
      if (!option.disabled) {
        onSelect(option.value);
      }
    }, [option.disabled, option.value, onSelect]);

    return (
      <motion.div
        id={optionId}
        variants={optionVariants}
        initial="rest"
        animate={isSelected ? 'selected' : isFocused ? 'hover' : 'rest'}
        className={cn(
          'px-3 py-2 cursor-pointer flex items-center gap-3',
          'transition-colors duration-150',
          option.disabled && 'opacity-50 cursor-not-allowed',
          isSelected && 'bg-background-secondary text-primary-500',
          isFocused && !isSelected && 'bg-background-secondary'
        )}
        onClick={handleClick}
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled}
      >
        {multiple && (
          <div className={cn(
            'w-4 h-4 border border-current rounded flex items-center justify-center',
            isSelected && 'bg-primary-500 border-primary-500'
          )}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}

        {option.icon && (
          <div className="flex-shrink-0 text-text-secondary">
            {option.icon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium">{option.label}</div>
          {option.description && (
            <div className="text-xs text-text-tertiary truncate">
              {option.description}
            </div>
          )}
        </div>

        {!multiple && isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0 text-primary-500"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        )}
      </motion.div>
    );
  }
);

OptionItem.displayName = 'OptionItem';

export { Select as default };