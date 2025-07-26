'use client'

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Clock,
  Shield,
  AlertTriangle,
  Info,
  RefreshCw,
  MessageSquare,
  AlertCircle
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatTokenAmount, formatCurrency } from '@/lib/utils/format'

type RetryReason = 'gasBump' | 'relayer' | 'manual' | 'timeout'

interface TransactionStep {
  id: string
  label: string
  description?: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  txHash?: string
  chainId?: number // Chain ID for this specific step
  txType?: 'source' | 'destination' | 'bridge'
  timestamp?: number
  estimatedTime?: number // in seconds
  maxTime?: number // maximum expected time before showing warning
  error?: string
  retryable?: boolean
  retryReasons?: RetryReason[]
}

interface PendingTransactionProps {
  isOpen: boolean
  onClose?: () => void
  onSuccess?: () => void
  onError?: (error: Error) => void
  onRetryStep?: (stepId: string, reason: RetryReason) => Promise<void>
  onContactSupport?: () => void
  fromToken: {
    symbol: string
    name: string
    decimals: number
    logoUrl?: string
    chainId: number
  }
  toToken: {
    symbol: string
    name: string
    decimals: number
    logoUrl?: string
    chainId: number
  }
  fromAmount: string
  toAmount: string
  fromNetwork: string
  toNetwork: string
  steps: TransactionStep[]
  currentStep: number
  canClose?: boolean
  showCancelWarning?: boolean
  explorerUrls?: {
    source?: string
    destination?: string
  }
  supportUrl?: string
}

// TODO: Replace with actual i18n implementation (e.g., next-intl)
// import { useTranslations } from 'next-intl'
// const t = useTranslations('transaction.pending')

const t = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'title': 'Transaction in Progress',
    'subtitle': 'Please wait while your transaction is being processed',
    'step': 'Step {current} of {total}',
    'estimated_time': 'Estimated time: {time}',
    'view_on_explorer': 'View on Explorer',
    'copy_hash': 'Copy transaction hash',
    'hash_copied': 'Copied!',
    'copy_manually': 'Copy the hash manually:',
    'cancel_warning': 'Warning: Closing this window will not cancel your transaction',
    'cancel_info': 'This transaction has already been submitted to the blockchain and cannot be canceled. It will continue processing even if you close this window.',
    'transaction_submitted': 'Transaction Submitted',
    'waiting_confirmation': 'Waiting for Confirmation',
    'processing': 'Processing...',
    'completed': 'Completed',
    'failed': 'Failed',
    'retry': 'Retry Step',
    'retry_gas': 'Retry with Higher Gas',
    'retry_relayer': 'Try Different Relayer',
    'retry_manual': 'Retry Manually',
    'retrying': 'Retrying...',
    'retry_failed': 'Retry failed. Please try again or contact support.',
    'close': 'Close',
    'contact_support': 'Contact Support',
    'report_issue': 'Report Issue',
    'source_chain': 'Source Chain',
    'destination_chain': 'Destination Chain',
    'bridging': 'Bridging {fromAmount} {fromSymbol} to {toAmount} {toSymbol}',
    'security_note': 'Your funds are secured by the bridge smart contract',
    'do_not_close': 'Please do not close this window or refresh the page',
    'transaction_hash': 'Transaction Hash',
    'time_elapsed': 'Time Elapsed',
    'support': 'Need help?',
    'step_approve': 'Approve Token',
    'step_initiate': 'Initiate Bridge',
    'step_confirm': 'Confirm on {network}',
    'step_receive': 'Receive Tokens',
    'step_complete': 'Bridge Complete',
    'transaction_failed': 'Transaction Failed',
    'unexpected_error': 'An unexpected error occurred',
    'step_updated': 'Step {step} status updated to {status}',
    'taking_longer': 'This step is taking longer than expected',
    'still_processing': 'Transaction is still being processed. This can happen during network congestion.',
    'check_explorer': 'Check the explorer for the latest status'
  }
  
  let text = translations[key] || key
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v))
    })
  }
  return text
}

// Explorer chain configuration
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
  // Add more chains as needed
}

function formatElapsedTime(startTime?: number): string {
  if (!startTime) return '0:00'
  
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatEstimatedTime(seconds?: number): string {
  if (!seconds) return ''
  
  if (seconds < 60) {
    return `~${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60)
    return `~${minutes}m`
  } else {
    const hours = Math.ceil(seconds / 3600)
    return `~${hours}h`
  }
}

function getExplorerUrl(chainId: number, txHash: string): string {
  const config = EXPLORER_CONFIGS[chainId]
  if (!config) {
    console.warn(`No explorer config for chain ${chainId}, using Etherscan as fallback`)
    return `https://etherscan.io/tx/${txHash}`
  }
  return `${config.baseUrl}${txHash}`
}

// Clipboard fallback for non-HTTPS contexts
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for non-secure contexts
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
      } catch (err) {
        // Last resort: prompt user
        prompt(t('copy_manually'), text)
        return false
      } finally {
        textArea.remove()
      }
    }
  } catch (error) {
    console.error('Failed to copy:', error)
    return false
  }
}

export function PendingTransaction({
  isOpen,
  onClose,
  onSuccess,
  onError,
  onRetryStep,
  onContactSupport,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  fromNetwork,
  toNetwork,
  steps,
  currentStep,
  canClose = false,
  showCancelWarning = true,
  explorerUrls = {},
  supportUrl = '/support'
}: PendingTransactionProps) {
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState('0:00')
  const [retryingSteps, setRetryingSteps] = useState<Set<string>>(new Set())
  const [retryErrors, setRetryErrors] = useState<Record<string, string>>({})
  const [stepStartTimes, setStepStartTimes] = useState<Record<string, number>>({})
  const [delayedSteps, setDelayedSteps] = useState<Set<string>>(new Set())
  const liveRegionRef = useRef<HTMLDivElement>(null)

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(startTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  // Track step start times and check for delays
  useEffect(() => {
    steps.forEach(step => {
      // Track when step becomes active
      if (step.status === 'active' && !stepStartTimes[step.id]) {
        setStepStartTimes(prev => ({ ...prev, [step.id]: Date.now() }))
      }

      // Check if step is taking too long
      if (step.status === 'active' && step.maxTime && stepStartTimes[step.id]) {
        const elapsed = (Date.now() - stepStartTimes[step.id]) / 1000
        if (elapsed > step.maxTime && !delayedSteps.has(step.id)) {
          setDelayedSteps(prev => new Set(prev).add(step.id))
        }
      }
    })
  }, [steps, stepStartTimes, delayedSteps])

  // Calculate progress
  const progress = useMemo(() => {
    const completedSteps = steps.filter(step => step.status === 'completed').length
    return (completedSteps / steps.length) * 100
  }, [steps])

  // Get current active step
  const activeStep = useMemo(() => {
    return steps.find(step => step.status === 'active') || steps[currentStep]
  }, [steps, currentStep])

  // Check if transaction failed
  const hasFailed = useMemo(() => {
    return steps.some(step => step.status === 'failed')
  }, [steps])

  // Check if transaction completed
  const isCompleted = useMemo(() => {
    return steps.every(step => step.status === 'completed')
  }, [steps])

  // Update live region for accessibility
  useEffect(() => {
    if (liveRegionRef.current && activeStep) {
      const announcement = t('step_updated', {
        step: activeStep.label,
        status: activeStep.status
      })
      liveRegionRef.current.textContent = announcement
    }
  }, [activeStep])

  // Handle completion
  useEffect(() => {
    if (isCompleted && onSuccess) {
      onSuccess()
    }
  }, [isCompleted, onSuccess])

  // Handle copy to clipboard
  const handleCopyHash = useCallback(async (hash: string) => {
    const success = await copyToClipboard(hash)
    if (success) {
      setCopiedHash(hash)
      setTimeout(() => setCopiedHash(null), 2000)
    }
  }, [])

  // Handle retry step
  const handleRetryStep = useCallback(async (stepId: string, reason: RetryReason) => {
    if (!onRetryStep) return

    setRetryingSteps(prev => new Set(prev).add(stepId))
    setRetryErrors(prev => ({ ...prev, [stepId]: '' }))

    try {
      await onRetryStep(stepId, reason)
      // Reset delay status on successful retry
      setDelayedSteps(prev => {
        const next = new Set(prev)
        next.delete(stepId)
        return next
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('unexpected_error')
      setRetryErrors(prev => ({ ...prev, [stepId]: errorMessage }))
      onError?.(error as Error)
    } finally {
      setRetryingSteps(prev => {
        const next = new Set(prev)
        next.delete(stepId)
        return next
      })
    }
  }, [onRetryStep, onError])

  // Get explorer URL based on step type
  const getStepExplorerUrl = useCallback((step: TransactionStep) => {
    if (!step.txHash) return ''
    
    // Use step's specific chain ID if available
    if (step.chainId) {
      return getExplorerUrl(step.chainId, step.txHash)
    }
    
    // Otherwise, determine based on transaction type
    if (step.txType === 'destination') {
      return explorerUrls.destination || getExplorerUrl(toToken.chainId, step.txHash)
    } else {
      return explorerUrls.source || getExplorerUrl(fromToken.chainId, step.txHash)
    }
  }, [fromToken.chainId, toToken.chainId, explorerUrls])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-title"
      aria-describedby="transaction-description"
    >
      {/* Live region for accessibility announcements */}
      <div 
        ref={liveRegionRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg"
      >
        <Card className="relative overflow-hidden">
          {/* Background animation */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/50 to-transparent animate-pulse" />
          </div>

          <div className="relative p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 id="transaction-title" className="text-2xl font-bold text-white" role="heading" aria-level={1}>
                {t('title')}
              </h1>
              <p id="transaction-description" className="text-sm text-muted-foreground">
                {t('subtitle')}
              </p>
            </div>

            {/* Token Info */}
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                {fromToken.logoUrl && (
                  <img 
                    src={fromToken.logoUrl} 
                    alt={fromToken.symbol}
                    className="w-12 h-12 rounded-full mx-auto mb-2"
                  />
                )}
                <p className="font-mono font-medium text-white">
                  {formatTokenAmount(fromAmount, fromToken.symbol, fromToken.decimals)}
                </p>
              </div>

              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ArrowRight className="w-6 h-6 text-primary" />
              </motion.div>

              <div className="text-center">
                {toToken.logoUrl && (
                  <img 
                    src={toToken.logoUrl} 
                    alt={toToken.symbol}
                    className="w-12 h-12 rounded-full mx-auto mb-2"
                  />
                )}
                <p className="font-mono font-medium text-white">
                  {formatTokenAmount(toAmount, toToken.symbol, toToken.decimals)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('step', { current: currentStep + 1, total: steps.length })}
                </span>
                <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
              </div>
              <div className="relative h-2 bg-background/50 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border transition-all ${
                    step.status === 'completed' 
                      ? 'border-green-500/20 bg-green-500/5'
                      : step.status === 'active'
                      ? 'border-primary/40 bg-primary/5'
                      : step.status === 'failed'
                      ? 'border-error/20 bg-error/5'
                      : 'border-border/50 bg-background/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Step Icon */}
                    <div className="shrink-0 mt-0.5">
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : step.status === 'active' ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : step.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-error" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-border/50" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${
                          step.status === 'active' || step.status === 'completed'
                            ? 'text-white'
                            : 'text-muted-foreground'
                        }`}>
                          {step.label}
                        </p>
                        {step.estimatedTime && step.status === 'active' && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatEstimatedTime(step.estimatedTime)}
                          </span>
                        )}
                      </div>

                      {step.description && (
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      )}

                      {/* Delay warning */}
                      {delayedSteps.has(step.id) && step.status === 'active' && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-warning/10 border border-warning/20 rounded">
                          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-warning">
                              {t('taking_longer')}
                            </p>
                            <p className="text-xs text-warning/80">
                              {t('still_processing')}
                            </p>
                            {step.txHash && (
                              <a
                                href={getStepExplorerUrl(step)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                              >
                                {t('check_explorer')}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {step.txHash && (
                        <div className="flex items-center gap-2 mt-2">
                          <a
                            href={getStepExplorerUrl(step)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                          >
                            {t('view_on_explorer')}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => handleCopyHash(step.txHash!)}
                            className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                            aria-label={t('copy_hash')}
                          >
                            {copiedHash === step.txHash ? (
                              <>
                                <Check className="w-3 h-3" />
                                {t('hash_copied')}
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                {step.txHash.slice(0, 6)}...{step.txHash.slice(-4)}
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {step.error && (
                        <div className="space-y-2 mt-2">
                          <p className="text-xs text-error">{step.error}</p>
                          {step.retryable && onRetryStep && step.retryReasons && (
                            <div className="flex flex-wrap gap-2">
                              {step.retryReasons.map(reason => (
                                <Button
                                  key={reason}
                                  onClick={() => handleRetryStep(step.id, reason)}
                                  disabled={retryingSteps.has(step.id)}
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {retryingSteps.has(step.id) ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      {t('retrying')}
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-3 h-3" />
                                      {t(`retry_${reason}`)}
                                    </>
                                  )}
                                </Button>
                              ))}
                            </div>
                          )}
                          {retryErrors[step.id] && (
                            <p className="text-xs text-error/80">
                              {t('retry_failed')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Time Elapsed */}
            <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {t('time_elapsed')}
              </span>
              <span className="font-mono text-sm text-white">{elapsedTime}</span>
            </div>

            {/* Security Note */}
            {!hasFailed && !isCompleted && (
              <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm text-white">
                    {t('security_note')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('do_not_close')}
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {hasFailed && (
              <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium text-error">
                    {t('transaction_failed')}
                  </p>
                  <p className="text-xs text-error/80">
                    {steps.find(s => s.status === 'failed')?.error || t('unexpected_error')}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {t('support')}
                    </span>
                    {onContactSupport ? (
                      <button
                        onClick={onContactSupport}
                        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {t('contact_support')}
                      </button>
                    ) : (
                      <a
                        href={supportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {t('report_issue')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {(canClose || isCompleted || hasFailed) && (
                <Button
                  onClick={onClose}
                  variant={hasFailed || isCompleted ? 'primary' : 'ghost'}
                  className="flex-1"
                >
                  {t('close')}
                </Button>
              )}
            </div>

            {/* Cancel Warning */}
            {showCancelWarning && !canClose && !isCompleted && !hasFailed && (
              <div className="flex items-center gap-2 justify-center">
                <Tooltip content={t('cancel_info')}>
                  <AlertTriangle className="w-4 h-4 text-warning cursor-help" />
                </Tooltip>
                <p className="text-xs text-center text-warning">
                  {t('cancel_warning')}
                </p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}