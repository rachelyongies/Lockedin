import { describe, it, expect } from '@jest/globals';

// Type definitions for testing
interface RouteStep {
  protocol: string;
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedOutput: string;
  fee: string;
}

interface RouteProposal {
  id: string;
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedOutput: string;
  path: RouteStep[];
  estimatedGas: string;
  estimatedTime: number;
  priceImpact: string;
  confidence: number;
  risks: string[];
  advantages: string[];
  proposedBy: string;
}

interface IntelligentRoute extends RouteProposal {
  source: '1inch-fusion' | '1inch-aggregation' | '1inch-hybrid';
  reasoning: string[];
  userPreference?: 'speed' | 'cost' | 'security' | 'balanced';
}

// Helper functions for testing
const createMockRoute = (overrides: Partial<IntelligentRoute> = {}): IntelligentRoute => ({
  id: 'test-route-1',
  fromToken: 'USDC',
  toToken: 'ETH',
  amount: '1000000',
  estimatedOutput: '0.416666',
  path: [{
    protocol: '1inch Fusion',
    fromToken: 'USDC',
    toToken: 'ETH',
    amount: '1000000',
    estimatedOutput: '0.416666',
    fee: '0'
  }],
  estimatedGas: '150000',
  estimatedTime: 180,
  priceImpact: '0.001',
  confidence: 0.95,
  risks: ['Network congestion'],
  advantages: ['MEV protection'],
  proposedBy: '1inch-fusion-intelligent',
  source: '1inch-fusion',
  reasoning: ['Best execution via Fusion'],
  ...overrides
});

const validateRoute = (route: IntelligentRoute): boolean => {
  return (
    route.id.length > 0 &&
    route.confidence >= 0 && route.confidence <= 1 &&
    parseFloat(route.estimatedOutput) > 0 &&
    route.path.length > 0
  );
};

describe('Route Types and Models', () => {
  describe('RouteStep Interface', () => {
    it('should have all required properties', () => {
      const step: RouteStep = {
        protocol: '1inch Fusion',
        fromToken: 'USDC',
        toToken: 'ETH',
        amount: '1000000',
        estimatedOutput: '0.416666',
        fee: '0'
      };

      expect(step.protocol).toBe('1inch Fusion');
      expect(step.fromToken).toBe('USDC');
      expect(step.toToken).toBe('ETH');
      expect(parseFloat(step.amount)).toBeGreaterThan(0);
    });
  });

  describe('IntelligentRoute Interface', () => {
    it('should create valid fusion routes', () => {
      const route = createMockRoute({
        source: '1inch-fusion',
        userPreference: 'security'
      });

      expect(route.source).toBe('1inch-fusion');
      expect(route.userPreference).toBe('security');
      expect(validateRoute(route)).toBe(true);
    });

    it('should create valid aggregation routes', () => {
      const route = createMockRoute({
        source: '1inch-aggregation',
        userPreference: 'speed',
        estimatedTime: 60
      });

      expect(route.source).toBe('1inch-aggregation');
      expect(route.userPreference).toBe('speed');
      expect(route.estimatedTime).toBe(60);
    });

    it('should create valid hybrid routes', () => {
      const route = createMockRoute({
        source: '1inch-hybrid',
        reasoning: ['AI-optimized selection', 'Best of both approaches']
      });

      expect(route.source).toBe('1inch-hybrid');
      expect(route.reasoning).toHaveLength(2);
      expect(route.reasoning[0]).toContain('AI-optimized');
    });
  });

  describe('Route Validation', () => {
    it('should validate correct routes', () => {
      const validRoute = createMockRoute();
      expect(validateRoute(validRoute)).toBe(true);
    });

    it('should reject routes with invalid confidence', () => {
      const invalidRoute = createMockRoute({ confidence: 1.5 });
      expect(validateRoute(invalidRoute)).toBe(false);
    });

    it('should reject routes with no output', () => {
      const invalidRoute = createMockRoute({ estimatedOutput: '0' });
      expect(validateRoute(invalidRoute)).toBe(false);
    });

    it('should reject routes with empty path', () => {
      const invalidRoute = createMockRoute({ path: [] });
      expect(validateRoute(invalidRoute)).toBe(false);
    });
  });

  describe('User Preferences', () => {
    it('should support all preference types', () => {
      const preferences: Array<'speed' | 'cost' | 'security' | 'balanced'> = [
        'speed', 'cost', 'security', 'balanced'
      ];

      preferences.forEach(pref => {
        const route = createMockRoute({ userPreference: pref });
        expect(route.userPreference).toBe(pref);
      });
    });

    it('should handle undefined preferences', () => {
      const route = createMockRoute({ userPreference: undefined });
      expect(route.userPreference).toBeUndefined();
    });
  });

  describe('Route Sources', () => {
    it('should support all route sources', () => {
      const sources: Array<'1inch-fusion' | '1inch-aggregation' | '1inch-hybrid'> = [
        '1inch-fusion', '1inch-aggregation', '1inch-hybrid'
      ];

      sources.forEach(source => {
        const route = createMockRoute({ source });
        expect(route.source).toBe(source);
      });
    });
  });

  describe('Risk and Advantage Arrays', () => {
    it('should handle multiple risks', () => {
      const risks = ['Network congestion', 'MEV exposure', 'Gas volatility'];
      const route = createMockRoute({ risks });
      
      expect(route.risks).toHaveLength(3);
      expect(route.risks).toContain('MEV exposure');
    });

    it('should handle multiple advantages', () => {
      const advantages = ['MEV protection', 'Optimal pricing', 'Fast execution'];
      const route = createMockRoute({ advantages });
      
      expect(route.advantages).toHaveLength(3);
      expect(route.advantages).toContain('Optimal pricing');
    });
  });
});