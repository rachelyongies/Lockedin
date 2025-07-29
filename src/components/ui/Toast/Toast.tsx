'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/helpers';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps extends Omit<Toast, 'id'> {
  onClose?: () => void;
  className?: string;
}

const ToastIcon = ({ type, className }: { type: ToastType; className?: string }) => {
  const iconClass = cn('w-5 h-5', className);
  
  switch (type) {
    case 'success':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.318 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case 'info':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

export function ToastComponent({ type, message, onClose, className }: ToastProps) {
  const toastStyles = {
    success: 'bg-success/10 border-success/20 text-success',
    error: 'bg-error/10 border-error/20 text-error',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    info: 'bg-primary-500/10 border-primary-500/20 text-primary-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'relative px-4 py-3 rounded-lg shadow-lg border max-w-sm backdrop-blur-sm',
        toastStyles[type],
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <ToastIcon type={type} />
        <span className="text-sm font-medium flex-1">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded hover:bg-current/10 transition-colors"
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemoveToast: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export function ToastContainer({ 
  toasts, 
  onRemoveToast, 
  position = 'top-right',
  className 
}: ToastContainerProps) {
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={cn('fixed z-50 space-y-2', positionStyles[position], className)}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => onRemoveToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const recentMessages = React.useRef<Set<string>>(new Set());

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const messageKey = `${toast.type}:${toast.message}`;
    
    // Prevent duplicate toasts within 2 seconds
    if (recentMessages.current.has(messageKey)) {
      return '';
    }
    
    const id = Math.random().toString(36).substring(2, 11);
    const newToast = { ...toast, id };
    
    // Add to recent messages tracking
    recentMessages.current.add(messageKey);
    setTimeout(() => {
      recentMessages.current.delete(messageKey);
    }, 2000);
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration (default 5 seconds)
    const duration = toast.duration || 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };
}