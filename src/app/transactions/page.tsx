'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { ErrorBoundary } from 'react-error-boundary'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TransactionList, type Transaction } from '@/components/bridge/TransactionFlow'
import { PageWrapper } from '@/components/layout/PageWrapper'

// i18n preparation - centralized translation keys
const useTranslations = () => {
  // TODO: Replace with actual i18n implementation (next-intl, react-i18next)
  return {
    'page.title': 'Transaction History',
    'page.description': 'Track all your bridge transactions, retry failed ones, and download receipts.',
    'nav.backToBridge': 'Back to Bridge',
    'action.refresh': 'Refresh',
    'stats.total': 'Total Transactions',
    'stats.completed': 'Completed',
    'stats.inProgress': 'In Progress', 
    'stats.failed': 'Failed',
    'help.needHelp': 'Need help with a transaction?',
    'action.viewDocs': 'View Documentation',
    'action.contactSupport': 'Contact Support',
    'action.retry': 'Retry Transaction',
    'action.download': 'Download Receipt',
    'error.listFailed': 'Failed to load transaction list',
    'error.tryAgain': 'Try Again',
    'retry.success': 'Transaction retry initiated',
    'retry.error': 'Cannot retry transaction in current state',
    'download.success': 'Receipt downloaded successfully'
  }
}

// Mock transaction data for demonstration
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    type: 'bridge',
    status: 'completed',
    fromToken: {
      symbol: 'BTC',
      amount: '0.5',
      logoUrl: '/images/tokens/btc.svg',
      chainId: 0,
      usdValue: '15750.00'
    },
    toToken: {
      symbol: 'WBTC',
      amount: '0.4995',
      logoUrl: '/images/tokens/wbtc.svg',
      chainId: 1,
      usdValue: '15726.83'
    },
    fromAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    toAddress: '0x742d35C6129d3A8E4C02Bb6E0e6E4B5B7b8F5e9A',
    timestamp: Date.now() - 3600000, // 1 hour ago
    completedAt: Date.now() - 3500000, // 58 minutes ago
    fee: {
      amount: '0.002',
      symbol: 'ETH',
      usdValue: '4.50'
    },
    explorerUrl: 'https://etherscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    bridgeRoute: ['Bitcoin Network', 'Bridge Contract', 'Mint WBTC', 'Ethereum Network'],
    estimatedValueUSD: '15750.00',
    gasUsed: '21000',
    blockNumber: 18500000
  },
  {
    id: '2',
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    type: 'bridge',
    status: 'pending',
    fromToken: {
      symbol: 'ETH',
      amount: '2.5',
      logoUrl: '/images/tokens/eth.svg',
      chainId: 1,
      usdValue: '5625.00'
    },
    toToken: {
      symbol: 'BTC',
      amount: '0.178',
      logoUrl: '/images/tokens/btc.svg',
      chainId: 0,
      usdValue: '5604.00'
    },
    fromAddress: '0x742d35C6129d3A8E4C02Bb6E0e6E4B5B7b8F5e9A',
    toAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    timestamp: Date.now() - 1800000, // 30 minutes ago
    fee: {
      amount: '0.003',
      symbol: 'ETH',
      usdValue: '6.75'
    },
    explorerUrl: 'https://etherscan.io/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    bridgeRoute: ['Ethereum Network', 'Burn ETH', 'Bridge Contract', 'Bitcoin Network'],
    estimatedValueUSD: '5625.00',
    gasUsed: '35000'
  },
  {
    id: '3',
    hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    type: 'approval',
    status: 'completed',
    fromToken: {
      symbol: 'USDC',
      amount: '1000',
      logoUrl: '/images/tokens/usdc.svg',
      chainId: 1,
      usdValue: '1000.00'
    },
    toToken: {
      symbol: 'USDC',
      amount: '1000',
      logoUrl: '/images/tokens/usdc.svg',
      chainId: 1,
      usdValue: '1000.00'
    },
    fromAddress: '0x742d35C6129d3A8E4C02Bb6E0e6E4B5B7b8F5e9A',
    toAddress: '0x5B8B7F8a5F4B3F2F1F0F9F8F7F6F5F4F3F2F1F0F',
    timestamp: Date.now() - 7200000, // 2 hours ago
    completedAt: Date.now() - 7140000, // 1h 59m ago
    fee: {
      amount: '0.001',
      symbol: 'ETH',
      usdValue: '2.25'
    },
    explorerUrl: 'https://etherscan.io/tx/0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    estimatedValueUSD: '1000.00',
    gasUsed: '46000',
    blockNumber: 18499950
  },
  {
    id: '4',
    hash: '0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    type: 'bridge',
    status: 'failed',
    fromToken: {
      symbol: 'WBTC',
      amount: '0.1',
      logoUrl: '/images/tokens/wbtc.svg',
      chainId: 1,
      usdValue: '3150.00'
    },
    toToken: {
      symbol: 'BTC',
      amount: '0.0999',
      logoUrl: '/images/tokens/btc.svg',
      chainId: 0,
      usdValue: '3146.85'
    },
    fromAddress: '0x742d35C6129d3A8E4C02Bb6E0e6E4B5B7b8F5e9A',
    toAddress: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
    timestamp: Date.now() - 10800000, // 3 hours ago
    fee: {
      amount: '0.0025',
      symbol: 'ETH',
      usdValue: '5.63'
    },
    explorerUrl: 'https://etherscan.io/tx/0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    bridgeRoute: ['Ethereum Network', 'Burn WBTC', 'Bridge Contract', 'Bitcoin Network'],
    estimatedValueUSD: '3150.00',
    gasUsed: '42000',
    blockNumber: 18499800,
    errorMessage: 'Insufficient gas for transaction execution. Please increase gas limit and try again.'
  },
  {
    id: '5',
    hash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    type: 'bridge',
    status: 'confirming',
    fromToken: {
      symbol: 'BTC',
      amount: '1.25',
      logoUrl: '/images/tokens/btc.svg',
      chainId: 0,
      usdValue: '39375.00'
    },
    toToken: {
      symbol: 'WBTC',
      amount: '1.24875',
      logoUrl: '/images/tokens/wbtc.svg',
      chainId: 1,
      usdValue: '39335.63'
    },
    fromAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    toAddress: '0x742d35C6129d3A8E4C02Bb6E0e6E4B5B7b8F5e9A',
    timestamp: Date.now() - 600000, // 10 minutes ago
    fee: {
      amount: '0.004',
      symbol: 'ETH',
      usdValue: '9.00'
    },
    explorerUrl: 'https://etherscan.io/tx/0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    bridgeRoute: ['Bitcoin Network', 'Bridge Contract', 'Mint WBTC', 'Ethereum Network'],
    estimatedValueUSD: '39375.00',
    gasUsed: '28000'
  }
]

// Error fallback component
const TransactionListError: React.FC<{ 
  error: Error
  resetErrorBoundary: () => void 
}> = ({ error, resetErrorBoundary }) => {
  const t = useTranslations()
  
  return (
    <Card variant="glass" className="p-8 text-center">
      <div className="space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-lg font-medium text-white">{t['error.listFailed']}</h3>
        <p className="text-muted-foreground">
          {error.message || 'An unexpected error occurred while loading your transaction history.'}
        </p>
        <Button
          variant="secondary"
          onClick={resetErrorBoundary}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {t['error.tryAgain']}
        </Button>
      </div>
    </Card>
  )
}

const TransactionsPage: React.FC = () => {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>()

  // Memoized transaction statistics to avoid recomputation on every render
  const transactionStats = useMemo(() => {
    const total = MOCK_TRANSACTIONS.length
    const completed = MOCK_TRANSACTIONS.filter(tx => tx.status === 'completed').length
    const inProgress = MOCK_TRANSACTIONS.filter(tx => 
      tx.status === 'pending' || tx.status === 'confirming'
    ).length
    const failed = MOCK_TRANSACTIONS.filter(tx => tx.status === 'failed').length
    
    return { total, completed, inProgress, failed }
  }, []) // Empty dependency array since MOCK_TRANSACTIONS is static

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: false,
    isFetchingMore: false,
    totalCount: MOCK_TRANSACTIONS.length
  })

  // Simulate loading more transactions
  const handleLoadMore = useCallback(() => {
    setPagination(prev => ({ ...prev, isFetchingMore: true }))
    
    // Simulate API call
    setTimeout(() => {
      setPagination(prev => ({
        ...prev,
        page: prev.page + 1,
        isFetchingMore: false,
        hasMore: false // No more mock data
      }))
    }, 1500)
  }, [])

  // Simulate refreshing transactions
  const handleRefresh = useCallback(() => {
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      // Reset pagination
      setPagination({
        page: 1,
        hasMore: false,
        isFetchingMore: false,
        totalCount: MOCK_TRANSACTIONS.length
      })
    }, 1000)
  }, [])

  // Handle transaction retry with proper status gating
  const handleRetryTransaction = useCallback((transaction: Transaction) => {
    // Status gate: only allow retry for failed transactions
    if (transaction.status !== 'failed') {
      console.warn('Cannot retry transaction in current state:', transaction.status)
      alert(t['retry.error'])
      return
    }

    try {
      console.log('Retrying transaction:', transaction.id)
      // In a real app, this would trigger the bridge flow again with updated parameters
      
      // Show success feedback
      alert(`${t['retry.success']}: ${transaction.hash.slice(0, 10)}...`)
      
      // TODO: Implement actual retry logic:
      // 1. Extract original transaction parameters
      // 2. Update gas price/limit based on failure reason
      // 3. Re-initiate bridge transaction
      // 4. Update transaction status to 'pending'
      
    } catch (error) {
      console.error('Failed to retry transaction:', error)
      alert(t['retry.error'])
    }
  }, [t])

  // Handle receipt download with proper error handling
  const handleDownloadReceipt = useCallback((transaction: Transaction) => {
    try {
      console.log('Downloading receipt for:', transaction.id)
      
      // Create a comprehensive JSON receipt
      const receipt = {
        transactionHash: transaction.hash,
        status: transaction.status,
        type: transaction.type,
        timestamp: new Date(transaction.timestamp).toISOString(),
        completedAt: transaction.completedAt ? new Date(transaction.completedAt).toISOString() : null,
        fromToken: transaction.fromToken,
        toToken: transaction.toToken,
        fromAddress: transaction.fromAddress,
        toAddress: transaction.toAddress,
        fee: transaction.fee,
        explorerUrl: transaction.explorerUrl,
        bridgeRoute: transaction.bridgeRoute,
        estimatedValueUSD: transaction.estimatedValueUSD,
        gasUsed: transaction.gasUsed,
        blockNumber: transaction.blockNumber,
        errorMessage: transaction.errorMessage,
        downloadedAt: new Date().toISOString()
      }
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transaction-receipt-${transaction.hash.slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log(t['download.success'])
    } catch (error) {
      console.error('Failed to download receipt:', error)
      alert('Failed to download receipt. Please try again.')
    }
  }, [t])

  // Handle transaction prefetch
  const handlePrefetchTransaction = useCallback(async (transactionId: string) => {
    try {
      console.log('Prefetching transaction details:', transactionId)
      // In a real app, this would fetch additional transaction details
      // await fetchTransactionDetails(transactionId)
      return Promise.resolve()
    } catch (error) {
      console.warn('Failed to prefetch transaction:', error)
      // Don't throw - prefetch failures should be silent
    }
  }, [])

  // Page animations
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  return (
    <PageWrapper
      title={t['page.title']}
      description={t['page.description']}
    >
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="container mx-auto px-4 py-8 max-w-6xl"
      >
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t['nav.backToBridge']}
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{t['page.title']}</h1>
              <p className="text-muted-foreground">
                {t['page.description']}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2"
                aria-label={t['action.refresh']}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {t['action.refresh']}
              </Button>
            </div>
          </div>
        </div>

        {/* Memoized Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card variant="glass" className="p-4">
            <div className="text-2xl font-bold text-white">
              {transactionStats.total}
            </div>
            <div className="text-sm text-muted-foreground">{t['stats.total']}</div>
          </Card>
          
          <Card variant="glass" className="p-4">
            <div className="text-2xl font-bold text-green-400">
              {transactionStats.completed}
            </div>
            <div className="text-sm text-muted-foreground">{t['stats.completed']}</div>
          </Card>
          
          <Card variant="glass" className="p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {transactionStats.inProgress}
            </div>
            <div className="text-sm text-muted-foreground">{t['stats.inProgress']}</div>
          </Card>
          
          <Card variant="glass" className="p-4">
            <div className="text-2xl font-bold text-red-400">
              {transactionStats.failed}
            </div>
            <div className="text-sm text-muted-foreground">{t['stats.failed']}</div>
          </Card>
        </div>

        {/* Transaction List with Error Boundary */}
        <Card variant="glass" className="p-6">
          <ErrorBoundary FallbackComponent={TransactionListError}>
            <TransactionList
              transactions={MOCK_TRANSACTIONS}
              isLoading={isLoading}
              pagination={pagination}
              onLoadMore={handleLoadMore}
              onRefresh={handleRefresh}
              onPrefetchTransaction={handlePrefetchTransaction}
              selectedTransactionId={selectedTransactionId}
              enableInfiniteScroll={false} // Use button for demo
              // Pass retry and download handlers to the TransactionDetails component
              onRetryTransaction={handleRetryTransaction}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </ErrorBoundary>
        </Card>

        {/* Additional Actions */}
        <div className="mt-8 text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <p className="text-muted-foreground">
              {t['help.needHelp']}
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link href="/docs">
                  {t['action.viewDocs']}
                </Link>
              </Button>
              <Button variant="ghost">
                {t['action.contactSupport']}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </PageWrapper>
  )
}

export default TransactionsPage