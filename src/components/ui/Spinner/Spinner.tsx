'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';
import { motion } from 'framer-motion';

const spinnerVariants = cva(
  [
    'animate-spin rounded-full border-solid',
    'inline-block',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-border-color',
          'border-t-primary-500',
        ],
        primary: [
          'border-primary-500/20',
          'border-t-primary-500',
        ],
        secondary: [
          'border-text-tertiary/20',
          'border-t-text-secondary',
        ],
        success: [
          'border-success/20',
          'border-t-success',
        ],
        error: [
          'border-error/20',
          'border-t-error',
        ],
        gradient: [
          'border-transparent',
          'bg-gradient-to-r from-primary-500 to-accent-500',
          '[mask:conic-gradient(transparent_0deg,black_360deg)]',
        ],
        dots: [
          'border-none',
          'bg-transparent',
        ],
      },
      size: {
        xs: 'w-3 h-3 border-[1.5px]',
        sm: 'w-4 h-4 border-2',
        md: 'w-6 h-6 border-2',
        lg: 'w-8 h-8 border-[3px]',
        xl: 'w-12 h-12 border-4',
        '2xl': 'w-16 h-16 border-4',
      },
      speed: {
        slow: 'animate-[spin_2s_linear_infinite]',
        normal: 'animate-[spin_1s_linear_infinite]',
        fast: 'animate-[spin_0.5s_linear_infinite]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      speed: 'normal',
    },
  }
);

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
  label?: string;
}

// CSS-based dots animation for performance
const DotsSpinner = React.forwardRef<HTMLDivElement, 
  { size?: SpinnerProps['size']; className?: string; label?: string }
>(({ size = 'md', className, label }, ref) => {
  const currentSize = size || 'md';
  const dotSize = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5', 
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3',
    '2xl': 'w-4 h-4',
  }[currentSize];

  return (
    <div
      ref={ref}
      className={cn('flex items-center justify-center gap-1', className)}
      role="status"
      aria-label={label || 'Loading'}
    >
      <style jsx>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        .dot-1 { animation: pulse-dot 1.4s infinite ease-in-out; animation-delay: 0s; }
        .dot-2 { animation: pulse-dot 1.4s infinite ease-in-out; animation-delay: 0.2s; }
        .dot-3 { animation: pulse-dot 1.4s infinite ease-in-out; animation-delay: 0.4s; }
        .dots-container:hover .dot-1,
        .dots-container:hover .dot-2,
        .dots-container:hover .dot-3 {
          animation-duration: 0.8s;
        }
      `}</style>
      <div className="dots-container flex gap-1">
        <div className={cn('rounded-full bg-primary-500 dot-1', dotSize)} />
        <div className={cn('rounded-full bg-primary-500 dot-2', dotSize)} />
        <div className={cn('rounded-full bg-primary-500 dot-3', dotSize)} />
      </div>
    </div>
  );
});

DotsSpinner.displayName = 'DotsSpinner';

// Enhanced motion dots for special interactions
const MotionDotsSpinner = React.forwardRef<HTMLDivElement,
  { size?: SpinnerProps['size']; className?: string; label?: string; interactive?: boolean }
>(({ size = 'md', className, label, interactive = false }, ref) => {
  const currentSize = size || 'md';
  const dotSize = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2', 
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3',
    '2xl': 'w-4 h-4',
  }[currentSize];

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
        repeat: Infinity,
        repeatType: 'loop' as const,
      },
    },
    hover: interactive ? {
      transition: {
        staggerChildren: 0.1,
        repeat: Infinity,
        repeatType: 'loop' as const,
      },
    } : {},
  };

  const dotVariants = {
    animate: {
      opacity: [0.3, 1, 0.3],
      scale: [0.8, 1, 0.8],
      transition: {
        duration: 1.4,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
    hover: interactive ? {
      opacity: [0.3, 1, 0.3],
      scale: [0.8, 1.2, 0.8],
      backgroundColor: ['#667eea', '#764ba2', '#667eea'],
      transition: {
        duration: 0.8,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    } : {},
  };

  return (
    <motion.div
      ref={ref}
      className={cn('flex items-center justify-center gap-1', className)}
      role="status"
      aria-label={label || 'Loading'}
      variants={containerVariants}
      animate="animate"
      whileHover={interactive ? "hover" : undefined}
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn('rounded-full bg-primary-500', dotSize)}
          variants={dotVariants}
        />
      ))}
    </motion.div>
  );
});

MotionDotsSpinner.displayName = 'MotionDotsSpinner';

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, variant, size, speed, label, ...props }, ref) => {
    // Use CSS-based dots for better performance
    if (variant === 'dots') {
      return (
        <DotsSpinner
          ref={ref}
          size={size}
          className={className}
          label={label}
          {...props}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          spinnerVariants({ variant, size, speed }),
          className
        )}
        role="status"
        aria-label={label || 'Loading'}
        {...props}
      />
    );
  }
);

Spinner.displayName = 'Spinner';

// Specialized loading indicators for DeFi contexts
export const TransactionSpinner = React.forwardRef<HTMLDivElement, 
  Omit<SpinnerProps, 'variant'> & { status?: 'pending' | 'confirming' | 'confirmed' }
>(({ status = 'pending', className, ...props }, ref) => {
  const statusConfig = {
    pending: { variant: 'primary' as const, speed: 'normal' as const },
    confirming: { variant: 'gradient' as const, speed: 'fast' as const },
    confirmed: { variant: 'success' as const, speed: 'slow' as const },
  };

  const config = statusConfig[status];

  return (
    <Spinner
      ref={ref}
      variant={config.variant}
      speed={config.speed}
      className={className}
      label={`Transaction ${status}`}
      {...props}
    />
  );
});

TransactionSpinner.displayName = 'TransactionSpinner';

export const WalletSpinner = React.forwardRef<HTMLDivElement, Omit<SpinnerProps, 'variant'>>(
  (props, ref) => (
    <Spinner
      ref={ref}
      variant="gradient"
      speed="normal"
      label="Connecting wallet"
      {...props}
    />
  )
);

WalletSpinner.displayName = 'WalletSpinner';

export const PriceSpinner = React.forwardRef<HTMLDivElement, Omit<SpinnerProps, 'variant'>>(
  (props, ref) => (
    <Spinner
      ref={ref}
      variant="dots"
      size="sm"
      label="Fetching price"
      {...props}
    />
  )
);

PriceSpinner.displayName = 'PriceSpinner';

// Export enhanced motion dots for special use cases
export { MotionDotsSpinner };