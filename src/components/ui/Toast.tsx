'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration: duration ?? 8000 }); // Longer duration for errors
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  // Safety check for undefined toasts
  const safeToasts = toasts || [];
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {safeToasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'info':
        return <Info className="w-5 h-5 text-info" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-success/10 border-success/20 text-success';
      case 'error':
        return 'bg-error/10 border-error/20 text-error';
      case 'warning':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'info':
        return 'bg-info/10 border-info/20 text-info';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
      className={`p-4 rounded-lg border backdrop-blur-sm shadow-lg ${getStyles()}`}
    >
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{toast.title}</div>
          {toast.message && (
            <div className="text-xs mt-1 opacity-90">{toast.message}</div>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="text-xs mt-2 underline hover:no-underline font-medium"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// Utility function for parsing error messages
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
};

// Utility function for extracting detailed error info
export const getErrorDetails = (error: unknown): { title: string; message: string } => {
  const message = getErrorMessage(error);
  
  // Handle common error patterns
  if (message.includes('Fusion+ API error:')) {
    const parts = message.split(' - ');
    return {
      title: '1inch API Error',
      message: parts[1] || parts[0]
    };
  }
  
  if (message.includes('User denied transaction') || message.includes('user rejected')) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet'
    };
  }
  
  if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
    return {
      title: 'Insufficient Balance',
      message: 'You don\'t have enough tokens for this transaction'
    };
  }
  
  if (message.includes('MetaMask not installed')) {
    return {
      title: 'Wallet Not Found',
      message: 'Please install MetaMask to continue'
    };
  }
  
  if (message.includes('network') || message.includes('RPC')) {
    return {
      title: 'Network Error',
      message: 'Please check your internet connection and try again'
    };
  }
  
  if (message.includes('Unauthorized') || message.includes('unauthorized')) {
    return {
      title: 'API Authentication Failed',
      message: 'Unable to authenticate with 1inch API'
    };
  }
  
  if (message.includes('cannot use fee without source')) {
    return {
      title: 'Quote Configuration Error',
      message: 'Invalid fee parameters in quote request'
    };
  }
  
  if (message.includes('chain not supported') || message.includes('Chain ID')) {
    return {
      title: 'Unsupported Network',
      message: 'This network is not supported for cross-chain quotes'
    };
  }
  
  if (message.includes('Invalid') || message.includes('invalid')) {
    return {
      title: 'Invalid Input',
      message: message
    };
  }
  
  if (message.includes('timeout') || message.includes('Timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete. Please try again.'
    };
  }
  
  // Default error handling
  return {
    title: 'Error',
    message: message.length > 100 ? message.substring(0, 97) + '...' : message
  };
};

// Named exports for components and types
export { ToastProvider as default, ToastContainer, ToastItem };

// Re-export Toast interface for external use
export type { Toast as ToastInterface };