import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '../../../app/api/1inch/spot-price/[...params]/route';

// Mock the 1inch API
global.fetch = jest.fn();

describe('1inch Spot Price API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/1inch/spot-price', () => {
    it('should fetch spot price successfully', async () => {
      const mockSpotPriceResponse = {
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
        protocols: [['Uniswap_V3', '100']],
        estimatedGas: 150000
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSpotPriceResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/spot-price?fromTokenAddress=0xA0b86a33E6441b8c4f27ead9083c756Cc2&toTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&amount=1000000');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSpotPriceResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.1inch.dev/swap/v6.0/1/quote'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('should return 400 for missing required parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/1inch/spot-price?fromTokenAddress=0xA0b86a33E6441b8c4f27ead9083c756Cc2');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should handle 1inch API errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/spot-price?fromTokenAddress=0xA0b86a33E6441b8c4f27ead9083c756Cc2&toTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&amount=1000000');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('1inch API error');
    });

    it('should support different chain IDs', async () => {
      const mockSpotPriceResponse = {
        fromToken: { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
        toToken: { symbol: 'WMATIC', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' },
        toTokenAmount: '100000000000000000000',
        fromTokenAmount: '100000000'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSpotPriceResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/spot-price?chainId=137&fromTokenAddress=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174&toTokenAddress=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270&amount=100000000');

      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.1inch.dev/swap/v6.0/137/quote'),
        expect.any(Object)
      );
    });
  });
});