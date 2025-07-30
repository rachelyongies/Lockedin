import { AISmartRoutingService } from '@/lib/services/ai-smart-routing';
import { Token, BridgeRoute } from '@/types/bridge';

// Mock tokens for testing
const mockBTCToken: Token = {
  id: 'btc-bitcoin',
  symbol: 'BTC',
  name: 'Bitcoin',
  decimals: 8,
  network: 'bitcoin',
  chainId: 'mainnet',
  logoUrl: 'https://example.com/btc.png',
  coingeckoId: 'bitcoin',
  isWrapped: false,
  verified: true,
  displayPrecision: 8,
  description: 'Bitcoin is a decentralized digital currency',
  tags: ['native', 'cryptocurrency'],
  isNative: true
};

const mockETHToken: Token = {
  id: 'eth-ethereum',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  address: '0x0000000000000000000000000000000000000000',
  network: 'ethereum',
  chainId: 1,
  logoUrl: 'https://example.com/eth.png',
  coingeckoId: 'ethereum',
  isWrapped: false,
  verified: true,
  displayPrecision: 6,
  description: 'Ethereum is a decentralized platform',
  tags: ['native', 'ethereum'],
  isNative: true
};

const mockRoutes: BridgeRoute[] = [
  {
    from: mockBTCToken,
    to: mockETHToken,
    limits: {
      min: { raw: '0.001', bn: BigInt('100000'), decimals: 8, formatted: '0.001' },
      max: { raw: '10', bn: BigInt('1000000000'), decimals: 8, formatted: '10.0' }
    },
    estimatedTime: { minutes: 15, blocks: 6 },
    fees: {
      network: {
        amount: { raw: '0.0005', bn: BigInt('50000'), decimals: 8, formatted: '0.0005' },
        amountUSD: 25.50
      },
      protocol: {
        amount: { raw: '0.0003', bn: BigInt('30000'), decimals: 8, formatted: '0.0003' },
        amountUSD: 15.00,
        percent: 0.3
      },
      total: {
        amount: { raw: '0.0008', bn: BigInt('80000'), decimals: 8, formatted: '0.0008' },
        amountUSD: 40.50
      }
    },
    exchangeRate: 15,
    inverseRate: 1/15,
    priceImpact: 0.015,
    available: true,
    warnings: [],
    isWrapping: false,
    requiresApproval: true
  }
];

describe('AISmartRoutingService', () => {
  let aiService: AISmartRoutingService;

  beforeEach(() => {
    aiService = new AISmartRoutingService();
  });

  describe('analyzeAndOptimizeRoutes', () => {
    it('should return optimized routes with AI analysis', async () => {
      const result = await aiService.analyzeAndOptimizeRoutes(
        mockBTCToken,
        mockETHToken,
        0.5,
        mockRoutes
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('confidenceScore');
      expect(result[0]).toHaveProperty('savingsEstimate');
      expect(result[0]).toHaveProperty('riskScore');
      expect(result[0]).toHaveProperty('executionTime');
      expect(result[0]).toHaveProperty('gasOptimization');
      
      // Confidence score should be between 0 and 1
      expect(result[0].confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result[0].confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should sort routes by confidence score', async () => {
      const multipleRoutes = [...mockRoutes, ...mockRoutes, ...mockRoutes];
      const result = await aiService.analyzeAndOptimizeRoutes(
        mockBTCToken,
        mockETHToken,
        0.5,
        multipleRoutes
      );

      // Results should be sorted by confidence score (descending)
      for (let i = 1; i < result.length; i++) {
        expect(result[i-1].confidenceScore).toBeGreaterThanOrEqual(result[i].confidenceScore);
      }
    });
  });

  describe('predictOptimalParameters', () => {
    it('should return ML predictions', async () => {
      const predictions = await aiService.predictOptimalParameters(
        mockBTCToken,
        mockETHToken,
        0.5
      );

      expect(predictions).toHaveProperty('optimalSlippage');
      expect(predictions).toHaveProperty('predictedGasCost');
      expect(predictions).toHaveProperty('successProbability');
      expect(predictions).toHaveProperty('estimatedTime');
      expect(predictions).toHaveProperty('recommendedRoute');

      // Validate ranges
      expect(predictions.optimalSlippage).toBeGreaterThan(0);
      expect(predictions.optimalSlippage).toBeLessThan(1);
      expect(predictions.successProbability).toBeGreaterThanOrEqual(0);
      expect(predictions.successProbability).toBeLessThanOrEqual(1);
      expect(predictions.estimatedTime).toBeGreaterThan(0);
    });
  });

  describe('getSmartInsights', () => {
    it('should generate meaningful insights', async () => {
      const routeAnalyses = await aiService.analyzeAndOptimizeRoutes(
        mockBTCToken,
        mockETHToken,
        0.5,
        mockRoutes
      );

      const insights = aiService.getSmartInsights(routeAnalyses);

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
      
      // Each insight should be a non-empty string
      insights.forEach(insight => {
        expect(typeof insight).toBe('string');
        expect(insight.length).toBeGreaterThan(0);
      });
    });
  });

  describe('recordTransactionResult', () => {
    it('should record transaction results for learning', () => {
      expect(() => {
        aiService.recordTransactionResult(
          mockBTCToken,
          mockETHToken,
          0.5,
          ['BTC', 'ETH'],
          300, // 5 minutes
          45.50, // Gas cost
          0.005, // Slippage
          true // Success
        );
      }).not.toThrow();
    });
  });
});

describe('AI Feature Integration', () => {
  it('should demonstrate complete AI workflow', async () => {
    const aiService = new AISmartRoutingService();

    // Step 1: Get optimized routes
    const routeAnalyses = await aiService.analyzeAndOptimizeRoutes(
      mockBTCToken,
      mockETHToken,
      0.5,
      mockRoutes
    );

    expect(routeAnalyses.length).toBeGreaterThan(0);

    // Step 2: Get ML predictions
    const predictions = await aiService.predictOptimalParameters(
      mockBTCToken,
      mockETHToken,
      0.5
    );

    expect(predictions).toBeDefined();

    // Step 3: Get insights
    const insights = aiService.getSmartInsights(routeAnalyses);
    expect(insights.length).toBeGreaterThan(0);

    // Step 4: Record transaction
    aiService.recordTransactionResult(
      mockBTCToken,
      mockETHToken,
      0.5,
      predictions.recommendedRoute,
      predictions.estimatedTime,
      predictions.predictedGasCost,
      predictions.optimalSlippage,
      true
    );

    // All steps completed successfully
    expect(true).toBe(true);
  });
});