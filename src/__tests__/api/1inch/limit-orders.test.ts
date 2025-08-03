import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST, GET } from '../../../app/api/1inch/limit-orders/route';

// Mock the 1inch API
global.fetch = jest.fn();

describe('1inch Limit Orders API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/1inch/limit-orders', () => {
    it('should create a limit order successfully', async () => {
      const mockLimitOrderResponse = {
        orderHash: '0x123...',
        status: 'active',
        makerAsset: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
        takerAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        makingAmount: '1000000',
        takingAmount: '1000000000000000000'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockLimitOrderResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/limit-orders', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          makerAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          makerAsset: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          takerAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          makingAmount: '1000000',
          takingAmount: '1000000000000000000'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockLimitOrderResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.1inch.dev/orderbook/v4.0/1/order'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/1inch/limit-orders', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          // Missing required fields
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required order parameters');
    });

    it('should handle 1inch API errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid order parameters' }),
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/limit-orders', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          makerAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          makerAsset: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          takerAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          makingAmount: '1000000',
          takingAmount: '1000000000000000000'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid order parameters');
    });
  });

  describe('GET /api/1inch/limit-orders', () => {
    it('should fetch orders successfully', async () => {
      const mockOrdersResponse = {
        orders: [
          {
            orderHash: '0x123...',
            status: 'active',
            makerAsset: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
            takerAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
          }
        ],
        total: 1,
        page: 1
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOrdersResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/limit-orders?chainId=1&makerAddress=0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockOrdersResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.1inch.dev/orderbook/v4.0/1/orders'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('should return 400 for missing chainId', async () => {
      const request = new NextRequest('http://localhost:3000/api/1inch/limit-orders');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('chainId parameter is required');
    });
  });
});