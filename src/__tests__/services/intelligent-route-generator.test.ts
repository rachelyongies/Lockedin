import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IntelligentRouteGenerator } from '../../lib/services/intelligent-route-generator';
import { Token } from '../../types/bridge';

// Mock dependencies
const mockOneInchAggregator = {
  getComprehensiveAnalysis: jest.fn()
};

const mockTokenValidationService = {
  validateTokenPair: jest.fn()
};

jest.mock('../../lib/services/1inch-api-aggregator', () => ({
  oneInchAggregator: mockOneInchAggregator
}));

jest.mock('../../lib/services/token-validation-service', () => ({
  tokenValidationService: mockTokenValidationService
}));

const mockFromToken: Token = {
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  address: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
  chainId: 1,
  logoURI: ''
};

const mockToToken: Token = {
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  chainId: 1,
  logoURI: ''
};

describe('IntelligentRouteGenerator', () => {
  let routeGenerator: IntelligentRouteGenerator;

  beforeEach(() => {
    jest.resetAllMocks();
    routeGenerator = IntelligentRouteGenerator.getInstance();
  });

  describe('generateIntelligentRoutes', () => {
    it('should generate fusion routes when available', async () => {
      // Mock the 1inch aggregator to return fusion data
      const mockAnalysis = {
        quotes: {
          fusion: {
            available: true,
            quote: {
              toTokenAmount: '1000000000000000000',
              gasCost: '150000',
              protocolFee: '0'
            }
          },
          aggregation: {
            available: false,
            quote: null
          },
          savings: { percentage: 0 },
          reasoning: 'Fusion provides better execution'
        },
        gas: {
          recommendation: 'standard',
          current: { standard: 20, fast: 30 },
          trend: 'stable',
          optimalTiming: 'now'
        },
        liquidity: {
          totalSources: 5,
          coverage: { description: 'Good' },
          topSources: [{ title: 'Uniswap V3' }]
        },
        paths: { totalPaths: 3 },
        overall: {
          confidence: 0.9,
          optimalStrategy: 'fusion'
        }
      };

      // Mock token validation
      mockTokenValidationService.validateTokenPair.mockReturnValue({
        isValid: true,
        reason: ''
      });

      // Mock 1inch aggregator
      mockOneInchAggregator.getComprehensiveAnalysis.mockResolvedValue(mockAnalysis);

      const routes = await routeGenerator.generateIntelligentRoutes(
        mockFromToken,
        mockToToken,
        '1000000'
      );

      expect(routes).toHaveLength(1);
      expect(routes[0].source).toBe('1inch-fusion');
      expect(routes[0].fromToken).toBe('USDC');
      expect(routes[0].toToken).toBe('ETH');
      expect(routes[0].estimatedOutput).toBe('1000000000000000000');
    });

    it('should generate aggregation routes when available', async () => {
      const mockAnalysis = {
        quotes: {
          fusion: {
            available: false,
            quote: null
          },
          aggregation: {
            available: true,
            quote: {
              toTokenAmount: '950000000000000000',
              gas: '180000',
              protocols: [['Uniswap_V3', '100']]
            }
          },
          savings: { percentage: 0 },
          reasoning: 'Aggregation provides fast execution'
        },
        gas: {
          recommendation: 'fast',
          current: { standard: 20, fast: 30 },
          trend: 'rising',
          optimalTiming: 'now'
        },
        liquidity: {
          totalSources: 8,
          coverage: { description: 'Excellent' },
          topSources: [
            { title: 'Uniswap V3' },
            { title: 'Curve' },
            { title: 'SushiSwap' }
          ]
        },
        paths: { totalPaths: 5 },
        overall: {
          confidence: 0.85,
          optimalStrategy: 'aggregation'
        }
      };

      mockTokenValidationService.validateTokenPair.mockReturnValue({
        isValid: true,
        reason: ''
      });

      mockOneInchAggregator.getComprehensiveAnalysis.mockResolvedValue(mockAnalysis);

      const routes = await routeGenerator.generateIntelligentRoutes(
        mockFromToken,
        mockToToken,
        '1000000'
      );

      expect(routes).toHaveLength(1);
      expect(routes[0].source).toBe('1inch-aggregation');
      expect(routes[0].reasoning).toContain('1inch Aggregation: Fast execution across multiple DEXs');
    });

    it('should generate hybrid routes when both fusion and aggregation are available', async () => {
      const mockAnalysis = {
        quotes: {
          fusion: {
            available: true,
            quote: {
              toTokenAmount: '1000000000000000000',
              gasCost: '150000'
            }
          },
          aggregation: {
            available: true,
            quote: {
              toTokenAmount: '950000000000000000',
              gas: '180000'
            }
          },
          savings: { percentage: 5.3 },
          reasoning: 'Fusion provides 5.3% better pricing'
        },
        gas: {
          recommendation: 'standard',
          current: { standard: 20, fast: 30 },
          trend: 'stable',
          optimalTiming: 'now'
        },
        liquidity: {
          totalSources: 10,
          coverage: { description: 'Excellent' },
          topSources: [{ title: 'Uniswap V3' }]
        },
        paths: { totalPaths: 7 },
        overall: {
          confidence: 0.95,
          optimalStrategy: 'fusion'
        }
      };

      mockTokenValidationService.validateTokenPair.mockReturnValue({
        isValid: true,
        reason: ''
      });

      mockOneInchAggregator.getComprehensiveAnalysis.mockResolvedValue(mockAnalysis);

      const routes = await routeGenerator.generateIntelligentRoutes(
        mockFromToken,
        mockToToken,
        '1000000'
      );

      expect(routes).toHaveLength(3); // Fusion + Aggregation + Hybrid
      
      // Should have all three route types
      const sources = routes.map(r => r.source);
      expect(sources).toContain('1inch-fusion');
      expect(sources).toContain('1inch-aggregation');
      expect(sources).toContain('1inch-hybrid');

      // Hybrid should be first (highest priority)
      expect(routes[0].source).toBe('1inch-hybrid');
    });

    it('should handle user preferences for route sorting', async () => {
      const mockAnalysis = {
        quotes: {
          fusion: {
            available: true,
            quote: { toTokenAmount: '1000000000000000000', gasCost: '150000' }
          },
          aggregation: {
            available: true,
            quote: { toTokenAmount: '950000000000000000', gas: '180000' }
          },
          savings: { percentage: 5.3 },
          reasoning: 'Fusion provides better pricing'
        },
        gas: {
          recommendation: 'standard',
          current: { standard: 20, fast: 30 },
          trend: 'stable',
          optimalTiming: 'now'
        },
        liquidity: {
          totalSources: 10,
          coverage: { description: 'Excellent' },
          topSources: [{ title: 'Uniswap V3' }]
        },
        paths: { totalPaths: 7 },
        overall: {
          confidence: 0.95,
          optimalStrategy: 'fusion'
        }
      };

      mockTokenValidationService.validateTokenPair.mockReturnValue({
        isValid: true,
        reason: ''
      });

      mockOneInchAggregator.getComprehensiveAnalysis.mockResolvedValue(mockAnalysis);

      // Test speed preference
      const speedRoutes = await routeGenerator.generateIntelligentRoutes(
        mockFromToken,
        mockToToken,
        '1000000',
        undefined,
        { userPreference: 'speed' }
      );

      expect(speedRoutes[0].userPreference).toBe('speed');

      // Test cost preference
      const costRoutes = await routeGenerator.generateIntelligentRoutes(
        mockFromToken,
        mockToToken,
        '1000000',
        undefined,
        { userPreference: 'cost' }
      );

      expect(costRoutes[0].userPreference).toBe('cost');
    });

    it('should handle invalid token pairs', async () => {
      mockTokenValidationService.validateTokenPair.mockReturnValue({
        isValid: false,
        reason: 'Unsupported token pair'
      });

      const routes = await routeGenerator.generateIntelligentRoutes(
        mockFromToken,
        mockToToken,
        '1000000'
      );

      expect(routes).toHaveLength(0);
    });

    it('should handle API failures gracefully', async () => {
      const mockAnalysis = {
        quotes: {
          fusion: { available: false, quote: null },
          aggregation: { available: false, quote: null },
          savings: { percentage: 0 },
          reasoning: 'All APIs failed'
        },
        gas: {
          recommendation: 'standard',
          current: { standard: 20, fast: 30 },
          trend: 'stable',
          optimalTiming: 'later'
        },
        liquidity: {
          totalSources: 0,
          coverage: { description: 'Poor' },
          topSources: []
        },
        paths: { totalPaths: 0 },
        overall: {
          confidence: 0.1,
          optimalStrategy: 'retry'
        }
      };

      mockTokenValidationService.validateTokenPair.mockReturnValue({
        isValid: true,
        reason: ''
      });

      mockOneInchAggregator.getComprehensiveAnalysis.mockResolvedValue(mockAnalysis);

      const routes = await routeGenerator.generateIntelligentRoutes(
        mockFromToken,
        mockToToken,
        '1000000'
      );

      expect(routes).toHaveLength(0);
    });
  });
});