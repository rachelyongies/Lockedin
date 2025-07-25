'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';

const skeletonVariants = cva(
  [
    'bg-background-tertiary',
    'relative overflow-hidden',
  ],
  {
    variants: {
      variant: {
        default: 'animate-pulse',
        shimmer: [
          'bg-gradient-to-r from-background-tertiary via-background-secondary/50 to-background-tertiary',
          'bg-[length:200%_100%]',
          'animate-skeleton-shimmer',
        ],
        wave: [
          'bg-background-tertiary',
          'before:absolute before:inset-0',
          'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
          'before:animate-skeleton-wave',
          'before:translate-x-[-100%]',
        ],
        static: '', // No animation
      },
      shape: {
        rectangle: 'rounded-md',
        circle: 'rounded-full',
        pill: 'rounded-full',
        text: 'rounded-sm',
        card: 'rounded-lg',
      },
      size: {
        xs: 'h-3',
        sm: 'h-4', 
        md: 'h-5',
        lg: 'h-6',
        xl: 'h-8',
        '2xl': 'h-10',
      },
      width: {
        auto: 'w-auto',
        full: 'w-full',
        '1/2': 'w-1/2',
        '1/3': 'w-1/3',
        '2/3': 'w-2/3',
        '1/4': 'w-1/4',
        '3/4': 'w-3/4',
        '8': 'w-8',
        '12': 'w-12',
        '16': 'w-16',
        '20': 'w-20',
        '24': 'w-24',
        '32': 'w-32',
        '40': 'w-40',
        '48': 'w-48',
        '64': 'w-64',
        '80': 'w-80',
      },
    },
    defaultVariants: {
      variant: 'default',
      shape: 'rectangle',
      size: 'md',
      width: 'full',
    },
  }
);

export interface SkeletonProps extends VariantProps<typeof skeletonVariants> {
  className?: string;
  customWidth?: string | number;
  customHeight?: string | number;
  lines?: number;
  spacing?: 'tight' | 'normal' | 'loose';
  'aria-label'?: string;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant, 
    shape, 
    size, 
    width,
    customWidth, 
    customHeight, 
    lines = 1, 
    spacing = 'normal',
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    const spacingClasses = {
      tight: 'space-y-1',
      normal: 'space-y-2', 
      loose: 'space-y-4',
    };

    // Build inline styles only when needed
    const inlineStyles: React.CSSProperties = {};
    if (customWidth) inlineStyles.width = customWidth;
    if (customHeight) inlineStyles.height = customHeight;
    const hasInlineStyles = Object.keys(inlineStyles).length > 0;

    // For multiple lines, render a container with multiple skeleton elements
    if (lines > 1) {
      return (
        <div 
          className={cn(spacingClasses[spacing], className)} 
          ref={ref} 
          role="status"
          aria-busy="true"
          aria-label={ariaLabel || `Loading ${lines} lines of content`}
          {...props}
        >
          {Array.from({ length: lines }, (_, index) => (
            <div
              key={index}
              className={cn(
                skeletonVariants({ 
                  variant, 
                  shape, 
                  size, 
                  width: index === lines - 1 ? '3/4' : width // Last line is shorter
                })
              )}
              style={hasInlineStyles ? inlineStyles : undefined}
              aria-hidden="true"
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, shape, size, width }), className)}
        style={hasInlineStyles ? inlineStyles : undefined}
        role="status"
        aria-busy="true"
        aria-label={ariaLabel || 'Loading content'}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Specialized skeleton components for common DeFi UI patterns
export const TokenSkeleton = React.forwardRef<HTMLDivElement, 
  Omit<SkeletonProps, 'shape' | 'lines'> & { showBalance?: boolean }
>(({ className, showBalance = true, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn('flex items-center gap-3', className)} 
    role="status"
    aria-busy="true"
    aria-label="Loading token information"
    {...props}
  >
    <Skeleton shape="circle" size="lg" width="auto" customWidth={40} customHeight={40} aria-label="Token logo" />
    <div className="flex-1 space-y-1">
      <Skeleton shape="text" width="2/3" aria-label="Token name" />
      {showBalance && <Skeleton shape="text" width="1/2" size="sm" aria-label="Token balance" />}
    </div>
  </div>
));

TokenSkeleton.displayName = 'TokenSkeleton';

export const PriceSkeleton = React.forwardRef<HTMLDivElement,
  Omit<SkeletonProps, 'shape' | 'lines'> & { currency?: boolean; large?: boolean }
>(({ className, currency = true, large = false, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn('flex items-baseline gap-1', className)} 
    role="status"
    aria-busy="true"
    aria-label="Loading price"
    {...props}
  >
    {currency && <Skeleton shape="text" width="auto" customWidth={8} size={large ? 'lg' : 'md'} aria-label="Currency symbol" />}
    <Skeleton shape="text" width="20" size={large ? 'xl' : 'lg'} variant="shimmer" aria-label="Price value" />
  </div>
));

PriceSkeleton.displayName = 'PriceSkeleton';

export const BalanceSkeleton = React.forwardRef<HTMLDivElement,
  Omit<SkeletonProps, 'shape' | 'lines'>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn('space-y-1', className)} 
    role="status"
    aria-busy="true"
    aria-label="Loading balance information"
    {...props}
  >
    <Skeleton shape="text" width="full" size="xl" variant="shimmer" aria-label="Balance amount" />
    <Skeleton shape="text" width="2/3" size="sm" aria-label="USD value" />
  </div>
));

BalanceSkeleton.displayName = 'BalanceSkeleton';

export const TransactionSkeleton = React.forwardRef<HTMLDivElement,
  Omit<SkeletonProps, 'shape' | 'lines'>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn('space-y-3', className)} 
    role="status"
    aria-busy="true"
    aria-label="Loading transaction details"
    {...props}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" size="md" width="auto" customWidth={32} customHeight={32} aria-label="Transaction type" />
        <div className="space-y-1">
          <Skeleton shape="text" width="32" aria-label="Transaction description" />
          <Skeleton shape="text" width="20" size="sm" aria-label="Transaction time" />
        </div>
      </div>
      <div className="text-right space-y-1">
        <Skeleton shape="text" width="24" aria-label="Transaction amount" />
        <Skeleton shape="text" width="16" size="sm" aria-label="Transaction status" />
      </div>
    </div>
  </div>
));

TransactionSkeleton.displayName = 'TransactionSkeleton';

export const CardSkeleton = React.forwardRef<HTMLDivElement,
  Omit<SkeletonProps, 'shape'> & { 
    header?: boolean; 
    footer?: boolean; 
    title?: string;
  }
>(({ className, header = true, footer = false, lines = 3, title, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 space-y-4 bg-card-background border border-border-color rounded-lg', className)}
    role="status"
    aria-busy="true"
    aria-label={title ? `Loading ${title}` : 'Loading card content'}
    {...props}
  >
    {header && (
      <div className="space-y-2">
        <Skeleton shape="text" width="1/2" size="lg" aria-label="Card title" />
        <Skeleton shape="text" width="3/4" size="sm" aria-label="Card description" />
      </div>
    )}
    
    <div className="space-y-3">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          shape="text"
          width={index === lines - 1 ? '3/4' : 'full'}
          aria-label={`Content line ${index + 1}`}
        />
      ))}
    </div>

    {footer && (
      <div className="flex gap-2 pt-2">
        <Skeleton shape="pill" width="20" size="lg" aria-label="Action button" />
        <Skeleton shape="pill" width="24" size="lg" aria-label="Secondary button" />
      </div>
    )}
  </div>
));

CardSkeleton.displayName = 'CardSkeleton';

// Table skeleton for transaction lists
export const TableSkeleton = React.forwardRef<HTMLDivElement,
  Omit<SkeletonProps, 'shape' | 'lines'> & { 
    rows?: number; 
    columns?: number;
    headers?: string[];
  }
>(({ className, rows = 5, columns = 4, headers, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn('space-y-3', className)} 
    role="status"
    aria-busy="true"
    aria-label="Loading table data"
    {...props}
  >
    {/* Header */}
    <div className="flex gap-4 pb-2 border-b border-border-color/50">
      {Array.from({ length: columns }, (_, index) => (
        <Skeleton
          key={`header-${index}`}
          shape="text"
          width={index === 0 ? '32' : '20'}
          size="sm"
          className="flex-1"
          aria-label={headers?.[index] || `Column ${index + 1} header`}
        />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex gap-4 items-center py-2">
        {Array.from({ length: columns }, (_, colIndex) => (
          <Skeleton
            key={`cell-${rowIndex}-${colIndex}`}
            shape="text"
            width={colIndex === 0 ? '32' : '20'}
            className="flex-1"
            aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}`}
          />
        ))}
      </div>
    ))}
  </div>
));

TableSkeleton.displayName = 'TableSkeleton';