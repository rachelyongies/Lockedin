'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { InfoIcon, ClockIcon, TrendingDownIcon, ShieldCheckIcon, AlertTriangleIcon } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { Token, BridgeQuote } from '@/types/bridge';
import { fadeInVariants } from '@/lib/utils/motionVariants';
import { safeFixed, formatTokenAmount, formatDuration } from '@/lib/utils/format';
import { useCountdown } from '@/hooks/useCountdown';

export interface BridgeDetailsProps {
  quote?: BridgeQuote | null;
  loading?: boolean;
  error?: string;
  showExpiryTimer?: boolean;
  className?: string;
  'data-testid'?: string;
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
  loading?: boolean;
  error?: boolean;
  icon?: React.ReactElement;
  testId?: string;
}

// Shared styles for consistency and DRYness
const rowBaseClasses = 'flex items-center justify-between py-2 px-1 hover:bg-background-secondary/30 rounded-md transition-colors';
const labelBaseClasses = 'text-sm text-text-secondary';
const valueBaseClasses = 'text-sm font-medium text-text-primary';
const iconBaseClasses = 'w-3 h-3 text-text-tertiary';

const DetailRow: React.FC<DetailRowProps> = ({ 
  label, 
  value, 
  tooltip, 
  loading = false, 
  error = false,
  icon,
  testId
}) => (
  <div className={cn(rowBaseClasses, error && 'text-error')}>
    <div className="flex items-center space-x-2">
      {icon && React.cloneElement(icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, {
        className: cn(iconBaseClasses, (icon.props as React.SVGProps<SVGSVGElement>).className)
      })}
      <span className={labelBaseClasses}>{label}</span>
      {tooltip && (
        <Tooltip content={tooltip} placement="top">
          <InfoIcon className={cn(iconBaseClasses, 'text-text-quaternary hover:text-text-tertiary cursor-help')} />
        </Tooltip>
      )}
    </div>
    <div className={valueBaseClasses} data-testid={testId}>
      {loading ? <Skeleton className="h-4 w-16" /> : value}
    </div>
  </div>
);

const BridgeDetails: React.FC<BridgeDetailsProps> = ({
  quote,
  loading = false,
  error,
  showExpiryTimer = false, // Reserved for future expiry timer feature
  className,
  'data-testid': testId, // Reserved for testing
}) => {
  // Live countdown for quote expiration
  const secondsLeft = useCountdown(quote?.expiresAt || 0);

  // Memoized derived values for performance
  const derivedValues = useMemo(() => {
    if (!quote) {
      return {
        exchangeRate: '—',
        totalFee: '—',
        networkFee: '—',
        protocolFee: '—',
        minimumReceived: '—',
        priceImpact: '—',
        estimatedTime: '—',
        isExpiringSoon: false,
        isPriceImpactHigh: false,
        priceImpactNumber: 0,
      };
    }

    const exchangeRate = `1 ${quote.fromToken.symbol} = ${safeFixed(quote.exchangeRate, 6)} ${quote.toToken.symbol}`;
    const totalFee = formatTokenAmount(quote.totalFee, quote.fromToken.symbol, 6);
    const networkFee = formatTokenAmount(quote.networkFee, quote.fromToken.symbol, 6);
    const protocolFee = formatTokenAmount(quote.protocolFee, quote.fromToken.symbol, 6);
    const minimumReceived = formatTokenAmount(quote.minimumReceived, quote.toToken.symbol, 6);
    const priceImpact = `${safeFixed(quote.priceImpact, 2)}%`;
    const estimatedTime = quote.estimatedTime;
    
    const isExpiringSoon = secondsLeft < 10;
    const priceImpactNumber = parseFloat(quote.priceImpact || '0');
    const isPriceImpactHigh = priceImpactNumber > 1;

    return {
      exchangeRate,
      totalFee,
      networkFee,
      protocolFee,
      minimumReceived,
      priceImpact,
      estimatedTime,
      isExpiringSoon,
      isPriceImpactHigh,
      priceImpactNumber,
    };
  }, [quote, secondsLeft]);

  // Progress bar for quote expiration
  const expirationProgress = useMemo(() => {
    if (!quote || secondsLeft <= 0) return 0;
    const totalTime = 30; // 30 seconds total
    return (secondsLeft / totalTime) * 100;
  }, [quote, secondsLeft]);

  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
      data-testid="bridge-details"
    >
      <Card variant="glass" className={cn(
        'transition-all duration-200',
        error && 'border-error/30',
        derivedValues.isExpiringSoon && 'border-warning/50 shadow-warning/10'
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Bridge Details</span>
            {derivedValues.isExpiringSoon && (
              <Tooltip content="Quote expires soon - confirm quickly!" placement="left">
                <div className="flex items-center space-x-1 text-warning text-xs">
                  <ClockIcon className={iconBaseClasses} />
                  <span>Expiring</span>
                </div>
              </Tooltip>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-1">
          {error ? (
            <div className="text-center py-4 text-error text-sm" data-testid="bridge-details-error">
              <div className="flex items-center justify-center space-x-2">
                <TrendingDownIcon className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <>
              {/* High Price Impact Warning */}
              {derivedValues.isPriceImpactHigh && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-md p-2 mb-2"
                  data-testid="high-price-impact-warning"
                >
                  <AlertTriangleIcon className="w-3 h-3 flex-shrink-0" />
                  <span>High price impact ({derivedValues.priceImpactNumber.toFixed(2)}%)</span>
                </motion.div>
              )}

              {/* Exchange Rate */}
              <DetailRow
                label="Exchange Rate"
                value={derivedValues.exchangeRate}
                tooltip="Current exchange rate between the selected tokens"
                loading={loading}
                icon={<TrendingDownIcon />}
                testId="bridge-detail-exchange-rate"
              />

              {/* Estimated Time */}
              <DetailRow
                label="Estimated Time"
                value={derivedValues.estimatedTime}
                tooltip="Expected time for the bridge transaction to complete"
                loading={loading}
                icon={<ClockIcon />}
                testId="bridge-detail-estimated-time"
              />

              {/* Network Fee */}
              <DetailRow
                label="Network Fee"
                value={derivedValues.networkFee}
                tooltip="Gas fee paid to the blockchain network"
                loading={loading}
                testId="bridge-detail-network-fee"
              />

              {/* Protocol Fee */}
              <DetailRow
                label="Protocol Fee"
                value={derivedValues.protocolFee}
                tooltip="Fee paid to the bridge protocol"
                loading={loading}
                testId="bridge-detail-protocol-fee"
              />

              {/* Total Fee */}
              <DetailRow
                label="Total Fee"
                value={derivedValues.totalFee}
                tooltip="Sum of all fees for this bridge transaction"
                loading={loading}
                testId="bridge-detail-total-fee"
              />

              {/* Divider */}
              <div className="border-t border-border-muted my-2" />

              {/* Price Impact */}
              <DetailRow
                label="Price Impact"
                value={derivedValues.priceImpact}
                tooltip="How much this trade affects the token price"
                loading={loading}
                error={derivedValues.isPriceImpactHigh}
                testId="bridge-detail-price-impact"
              />

              {/* Minimum Received */}
              <DetailRow
                label="Minimum Received"
                value={derivedValues.minimumReceived}
                tooltip="Minimum amount you'll receive after slippage (3% tolerance)"
                loading={loading}
                icon={<ShieldCheckIcon />}
                testId="bridge-detail-minimum-received"
              />

              {/* Quote Expiry Timer with Progress Bar */}
              {quote && !loading && secondsLeft > 0 && (
                <div className="pt-3 border-t border-border-muted">
                  <div className="flex items-center justify-between text-xs text-text-quaternary mb-1">
                    <span>Quote expires in</span>
                    <span data-testid="quote-expiry-countdown">{formatDuration(secondsLeft)}</span>
                  </div>
                  <div className="w-full bg-background-tertiary rounded-full h-1">
                    <motion.div
                      className={cn(
                        'h-1 rounded-full transition-colors duration-300',
                        expirationProgress > 50 ? 'bg-success' : 
                        expirationProgress > 20 ? 'bg-warning' : 'bg-error'
                      )}
                      style={{ width: `${expirationProgress}%` }}
                      animate={{ width: `${expirationProgress}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  </div>
                </div>
              )}

              {/* Expired Quote Message */}
              {quote && secondsLeft <= 0 && (
                <div className="text-center py-2 text-error text-xs bg-error/10 border border-error/20 rounded-md" data-testid="quote-expired">
                  Quote expired - please get a fresh quote
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export { BridgeDetails };