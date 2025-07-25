'use client';

import React, { useState, useRef, useCallback, useId, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';

const tooltipVariants = cva(
  [
    'px-2 py-1 text-xs font-medium',
    'bg-tooltip-bg border border-tooltip-border',
    'shadow-lg backdrop-blur-sm',
    'pointer-events-none select-none',
    'z-50 max-w-xs',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-background-dark text-text-primary border-border-color',
        ],
        dark: [
          'bg-gray-900 text-white border-gray-700',
        ],
        light: [
          'bg-white text-gray-900 border-gray-200',
        ],
        error: [
          'bg-error text-white border-error',
        ],
        warning: [
          'bg-warning text-white border-warning',
        ],
        success: [
          'bg-success text-white border-success',
        ],
        info: [
          'bg-primary-500 text-white border-primary-500',
        ],
      },
      size: {
        sm: 'px-2 py-1 text-xs rounded',
        md: 'px-3 py-1.5 text-sm rounded-md',
        lg: 'px-4 py-2 text-sm rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
);

const arrowVariants = cva(
  [
    'absolute w-2 h-2 rotate-45',
  ],
  {
    variants: {
      variant: {
        default: 'bg-background-dark border-border-color',
        dark: 'bg-gray-900 border-gray-700',
        light: 'bg-white border-gray-200',
        error: 'bg-error border-error',
        warning: 'bg-warning border-warning',
        success: 'bg-success border-success',
        info: 'bg-primary-500 border-primary-500',
      },
      placement: {
        top: '-bottom-1 left-1/2 -translate-x-1/2 border border-t-0 border-l-0',
        bottom: '-top-1 left-1/2 -translate-x-1/2 border border-b-0 border-r-0',
        left: '-right-1 top-1/2 -translate-y-1/2 border border-l-0 border-b-0',
        right: '-left-1 top-1/2 -translate-y-1/2 border border-r-0 border-t-0',
      },
    },
  }
);

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface Position {
  x: number;
  y: number;
}

// Debounced state updater
const useDebouncedState = <T,>(initialValue: T, delay: number = 100) => {
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSetValue = useCallback((newValue: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setValue(newValue);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, debouncedSetValue] as const;
};

// Media query hook for responsive placement
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

// Animation variants with fallback support
const tooltipAnimationVariants: Variants = {
  hidden: (placement: Placement) => ({
    opacity: 0,
    scale: 0.95,
    y: placement === 'top' ? 5 : placement === 'bottom' ? -5 : 0,
    x: placement === 'left' ? 5 : placement === 'right' ? -5 : 0,
  }),
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
      duration: 0.15,
    },
  },
  exit: (placement: Placement) => ({
    opacity: 0,
    scale: 0.95,
    y: placement === 'top' ? 5 : placement === 'bottom' ? -5 : 0,
    x: placement === 'left' ? 5 : placement === 'right' ? -5 : 0,
    transition: {
      duration: 0.1,
      ease: 'easeIn',
    },
  }),
};

// Fallback animation for non-motion environments
const fallbackAnimationVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export interface TooltipProps extends VariantProps<typeof tooltipVariants> {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: Placement;
  offset?: number;
  delay?: number;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  arrow?: boolean;
  interactive?: boolean;
  portalContainer?: HTMLElement;
  fallbackAnimation?: boolean; // For Suspense/Transition boundaries
  onShow?: () => void;
  onHide?: () => void;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      content,
      children,
      placement = 'top',
      offset = 8,
      delay = 500,
      disabled = false,
      className: _className,
      contentClassName,
      arrow = true,
      interactive = false,
      variant,
      size,
      portalContainer,
      fallbackAnimation = false,
      onShow,
      onHide,
      ...props
    }
  ) => {
    // className is intentionally omitted as it should be applied to children, not tooltip content
    const [isVisible, setIsVisible] = useDebouncedState(false, 50);
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [actualPlacement, setActualPlacement] = useState<Placement>(placement);
    
    const triggerRef = useRef<HTMLElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const rafRef = useRef<number | null>(null);
    
    const tooltipId = useId();
    
    // Responsive considerations
    const isMobile = useMediaQuery('(max-width: 640px)');
    const isLandscape = useMediaQuery('(orientation: landscape)');

    // Adaptive offset based on screen size
    const adaptiveOffset = useMemo(() => {
      if (isMobile) {
        return isLandscape ? offset * 0.75 : offset * 1.25;
      }
      return offset;
    }, [isMobile, isLandscape, offset]);

    // Calculate position with viewport awareness
    const calculatePosition = useCallback(
      (triggerRect: DOMRect, tooltipRect: DOMRect, preferredPlacement: Placement): { position: Position; placement: Placement } => {
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };

        // Adjust for mobile viewports
        const padding = isMobile ? 16 : 8;
        const safeArea = {
          left: padding,
          right: viewport.width - padding,
          top: padding,
          bottom: viewport.height - padding,
        };

        let finalPlacement = preferredPlacement;
        let x = 0;
        let y = 0;

        // Calculate initial position
        switch (preferredPlacement) {
          case 'top':
            x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
            y = triggerRect.top - tooltipRect.height - adaptiveOffset;
            break;
          case 'bottom':
            x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
            y = triggerRect.bottom + adaptiveOffset;
            break;
          case 'left':
            x = triggerRect.left - tooltipRect.width - adaptiveOffset;
            y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
            break;
          case 'right':
            x = triggerRect.right + adaptiveOffset;
            y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
            break;
        }

        // Smart flipping with space consideration
        const spaceTop = triggerRect.top;
        const spaceBottom = viewport.height - triggerRect.bottom;
        const spaceLeft = triggerRect.left;
        const spaceRight = viewport.width - triggerRect.right;

        if (preferredPlacement === 'top' && y < safeArea.top) {
          if (spaceBottom > spaceTop) {
            finalPlacement = 'bottom';
            y = triggerRect.bottom + adaptiveOffset;
          }
        } else if (preferredPlacement === 'bottom' && y + tooltipRect.height > safeArea.bottom) {
          if (spaceTop > spaceBottom) {
            finalPlacement = 'top';
            y = triggerRect.top - tooltipRect.height - adaptiveOffset;
          }
        } else if (preferredPlacement === 'left' && x < safeArea.left) {
          if (spaceRight > spaceLeft) {
            finalPlacement = 'right';
            x = triggerRect.right + adaptiveOffset;
          }
        } else if (preferredPlacement === 'right' && x + tooltipRect.width > safeArea.right) {
          if (spaceLeft > spaceRight) {
            finalPlacement = 'left';
            x = triggerRect.left - tooltipRect.width - adaptiveOffset;
          }
        }

        // Constrain to safe area
        x = Math.max(safeArea.left, Math.min(x, safeArea.right - tooltipRect.width));
        y = Math.max(safeArea.top, Math.min(y, safeArea.bottom - tooltipRect.height));

        return {
          position: { x, y },
          placement: finalPlacement,
        };
      },
      [adaptiveOffset, isMobile]
    );

    // Optimized position update with RAF
    const updatePosition = useCallback(() => {
      if (!triggerRef.current || !tooltipRef.current) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        
        const { position: newPosition, placement: newPlacement } = calculatePosition(
          triggerRect,
          tooltipRect,
          placement
        );
        
        setPosition(newPosition);
        setActualPlacement(newPlacement);
      });
    }, [calculatePosition, placement]);

    // Show tooltip with delay
    const showTooltip = useCallback(() => {
      if (disabled) return;

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      if (!isVisible) {
        showTimeoutRef.current = setTimeout(() => {
          setIsVisible(true);
          onShow?.();
        }, delay);
      }
    }, [disabled, isVisible, delay, onShow, setIsVisible]);

    // Hide tooltip with interaction consideration
    const hideTooltip = useCallback(() => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }

      if (isVisible) {
        const hideDelay = interactive ? 100 : 0;
        
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
          onHide?.();
        }, hideDelay);
      }
    }, [isVisible, interactive, onHide, setIsVisible]);

    // Event handlers
    const handleMouseEnter = useCallback(() => showTooltip(), [showTooltip]);
    const handleMouseLeave = useCallback(() => hideTooltip(), [hideTooltip]);
    const handleFocus = useCallback(() => showTooltip(), [showTooltip]);
    const handleBlur = useCallback(() => hideTooltip(), [hideTooltip]);

    const handleTooltipMouseEnter = useCallback(() => {
      if (interactive && hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }, [interactive]);

    const handleTooltipMouseLeave = useCallback(() => {
      if (interactive) hideTooltip();
    }, [interactive, hideTooltip]);

    // Update position when visible or viewport changes
    useEffect(() => {
      if (isVisible) {
        updatePosition();
        
        const handleUpdate = () => updatePosition();
        const handleScroll = () => updatePosition();
        
        window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
        window.addEventListener('resize', handleUpdate, { passive: true });
        
        return () => {
          window.removeEventListener('scroll', handleScroll, { capture: true });
          window.removeEventListener('resize', handleUpdate);
        };
      }
    }, [isVisible, updatePosition]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, []);

    // Safe ref forwarding with warning
    const safeTrigger = useMemo(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const child = children as React.ReactElement<any>;
        return React.cloneElement(child, {
          ref: (node: HTMLElement) => {
            triggerRef.current = node;
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const originalRef = (child as any).ref;
            if (typeof originalRef === 'function') {
              originalRef(node);
            } else if (originalRef?.current !== undefined) {
              originalRef.current = node;
            }
          },
          onMouseEnter: (e: React.MouseEvent) => {
            child.props.onMouseEnter?.(e);
            handleMouseEnter();
          },
          onMouseLeave: (e: React.MouseEvent) => {
            child.props.onMouseLeave?.(e);
            handleMouseLeave();
          },
          onFocus: (e: React.FocusEvent) => {
            child.props.onFocus?.(e);
            handleFocus();
          },
          onBlur: (e: React.FocusEvent) => {
            child.props.onBlur?.(e);
            handleBlur();
          },
          'aria-describedby': isVisible ? tooltipId : child.props['aria-describedby'],
        });
      } catch (error) {
        console.warn('Tooltip: Failed to clone child element. Ensure child is a valid React element that accepts refs.', error);
        return children;
      }
    }, [children, handleMouseEnter, handleMouseLeave, handleFocus, handleBlur, isVisible, tooltipId]);

    // Choose animation variants based on environment
    const animationVariants = fallbackAnimation ? fallbackAnimationVariants : tooltipAnimationVariants;

    // Tooltip content with error boundary
    const tooltipContent = (
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            className={cn(tooltipVariants({ variant, size }), contentClassName)}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              zIndex: 50,
            }}
            custom={actualPlacement}
            variants={animationVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            {...props}
          >
            {content}
            
            {arrow && (
              <div
                className={cn(arrowVariants({ variant, placement: actualPlacement }))}
                aria-hidden="true"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );

    const container = portalContainer || (typeof document !== 'undefined' ? document.body : null);

    return (
      <>
        {safeTrigger}
        {container && createPortal(tooltipContent, container)}
      </>
    );
  }
);

Tooltip.displayName = 'Tooltip';

// Specialized tooltip variants for DeFi contexts
export const InfoTooltip = React.forwardRef<HTMLDivElement,
  Omit<TooltipProps, 'variant' | 'children'> & { children: React.ReactElement }
>(({ children, ...props }, ref) => (
  <Tooltip ref={ref} variant="info" {...props}>
    {children}
  </Tooltip>
));

InfoTooltip.displayName = 'InfoTooltip';

export const ErrorTooltip = React.forwardRef<HTMLDivElement,
  Omit<TooltipProps, 'variant' | 'children'> & { children: React.ReactElement }
>(({ children, ...props }, ref) => (
  <Tooltip ref={ref} variant="error" {...props}>
    {children}
  </Tooltip>
));

ErrorTooltip.displayName = 'ErrorTooltip';

export const WarningTooltip = React.forwardRef<HTMLDivElement,
  Omit<TooltipProps, 'variant' | 'children'> & { children: React.ReactElement }
>(({ children, ...props }, ref) => (
  <Tooltip ref={ref} variant="warning" {...props}>
    {children}
  </Tooltip>
));

WarningTooltip.displayName = 'WarningTooltip';

// Quick tooltip for simple text content
export interface QuickTooltipProps {
  text: string;
  children: React.ReactElement;
  placement?: Placement;
  variant?: TooltipProps['variant'];
}

export const QuickTooltip = React.forwardRef<HTMLDivElement, QuickTooltipProps>(
  ({ text, children, placement = 'top', variant = 'default' }, ref) => (
    <Tooltip
      ref={ref}
      content={text}
      placement={placement}
      variant={variant}
      delay={300}
    >
      {children}
    </Tooltip>
  )
);

QuickTooltip.displayName = 'QuickTooltip';

export { Tooltip as default };