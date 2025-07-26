'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';

const buttonVariants = cva(
  // Base styles - shared across all variants
  [
    'inline-flex items-center justify-center', // Fixed: justify-center not justify-content-center
    'font-medium text-center relative overflow-hidden',
    'transition-all duration-200 ease-out',
    'cursor-pointer select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'group',
  ],
  {
    variants: {
      variant: {
        // Primary - gradient background for main actions
        primary: [
          'bg-gradient-to-r from-primary-600 to-primary-700',
          'text-white shadow-lg',
          'hover:from-primary-500 hover:to-primary-600',
          'hover:shadow-xl hover:shadow-primary-500/25',
          'hover:-translate-y-0.5',
          'active:translate-y-0 active:shadow-lg',
          'border border-primary-500/50',
          'with-overlay-effect', // Custom class for overlay handling
        ],
        
        // Secondary - outlined style for secondary actions
        secondary: [
          'bg-transparent border border-border-color',
          'text-text-primary hover:text-white',
          'hover:bg-card-background-hover hover:border-border-color-hover',
          'hover:-translate-y-0.5 hover:shadow-md',
          'active:translate-y-0',
        ],
        
        // Ghost - minimal style for subtle actions
        ghost: [
          'bg-transparent border-none',
          'text-text-primary hover:text-white',
          'hover:bg-card-background',
          'hover:-translate-y-0.5',
          'active:translate-y-0',
        ],
        
        // Glass - glassmorphism effect for premium feel
        glass: [
          'bg-glass-bg backdrop-blur-md',
          'text-text-primary hover:text-white',
          'hover:bg-glass-hover-bg',
          'hover:-translate-y-0.5',
          'shadow-glass',
          'with-glass-shine', // Custom class for glass shine
          '!border-none',
        ],
        
        // Success - for positive actions like "Confirm"
        success: [
          'bg-gradient-to-r from-success to-success-light',
          'text-white shadow-lg',
          'hover:from-success-dark hover:to-success',
          'hover:shadow-xl hover:shadow-success/25',
          'hover:-translate-y-0.5',
          'border border-success/50',
          'with-overlay-effect',
        ],
        
        // Error - for destructive actions
        error: [
          'bg-gradient-to-r from-error to-error-light',
          'text-white shadow-lg',
          'hover:from-error-dark hover:to-error',
          'hover:shadow-xl hover:shadow-error/25',
          'hover:-translate-y-0.5',
          'border border-error/50',
          'with-overlay-effect',
        ],
        
        // Warning - for testnet/caution actions
        warning: [
          'bg-gradient-to-r from-warning to-orange-500',
          'text-white shadow-lg',
          'hover:from-orange-600 hover:to-warning',
          'hover:shadow-xl hover:shadow-warning/25',
          'hover:-translate-y-0.5',
          'border border-warning/50',
          'with-overlay-effect',
        ],
      },
      
      size: {
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-sm rounded-lg',
        lg: 'h-12 px-6 text-base rounded-lg',
        xl: 'h-14 px-8 text-lg rounded-xl',
        icon: 'h-10 w-10 rounded-lg',
      },
      
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
      
      loading: {
        true: 'cursor-wait',
        false: '',
      },
    },
    
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
    },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'size'>,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

const LoadingSpinner = ({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <motion.div
      className={cn('border-2 border-current border-t-transparent rounded-full', sizeClasses[size])}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      asChild = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const spinnerSize = size === 'sm' ? 'sm' : size === 'lg' || size === 'xl' ? 'lg' : 'md';
    
    // Animation variants for programmatic control
    const animationVariants = {
      idle: { scale: 1, y: 0 },
      hover: isDisabled ? {} : { scale: 1.02, y: -2 },
      tap: isDisabled ? {} : { scale: 0.98, y: 0 },
    };

    const buttonClass = cn(buttonVariants({ variant, size, fullWidth, loading }), className);
    
    // Determine if this variant should have overlay effects
    const hasOverlay = buttonClass.includes('with-overlay-effect');
    const hasGlassShine = buttonClass.includes('with-glass-shine');

    const buttonContent = (
      <>
        {/* Loading state */}
        {loading && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <LoadingSpinner size={spinnerSize} />
            {loadingText && <span>{loadingText}</span>}
          </motion.div>
        )}

        {/* Normal state */}
        {!loading && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {leftIcon && (
              <motion.span
                className="inline-flex"
                whileHover={!isDisabled ? { scale: 1.1 } : undefined}
                transition={{ duration: 0.2 }}
              >
                {leftIcon}
              </motion.span>
            )}
            
            {children && <span>{children}</span>}
            
            {rightIcon && (
              <motion.span
                className="inline-flex"
                whileHover={!isDisabled ? { scale: 1.1 } : undefined}
                transition={{ duration: 0.2 }}
              >
                {rightIcon}
              </motion.span>
            )}
          </motion.div>
        )}

        {/* Gradient overlay for enhanced hover effect - controlled by variant */}
        {hasOverlay && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-inherit pointer-events-none"
            initial={false}
          />
        )}
        
        {/* Glass shine effect - controlled by variant */}
        {hasGlassShine && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-inherit pointer-events-none"
            initial={false}
          />
        )}

        {/* Ripple effect container */}
        <div className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-white/10 rounded-full scale-0"
            whileTap={!isDisabled ? { scale: 4, opacity: [0.3, 0] } : undefined}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </>
    );

    if (asChild) {
      // Filter out all Framer Motion props when using asChild
      const motionProps = [
        'style', 'initial', 'animate', 'whileHover', 'whileTap', 'variants', 'transition',
        'onDrag', 'onDragStart', 'onDragEnd', 'dragConstraints', 'dragSnapToOrigin',
        'onAnimationStart', 'onAnimationComplete', 'onUpdate', 'onTap', 'onTapStart', 'onTapCancel',
        'onHoverStart', 'onHoverEnd', 'onFocus', 'onBlur', 'onPan', 'onPanStart', 'onPanEnd',
        'transformTemplate', 'custom'
      ];
      
      const slotProps = Object.fromEntries(
        Object.entries(props).filter(([key]) => !motionProps.includes(key))
      );
      
      return (
        <Slot
          ref={ref}
          className={buttonClass}
          aria-busy={loading ? 'true' : undefined}
          aria-disabled={isDisabled}
          data-loading={loading}
          data-disabled={isDisabled}
          {...slotProps}
        >
          {buttonContent}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        type={type}
        className={buttonClass}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : undefined}
        data-loading={loading}
        variants={animationVariants}
        initial="idle"
        animate="idle"
        whileHover="hover"
        whileTap="tap"
        transition={{ duration: 0.2, ease: 'easeOut' }}
        {...props}
      >
        {buttonContent}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };