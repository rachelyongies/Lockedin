'use client';

import React, { useCallback, useId } from 'react';
import { motion, Variants } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';

const toggleVariants = cva(
  [
    'relative inline-flex items-center',
    'rounded-full border-2 border-transparent',
    'transition-colors duration-200 ease-in-out',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'cursor-pointer',
  ],
  {
    variants: {
      variant: {
        default: [
          'data-[state=checked]:bg-primary-500',
          'data-[state=unchecked]:bg-background-tertiary',
        ],
        success: [
          'data-[state=checked]:bg-success',
          'data-[state=unchecked]:bg-background-tertiary',
        ],
        warning: [
          'data-[state=checked]:bg-warning',
          'data-[state=unchecked]:bg-background-tertiary',
        ],
        error: [
          'data-[state=checked]:bg-error',
          'data-[state=unchecked]:bg-background-tertiary',
        ],
        glass: [
          'data-[state=checked]:bg-primary-500/80 data-[state=checked]:backdrop-blur-md',
          'data-[state=unchecked]:bg-glass-bg data-[state=unchecked]:backdrop-blur-md',
          'data-[state=unchecked]:border-glass-border',
        ],
      },
      size: {
        sm: 'h-5 w-9 p-0.5',
        md: 'h-6 w-11 p-0.5',
        lg: 'h-7 w-12 p-0.5', 
        xl: 'h-8 w-14 p-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const thumbVariants = cva(
  [
    'pointer-events-none inline-block rounded-full bg-white shadow-lg',
    'ring-0 transition-transform ease-in-out duration-200',
  ],
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
        xl: 'h-6 w-6', // Slightly smaller for xl to maintain proportions
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// Calculate thumb translation distances based on container and thumb sizes
const getThumbTranslation = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
  const translations = {
    sm: 16, // 36px container - 16px thumb - 4px padding = 16px
    md: 20, // 44px container - 20px thumb - 4px padding = 20px  
    lg: 22, // 48px container - 24px thumb - 4px padding = 20px, but accounting for visual balance
    xl: 24, // 56px container - 24px thumb - 8px padding = 24px
  };
  return translations[size];
};

// Animation variants for the thumb
const createThumbAnimationVariants = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md'): Variants => ({
  checked: {
    x: getThumbTranslation(size),
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
    },
  },
  unchecked: {
    x: 0,
    transition: {
      type: 'spring', 
      stiffness: 500,
      damping: 30,
    },
  },
});

export interface ToggleProps extends VariantProps<typeof toggleVariants> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  id?: string;
  name?: string; // For form integration
  value?: string; // For form integration
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      className,
      label,
      description,
      variant,
      size = 'md',
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      id,
      name,
      value,
      ...props
    },
    ref
  ) => {
    // Handle controlled vs uncontrolled state
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const checked = isControlled ? controlledChecked : internalChecked;

    // SSR-safe ID generation
    const reactId = useId();
    const toggleId = id || `toggle-${reactId}`;
    const labelId = `${toggleId}-label`;
    const descriptionId = `${toggleId}-description`;

    // Get animation variants for current size
    const thumbAnimationVariants = React.useMemo(
      () => createThumbAnimationVariants(size || 'md'),
      [size]
    );

    // Handle toggle
    const handleToggle = useCallback(() => {
      if (disabled) return;

      const newChecked = !checked;
      
      if (!isControlled) {
        setInternalChecked(newChecked);
      }
      
      onCheckedChange?.(newChecked);
    }, [checked, disabled, isControlled, onCheckedChange]);

    // Handle keyboard events
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleToggle();
        }
      },
      [handleToggle]
    );

    return (
      <div className="flex items-center">
        {/* Hidden input for form integration */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={value || (checked ? 'true' : 'false')}
          />
        )}

        <motion.button
          ref={ref}
          id={toggleId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy || (label ? labelId : undefined)}
          aria-describedby={ariaDescribedBy || (description ? descriptionId : undefined)}
          disabled={disabled}
          className={cn(toggleVariants({ variant, size }), className)}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          data-state={checked ? 'checked' : 'unchecked'}
          {...props}
        >
          {/* Thumb */}
          <motion.span
            className={cn(thumbVariants({ size }))}
            variants={thumbAnimationVariants}
            animate={checked ? 'checked' : 'unchecked'}
          >
            {/* Optional icons for checked/unchecked states */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: checked ? 1 : 0,
                scale: checked ? 1 : 0.8,
              }}
              transition={{ duration: 0.15 }}
            >
              {variant === 'success' && checked && (
                <svg className="w-2.5 h-2.5 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {variant === 'error' && checked && (
                <svg className="w-2.5 h-2.5 text-error" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </motion.div>
          </motion.span>
        </motion.button>

        {/* Label and Description */}
        {(label || description) && (
          <div className="ml-3">
            {label && (
              <label
                id={labelId}
                htmlFor={toggleId}
                className="text-sm font-medium text-text-primary cursor-pointer select-none"
              >
                {label}
              </label>
            )}
            {description && (
              <p
                id={descriptionId}
                className="text-xs text-text-tertiary mt-1"
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

// Compound component for toggle groups
export interface ToggleGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'tight' | 'normal' | 'loose';
  label?: string;
  description?: string;
}

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (
    {
      children,
      className,
      orientation = 'vertical',
      spacing = 'normal',
      label,
      description,
      ...props
    },
    ref
  ) => {
    const groupId = useId();
    const labelId = `${groupId}-label`;

    const spacingClasses = {
      tight: orientation === 'horizontal' ? 'gap-2' : 'space-y-2',
      normal: orientation === 'horizontal' ? 'gap-4' : 'space-y-4',
      loose: orientation === 'horizontal' ? 'gap-6' : 'space-y-6',
    };

    return (
      <div ref={ref} className={className} {...props}>
        {label && (
          <div className="mb-4">
            <h3 id={labelId} className="text-sm font-medium text-text-primary">
              {label}
            </h3>
            {description && (
              <p className="text-xs text-text-tertiary mt-1">
                {description}
              </p>
            )}
          </div>
        )}
        
        <div
          className={cn(
            orientation === 'horizontal' ? 'flex flex-wrap items-center' : 'space-y-0',
            spacingClasses[spacing]
          )}
          role="group"
          aria-labelledby={label ? labelId : undefined}
        >
          {children}
        </div>
      </div>
    );
  }
);

ToggleGroup.displayName = 'ToggleGroup';

// Specialized toggles for common DeFi use cases
export const SlippageToggle = React.forwardRef<HTMLButtonElement,
  Omit<ToggleProps, 'variant' | 'label'> & { 
    slippageValue?: number;
    label?: string;
  }
>(({ slippageValue, label = 'Auto Slippage', ...props }, ref) => (
  <Toggle
    ref={ref}
    variant="default"
    label={label}
    description={slippageValue ? `Current: ${slippageValue}%` : 'Automatically set optimal slippage'}
    {...props}
  />
));

SlippageToggle.displayName = 'SlippageToggle';

export const ExpertModeToggle = React.forwardRef<HTMLButtonElement,
  Omit<ToggleProps, 'variant' | 'label'>
>(({ ...props }, ref) => (
  <Toggle
    ref={ref}
    variant="warning"
    label="Expert Mode"
    description="Disable transaction confirmations and enable high slippage trades"
    {...props}
  />
));

ExpertModeToggle.displayName = 'ExpertModeToggle';

export const DarkModeToggle = React.forwardRef<HTMLButtonElement,
  Omit<ToggleProps, 'variant' | 'label'>
>(({ ...props }, ref) => (
  <Toggle
    ref={ref}
    variant="default"
    label="Dark Mode"
    description="Switch between light and dark theme"
    {...props}
  />
));

DarkModeToggle.displayName = 'DarkModeToggle';

export { Toggle as default };