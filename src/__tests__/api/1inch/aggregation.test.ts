import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/1inch/aggregation/quote/route';

// Mock the 1inch API
global.fetch = jest.fn();

describe('1inch Aggregation Quote API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/1inch/aggregation/quote', () => {
    it('should fetch aggregation quote successfully', async () => {
      const mockAggregationResponse = {
        fromToken: {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          decimals: 6
        },
        toToken: {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          decimals: 18
        },
        toTokenAmount: '1000000000000000000',
        fromTokenAmount: '2400000000',
        protocols: [
          [['Uniswap_V3', 50], ['SushiSwap', 30], ['Curve', 20]]
        ],
        estimatedGas: 180000,
        tx: {
          from: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          to: '0x1111111254eeb25477b68fb85ed929f73a960582',
          data: '0x...',
          value: '0',
          gasPrice: '20000000000'
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAggregationResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/aggregation/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '1000000',
          fromAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          slippage: 1
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAggregationResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.1inch.dev/swap/v6.0/1/swap'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('should handle multi-chain aggregation requests', async () => {
      const mockPolygonResponse = {
        fromToken: { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
        toToken: { symbol: 'WMATIC', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' },
        toTokenAmount: '100000000000000000000',
        fromTokenAmount: '100000000',
        protocols: [['QuickSwap', '60'], ['SushiSwap', '40']],
        estimatedGas: 120000
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPolygonResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/aggregation/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 137,
          fromTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          toTokenAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
          amount: '100000000',
          fromAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          slippage: 1
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.1inch.dev/swap/v6.0/137/swap'),
        expect.any(Object)
      );
    });

    it('should return 400 for missing required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/1inch/aggregation/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          // Missing required fields
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Insufficient liquidity',
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/aggregation/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '1000000',
          fromAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          slippage: 1
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('1inch API error');
    });

    it('should validate slippage parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/1inch/aggregation/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '1000000',
          fromAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          slippage: 51 // Too high slippage
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('slippage');
    });
  });
});