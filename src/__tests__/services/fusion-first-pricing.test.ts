import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fusionFirstPricing } from '../../lib/services/fusion-first-pricing';
import { Token } from '../../types/bridge';

// Mock dependencies
const mockFusionAPI = {
  getTokenPrices: jest.fn()
};

jest.mock('../../lib/services/1inch-fusion', () => ({
  fusionAPI: mockFusionAPI
}));

jest.mock('../../lib/services/token-validation-service');

const mockTokens: Token[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
    chainId: 1,
    logoURI: ''
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    chainId: 1,
    logoURI: ''
  }
];

describe('FusionFirstPricingService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fusionFirstPricing.clearCache();
  });

  describe('getTokenPrices', () => {
    it('should fetch prices from 1inch Fusion successfully', async () => {
      const mockFusionPrices = {
        '0xa0b86a33e6441b8c4f27ead9083c756cc2': 1.0,
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 2400.0
      };

      mockFusionAPI.getTokenPrices.mockResolvedValue(mockFusionPrices);

      const result = await fusionFirstPricing.getTokenPrices(mockTokens, {
        preferFusion: true,
        fallbackToCoinGecko: false
      });

      expect(result.source).toBe('1inch-fusion');
      expect(result.prices).toEqual(mockFusionPrices);
      expect(result.confidence).toBe(0.95);
      expect(mockFusionAPI.getTokenPrices).toHaveBeenCalledWith([
        '0xa0b86a33e6441b8c4f27ead9083c756cc2',
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ]);
    });

    it('should fallback to CoinGecko when Fusion fails', async () => {
      // Mock Fusion API failure
      mockFusionAPI.getTokenPrices.mockRejectedValue(new Error('Fusion API failed'));

      // Mock successful CoinGecko response
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          'usd-coin': { usd: 1.0 },
          'ethereum': { usd: 2400.0 }
        })
      } as Response);

      const result = await fusionFirstPricing.getTokenPrices(mockTokens, {
        preferFusion: true,
        fallbackToCoinGecko: true
      });

      expect(result.source).toBe('coingecko-fallback');
      expect(result.confidence).toBe(0.8);
      expect(Object.keys(result.prices)).toHaveLength(2);
    });

    it('should use hybrid pricing approach', async () => {
      const mockFusionPrices = {
        '0xa0b86a33e6441b8c4f27ead9083c756cc2': 1.0
      };

      mockFusionAPI.getTokenPrices.mockResolvedValue(mockFusionPrices);

      // Mock CoinGecko response
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          'usd-coin': { usd: 1.0 },
          'ethereum': { usd: 2400.0 }
        })
      } as Response);

      const result = await fusionFirstPricing.getTokenPrices(mockTokens, {
        preferFusion: false // This triggers hybrid approach
      });

      expect(result.source).toBe('hybrid');
      expect(result.confidence).toBe(0.9);
      // Should have prices from both sources, with Fusion taking priority
      expect(result.prices['0xa0b86a33e6441b8c4f27ead9083c756cc2']).toBe(1.0);
      expect(result.prices['0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee']).toBe(2400.0);
    });

    it('should handle token symbols correctly', async () => {
      const tokenSymbols = ['USDC', 'ETH', 'WBTC'];

      const mockFusionPrices = {
        'USDC': 1.0,
        'ETH': 2400.0,
        'WBTC': 45000.0
      };

      mockFusionAPI.getTokenPrices.mockResolvedValue(mockFusionPrices);

      const result = await fusionFirstPricing.getTokenPrices(tokenSymbols);

      expect(result.source).toBe('1inch-fusion');
      expect(result.prices).toEqual(mockFusionPrices);
    });

    it('should cache results properly', async () => {
      const mockFusionPrices = {
        '0xa0b86a33e6441b8c4f27ead9083c756cc2': 1.0
      };

      mockFusionAPI.getTokenPrices.mockResolvedValue(mockFusionPrices);

      // First call
      const result1 = await fusionFirstPricing.getTokenPrices(mockTokens);
      
      // Second call should use cache
      const result2 = await fusionFirstPricing.getTokenPrices(mockTokens);

      expect(mockFusionAPI.getTokenPrices).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should handle complete API failure gracefully', async () => {
      // Mock both APIs failing
      mockFusionAPI.getTokenPrices.mockRejectedValue(new Error('Fusion failed'));

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'CoinGecko failed' })
      } as Response);

      const result = await fusionFirstPricing.getTokenPrices(mockTokens);

      expect(result.source).toBe('all-apis-failed');
      expect(result.confidence).toBe(0.0);
      expect(Object.keys(result.prices)).toHaveLength(0);
    });

    it('should support hackathon-optimized pricing', async () => {
      const mockFusionPrices = {
        '0xa0b86a33e6441b8c4f27ead9083c756cc2': 1.0,
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 2400.0
      };

      mockFusionAPI.getTokenPrices.mockResolvedValue(mockFusionPrices);

      const result = await fusionFirstPricing.getHackathonOptimizedPricing(mockTokens);

      expect(result.source).toBe('1inch-fusion');
      expect(result.confidence).toBe(0.95);
      expect(mockFusionAPI.getTokenPrices).toHaveBeenCalled();
    });
  });

  describe('cache management', () => {
    it('should clear cache properly', () => {
      fusionFirstPricing.clearCache();
      const stats = fusionFirstPricing.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toHaveLength(0);
    });

    it('should provide cache statistics', async () => {
      const mockPrices = { '0x123': 1.0 };
      mockFusionAPI.getTokenPrices.mockResolvedValue(mockPrices);

      await fusionFirstPricing.getTokenPrices(mockTokens);
      
      const stats = fusionFirstPricing.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.keys.length).toBeGreaterThan(0);
    });
  });
});