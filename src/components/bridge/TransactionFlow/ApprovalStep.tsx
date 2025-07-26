'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, ExternalLink, Loader2, Shield, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatCurrency, formatTokenAmount } from '@/lib/utils/format'
import { parseUnits } from 'viem'

interface ApprovalStepProps {
  token: {
    symbol: string
    name: string
    decimals: number
    logoUrl?: string
    address: string
  }
  amount: string
  spenderAddress: string
  spenderName?: string
  currentAllowance?: string
  onApprove: () => Promise<void>
  onSkip?: () => void
  isApproving?: boolean
  error?: string | null
  maxRetries?: number
  retryDelay?: number
}

// Safe parsing utility
function safeParseAmount(value: string | undefined, decimals: number): bigint {
  if (!value || value.trim() === '') return BigInt(0)
  
  try {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '')
    if (!cleanValue) return BigInt(0)
    
    return parseUnits(cleanValue, decimals)
  } catch (error) {
    console.error('Error parsing amount:', error)
    return BigInt(0)
  }
}

// TODO: Replace with actual i18n implementation
const t = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'approval.already_approved': 'Token Already Approved',
    'approval.already_approved_desc': '{symbol} is already approved for bridging',
    'approval.title': 'Token Approval Required',
    'approval.description': 'Allow the bridge contract to transfer your {symbol}',
    'approval.amount_to_approve': 'Amount to approve',
    'approval.current_allowance': 'Current Allowance',
    'approval.show_details': 'Show contract details',
    'approval.hide_details': 'Hide contract details',
    'approval.contract_name': 'Contract Name',
    'approval.contract_address': 'Contract Address',
    'approval.token_address': 'Token Address',
    'approval.retry_attempt': 'Retry attempt {current} of {max}',
    'approval.retrying': 'Retrying approval...',
    'approval.approving': 'Approving...',
    'approval.approve_token': 'Approve {symbol}',
    'approval.skip': 'Skip',
    'approval.security_note_title': 'Security Note',
    'approval.security_note_desc': 'Token approval is a standard DeFi practice. You\'re allowing the bridge contract to transfer only the specified amount of {symbol} on your behalf.',
    'approval.security_tooltip': 'Approvals are required by ERC-20 tokens to allow smart contracts to transfer tokens on your behalf. This is a one-time approval for the amount you\'re bridging.',
    'approval.learn_more': 'Learn more about token approvals'
  }
  
  let text = translations[key] || key
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v))
    })
  }
  return text
}

export function ApprovalStep({
  token,
  amount,
  spenderAddress,
  spenderName = 'Bridge Contract',
  currentAllowance = '0',
  onApprove,
  onSkip,
  isApproving = false,
  error = null,
  maxRetries = 3,
  retryDelay = 1000
}: ApprovalStepProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const lastRetryTime = useRef<number>(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Memoized approval check using BigInt
  const needsApproval = useMemo(() => {
    const currentAllowanceBN = safeParseAmount(currentAllowance, token.decimals)
    const amountBN = safeParseAmount(amount, token.decimals)
    return currentAllowanceBN < amountBN
  }, [currentAllowance, amount, token.decimals])

  // Check if current allowance is greater than zero
  const hasExistingAllowance = useMemo(() => {
    return safeParseAmount(currentAllowance, token.decimals) > 0n
  }, [currentAllowance, token.decimals])

  // Auto-skip if already approved
  useEffect(() => {
    if (!needsApproval && onSkip) {
      onSkip()
    }
  }, [needsApproval, onSkip])

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  // Handle approval with retry logic and debounce
  const handleApprove = useCallback(async () => {
    // Prevent rapid retries
    const now = Date.now()
    if (now - lastRetryTime.current < retryDelay) {
      return
    }
    lastRetryTime.current = now

    try {
      setIsRetrying(false)
      await onApprove()
      setRetryCount(0)
    } catch (err) {
      console.error('Approval failed:', err)
      
      // Auto-retry logic with exponential backoff
      if (retryCount < maxRetries) {
        setIsRetrying(true)
        const delay = retryDelay * Math.pow(2, retryCount) // Exponential backoff
        
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1)
          handleApprove()
        }, delay)
      }
    }
  }, [onApprove, retryCount, maxRetries, retryDelay])

  if (!needsApproval) {
    return (
      <Card className="p-6 border-green-500/20 bg-green-500/5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="font-medium text-white">
              {t('approval.already_approved')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('approval.already_approved_desc', { symbol: token.symbol })}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t('approval.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('approval.description', { symbol: token.symbol })}
        </p>
      </div>

      {/* Token Info */}
      <div className="bg-background/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {token.logoUrl ? (
              <img 
                src={token.logoUrl} 
                alt={`${token.symbol} logo`}
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  // Fallback to placeholder
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">
                  {token.symbol.slice(0, 2)}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-white">{token.symbol}</p>
              <p className="text-sm text-muted-foreground">{token.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono font-medium text-white">
              {formatTokenAmount(amount, token.symbol, token.decimals)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('approval.amount_to_approve')}
            </p>
          </div>
        </div>

        {/* Current Allowance */}
        {hasExistingAllowance && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('approval.current_allowance')}
              </span>
              <span className="font-mono text-warning">
                {formatTokenAmount(currentAllowance, token.symbol, token.decimals)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contract Details */}
      <div className="space-y-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          aria-expanded={showDetails}
          aria-controls="contract-details"
        >
          {showDetails ? t('approval.hide_details') : t('approval.show_details')}
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        
        <AnimatePresence>
          {showDetails && (
            <motion.div
              id="contract-details"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-background/30 rounded-lg p-3 space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('approval.contract_name')}</p>
                  <p className="font-mono text-white">{spenderName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('approval.contract_address')}</p>
                  <p className="font-mono text-white break-all">
                    {spenderAddress}
                    <a
                      href={`https://etherscan.io/address/${spenderAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 inline-flex"
                      aria-label="View on Etherscan"
                    >
                      <ExternalLink className="w-3 h-3 text-primary" />
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('approval.token_address')}</p>
                  <p className="font-mono text-white break-all">
                    {token.address}
                    <a
                      href={`https://etherscan.io/token/${token.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 inline-flex"
                      aria-label="View token on Etherscan"
                    >
                      <ExternalLink className="w-3 h-3 text-primary" />
                    </a>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-2 p-3 bg-error/10 border border-error/20 rounded-lg"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="text-sm text-error">{error}</p>
              {retryCount > 0 && retryCount < maxRetries && (
                <p className="text-xs text-error/80">
                  {t('approval.retry_attempt', { current: retryCount, max: maxRetries })}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retry Loading State */}
      <AnimatePresence>
        {isRetrying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('approval.retrying')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleApprove}
          disabled={isApproving || isRetrying}
          className="flex-1"
          variant="primary"
          aria-busy={isApproving || isRetrying}
        >
          {isApproving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('approval.approving')}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {t('approval.approve_token', { symbol: token.symbol })}
            </>
          )}
        </Button>
        {onSkip && (
          <Button
            onClick={onSkip}
            variant="ghost"
            disabled={isApproving || isRetrying}
          >
            {t('approval.skip')}
          </Button>
        )}
      </div>

      {/* Security Note with Tooltip */}
      <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg">
        <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">
              {t('approval.security_note_title')}
            </p>
            <Tooltip content={t('approval.security_tooltip')}>
              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
            </Tooltip>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('approval.security_note_desc', { symbol: token.symbol })}
          </p>
          <a
            href="https://docs.example.com/token-approvals"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
          >
            {t('approval.learn_more')}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Card>
  )
}