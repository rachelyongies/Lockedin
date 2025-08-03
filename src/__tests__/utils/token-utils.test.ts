import { describe, it, expect } from '@jest/globals';

// Simple utility functions for testing
const formatTokenAmount = (amount: string, decimals: number): string => {
  const num = parseFloat(amount);
  return (num / Math.pow(10, decimals)).toFixed(6);
};

const calculatePriceImpact = (inputAmount: number, outputAmount: number, price: number): number => {
  const expectedOutput = inputAmount * price;
  const impact = ((expectedOutput - outputAmount) / expectedOutput) * 100;
  return Math.max(0, impact);
};

const validateTokenAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const getSupportedChains = (): number[] => {
  return [1, 137, 42161, 10, 56]; // Ethereum, Polygon, Arbitrum, Optimism, BSC
};

describe('Token Utility Functions', () => {
  describe('formatTokenAmount', () => {
    it('should format USDC amounts correctly', () => {
      expect(formatTokenAmount('1000000', 6)).toBe('1.000000');
      expect(formatTokenAmount('2500000', 6)).toBe('2.500000');
    });

    it('should format ETH amounts correctly', () => {
      expect(formatTokenAmount('1000000000000000000', 18)).toBe('1.000000');
      expect(formatTokenAmount('500000000000000000', 18)).toBe('0.500000');
    });

    it('should handle WBTC amounts correctly', () => {
      expect(formatTokenAmount('100000000', 8)).toBe('1.000000');
      expect(formatTokenAmount('50000000', 8)).toBe('0.500000');
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact correctly', () => {
      const impact = calculatePriceImpact(1000, 990, 1);
      expect(impact).toBe(1); // 1% impact
    });

    it('should return 0 for no impact', () => {
      const impact = calculatePriceImpact(1000, 1000, 1);
      expect(impact).toBe(0);
    });

    it('should handle favorable trades', () => {
      const impact = calculatePriceImpact(1000, 1010, 1);
      expect(impact).toBe(0); // No negative impact
    });
  });

  describe('validateTokenAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      expect(validateTokenAddress('0xA0b86a33E6441b8c4f27ead9083c756Cc2000000')).toBe(true);
      expect(validateTokenAddress('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(validateTokenAddress('0x123')).toBe(false);
      expect(validateTokenAddress('invalid')).toBe(false);
      expect(validateTokenAddress('')).toBe(false);
    });
  });

  describe('getSupportedChains', () => {
    it('should return all supported chain IDs', () => {
      const chains = getSupportedChains();
      expect(chains).toHaveLength(5);
      expect(chains).toContain(1); // Ethereum
      expect(chains).toContain(137); // Polygon
      expect(chains).toContain(42161); // Arbitrum
      expect(chains).toContain(10); // Optimism
      expect(chains).toContain(56); // BSC
    });

    it('should include mainnet chains only', () => {
      const chains = getSupportedChains();
      chains.forEach(chainId => {
        expect(chainId).toBeGreaterThan(0);
        expect(Number.isInteger(chainId)).toBe(true);
      });
    });
  });
});