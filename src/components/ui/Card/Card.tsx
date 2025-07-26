'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';
import { motion, HTMLMotionProps, useReducedMotion } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';

// Elevation tokens
const elevationTokens = {
  none: '',
  sm: 'shadow-sm hover:shadow-md',
  md: 'shadow-md hover:shadow-lg',
  lg: 'shadow-lg hover:shadow-xl',
  xl: 'shadow-xl hover:shadow-2xl',
} as const;

// Overlay effects abstraction
const OverlayEffects = ({ variant }: { variant?: string }) => {
  switch (variant) {
    case 'glass':
      return (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit] pointer-events-none"
          initial={false}
          aria-hidden="true"
        />
      );
    case 'gradient':
      return (
        <div 
          className="absolute inset-0 rounded-[inherit] bg-gradient-to-r from-primary-600 to-primary-700 opacity-10 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" 
          aria-hidden="true"
        />
      );
    case 'elevated':
    case 'interactive':
      return (
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit] pointer-events-none"
          initial={false}
          aria-hidden="true"
        />
      );
    default:
      return null;
  }
};

const cardVariants = cva(
  // Base styles
  [
    'relative overflow-hidden',
    'transition-all duration-200 ease-out',
    'group',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
  ],
  {
    variants: {
      variant: {
        // Default card with subtle background
        default: [
          'bg-card-background',
          'border border-border-color',
          'hover:bg-card-background-hover hover:border-border-color-hover',
        ],
        
        // Glass morphism effect
        glass: [
          'bg-glass-bg backdrop-blur-md',
          'border-none',
          'shadow-glass',
          'hover:bg-glass-hover-bg',
        ],
        
        // Elevated card with shadow
        elevated: [
          'bg-card-background',
          'border border-border-color',
          'hover:bg-card-background-hover',
          'hover:-translate-y-1',
        ],
        
        // Gradient border card
        gradient: [
          'bg-card-background',
          'relative',
          'before:absolute before:inset-0',
          'before:rounded-[inherit] before:p-[1px]',
          'before:bg-gradient-to-r before:from-primary-600 before:to-primary-700',
          'before:-z-10',
          'hover:before:from-primary-500 hover:before:to-primary-600',
        ],
        
        // Outline only
        outline: [
          'bg-transparent',
          'border border-border-color',
          'hover:border-border-color-hover',
        ],
        
        // Interactive card with hover effects
        interactive: [
          'bg-card-background',
          'border border-border-color',
          'cursor-pointer',
          'hover:bg-card-background-hover hover:border-primary-500/50',
          'hover:-translate-y-1',
          'active:translate-y-0',
        ],
      },
      
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-md',
        md: 'rounded-lg',
        lg: 'rounded-xl',
        xl: 'rounded-2xl',
        full: 'rounded-full',
      },
      
      elevation: {
        none: elevationTokens.none,
        sm: elevationTokens.sm,
        md: elevationTokens.md,
        lg: elevationTokens.lg,
        xl: elevationTokens.xl,
      },
      
      glow: {
        none: '',
        primary: 'shadow-glow-primary',
        success: 'shadow-glow-success',
        error: 'shadow-glow-error',
        warning: 'shadow-glow-warning',
      },
    },
    
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      rounded: 'lg',
      elevation: 'none',
      glow: 'none',
    },
  }
);

export interface CardProps
  extends Omit<HTMLMotionProps<'div'>, 'role'>,
    VariantProps<typeof cardVariants> {
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  asChild?: boolean;
  hoverable?: boolean;
  pressable?: boolean;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      padding,
      rounded,
      elevation,
      glow,
      children,
      header,
      footer,
      asChild = false,
      hoverable = false,
      pressable = false,
      role,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const cardClass = cn(cardVariants({ variant, padding, rounded, elevation, glow }), className);
    
    
    const animationVariants = {
      initial: shouldReduceMotion ? {} : { opacity: 0, y: 20 },
      animate: shouldReduceMotion ? {} : { opacity: 1, y: 0 },
      hover: hoverable && !shouldReduceMotion ? { y: -4, transition: { duration: 0.2 } } : {},
      tap: pressable && !shouldReduceMotion ? { scale: 0.98, transition: { duration: 0.1 } } : {},
    };

    const cardContent = (
      <>
        {/* Overlay effects abstraction */}
        <OverlayEffects variant={variant || 'default'} />
        
        {/* Card Header */}
        {header && (
          <div className="card-header border-b border-border-color pb-4 mb-4">
            {header}
          </div>
        )}
        
        {/* Card Content */}
        <div className="card-content">
          {children}
        </div>
        
        {/* Card Footer */}
        {footer && (
          <div className="card-footer border-t border-border-color pt-4 mt-4">
            {footer}
          </div>
        )}
      </>
    );

    // Handle asChild with Slot
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
          className={cardClass}
          role={role}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          {...slotProps}
        >
          {cardContent}
        </Slot>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={cardClass}
        role={role}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        variants={animationVariants}
        initial="initial"
        animate="animate"
        whileHover={hoverable ? "hover" : undefined}
        whileTap={pressable ? "tap" : undefined}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
        {...props}
      >
        {cardContent}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

// Compound components for better composition with accessibility
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' }
>(({ className, as: Component = 'h3', ...props }, ref) => (
  <Component
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-tight tracking-tight text-text-primary',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-secondary', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center space-x-2', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, cardVariants };