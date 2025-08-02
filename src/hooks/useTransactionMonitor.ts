import { useState, useEffect, useCallback, useRef } from 'react';
import { BridgeTransaction, BridgeErrorCode } from '@/types/bridge';

interface UseTransactionMonitorProps {
  transactionId?: string;
  onStatusChange?: (transaction: BridgeTransaction) => void;
  onError?: (error: Error) => void;
  onComplete?: (transaction: BridgeTransaction) => void;
  autoStart?: boolean;
}

interface UseTransactionMonitorReturn {
  transaction: BridgeTransaction | null;
  isLoading: boolean;
  error: Error | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refresh: () => void;
}

export function useTransactionMonitor({
  transactionId,
  onStatusChange,
  onError,
  onComplete,
  autoStart = true,
}: UseTransactionMonitorProps): UseTransactionMonitorReturn {
  const [transaction, setTransaction] = useState<BridgeTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMonitoringRef = useRef(false);

  // Start monitoring transaction
  const startMonitoring = useCallback(async () => {
    if (!transactionId || isMonitoringRef.current) return;

    isMonitoringRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Initial fetch
      await refresh();

      // Set up polling
      pollingIntervalRef.current = setInterval(async () => {
        if (!isMonitoringRef.current) return;
        
        try {
          await refresh();
        } catch (err) {
          console.error('Transaction monitoring error:', err);
          // Don't stop monitoring on individual errors
        }
      }, 5000); // Poll every 5 seconds

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start monitoring');
      setError(error);
      onError?.(error);
      isMonitoringRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [transactionId, onError]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Refresh transaction data
  const refresh = useCallback(async () => {
    if (!transactionId) return;

    try {
      // Enhanced to support Fusion RFQ and Bitcoin HTLC monitoring
      console.error('🚨 Transaction Monitor FAILED - Real Data Required:', {
        transactionId,
        timestamp: new Date().toISOString(),
        error: 'Transaction monitoring service not implemented - requires real bridge service integration'
      });
      
      throw new Error(
        `Transaction monitoring failed: Cannot fetch transaction status for ${transactionId} without real bridge service integration. ` +
        `Transaction ID: ${transactionId}. Real-time transaction monitoring required.`
      );

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch transaction');
      setError(error);
      onError?.(error);
    }
  }, [transactionId, onStatusChange, onComplete, onError, stopMonitoring]);

  // Auto-start monitoring when transactionId changes
  useEffect(() => {
    if (autoStart && transactionId) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [transactionId, autoStart, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    transaction,
    isLoading,
    error,
    startMonitoring,
    stopMonitoring,
    refresh,
  };
} 