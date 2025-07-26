'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Download,
  Share2,
  Plus,
  Send,
  Wallet,
  Receipt,
  Clock,
  Zap,
  AlertTriangle,
  X
} from 'lucide-react'
import { Modal, ModalContent } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatTokenAmount, formatCurrency } from '@/lib/utils/format'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  onViewTransactions?: () => void
  onNewTransaction?: () => void
  fromToken: {
    symbol: string
    name: string
    decimals: number
    logoUrl?: string
    address: string
    chainId: number
  }
  toToken: {
    symbol: string
    name: string
    decimals: number
    logoUrl?: string
    address: string
    chainId: number
  }
  fromAmount: string
  toAmount: string
  actualReceived?: string // Actual amount received (may differ from estimate)
  fromNetwork: string
  toNetwork: string
  transactionHash: string
  destinationHash?: string
  totalTime?: number // Total time taken in seconds
  totalFees?: string
  feesCurrency?: string
  explorerUrls?: {
    source?: string
    destination?: string
  }
  canAddToWallet?: boolean
  onAddToWallet?: () => Promise<void>
  shareUrl?: string
  platformName?: string
  showLiveTimer?: boolean
}

// TODO: Replace with actual i18n implementation
const t = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'success.title': 'Bridge Successful!',
    'success.subtitle': 'Your tokens have been successfully bridged',
    'success.bridged_amount': 'You successfully bridged',
    'success.received_amount': 'You received',
    'success.from_to': 'from {fromNetwork} to {toNetwork}', 
    'success.transaction_hash': 'Transaction Hash',
    'success.destination_hash': 'Destination Hash',
    'success.total_time': 'Total Time',
    'success.total_fees': 'Total Fees',
    'success.view_on_explorer': 'View on Explorer',
    'success.view_source': 'View Source Transaction',
    'success.view_destination': 'View Destination Transaction',
    'success.copy_hash': 'Copy transaction hash',
    'success.copy_link': 'Copy transaction link',
    'success.hash_copied': 'Transaction hash copied to clipboard!',
    'success.link_copied': 'Link copied to clipboard!',
    'success.download_receipt': 'Download Receipt',
    'success.share_transaction': 'Share Transaction',
    'success.add_to_wallet': 'Add {symbol} to Wallet',
    'success.adding_to_wallet': 'Adding to wallet...',
    'success.added_to_wallet': 'Added to Wallet!',
    'success.wallet_add_failed': 'Failed to add token to wallet',
    'success.wallet_add_error': 'Could not add {symbol} to your wallet. You can add it manually using the token address: {address}',
    'success.view_transactions': 'View All Transactions',
    'success.bridge_again': 'Bridge Again',
    'success.close': 'Close',
    'success.share_message': 'I just bridged {fromAmount} {fromSymbol} to {toAmount} {toSymbol} using {platform}! 🌉',
    'success.receipt_title': 'Bridge Transaction Receipt',
    'success.congratulations': 'Congratulations!',
    'success.completed_in': 'Completed in {time}',
    'success.success_rate': 'Success Rate: 99.9%',
    'success.next_steps': 'What\'s next?',
    'success.explore_defi': 'Explore DeFi opportunities on {network}',
    'success.provide_liquidity': 'Provide liquidity and earn rewards',
    'success.stake_tokens': 'Stake your tokens for additional yield',
    'success.live_timer': 'Time since completion: {time}',
    'success.dismiss_error': 'Dismiss error'
  }
  
  let text = translations[key] || key
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v))
    })
  }
  return text
}

// Explorer URLs by chain ID
const EXPLORER_CONFIGS: Record<number, { name: string; baseUrl: string }> = {
  1: { name: 'Etherscan', baseUrl: 'https://etherscan.io/tx/' },
  5: { name: 'Goerli Etherscan', baseUrl: 'https://goerli.etherscan.io/tx/' },
  10: { name: 'Optimistic Etherscan', baseUrl: 'https://optimistic.etherscan.io/tx/' },
  137: { name: 'Polygonscan', baseUrl: 'https://polygonscan.com/tx/' },
  42161: { name: 'Arbiscan', baseUrl: 'https://arbiscan.io/tx/' },
  8453: { name: 'Basescan', baseUrl: 'https://basescan.org/tx/' },
  43114: { name: 'Snowtrace', baseUrl: 'https://snowtrace.io/tx/' },
  56: { name: 'BscScan', baseUrl: 'https://bscscan.com/tx/' },
  250: { name: 'FTMScan', baseUrl: 'https://ftmscan.com/tx/' },
  100: { name: 'Gnosisscan', baseUrl: 'https://gnosisscan.io/tx/' },
}

function getExplorerUrl(chainId: number, txHash: string): string {
  const config = EXPLORER_CONFIGS[chainId]
  if (!config) {
    console.warn(`No explorer config for chain ${chainId}, using Etherscan as fallback`)
    return `https://etherscan.io/tx/${txHash}`
  }
  return `${config.baseUrl}${txHash}`
}

function formatTime(seconds?: number): string {
  if (!seconds) return 'N/A'
  
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
}

// Clipboard utility
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        return true
      } finally {
        textArea.remove()
      }
    }
  } catch (error) {
    console.error('Failed to copy:', error)
    return false
  }
}

export function SuccessModal({
  isOpen,
  onClose,
  onViewTransactions,
  onNewTransaction,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  actualReceived,
  fromNetwork,
  toNetwork,
  transactionHash,
  destinationHash,
  totalTime,
  totalFees,
  feesCurrency = 'ETH',
  explorerUrls = {},
  canAddToWallet = false,
  onAddToWallet,
  shareUrl,
  platformName = 'ChainCrossing',
  showLiveTimer = false
}: SuccessModalProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [isAddingToWallet, setIsAddingToWallet] = useState(false)
  const [walletAdded, setWalletAdded] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [completionTime] = useState(Date.now())
  const [liveElapsed, setLiveElapsed] = useState(0)
  
  // Refs for accessibility
  const liveRegionRef = useRef<HTMLDivElement>(null)
  const errorRegionRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  const finalAmount = actualReceived || toAmount
  const sourceExplorerUrl = explorerUrls.source || getExplorerUrl(fromToken.chainId, transactionHash)
  const destinationExplorerUrl = destinationHash 
    ? (explorerUrls.destination || getExplorerUrl(toToken.chainId, destinationHash))
    : null

  // Live timer effect
  useEffect(() => {
    if (!showLiveTimer || !isOpen) return

    const interval = setInterval(() => {
      setLiveElapsed(Math.floor((Date.now() - completionTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [showLiveTimer, isOpen, completionTime])

  // Focus management
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus()
    }
  }, [isOpen])

  // Announce copy success to screen readers
  const announceCopySuccess = (message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message
      // Clear after announcement
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = ''
        }
      }, 1000)
    }
  }

  // Handle copy operations
  const handleCopy = async (text: string, itemKey: string, successMessage: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedItem(itemKey)
      announceCopySuccess(successMessage)
      setTimeout(() => setCopiedItem(null), 2000)
    }
  }

  // Handle add to wallet with proper error handling
  const handleAddToWallet = async () => {
    if (!onAddToWallet) return

    setIsAddingToWallet(true)
    setWalletError(null)
    
    try {
      await onAddToWallet()
      setWalletAdded(true)
      announceCopySuccess(t('success.added_to_wallet'))
    } catch (error) {
      console.error('Failed to add token to wallet:', error)
      
      const errorMessage = t('success.wallet_add_error', {
        symbol: toToken.symbol,
        address: toToken.address
      })
      
      setWalletError(errorMessage)
      
      // Announce error to screen readers
      if (errorRegionRef.current) {
        errorRegionRef.current.textContent = errorMessage
      }
    } finally {
      setIsAddingToWallet(false)
    }
  }

  // Dismiss wallet error
  const dismissWalletError = () => {
    setWalletError(null)
    if (errorRegionRef.current) {
      errorRegionRef.current.textContent = ''
    }
  }

  // Generate receipt data for download
  const generateReceipt = () => {
    const receiptData = {
      title: t('success.receipt_title'),
      timestamp: new Date().toISOString(),
      from: {
        amount: fromAmount,
        token: fromToken.symbol,
        network: fromNetwork
      },
      to: {
        amount: finalAmount,
        token: toToken.symbol,
        network: toNetwork
      },
      transactionHash,
      destinationHash,
      totalTime: totalTime ? formatTime(totalTime) : 'N/A',
      totalFees: totalFees ? `${totalFees} ${feesCurrency}` : 'N/A',
      explorerUrls: {
        source: sourceExplorerUrl,
        destination: destinationExplorerUrl
      }
    }
    
    const blob = new Blob([JSON.stringify(receiptData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bridge-receipt-${transactionHash.slice(0, 8)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Celebration animation variants
  const celebrationVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { 
      scale: [0, 1.2, 1], 
      rotate: [0, 10, -10, 0],
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  }

  const tokenVariants = {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { delay: 0.3, duration: 0.5 } }
  }

  const arrowVariants = {
    initial: { scale: 0 },
    animate: { 
      scale: 1,
      transition: { delay: 0.5, duration: 0.3 }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="glass"
      size="lg"
    >
      {/* Live regions for accessibility */}
      <div 
        ref={liveRegionRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
      <div 
        ref={errorRegionRef}
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      />

      <ModalContent className="space-y-6">
        {/* Success Animation */}
        <div className="text-center">
          <motion.div 
            className="flex justify-center mb-4"
            variants={celebrationVariants}
            initial="initial"
            animate="animate"
          >
            <div className="relative">
              <CheckCircle2 className="w-16 h-16 text-green-500" aria-hidden="true" />
              {/* Celebration particles */}
              <div className="absolute inset-0 -m-4">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-primary rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                    }}
                    animate={{
                      x: [0, (Math.cos(i * Math.PI / 4) * 40)],
                      y: [0, (Math.sin(i * Math.PI / 4) * 40)],
                      opacity: [1, 0],
                      scale: [1, 0],
                    }}
                    transition={{
                      duration: 1,
                      delay: 0.8 + i * 0.1,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <div className="space-y-2">
            <motion.h2 
              className="text-2xl font-bold text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              role="heading"
              aria-level={1}
            >
              {t('success.title')}
            </motion.h2>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {t('success.subtitle')}
            </motion.p>
          </div>
        </div>

        {/* Transaction Summary */}
        <motion.div 
          className="flex items-center justify-center gap-4 p-6 bg-background/30 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.div 
            className="text-center"
            variants={tokenVariants}
            initial="initial"
            animate="animate"
          >
            {fromToken.logoUrl && (
              <img 
                src={fromToken.logoUrl} 
                alt={`${fromToken.symbol} token logo`}
                className="w-12 h-12 rounded-full mx-auto mb-2"
              />
            )}
            <p className="font-mono font-medium text-white">
              {formatTokenAmount(fromAmount, fromToken.symbol, fromToken.decimals)}
            </p>
            <p className="text-sm text-muted-foreground">{fromToken.symbol}</p>
            <p className="text-xs text-muted-foreground">{fromNetwork}</p>
          </motion.div>

          <motion.div
            variants={arrowVariants}
            initial="initial"
            animate="animate"
          >
            <ArrowRight className="w-6 h-6 text-green-500" aria-hidden="true" />
          </motion.div>

          <motion.div 
            className="text-center"
            variants={tokenVariants}
            initial="initial"
            animate="animate"
          >
            {toToken.logoUrl && (
              <img 
                src={toToken.logoUrl} 
                alt={`${toToken.symbol} token logo`}
                className="w-12 h-12 rounded-full mx-auto mb-2"
              />
            )}
            <p className="font-mono font-medium text-white">
              {formatTokenAmount(finalAmount, toToken.symbol, toToken.decimals)}
            </p>
            <p className="text-sm text-muted-foreground">{toToken.symbol}</p>
            <p className="text-xs text-muted-foreground">{toNetwork}</p>
          </motion.div>
        </motion.div>

        {/* Live Timer */}
        {showLiveTimer && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground" role="timer" aria-live="off">
              {t('success.live_timer', { time: formatTime(liveElapsed) })}
            </p>
          </div>
        )}

        {/* Wallet Add Error */}
        <AnimatePresence>
          {walletError && (
            <motion.div 
              className="flex items-start gap-2 p-3 bg-error/10 border border-error/20 rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-error mb-1">
                  {t('success.wallet_add_failed')}
                </p>
                <p className="text-xs text-error/80">
                  {walletError}
                </p>
              </div>
              <button
                onClick={dismissWalletError}
                className="shrink-0 text-error hover:text-error/80 transition-colors"
                aria-label={t('success.dismiss_error')}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction Details */}
        <Card className="p-4 space-y-3 bg-background/20">
          {/* Transaction Hashes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('success.transaction_hash')}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={sourceExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  aria-label={t('success.view_source')}
                >
                  {t('success.view_source')}
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
                <button
                  onClick={() => handleCopy(
                    transactionHash,
                    'source-hash',
                    t('success.hash_copied')
                  )}
                  className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                  aria-label={t('success.copy_hash')}
                >
                  {copiedItem === 'source-hash' ? (
                    <>
                      <Check className="w-3 h-3" aria-hidden="true" />
                      <span className="sr-only">{t('success.hash_copied')}</span>
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                    </>
                  )}
                </button>
              </div>
            </div>

            {destinationHash && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('success.destination_hash')}
                </span>
                <div className="flex items-center gap-2">
                  {destinationExplorerUrl && (
                    <a
                      href={destinationExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      aria-label={t('success.view_destination')}
                    >
                      {t('success.view_destination')}
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                  <button
                    onClick={() => handleCopy(
                      destinationHash,
                      'dest-hash',
                      t('success.hash_copied')
                    )}
                    className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                    aria-label={t('success.copy_hash')}
                  >
                    {copiedItem === 'dest-hash' ? (
                      <>
                        <Check className="w-3 h-3" aria-hidden="true" />
                        <span className="sr-only">{t('success.hash_copied')}</span>
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" aria-hidden="true" />
                        {destinationHash.slice(0, 6)}...{destinationHash.slice(-4)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Time and Fees */}
          <div className="pt-2 border-t border-border/50 space-y-2">
            {totalTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {t('success.total_time')}
                </span>
                <span className="text-sm font-mono text-white">
                  {formatTime(totalTime)}
                </span>
              </div>
            )}

            {totalFees && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" aria-hidden="true" />
                  {t('success.total_fees')}
                </span>
                <span className="text-sm font-mono text-white">
                  {totalFees} {feesCurrency}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Add to Wallet */}
          {canAddToWallet && onAddToWallet && (
            <Button
              ref={firstFocusableRef}
              onClick={handleAddToWallet}
              disabled={isAddingToWallet || walletAdded}
              variant="secondary"
              className="flex items-center gap-2"
              aria-describedby={walletError ? 'wallet-error' : undefined}
            >
              {walletAdded ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  {t('success.added_to_wallet')}
                </>
              ) : isAddingToWallet ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </motion.div>
                  {t('success.adding_to_wallet')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  {t('success.add_to_wallet', { symbol: toToken.symbol })}
                </>
              )}
            </Button>
          )}

          {/* Download Receipt */}
          <Button
            onClick={generateReceipt}
            variant="secondary"
            className="flex items-center gap-2"
            aria-label={t('success.download_receipt')}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            {t('success.download_receipt')}
          </Button>

          {/* Copy Link */}
          {shareUrl && (
            <Button
              onClick={() => handleCopy(
                shareUrl,
                'share-link',
                t('success.link_copied')
              )}
              variant="secondary"
              className="flex items-center gap-2 col-span-2"
              aria-label={t('success.copy_link')}
            >
              {copiedItem === 'share-link' ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span className="sr-only">{t('success.link_copied')}</span>
                  {t('success.link_copied')}
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  {t('success.copy_link')}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Primary Actions */}
        <div className="flex gap-3">
          {onViewTransactions && (
            <Button
              onClick={onViewTransactions}
              variant="ghost"
              className="flex-1"
              aria-label={t('success.view_transactions')}
            >
              <Receipt className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('success.view_transactions')}
            </Button>
          )}
          
          {onNewTransaction && (
            <Button
              onClick={onNewTransaction}
              variant="secondary"
              className="flex-1"
              aria-label={t('success.bridge_again')}
            >
              <ArrowRight className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('success.bridge_again')}
            </Button>
          )}
          
          <Button
            onClick={onClose}
            variant="primary"
            className="flex-1"
          >
            {t('success.close')}
          </Button>
        </div>

        {/* Success Stats */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" aria-hidden="true" />
            {t('success.success_rate')}
          </div>
          {totalTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {t('success.completed_in', { time: formatTime(totalTime) })}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  )
}