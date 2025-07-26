import { useState, useEffect, useCallback, useRef } from 'react';
import { BridgeTransaction, BridgeErrorCode } from '@/types/bridge';
import { bridgeService } from '@/lib/services/bridge-service';

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
      // For now, we'll simulate transaction updates
      // In a real implementation, you'd fetch from your backend or blockchain
      const mockTransaction: BridgeTransaction = {
        id: transactionId,
        from: {
          id: 'eth-mainnet',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          logoUrl: '/images/tokens/eth.svg',
          coingeckoId: 'ethereum',
          network: 'ethereum',
          chainId: 1,
          address: '0x0000000000000000000000000000000000000000',
          isNative: true,
          isWrapped: false,
          verified: true,
          displayPrecision: 4,
          description: 'Native cryptocurrency of Ethereum blockchain',
          tags: ['native', 'gas-token', 'defi'],
        },
        to: {
          id: 'wbtc-mainnet',
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin',
          decimals: 8,
          logoUrl: '/images/tokens/wbtc.svg',
          coingeckoId: 'wrapped-bitcoin',
          network: 'ethereum',
          chainId: 1,
          address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          isNative: false,
          isWrapped: true,
          verified: true,
          displayPrecision: 5,
          description: 'Bitcoin on Ethereum - fully backed by Bitcoin',
          tags: ['wrapped', 'erc20', 'bitcoin'],
        },
        fromAmount: {
          raw: '1.0',
          bn: BigInt('1000000000000000000'),
          decimals: 18,
          formatted: '1.0'
        },
        toAmount: {
          raw: '0.065',
          bn: BigInt('6500000'),
          decimals: 8,
          formatted: '0.065'
        },
        fromAddress: '0x1234...5678',
        toAddress: '0x1234...5678',
        status: 'completed',
        txIdentifier: {
          ethereum: '0xabc123...def456',
        },
        confirmations: 12,
        requiredConfirmations: 1,
        isConfirmed: true,
        timestamps: {
          created: Date.now() - 300000, // 5 minutes ago
          updated: Date.now(),
          completed: Date.now(),
        },
        duration: 300000, // 5 minutes
        fees: {
          network: {
            amount: {
              raw: '50000000000000',
              bn: BigInt('50000000000000'),
              decimals: 18,
              formatted: '0.00005'
            },
            amountUSD: 0.1
          },
          protocol: {
            amount: {
              raw: '0',
              bn: BigInt(0),
              decimals: 18,
              formatted: '0'
            },
            amountUSD: 0,
            percent: 0
          },
          total: {
            amount: {
              raw: '50000000000000',
              bn: BigInt('50000000000000'),
              decimals: 18,
              formatted: '0.00005'
            },
            amountUSD: 0.1
          }
        },
        retryCount: 0,
      };

      setTransaction(mockTransaction);
      onStatusChange?.(mockTransaction);

      // Check if transaction is complete
      if (mockTransaction.status === 'completed' || mockTransaction.status === 'failed') {
        stopMonitoring();
        onComplete?.(mockTransaction);
      }

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