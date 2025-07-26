/**
 * Safe formatting utilities for numbers, currencies, and time
 */

/**
 * Safely formats a number to fixed decimal places
 * Returns fallback string if value is invalid
 */
export function safeFixed(
  value?: string | number | null, 
  decimals: number = 6, 
  fallback: string = '—'
): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return fallback;
  }
  
  return numValue.toFixed(decimals);
}

/**
 * Formats a number using Intl.NumberFormat for localization
 */
export function formatNumber(
  value: string | number,
  options: Intl.NumberFormatOptions = {}
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '—';
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
    ...options,
  }).format(numValue);
}

/**
 * Formats a currency value with proper localization
 */
export function formatCurrency(
  value: string | number,
  currency: string = 'USD',
  options: Intl.NumberFormatOptions = {}
): string {
  return formatNumber(value, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
}

/**
 * Formats a percentage with proper localization
 */
export function formatPercentage(
  value: string | number,
  decimals: number = 2
): string {
  return formatNumber(value, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats a token amount with appropriate decimal places
 */
export function formatTokenAmount(
  amount: string | number,
  symbol?: string,
  decimals?: number
): string {
  const formatted = formatNumber(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals || 6,
  });
  
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Formats time duration in a human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}