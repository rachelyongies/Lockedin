import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as getBalances } from '../../../app/api/1inch/portfolio/balances/route';
import { GET as getHistory } from '../../../app/api/1inch/portfolio/history/route';
import { GET as getAnalytics } from '../../../app/api/1inch/portfolio/analytics/route';

// Mock the 1inch API
global.fetch = jest.fn();

describe('1inch Portfolio APIs', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/1inch/portfolio/balances', () => {
    it('should fetch wallet balances successfully', async () => {
      const mockBalancesResponse = {
        balances: {
          '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342': {
            '0xA0b86a33E6441b8c4f27ead9083c756Cc2': {
              balance: '1000000',
              price: 1.0,
              value: 1.0
            },
            '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': {
              balance: '1000000000000000000',
              price: 2400,
              value: 2400
            }
          }
        },
        totalValue: 2401.0
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBalancesResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/portfolio/balances?addresses=0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342&chainId=1');

      const response = await getBalances(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockBalancesResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.1inch.dev/portfolio/v4.0/1/general/balances'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('should return 400 for missing addresses', async () => {
      const request = new NextRequest('http://localhost:3000/api/1inch/portfolio/balances?chainId=1');

      const response = await getBalances(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('addresses parameter is required');
    });
  });

  describe('GET /api/1inch/portfolio/history', () => {
    it('should fetch portfolio history successfully', async () => {
      const mockHistoryResponse = {
        chart: [
          { timestamp: 1640995200, value: 1000 },
          { timestamp: 1641081600, value: 1100 },
          { timestamp: 1641168000, value: 1200 }
        ],
        performance: {
          '1h': { change: 0.05, changePercent: 5.0 },
          '24h': { change: 0.20, changePercent: 20.0 }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockHistoryResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/portfolio/history?addresses=0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342&chainId=1&timeframe=1d');

      const response = await getHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockHistoryResponse);
    });
  });

  describe('GET /api/1inch/portfolio/analytics', () => {
    it('should fetch portfolio analytics successfully', async () => {
      const mockAnalyticsResponse = {
        overview: {
          totalValue: 10000,
          change24h: 250,
          changePercent24h: 2.5,
          topAssets: [
            { symbol: 'ETH', value: 5000, percent: 50 },
            { symbol: 'USDC', value: 3000, percent: 30 },
            { symbol: 'WBTC', value: 2000, percent: 20 }
          ]
        },
        risk: {
          score: 6.5,
          volatility: 'Medium',
          diversification: 'Good'
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAnalyticsResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/portfolio/analytics?addresses=0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342&chainId=1');

      const response = await getAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAnalyticsResponse);
    });
  });
});