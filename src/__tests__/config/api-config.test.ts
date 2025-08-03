import { describe, it, expect } from '@jest/globals';

// API Configuration tests
const API_CONFIGS = {
  FUSION_BASE_URL: 'https://api.1inch.dev/fusion/quoter/v2.0',
  AGGREGATION_BASE_URL: 'https://api.1inch.dev/swap/v6.0',
  PORTFOLIO_BASE_URL: 'https://api.1inch.dev/portfolio/v4.0',
  ORDERBOOK_BASE_URL: 'https://api.1inch.dev/orderbook/v4.0',
  SUPPORTED_CHAINS: {
    ETHEREUM: 1,
    POLYGON: 137,
    ARBITRUM: 42161,
    OPTIMISM: 10,
    BSC: 56
  }
};

const validateApiUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && urlObj.hostname === 'api.1inch.dev';
  } catch {
    return false;
  }
};

const buildApiEndpoint = (baseUrl: string, chainId: number, path: string): string => {
  return `${baseUrl}/${chainId}/${path}`;
};

describe('API Configuration Tests', () => {
  describe('API Base URLs', () => {
    it('should have valid 1inch API URLs', () => {
      expect(validateApiUrl(API_CONFIGS.FUSION_BASE_URL)).toBe(true);
      expect(validateApiUrl(API_CONFIGS.AGGREGATION_BASE_URL)).toBe(true);
      expect(validateApiUrl(API_CONFIGS.PORTFOLIO_BASE_URL)).toBe(true);
      expect(validateApiUrl(API_CONFIGS.ORDERBOOK_BASE_URL)).toBe(true);
    });

    it('should use HTTPS protocol', () => {
      Object.values(API_CONFIGS).forEach(config => {
        if (typeof config === 'string') {
          expect(config.startsWith('https://')).toBe(true);
        }
      });
    });

    it('should point to official 1inch domain', () => {
      const urls = [
        API_CONFIGS.FUSION_BASE_URL,
        API_CONFIGS.AGGREGATION_BASE_URL,
        API_CONFIGS.PORTFOLIO_BASE_URL,
        API_CONFIGS.ORDERBOOK_BASE_URL
      ];
      
      urls.forEach(url => {
        expect(url).toContain('api.1inch.dev');
      });
    });
  });

  describe('Supported Chain IDs', () => {
    it('should have all major chain IDs defined', () => {
      expect(API_CONFIGS.SUPPORTED_CHAINS.ETHEREUM).toBe(1);
      expect(API_CONFIGS.SUPPORTED_CHAINS.POLYGON).toBe(137);
      expect(API_CONFIGS.SUPPORTED_CHAINS.ARBITRUM).toBe(42161);
      expect(API_CONFIGS.SUPPORTED_CHAINS.OPTIMISM).toBe(10);
      expect(API_CONFIGS.SUPPORTED_CHAINS.BSC).toBe(56);
    });

    it('should have unique chain IDs', () => {
      const chainIds = Object.values(API_CONFIGS.SUPPORTED_CHAINS);
      const uniqueIds = new Set(chainIds);
      expect(uniqueIds.size).toBe(chainIds.length);
    });
  });

  describe('API Endpoint Building', () => {
    it('should build fusion endpoints correctly', () => {
      const endpoint = buildApiEndpoint(API_CONFIGS.FUSION_BASE_URL, 1, 'quote');
      expect(endpoint).toBe('https://api.1inch.dev/fusion/quoter/v2.0/1/quote');
    });

    it('should build aggregation endpoints correctly', () => {
      const endpoint = buildApiEndpoint(API_CONFIGS.AGGREGATION_BASE_URL, 137, 'swap');
      expect(endpoint).toBe('https://api.1inch.dev/swap/v6.0/137/swap');
    });

    it('should handle different chain IDs', () => {
      Object.values(API_CONFIGS.SUPPORTED_CHAINS).forEach(chainId => {
        const endpoint = buildApiEndpoint(API_CONFIGS.PORTFOLIO_BASE_URL, chainId, 'balances');
        expect(endpoint).toContain(`/${chainId}/`);
        expect(endpoint).toContain('balances');
      });
    });
  });

  describe('API Versioning', () => {
    it('should use correct API versions', () => {
      expect(API_CONFIGS.FUSION_BASE_URL).toContain('v2.0');
      expect(API_CONFIGS.AGGREGATION_BASE_URL).toContain('v6.0');
      expect(API_CONFIGS.PORTFOLIO_BASE_URL).toContain('v4.0');
      expect(API_CONFIGS.ORDERBOOK_BASE_URL).toContain('v4.0');
    });

    it('should maintain version consistency', () => {
      // Portfolio and Orderbook should use same version
      const portfolioVersion = API_CONFIGS.PORTFOLIO_BASE_URL.match(/v(\d+\.\d+)/)?.[1];
      const orderbookVersion = API_CONFIGS.ORDERBOOK_BASE_URL.match(/v(\d+\.\d+)/)?.[1];
      expect(portfolioVersion).toBe(orderbookVersion);
    });
  });
});