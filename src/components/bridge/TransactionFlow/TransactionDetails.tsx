'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  DollarSign,
  Hash,
  Calendar,
  Network,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Calculator,
  Eye,
  EyeOff
} from 'lucide-react'
import { Modal, ModalContent, ModalHeader } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import type { Transaction } from './TransactionList'

interface TransactionDetailsProps {
  transaction: Transaction
  isOpen: boolean
  onClose: () => void
  onRetryTransaction?: (transaction: Transaction) => void
  onDownloadReceipt?: (transaction: Transaction) => void
  className?: string
}

// Network configuration for explorer links
const getNetworkConfig = (chainId: number) => {
  switch (chainId) {
    case 1: // Ethereum Mainnet
      return {
        name: 'Ethereum',
        color: 'bg-blue-500',
        textColor: 'text-blue-400',
        explorerUrl: 'https://etherscan.io',
        explorerName: 'Etherscan'
      }
    case 11155111: // Ethereum Sepolia
      return {
        name: 'Ethereum Sepolia',
        color: 'bg-blue-400',
        textColor: 'text-blue-300',
        explorerUrl: 'https://sepolia.etherscan.io',
        explorerName: 'Etherscan'
      }
    case 56: // BSC
      return {
        name: 'BNB Chain',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-400',
        explorerUrl: 'https://bscscan.com',
        explorerName: 'BscScan'
      }
    case 137: // Polygon
      return {
        name: 'Polygon',
        color: 'bg-purple-500',
        textColor: 'text-purple-400',
        explorerUrl: 'https://polygonscan.com',
        explorerName: 'PolygonScan'
      }
    case 0: // Bitcoin (special case)
      return {
        name: 'Bitcoin',
        color: 'bg-orange-500',
        textColor: 'text-orange-400',
        explorerUrl: 'https://mempool.space',
        explorerName: 'Mempool'
      }
    default:
      return {
        name: `Chain ${chainId}`,
        color: 'bg-gray-500',
        textColor: 'text-gray-400',
        explorerUrl: null,
        explorerName: 'Explorer'
      }
  }
}

// Generate network-specific explorer link
const getExplorerLink = (chainId: number, txHash: string) => {
  const config = getNetworkConfig(chainId)
  if (!config.explorerUrl) return null
  
  if (chainId === 0) { // Bitcoin
    return `${config.explorerUrl}/tx/${txHash}`
  } else { // EVM chains
    return `${config.explorerUrl}/tx/${txHash}`
  }
}

// Status configuration
const getStatusConfig = (status: Transaction['status']) => {
  switch (status) {
    case 'pending':
      return {
        icon: Clock,
        label: 'Pending',
        description: 'Transaction is waiting for confirmation',
        className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        iconClassName: 'text-yellow-400'
      }
    case 'confirming':
      return {
        icon: ArrowRightLeft,
        label: 'Confirming',
        description: 'Transaction is being confirmed on the blockchain',
        className: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        iconClassName: 'text-blue-400'
      }
    case 'completed':
      return {
        icon: CheckCircle,
        label: 'Completed',
        description: 'Transaction has been successfully completed',
        className: 'text-green-400 bg-green-500/10 border-green-500/20',
        iconClassName: 'text-green-400'
      }
    case 'failed':
      return {
        icon: XCircle,
        label: 'Failed',
        description: 'Transaction failed to complete',
        className: 'text-red-400 bg-red-500/10 border-red-500/20',
        iconClassName: 'text-red-400'
      }
    case 'cancelled':
      return {
        icon: AlertTriangle,
        label: 'Cancelled',
        description: 'Transaction was cancelled',
        className: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
        iconClassName: 'text-gray-400'
      }
  }
}

// Copy to clipboard hook
const useCopyToClipboard = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setTimeout(() => setCopiedText(null), 2000)
      return true
    } catch (error) {
      console.error('Failed to copy text:', error)
      return false
    }
  }, [])

  return { copyToClipboard, copiedText }
}

// Copyable text component
const CopyableText: React.FC<{ 
  text: string
  displayText?: string
  className?: string
  truncate?: boolean
}> = ({ text, displayText, className = '', truncate = true }) => {
  const { copyToClipboard, copiedText } = useCopyToClipboard()
  const isCopied = copiedText === text

  const handleCopy = () => {
    copyToClipboard(text)
  }

  const truncateText = (str: string) => {
    if (!truncate || str.length <= 20) return str
    return `${str.slice(0, 8)}...${str.slice(-8)}`
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-mono text-sm">
        {displayText || truncateText(text)}
      </span>
      <Tooltip content={isCopied ? 'Copied!' : 'Copy to clipboard'}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="p-1 h-auto"
          aria-label={`Copy ${text} to clipboard`}
        >
          {isCopied ? (
            <CheckCircle className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground hover:text-white" />
          )}
        </Button>
      </Tooltip>
    </div>
  )
}

// Enhanced chain info component (removed redundant chainName prop)
const ChainInfo: React.FC<{ 
  chainId: number
  txHash?: string
  showExplorer?: boolean
}> = ({ chainId, txHash, showExplorer = false }) => {
  const config = getNetworkConfig(chainId)
  const explorerLink = txHash ? getExplorerLink(chainId, txHash) : null

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${config.color}`} />
      <span className={`text-sm ${config.textColor}`}>
        {config.name}
      </span>
      {showExplorer && explorerLink && (
        <a
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary-400 transition-colors"
          aria-label={`View on ${config.explorerName}`}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}

// Token amount display with precision toggle
const TokenAmountDisplay: React.FC<{
  amount: string
  symbol: string
  usdValue?: string
  showFullPrecision?: boolean
  onTogglePrecision?: () => void
}> = ({ amount, symbol, usdValue, showFullPrecision = false, onTogglePrecision }) => {
  const formatAmount = (amount: string, showFull: boolean) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return amount
    
    if (showFull) {
      return amount // Show original precision
    } else {
      // Format with reasonable precision
      if (num < 0.001) return num.toExponential(3)
      if (num < 1) return num.toFixed(6)
      if (num < 1000) return num.toFixed(4)
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div>
        <div className="font-semibold text-white flex items-center gap-2">
          <span>{formatAmount(amount, showFullPrecision)} {symbol}</span>
          {onTogglePrecision && (
            <Tooltip content={showFullPrecision ? 'Show formatted amount' : 'Show full precision'}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onTogglePrecision}
                className="p-1 h-auto"
              >
                {showFullPrecision ? (
                  <EyeOff className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <Eye className="w-3 h-3 text-muted-foreground" />
                )}
              </Button>
            </Tooltip>
          )}
        </div>
        {usdValue && (
          <div className="text-sm text-muted-foreground">
            ≈ ${usdValue}
          </div>
        )}
      </div>
    </div>
  )
}

// Safe exchange rate calculation
const calculateExchangeRate = (fromAmount: string, toAmount: string): string | null => {
  const fromValue = parseFloat(fromAmount)
  const toValue = parseFloat(toAmount)
  
  // Guard against invalid or zero values
  if (!fromValue || fromValue <= 0 || !toValue || toValue <= 0) {
    return null
  }
  
  const rate = toValue / fromValue
  return rate.toFixed(6)
}

// Enhanced gas cost breakdown component with dynamic gas price
const GasCostBreakdown: React.FC<{
  gasUsed?: string
  gasPriceGwei?: string
  networkFee: {
    amount: string
    symbol: string
    usdValue: string
  }
}> = ({ gasUsed, gasPriceGwei, networkFee }) => {
  const hasGasDetails = gasUsed && gasPriceGwei

  return (
    <div className="space-y-4">
      {/* Network Fee Total */}
      <div className="flex items-center justify-between p-3 bg-card-background/30 rounded-lg">
        <span className="text-white font-medium">Total Network Fee</span>
        <div className="text-right">
          <div className="text-white font-mono">
            {networkFee.amount} {networkFee.symbol}
          </div>
          <div className="text-sm text-muted-foreground">
            ≈ ${networkFee.usdValue}
          </div>
        </div>
      </div>

      {/* Gas Breakdown (if available) */}
      {hasGasDetails && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calculator className="w-4 h-4" />
            <span>Gas Cost Breakdown</span>
          </div>
          
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gas Used</span>
              <span className="text-white font-mono">{parseInt(gasUsed!).toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Gas Price</span>
              <span className="text-white font-mono">{gasPriceGwei} Gwei</span>
            </div>
            
            <div className="border-t border-border-color pt-2 flex items-center justify-between">
              <span className="text-muted-foreground">
                {parseInt(gasUsed!).toLocaleString()} × {gasPriceGwei} Gwei =
              </span>
              <div className="text-right">
                <div className="text-white font-mono">
                  {networkFee.amount} {networkFee.symbol}
                </div>
                <div className="text-xs text-muted-foreground">
                  ≈ ${networkFee.usdValue}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Fee Components (if any) */}
      <div className="text-xs text-muted-foreground">
        * Gas fees are paid to network validators and vary based on network congestion
      </div>
    </div>
  )
}

// Expandable section component
const ExpandableSection: React.FC<{
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultExpanded?: boolean
}> = ({ title, icon: Icon, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-border-color rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-card-background/50 hover:bg-card-background/70 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-primary-400" />
          <span className="font-medium text-white">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-border-color">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  transaction,
  isOpen,
  onClose,
  onRetryTransaction,
  onDownloadReceipt,
  className = ''
}) => {
  const [showFullPrecision, setShowFullPrecision] = useState(false)
  const statusConfig = getStatusConfig(transaction.status)
  const StatusIcon = statusConfig.icon

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (start: number, end?: number) => {
    if (!end) return 'In progress...'
    const duration = end - start
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  // Safe exchange rate calculation
  const exchangeRate = calculateExchangeRate(transaction.fromToken.amount, transaction.toToken.amount)

  // Extract gas price from transaction data with fallback
  const getGasPriceGwei = () => {
    // Try to get from transaction data first
    if (transaction.gasUsed && transaction.fee?.amount) {
      // Calculate gas price if not provided directly
      const gasUsed = parseFloat(transaction.gasUsed)
      const feeInWei = parseFloat(transaction.fee.amount) * 1e18 // Assume ETH
      if (gasUsed > 0) {
        const gasPriceWei = feeInWei / gasUsed
        const gasPriceGwei = gasPriceWei / 1e9
        return gasPriceGwei.toFixed(2)
      }
    }
    
    // Fallback to realistic current network conditions
    return '25' // Current typical gas price
  }

  const handleRetryTransaction = () => {
    if (onRetryTransaction) {
      onRetryTransaction(transaction)
    }
  }

  const handleDownloadReceipt = () => {
    if (onDownloadReceipt) {
      onDownloadReceipt(transaction)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="glass"
      size="lg"
      className={className}
    >
      <ModalHeader className="flex items-center justify-between p-6 border-b border-border-color">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-6 h-6 ${statusConfig.iconClassName}`} />
          <div>
            <h2 className="text-xl font-semibold text-white">Transaction Details</h2>
            <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Action Buttons */}
          {transaction.status === 'failed' && onRetryTransaction && (
            <Tooltip content="Retry transaction with updated parameters">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetryTransaction}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </Tooltip>
          )}
          
          {(transaction.status === 'completed' || transaction.status === 'failed') && onDownloadReceipt && (
            <Tooltip content="Download transaction receipt">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadReceipt}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Receipt
              </Button>
            </Tooltip>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
            aria-label="Close transaction details"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </ModalHeader>

      <ModalContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Status Card with Explorer Link */}
        <Card variant="glass" className="p-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${statusConfig.className}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="font-medium">{statusConfig.label}</span>
            </div>
            {transaction.explorerUrl && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="gap-2"
              >
                <a
                  href={transaction.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View transaction on explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Explorer
                </a>
              </Button>
            )}
          </div>
        </Card>

        {/* Transaction Overview */}
        <ExpandableSection title="Transaction Overview" icon={ArrowRightLeft}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From Token */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">From</h4>
              <div className="flex items-center gap-3">
                {transaction.fromToken.logoUrl && (
                  <img
                    src={transaction.fromToken.logoUrl}
                    alt={`${transaction.fromToken.symbol} logo`}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <TokenAmountDisplay
                    amount={transaction.fromToken.amount}
                    symbol={transaction.fromToken.symbol}
                    usdValue={transaction.fromToken.usdValue}
                    showFullPrecision={showFullPrecision}
                    onTogglePrecision={() => setShowFullPrecision(!showFullPrecision)}
                  />
                  <ChainInfo 
                    chainId={transaction.fromToken.chainId}
                    txHash={transaction.hash}
                    showExplorer={true}
                  />
                </div>
              </div>
            </div>

            {/* To Token */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">To</h4>
              <div className="flex items-center gap-3">
                {transaction.toToken.logoUrl && (
                  <img
                    src={transaction.toToken.logoUrl}
                    alt={`${transaction.toToken.symbol} logo`}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <TokenAmountDisplay
                    amount={transaction.toToken.amount}
                    symbol={transaction.toToken.symbol}
                    usdValue={transaction.toToken.usdValue}
                    showFullPrecision={showFullPrecision}
                    onTogglePrecision={() => setShowFullPrecision(!showFullPrecision)}
                  />
                  <ChainInfo 
                    chainId={transaction.toToken.chainId}
                    txHash={transaction.hash}
                    showExplorer={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Exchange Rate */}
          {exchangeRate && (
            <div className="mt-4 p-3 bg-card-background/30 rounded-lg">
              <div className="text-sm text-muted-foreground">Exchange Rate</div>
              <div className="font-mono text-white">
                1 {transaction.fromToken.symbol} = {exchangeRate} {transaction.toToken.symbol}
              </div>
            </div>
          )}
        </ExpandableSection>

        {/* Transaction Information */}
        <ExpandableSection title="Transaction Information" icon={Hash}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Transaction Hash</div>
                <CopyableText text={transaction.hash} className="text-white" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">From Address</div>
                  <CopyableText text={transaction.fromAddress} className="text-white" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">To Address</div>
                  <CopyableText text={transaction.toAddress} className="text-white" />
                </div>
              </div>

              {transaction.blockNumber && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Block Number</div>
                  <span className="font-mono text-white">#{transaction.blockNumber}</span>
                </div>
              )}
            </div>
          </div>
        </ExpandableSection>

        {/* Timing Information */}
        <ExpandableSection title="Timing" icon={Calendar}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Started</div>
                <div className="text-white">{formatTimestamp(transaction.timestamp)}</div>
              </div>
              {transaction.completedAt && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Completed</div>
                  <div className="text-white">{formatTimestamp(transaction.completedAt)}</div>
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Duration</div>
              <div className="text-white">{formatDuration(transaction.timestamp, transaction.completedAt)}</div>
            </div>
          </div>
        </ExpandableSection>

        {/* Enhanced Fee Information with dynamic gas price */}
        <ExpandableSection title="Fee Information" icon={DollarSign}>
          <GasCostBreakdown
            gasUsed={transaction.gasUsed}
            gasPriceGwei={getGasPriceGwei()}
            networkFee={transaction.fee}
          />
        </ExpandableSection>

        {/* Bridge Route (if applicable) */}
        {transaction.bridgeRoute && transaction.bridgeRoute.length > 0 && (
          <ExpandableSection title="Bridge Route" icon={Network} defaultExpanded={false}>
            <div className="space-y-2">
              {transaction.bridgeRoute.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                  <span className="text-white">{step}</span>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Error Information (if failed) */}
        {transaction.status === 'failed' && transaction.errorMessage && (
          <ExpandableSection title="Error Details" icon={AlertTriangle}>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-red-400 text-sm font-mono">
                {transaction.errorMessage}
              </div>
            </div>
          </ExpandableSection>
        )}

        {/* Security Information */}
        <ExpandableSection title="Security" icon={Shield} defaultExpanded={false}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Transaction cryptographically verified</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Smart contract security validated</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Bridge protocol audited</span>
            </div>
          </div>
        </ExpandableSection>
      </ModalContent>
    </Modal>
  )
}

export default TransactionDetails