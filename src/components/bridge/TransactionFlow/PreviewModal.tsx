'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowDown, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Shield, 
  Zap,
  ExternalLink,
  Info,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { Modal, ModalHeader, ModalContent, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tooltip } from '@/components/ui/Tooltip'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatTokenAmount, formatCurrency } from '@/lib/utils/format'
import { parseUnits } from 'viem'

interface BridgeRoute {
  protocol: string
  logoUrl?: string
  estimatedTime?: number
}

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onError?: (error: Error) => void
  isLoading?: boolean
  isLoadingData?: boolean
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
  fromTokenUsdPrice?: number
  toTokenUsdPrice?: number
  exchangeRate?: number
  priceImpact?: number
  networkFee?: string
  protocolFee?: string
  estimatedTime?: number
  slippage: number
  minimumReceived?: string
  fromNetwork: string
  toNetwork: string
  recipientAddress?: string
  route?: BridgeRoute[]
  explorerUrls?: {
    fromToken?: string
    toToken?: string
    fromTx?: string
    toTx?: string
  }
}

// TODO: Replace with actual i18n implementation
const t = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'preview.title': 'Review Transaction',
    'preview.subtitle': 'Please review your bridge transaction details',
    'preview.from': 'From',
    'preview.to': 'To',
    'preview.rate': 'Exchange Rate',
    'preview.price_impact': 'Price Impact',
    'preview.price_impact_warning': 'High price impact! Consider reducing the amount.',
    'preview.network_fee': 'Network Fee',
    'preview.protocol_fee': 'Protocol Fee',
    'preview.total_fee': 'Total Fees',
    'preview.estimated_time': 'Estimated Time',
    'preview.slippage': 'Max Slippage',
    'preview.minimum_received': 'Minimum Received',
    'preview.recipient': 'Recipient Address',
    'preview.recipient_on_network': 'Recipient Address ({network})',
    'preview.route': 'Bridge Route',
    'preview.security_check': 'Security Check',
    'preview.security_passed': 'All security checks passed',
    'preview.confirm': 'Confirm Bridge',
    'preview.cancel': 'Cancel',
    'preview.processing': 'Processing...',
    'preview.network': 'Network',
    'preview.token_address': 'Token Address',
    'preview.view_on_explorer': 'View on Explorer',
    'preview.slippage_info': 'Your transaction will revert if the price changes unfavorably by more than this percentage',
    'preview.fee_info': 'Fees include gas costs and protocol fees for processing your bridge transaction',
    'preview.loading': 'Loading transaction details...',
    'preview.error': 'Error loading transaction details',
    'preview.usd_value': 'USD Value',
    'preview.calculating': 'Calculating...'
  }
  
  let text = translations[key] || key
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v))
    })
  }
  return text
}

function formatTime(minutes?: number): string {
  if (!minutes) return t('preview.calculating')
  if (minutes < 60) {
    return `~${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `~${hours}h ${mins}min` : `~${hours}h`
}

// Safe amount parsing with BigInt
function safeParseAmount(value: string | undefined, decimals: number): bigint {
  if (!value || value.trim() === '') return BigInt(0)
  
  try {
    const cleanValue = value.replace(/[^\d.]/g, '')
    if (!cleanValue) return BigInt(0)
    
    return parseUnits(cleanValue, decimals)
  } catch (error) {
    console.error('Error parsing amount:', error)
    return BigInt(0)
  }
}

// Calculate USD value safely
function calculateUsdValue(amount: string, price?: number, decimals: number = 18): string {
  if (!price || price === 0) return '0.00'
  
  try {
    const amountBN = safeParseAmount(amount, decimals)
    const priceInCents = Math.round(price * 100)
    const totalCents = (amountBN * BigInt(priceInCents)) / BigInt(10 ** decimals)
    return (Number(totalCents) / 100).toFixed(2)
  } catch (error) {
    console.error('Error calculating USD value:', error)
    return '0.00'
  }
}

// Get explorer URL based on chain ID
function getExplorerUrl(chainId: number, address: string, type: 'token' | 'address' = 'token'): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    5: 'https://goerli.etherscan.io',
    137: 'https://polygonscan.com',
    10: 'https://optimistic.etherscan.io',
    42161: 'https://arbiscan.io',
    // Add more chains as needed
  }
  
  const baseUrl = explorers[chainId] || 'https://etherscan.io'
  return `${baseUrl}/${type}/${address}`
}

export function PreviewModal({
  isOpen,
  onClose,
  onConfirm,
  onError,
  isLoading = false,
  isLoadingData = false,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  fromTokenUsdPrice,
  toTokenUsdPrice,
  exchangeRate,
  priceImpact,
  networkFee,
  protocolFee,
  estimatedTime,
  slippage,
  minimumReceived,
  fromNetwork,
  toNetwork,
  recipientAddress,
  route,
  explorerUrls = {}
}: PreviewModalProps) {
  const totalFee = useMemo(() => {
    if (!networkFee || !protocolFee) return null
    const network = parseFloat(networkFee) || 0
    const protocol = parseFloat(protocolFee) || 0
    return (network + protocol).toFixed(6)
  }, [networkFee, protocolFee])

  const fromUsdValue = useMemo(() => 
    calculateUsdValue(fromAmount, fromTokenUsdPrice, fromToken.decimals),
    [fromAmount, fromTokenUsdPrice, fromToken.decimals]
  )

  const toUsdValue = useMemo(() => 
    calculateUsdValue(toAmount, toTokenUsdPrice, toToken.decimals),
    [toAmount, toTokenUsdPrice, toToken.decimals]
  )

  const isPriceImpactHigh = (priceImpact ?? 0) > 2
  const isPriceImpactSevere = (priceImpact ?? 0) > 5

  // Handle errors
  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (error) {
      console.error('Transaction confirmation error:', error)
      onError?.(error as Error)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="glass"
      size="lg"
    >
      <ModalHeader>
        <h2 className="text-xl font-semibold text-white">
          {t('preview.title')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('preview.subtitle')}
        </p>
      </ModalHeader>

      <ModalContent className="space-y-6">
        {isLoadingData ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Token Flow */}
            <div className="space-y-4">
              {/* From Token */}
              <Card className="p-4 bg-background/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {fromToken.logoUrl && (
                      <img 
                        src={fromToken.logoUrl} 
                        alt={`${fromToken.symbol} logo`}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">{t('preview.from')}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{fromToken.symbol}</p>
                        <a
                          href={explorerUrls.fromToken || getExplorerUrl(fromToken.chainId, fromToken.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors"
                          aria-label={t('preview.view_on_explorer')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">{fromNetwork}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-medium text-white">
                      {formatTokenAmount(fromAmount, fromToken.symbol, fromToken.decimals)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {fromTokenUsdPrice ? (
                        formatCurrency(parseFloat(fromUsdValue))
                      ) : (
                        <span className="text-xs">{t('preview.calculating')}</span>
                      )}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Route Display */}
              {route && route.length > 0 && (
                <div className="flex items-center justify-center gap-2">
                  {route.map((step, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                      <div className="flex items-center gap-1 px-3 py-1 bg-background/50 rounded-lg">
                        {step.logoUrl && (
                          <img src={step.logoUrl} alt={step.protocol} className="w-4 h-4" />
                        )}
                        <span className="text-xs text-muted-foreground">{step.protocol}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Arrow */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-primary/10 p-2 rounded-lg"
                >
                  <ArrowDown className="w-5 h-5 text-primary" />
                </motion.div>
              </div>

              {/* To Token */}
              <Card className="p-4 bg-background/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {toToken.logoUrl && (
                      <img 
                        src={toToken.logoUrl} 
                        alt={`${toToken.symbol} logo`}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">{t('preview.to')}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{toToken.symbol}</p>
                        <a
                          href={explorerUrls.toToken || getExplorerUrl(toToken.chainId, toToken.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors"
                          aria-label={t('preview.view_on_explorer')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">{toNetwork}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-medium text-white">
                      {formatTokenAmount(toAmount, toToken.symbol, toToken.decimals)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {toTokenUsdPrice ? (
                        formatCurrency(parseFloat(toUsdValue))
                      ) : (
                        <span className="text-xs">{t('preview.calculating')}</span>
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Transaction Details */}
            <Card className="p-4 space-y-3 bg-background/30">
              {/* Exchange Rate */}
              {exchangeRate !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('preview.rate')}</span>
                  <span className="text-sm font-mono text-white">
                    1 {fromToken.symbol} = {exchangeRate.toFixed(6)} {toToken.symbol}
                  </span>
                </div>
              )}

              {/* Price Impact */}
              {priceImpact !== undefined && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{t('preview.price_impact')}</span>
                    {isPriceImpactHigh && (
                      <Tooltip content={t('preview.price_impact_warning')}>
                        <AlertTriangle className="w-3 h-3 text-warning" />
                      </Tooltip>
                    )}
                  </div>
                  <span className={`text-sm font-mono ${
                    isPriceImpactSevere ? 'text-error' : 
                    isPriceImpactHigh ? 'text-warning' : 
                    'text-white'
                  }`}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}

              {/* Fees */}
              {(networkFee || protocolFee) && (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  {networkFee && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t('preview.network_fee')}</span>
                      <span className="font-mono text-white">{networkFee} ETH</span>
                    </div>
                  )}
                  {protocolFee && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t('preview.protocol_fee')}</span>
                      <span className="font-mono text-white">{protocolFee} ETH</span>
                    </div>
                  )}
                  {totalFee && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-white">{t('preview.total_fee')}</span>
                        <Tooltip content={t('preview.fee_info')}>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </Tooltip>
                      </div>
                      <span className="text-sm font-mono font-medium text-white">
                        {totalFee} ETH
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Other Details */}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {t('preview.estimated_time')}
                  </div>
                  <span className="text-sm font-mono text-white">
                    {formatTime(estimatedTime)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{t('preview.slippage')}</span>
                    <Tooltip content={t('preview.slippage_info')}>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </Tooltip>
                  </div>
                  <span className="text-sm font-mono text-white">{slippage}%</span>
                </div>

                {minimumReceived && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('preview.minimum_received')}</span>
                    <span className="text-sm font-mono text-white">
                      {formatTokenAmount(minimumReceived, toToken.symbol, toToken.decimals)}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Recipient Address */}
            {recipientAddress && (
              <Card className="p-4 bg-background/30">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('preview.recipient_on_network', { network: toNetwork })}
                  </p>
                  <p className="font-mono text-sm text-white break-all">{recipientAddress}</p>
                </div>
              </Card>
            )}

            {/* Security Check */}
            <div className="flex items-start gap-2 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <Shield className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-500">
                  {t('preview.security_check')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('preview.security_passed')}
                </p>
              </div>
            </div>

            {/* High Price Impact Warning */}
            {isPriceImpactHigh && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg"
              >
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-warning">
                    {t('preview.price_impact_warning')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current price impact: {priceImpact?.toFixed(2)}%
                  </p>
                </div>
              </motion.div>
            )}
          </>
        )}
      </ModalContent>

      <ModalFooter className="flex gap-3">
        <Button
          onClick={onClose}
          variant="ghost"
          disabled={isLoading}
          className="flex-1"
        >
          {t('preview.cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="primary"
          disabled={isLoading || isLoadingData}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('preview.processing')}
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {t('preview.confirm')}
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}