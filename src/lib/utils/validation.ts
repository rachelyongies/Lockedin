/**
 * Validation utilities for bridge form inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates if an amount string is a valid positive number
 */
export function validateAmount(amount: string): ValidationResult {
  if (!amount || amount.trim() === '') {
    return { isValid: true }; // Empty is valid (just not ready for bridge)
  }

  // Check if it's a valid number
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { 
      isValid: false, 
      error: 'Please enter a valid number' 
    };
  }

  if (numAmount <= 0) {
    return { 
      isValid: false, 
      error: 'Amount must be greater than 0' 
    };
  }

  if (numAmount > 1e18) {
    return { 
      isValid: false, 
      error: 'Amount too large' 
    };
  }

  // Check for too many decimal places (max 18)
  const decimalPart = amount.split('.')[1];
  if (decimalPart && decimalPart.length > 18) {
    return { 
      isValid: false, 
      error: 'Too many decimal places' 
    };
  }

  return { isValid: true };
}

/**
 * Validates if amount is within available balance
 */
export function validateBalance(amount: string, balance: string): ValidationResult {
  const amountValidation = validateAmount(amount);
  if (!amountValidation.isValid) {
    return amountValidation;
  }

  if (!amount || !balance) {
    return { isValid: true };
  }

  const numAmount = parseFloat(amount);
  const numBalance = parseFloat(balance);

  if (numAmount > numBalance) {
    return { 
      isValid: false, 
      error: 'Insufficient balance' 
    };
  }

  return { isValid: true };
}

/**
 * Formats amount string for display (removes trailing zeros, limits decimals)
 */
export function formatAmountInput(amount: string, maxDecimals: number = 6): string {
  if (!amount) return '';
  
  // Remove any non-numeric characters except decimal point
  let cleaned = amount.replace(/[^0-9.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    cleaned = parts[0] + '.' + parts[1].substring(0, maxDecimals);
  }
  
  return cleaned;
}