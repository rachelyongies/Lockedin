import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/1inch/fusion/quote/route';

// Mock the 1inch API
global.fetch = jest.fn();

describe('Multi-Chain 1inch Fusion Quote API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/1inch/fusion/quote', () => {
    it('should handle Ethereum (chainId: 1) requests', async () => {
      const mockFusionResponse = {
        toTokenAmount: '1000000000000000000',
        fromTokenAmount: '1000000',
        protocols: [['1inch', '100']],
        estimatedGas: 150000
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFusionResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '1000000',
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          enableEstimate: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockFusionResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('fusion/quoter/v2.0/1/quote'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('should handle Polygon (chainId: 137) requests', async () => {
      const mockFusionResponse = {
        toTokenAmount: '1000000000000000000',
        fromTokenAmount: '1000000',
        protocols: [['QuickSwap', '100']],
        estimatedGas: 120000
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFusionResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 137,
          fromTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          toTokenAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
          amount: '1000000',
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          enableEstimate: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockFusionResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('fusion/quoter/v2.0/137/quote'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle Arbitrum (chainId: 42161) requests', async () => {
      const mockFusionResponse = {
        toTokenAmount: '1000000000000000000',
        fromTokenAmount: '1000000',
        protocols: [['Uniswap_V3', '100']],
        estimatedGas: 80000
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFusionResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 42161,
          fromTokenAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          toTokenAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
          amount: '1000000',
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          enableEstimate: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockFusionResponse);
    });

    it('should handle Optimism (chainId: 10) requests', async () => {
      const mockFusionResponse = {
        toTokenAmount: '1000000000000000000',
        fromTokenAmount: '1000000',
        protocols: [['Uniswap_V3', '100']],
        estimatedGas: 60000
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFusionResponse,
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 10,
          fromTokenAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
          toTokenAddress: '0x4200000000000000000000000000000000000006',
          amount: '1000000',
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          enableEstimate: true
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockFusionResponse);
    });

    it('should reject unsupported chain IDs', async () => {
      const request = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 999, // Unsupported chain
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '1000000',
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unsupported chain ID: 999');
      expect(data.error).toContain('Supported chains: 1, 137, 42161, 10, 56');
    });

    it('should fall back to aggregation API when Fusion fails', async () => {
      // Mock Fusion API failure
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Fusion API Error',
        } as Response)
        // Mock successful aggregation API fallback
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            toTokenAmount: '900000000000000000',
            fromTokenAmount: '1000000',
            protocols: [['Uniswap_V2', '100']],
            estimatedGas: 180000
          }),
        } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '1000000',
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.toTokenAmount).toBe('900000000000000000');
      expect(fetch).toHaveBeenCalledTimes(2); // Fusion + Aggregation fallback
    });

    it('should handle complete API failure gracefully', async () => {
      // Mock both Fusion and Aggregation API failures
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Fusion API Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Aggregation API Error',
        } as Response);

      const request = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '1000000',
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Both APIs failed');
    });
  });
});