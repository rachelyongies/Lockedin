'use client';

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';

const modalVariants = cva(
  [
    'relative w-full max-w-lg mx-4',
    'bg-card-background border border-border-color',
    'shadow-2xl shadow-primary-500/5',
    'overflow-hidden',
  ],
  {
    variants: {
      variant: {
        default: [
          'rounded-xl',
        ],
        glass: [
          'bg-glass-bg backdrop-blur-lg',
          'border-glass-border',
          'rounded-xl',
        ],
        floating: [
          'rounded-2xl',
          'shadow-floating',
          'border border-border-color/50',
        ],
        fullscreen: [
          'max-w-none mx-0 h-screen',
          'rounded-none',
        ],
      },
      size: {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// Animation variants for sophisticated spring-based motion
const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
};

const modalAnimationVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300, duration: 0.3 },
  },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2, ease: 'easeIn' } },
};

const mobileModalVariants: Variants = {
  hidden: { opacity: 0, y: '100%' },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },
  exit: { opacity: 0, y: '100%', transition: { duration: 0.25, ease: 'easeInOut' } },
};

export interface ModalProps extends VariantProps<typeof modalVariants> {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  className?: string;
  overlayClassName?: string;
  mobileFullScreen?: boolean;
  portalContainer?: HTMLElement;
  zIndex?: number;
  renderCloseButton?: () => React.ReactNode;
  id?: string;
}

// Modal components for compound pattern
export const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 pb-4 border-b border-border-color/50', className)}
    {...props}
  />
));
ModalHeader.displayName = 'ModalHeader';

export const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      'text-xl font-semibold text-text-primary leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
ModalTitle.displayName = 'ModalTitle';

export const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-tertiary mt-2', className)}
    {...props}
  />
));
ModalDescription.displayName = 'ModalDescription';

export const ModalContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6', className)} {...props} />
));
ModalContent.displayName = 'ModalContent';

export const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'p-6 pt-4 border-t border-border-color/50',
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0',
      className
    )}
    {...props}
  />
));
ModalFooter.displayName = 'ModalFooter';

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      children,
      title,
      description,
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      preventScroll = true,
      className,
      overlayClassName,
      variant,
      size,
      mobileFullScreen = false,
      portalContainer,
      zIndex = 50,
      renderCloseButton,
      id,
      ...props
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const fallbackFocusRef = useRef<HTMLDivElement>(null);
    
    // SSR-safe ID generation with fallback
    const modalId = useMemo(() => {
      if (id) return id;
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return `modal-${Math.random().toString(36).substr(2, 9)}`;
    }, [id]);
    
    const titleId = `${modalId}-title`;
    const descriptionId = `${modalId}-description`;

    // Focus trap with edge case handling
    const trapFocus = useCallback((element: HTMLElement) => {
      const focusableSelector = 
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      
      const getFocusableElements = () => {
        const elements = Array.from(element.querySelectorAll(focusableSelector)) as HTMLElement[];
        return elements.filter(el => {
          const isDisabled = 'disabled' in el && (el as HTMLInputElement).disabled;
          return !isDisabled && !el.getAttribute('aria-hidden');
        });
      };

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusableElements = getFocusableElements();
        
        // Fallback to modal container if no focusable elements
        if (focusableElements.length === 0) {
          e.preventDefault();
          fallbackFocusRef.current?.focus();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      };

      element.addEventListener('keydown', handleTabKey);
      return () => element.removeEventListener('keydown', handleTabKey);
    }, []);

    // Handle escape key
    useEffect(() => {
      if (!isOpen || !closeOnEscape) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
      if (!preventScroll || typeof window === 'undefined') return;

      if (isOpen) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      } else {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }

      return () => {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      };
    }, [isOpen, preventScroll]);

    // Focus management with edge cases
    useEffect(() => {
      if (!isOpen) return;

      const modal = modalRef.current;
      if (!modal) return;

      // Focus first focusable element or fallback
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      
      setTimeout(() => {
        if (firstElement) {
          firstElement.focus();
        } else {
          // Fallback to modal container
          fallbackFocusRef.current?.focus();
        }
      }, 100);

      // Set up focus trap
      return trapFocus(modal);
    }, [isOpen, trapFocus]);

    // Handle overlay click
    const handleOverlayClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose();
        }
      },
      [closeOnOverlayClick, onClose]
    );

    // SSR-safe mobile detection
    const [isMobile, setIsMobile] = React.useState(false);
    useEffect(() => {
      if (typeof window === 'undefined') return;
      
      const checkMobile = () => setIsMobile(window.innerWidth < 640);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const shouldUseMobileFullScreen = mobileFullScreen && isMobile;
    const modalVariantToUse = shouldUseMobileFullScreen ? 'fullscreen' : variant;
    const animationVariants = shouldUseMobileFullScreen ? mobileModalVariants : modalAnimationVariants;

    // Default close button
    const defaultCloseButton = (
      <motion.button
        onClick={onClose}
        className={cn(
          'ml-4 p-2 rounded-lg',
          'text-text-tertiary hover:text-text-secondary',
          'hover:bg-background-secondary transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/50'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Close modal"
      >
        <svg
          className="w-5 h-5"
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
      </motion.button>
    );

    if (!isOpen) return null;

    const modalContent = (
      <AnimatePresence>
        <motion.div
          className={cn(
            'fixed inset-0 flex items-center justify-center',
            shouldUseMobileFullScreen ? 'items-end' : 'items-center'
          )}
          style={{ zIndex }}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <motion.div
            className={cn(
              'absolute inset-0 bg-black/50 backdrop-blur-sm',
              overlayClassName
            )}
            variants={overlayVariants}
            onClick={handleOverlayClick}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={(node) => {
              modalRef.current = node;
              if (ref) {
                if (typeof ref === 'function') {
                  ref(node);
                } else {
                  ref.current = node;
                }
              }
            }}
            className={cn(
              modalVariants({ variant: modalVariantToUse, size }),
              shouldUseMobileFullScreen && 'h-[90vh] max-h-none rounded-t-2xl rounded-b-none',
              className
            )}
            variants={animationVariants}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            {...props}
          >
            {/* Fallback focus element for empty modals */}
            <div
              ref={fallbackFocusRef}
              tabIndex={-1}
              className="sr-only"
              aria-hidden="true"
            />

            {/* Header with close button */}
            {(title || description || showCloseButton) && (
              <ModalHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {title && (
                      <ModalTitle id={titleId}>
                        {title}
                      </ModalTitle>
                    )}
                    {description && (
                      <ModalDescription id={descriptionId}>
                        {description}
                      </ModalDescription>
                    )}
                  </div>
                  
                  {showCloseButton && (
                    renderCloseButton ? renderCloseButton() : defaultCloseButton
                  )}
                </div>
              </ModalHeader>
            )}

            {/* Content */}
            <div className={cn(
              shouldUseMobileFullScreen && 'flex-1 overflow-y-auto'
            )}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );

    // Portal to body or custom container
    const container = portalContainer || (typeof document !== 'undefined' ? document.body : null);
    return container ? createPortal(modalContent, container) : null;
  }
);

Modal.displayName = 'Modal';

export { Modal as default };