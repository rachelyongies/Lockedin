'use client'

import React, { useState, useMemo, useCallback, Suspense, useRef, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from 'react-error-boundary'
import { 
  Filter,
  Search,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRightLeft,
  DollarSign,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { useDebounce } from '@/hooks/useDebounce'

// Enhanced transaction types
export type TransactionStatus = 'pending' | 'confirming' | 'completed' | 'failed' | 'cancelled'
export type TransactionType = 'bridge' | 'approval' | 'deposit' | 'withdrawal'
export type SortBy = 'timestamp' | 'usdValue' | 'fromAmount' | 'toAmount' | 'fee'

export interface TokenInfo {
  symbol: string
  amount: string
  logoUrl?: string
  chainId: number
  chainName?: string
  usdValue?: string
}

export interface Transaction {
  id: string
  hash: string
  type: TransactionType
  status: TransactionStatus
  fromToken: TokenInfo
  toToken: TokenInfo
  fromAddress: string
  toAddress: string
  timestamp: number
  completedAt?: number
  fee: {
    amount: string
    symbol: string
    usdValue: string
  }
  explorerUrl?: string
  bridgeRoute?: string[]
  errorMessage?: string
  estimatedValueUSD?: string
  gasUsed?: string
  blockNumber?: number
}

interface PaginationState {
  page: number
  hasMore: boolean
  isFetchingMore: boolean
  totalCount?: number
}

interface TransactionListProps {
  transactions: Transaction[]
  isLoading?: boolean
  pagination?: PaginationState
  onLoadMore?: () => void
  onRefresh?: () => void
  onPrefetchTransaction?: (transactionId: string) => Promise<void>
  onRetryTransaction?: (transaction: Transaction) => void
  onDownloadReceipt?: (transaction: Transaction) => void
  className?: string
  enableInfiniteScroll?: boolean
  selectedTransactionId?: string
}

// Enhanced status badge with better accessibility
const StatusBadge = React.memo<{ status: TransactionStatus }>(({ status }) => {
  const getStatusConfig = (status: TransactionStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
          ariaLabel: 'Transaction pending'
        }
      case 'confirming':
        return {
          icon: ArrowRightLeft,
          label: 'Confirming',
          className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          ariaLabel: 'Transaction confirming'
        }
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          className: 'bg-green-500/10 text-green-400 border-green-500/20',
          ariaLabel: 'Transaction completed successfully'
        }
      case 'failed':
        return {
          icon: XCircle,
          label: 'Failed',
          className: 'bg-red-500/10 text-red-400 border-red-500/20',
          ariaLabel: 'Transaction failed'
        }
      case 'cancelled':
        return {
          icon: AlertCircle,
          label: 'Cancelled',
          className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
          ariaLabel: 'Transaction cancelled'
        }
    }
  }

  const config = getStatusConfig(status)
  const IconComponent = config.icon

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${config.className}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      <IconComponent className="w-3 h-3" />
      {config.label}
    </div>
  )
})

StatusBadge.displayName = 'StatusBadge'

// Chain indicator component
const ChainIndicator = React.memo<{ chainId: number; chainName?: string }>(({ chainId, chainName }) => {
  const getChainColor = (chainId: number) => {
    switch (chainId) {
      case 1: return 'bg-blue-500' // Ethereum
      case 56: return 'bg-yellow-500' // BSC
      case 137: return 'bg-purple-500' // Polygon
      default: return 'bg-gray-500'
    }
  }

  return (
    <div 
      className={`w-3 h-3 rounded-full ${getChainColor(chainId)} absolute -bottom-1 -right-1 border border-card-background`}
      title={chainName || `Chain ${chainId}`}
      aria-label={`Chain: ${chainName || chainId}`}
    />
  )
})

ChainIndicator.displayName = 'ChainIndicator'

// Memoized transaction item with prefetch on hover and selected state
const TransactionItem = React.memo<{ 
  transaction: Transaction
  isSelected: boolean
  onClick: (transaction: Transaction) => void
  onPrefetch?: (transactionId: string) => void
}>(({ transaction, isSelected, onClick, onPrefetch }) => {
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
  }, [])

  const truncateHash = useCallback((hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }, [])

  const handleClick = useCallback(() => {
    onClick(transaction)
  }, [onClick, transaction])

  const handleMouseEnter = useCallback(() => {
    // Debounced prefetch on hover
    if (onPrefetch && !isSelected) {
      prefetchTimeoutRef.current = setTimeout(() => {
        onPrefetch(transaction.id)
      }, 300) // 300ms delay before prefetch
    }
  }, [onPrefetch, transaction.id, isSelected])

  const handleMouseLeave = useCallback(() => {
    // Cancel prefetch if user moves away quickly
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }
  }, [])

  const handleExplorerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Visual feedback for selected state
  const cardClassName = `p-4 cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-primary-500/20 ${
    isSelected 
      ? 'border-primary-500/50 bg-primary-500/5 shadow-lg shadow-primary-500/10' 
      : 'hover:border-primary-500/30'
  }`

  const ariaLabel = `Transaction: ${transaction.fromToken.amount} ${transaction.fromToken.symbol} to ${transaction.toToken.amount} ${transaction.toToken.symbol}, Status: ${transaction.status}${isSelected ? ', currently selected' : ''}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isSelected ? 1.005 : 1
      }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: isSelected ? 1.005 : 1.002 }}
      className="group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Card 
        variant="glass" 
        className={cardClassName}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-pressed={isSelected}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Token Logos with Chain Indicators */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                {transaction.fromToken.logoUrl && (
                  <img 
                    src={transaction.fromToken.logoUrl} 
                    alt={`${transaction.fromToken.symbol} logo`}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <ChainIndicator 
                  chainId={transaction.fromToken.chainId} 
                  chainName={transaction.fromToken.chainName}
                />
              </div>
              <ArrowRightLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="relative">
                {transaction.toToken.logoUrl && (
                  <img 
                    src={transaction.toToken.logoUrl} 
                    alt={`${transaction.toToken.symbol} logo`}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <ChainIndicator 
                  chainId={transaction.toToken.chainId} 
                  chainName={transaction.toToken.chainName}
                />
              </div>
            </div>

            {/* Transaction Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-medium text-white truncate">
                  {transaction.fromToken.amount} {transaction.fromToken.symbol}
                </span>
                <span className="text-muted-foreground flex-shrink-0">→</span>
                <span className="font-medium text-white truncate">
                  {transaction.toToken.amount} {transaction.toToken.symbol}
                </span>
                {transaction.estimatedValueUSD && (
                  <span className="text-sm text-muted-foreground flex-shrink-0">
                    (~${transaction.estimatedValueUSD})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="font-mono">{truncateHash(transaction.hash)}</span>
                <span className="flex-shrink-0">•</span>
                <span className="flex-shrink-0">{formatTimestamp(transaction.timestamp)}</span>
                <span className="flex-shrink-0">•</span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  <DollarSign className="w-3 h-3" />
                  {transaction.fee.usdValue}
                </span>
                {transaction.explorerUrl && (
                  <a
                    href={transaction.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary-400 transition-colors flex-shrink-0"
                    onClick={handleExplorerClick}
                    aria-label="View transaction on explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Status and Arrow */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={transaction.status} />
            <ChevronRight 
              className={`w-4 h-4 transition-colors ${
                isSelected 
                  ? 'text-primary-400' 
                  : 'text-muted-foreground group-hover:text-primary-400'
              }`} 
            />
          </div>
        </div>
      </Card>
    </motion.div>
  )
})

TransactionItem.displayName = 'TransactionItem'

// Enhanced filters component with proper accessibility
const TransactionFilters = React.memo<{
  statusFilter: TransactionStatus | 'all'
  typeFilter: TransactionType | 'all'
  sortBy: SortBy
  sortOrder: 'asc' | 'desc'
  onStatusFilter: (status: TransactionStatus | 'all') => void
  onTypeFilter: (type: TransactionType | 'all') => void
  onSortBy: (sort: SortBy) => void
  onToggleSort: () => void
}>(({ statusFilter, typeFilter, sortBy, sortOrder, onStatusFilter, onTypeFilter, onSortBy, onToggleSort }) => {
  // Generate unique IDs for proper form accessibility
  const statusSelectId = useId()
  const typeSelectId = useId()
  const sortSelectId = useId()
  
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirming', label: 'Confirming' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'bridge', label: 'Bridge' },
    { value: 'approval', label: 'Approval' },
    { value: 'deposit', label: 'Deposit' },
    { value: 'withdrawal', label: 'Withdrawal' }
  ]

  const sortOptions = [
    { value: 'timestamp', label: 'Date' },
    { value: 'usdValue', label: 'USD Value' },
    { value: 'fromAmount', label: 'From Amount' },
    { value: 'toAmount', label: 'To Amount' },
    { value: 'fee', label: 'Fee' }
  ]

  return (
    <Card variant="glass" className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor={statusSelectId} className="block text-sm font-medium text-white mb-2">
            Status
          </label>
          <select
            id={statusSelectId}
            value={statusFilter}
            onChange={(e) => onStatusFilter(e.target.value as TransactionStatus | 'all')}
            className="w-full bg-card-background border border-border-color rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/30"
            aria-label="Filter transactions by status"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={typeSelectId} className="block text-sm font-medium text-white mb-2">
            Type
          </label>
          <select
            id={typeSelectId}
            value={typeFilter}
            onChange={(e) => onTypeFilter(e.target.value as TransactionType | 'all')}
            className="w-full bg-card-background border border-border-color rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/30"
            aria-label="Filter transactions by type"
          >
            {typeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={sortSelectId} className="block text-sm font-medium text-white mb-2">
            Sort By
          </label>
          <select
            id={sortSelectId}
            value={sortBy}
            onChange={(e) => onSortBy(e.target.value as SortBy)}
            className="w-full bg-card-background border border-border-color rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/30"
            aria-label="Sort transactions by field"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSort}
            className="gap-2 justify-start"
            aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}, click to toggle`}
            aria-pressed={sortOrder === 'desc'}
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>
      </div>
    </Card>
  )
})

TransactionFilters.displayName = 'TransactionFilters'

// Error fallback component
const TransactionListError: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <Card variant="glass" className="p-8 text-center">
    <div className="space-y-4">
      <XCircle className="w-12 h-12 text-red-400 mx-auto" />
      <h3 className="text-lg font-medium text-white">Failed to load transactions</h3>
      <p className="text-muted-foreground">
        {error.message || 'An unexpected error occurred while loading your transaction history.'}
      </p>
      <Button
        variant="secondary"
        onClick={resetErrorBoundary}
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </Button>
    </div>
  </Card>
)

// Main component with enhanced features
export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  isLoading = false,
  pagination,
  onLoadMore,
  onRefresh,
  onPrefetchTransaction,
  onRetryTransaction,
  onDownloadReceipt,
  className = '',
  enableInfiniteScroll = false,
  selectedTransactionId
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortBy>('timestamp')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Enhanced sorting logic with multiple criteria
  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Search filter (using debounced query)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(tx => 
        tx.hash.toLowerCase().includes(query) ||
        tx.fromToken.symbol.toLowerCase().includes(query) ||
        tx.toToken.symbol.toLowerCase().includes(query) ||
        tx.fromAddress.toLowerCase().includes(query) ||
        tx.toAddress.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter)
    }

    // Enhanced sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp
          break
        case 'usdValue':
          const aUsd = parseFloat(a.estimatedValueUSD || a.fee.usdValue || '0')
          const bUsd = parseFloat(b.estimatedValueUSD || b.fee.usdValue || '0')
          comparison = aUsd - bUsd
          break
        case 'fromAmount':
          comparison = parseFloat(a.fromToken.amount) - parseFloat(b.fromToken.amount)
          break
        case 'toAmount':
          comparison = parseFloat(a.toToken.amount) - parseFloat(b.toToken.amount)
          break
        case 'fee':
          comparison = parseFloat(a.fee.usdValue) - parseFloat(b.fee.usdValue)
          break
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [transactions, debouncedSearchQuery, statusFilter, typeFilter, sortBy, sortOrder])

  // Infinite scroll setup
  const { targetRef } = useIntersectionObserver({
    onIntersect: onLoadMore,
    enabled: enableInfiniteScroll && pagination?.hasMore && !pagination?.isFetchingMore
  })

  const handleTransactionClick = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction)
  }, [])

  // Enhanced prefetch with proper error handling
  const handlePrefetch = useCallback(async (transactionId: string) => {
    if (!onPrefetchTransaction) return
    
    try {
      await onPrefetchTransaction(transactionId)
    } catch (error) {
      console.warn(`Failed to prefetch transaction ${transactionId}:`, error)
      // Optionally show a subtle notification to user
    }
  }, [onPrefetchTransaction])

  const toggleSort = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }, [])

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev)
  }, [])

  return (
    <ErrorBoundary FallbackComponent={TransactionListError}>
      <div className={`space-y-6 ${className}`} role="main" aria-label="Transaction history">
        {/* Header with Search and Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-white">Transaction History</h2>
              {pagination?.totalCount && (
                <span className="text-sm text-muted-foreground">
                  ({pagination.totalCount} total)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  className="gap-2"
                  aria-label="Refresh transaction list"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFilters}
                className="gap-2"
                aria-label={`${showFilters ? 'Hide' : 'Show'} filters`}
                aria-pressed={showFilters}
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by hash, token, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search transactions"
            />
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <TransactionFilters
                  statusFilter={statusFilter}
                  typeFilter={typeFilter}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onStatusFilter={setStatusFilter}
                  onTypeFilter={setTypeFilter}
                  onSortBy={setSortBy}
                  onToggleSort={toggleSort}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Transaction List */}
        <div className="space-y-3" role="list" aria-label="Transactions">
          {isLoading && transactions.length === 0 ? (
            // Loading skeletons
            <div className="space-y-3" aria-label="Loading transactions">
              {[...Array(5)].map((_, i) => (
                <Card key={i} variant="glass" className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                      <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                      <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                    </div>
                    <div className="w-20 h-6 bg-muted animate-pulse rounded-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            // Empty state
            <Card variant="glass" className="p-8 text-center">
              <div className="space-y-3">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium text-white">No transactions found</h3>
                <p className="text-muted-foreground">
                  {debouncedSearchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters or search query.'
                    : 'Your transaction history will appear here once you start bridging tokens.'
                  }
                </p>
                {(debouncedSearchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      setTypeFilter('all')
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            // Transaction items
            <AnimatePresence>
              {filteredTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  isSelected={selectedTransactionId === transaction.id || selectedTransaction?.id === transaction.id}
                  onClick={handleTransactionClick}
                  onPrefetch={handlePrefetch}
                />
              ))}
            </AnimatePresence>
          )}

          {/* Infinite scroll trigger or Load More Button */}
          {pagination?.hasMore && (
            <div className="text-center pt-4">
              {enableInfiniteScroll ? (
                <div 
                  ref={targetRef}
                  className="flex items-center justify-center py-4"
                >
                  {pagination.isFetchingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading more transactions...
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={onLoadMore}
                  disabled={pagination.isFetchingMore}
                  className="gap-2"
                  aria-label="Load more transactions"
                >
                  {pagination.isFetchingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                  {pagination.isFetchingMore ? 'Loading...' : 'Load More'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <Suspense fallback={
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              <span className="ml-2 text-muted-foreground">Loading transaction details...</span>
            </div>
          }>
            <LazyTransactionDetails
              transaction={selectedTransaction}
              isOpen={!!selectedTransaction}
              onClose={() => setSelectedTransaction(null)}
              onRetryTransaction={onRetryTransaction}
              onDownloadReceipt={onDownloadReceipt}
            />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  )
}

// Lazy load transaction details for better performance
const LazyTransactionDetails = React.lazy(() => 
  import('./TransactionDetails').then(module => ({ default: module.TransactionDetails }))
)

export default TransactionList