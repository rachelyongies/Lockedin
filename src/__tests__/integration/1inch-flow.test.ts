import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as fusionQuote } from '../../app/api/1inch/fusion/quote/route';
import { POST as aggregationQuote } from '../../app/api/1inch/aggregation/quote/route';
import { GET as spotPrice } from '../../app/api/1inch/spot-price/route';
import { POST as createLimitOrder, GET as getLimitOrders } from '../../app/api/1inch/limit-orders/route';
import { GET as getBalances } from '../../app/api/1inch/portfolio/balances/route';

// Mock the 1inch API
global.fetch = jest.fn();

describe('1inch Integration Flow Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Complete Trading Flow', () => {
    it('should handle a complete USDC to ETH trading flow', async () => {
      // Step 1: Get spot price
      const mockSpotPrice = {
        fromToken: { symbol: 'USDC', address: '0xA0b86a33E6441b8c4f27ead9083c756Cc2' },
        toToken: { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' },
        toTokenAmount: '1000000000000000000',
        fromTokenAmount: '2400000000'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSpotPrice,
      } as Response);

      const spotPriceRequest = new NextRequest(
        'http://localhost:3000/api/1inch/spot-price?fromTokenAddress=0xA0b86a33E6441b8c4f27ead9083c756Cc2&toTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&amount=1000000'
      );

      const spotPriceResponse = await spotPrice(spotPriceRequest);
      const spotPriceData = await spotPriceResponse.json();

      expect(spotPriceResponse.status).toBe(200);
      expect(spotPriceData.toTokenAmount).toBe('1000000000000000000');

      // Step 2: Get Fusion quote
      const mockFusionQuote = {
        toTokenAmount: '1020000000000000000', // Better rate
        fromTokenAmount: '2400000000',
        estimatedGas: 150000,
        protocolFee: '0'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFusionQuote,
      } as Response);

      const fusionRequest = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '1000000',
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342'
        })
      });

      const fusionResponse = await fusionQuote(fusionRequest);
      const fusionData = await fusionResponse.json();

      expect(fusionResponse.status).toBe(200);
      expect(parseFloat(fusionData.toTokenAmount)).toBeGreaterThan(parseFloat(spotPriceData.toTokenAmount));

      // Step 3: Compare with aggregation quote
      const mockAggregationQuote = {
        toTokenAmount: '995000000000000000', // Slightly worse rate
        fromTokenAmount: '2400000000',
        estimatedGas: 180000,
        protocols: [['Uniswap_V3', '100']]
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAggregationQuote,
      } as Response);

      const aggregationRequest = new NextRequest('http://localhost:3000/api/1inch/aggregation/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '1000000',
          fromAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342',
          slippage: 1
        })
      });

      const aggregationResponse = await aggregationQuote(aggregationRequest);
      const aggregationData = await aggregationResponse.json();

      expect(aggregationResponse.status).toBe(200);
      
      // Fusion should provide better output
      expect(parseFloat(fusionData.toTokenAmount)).toBeGreaterThan(parseFloat(aggregationData.toTokenAmount));
      
      // Fusion should have lower gas costs
      expect(parseInt(fusionData.estimatedGas)).toBeLessThan(parseInt(aggregationData.estimatedGas));
    });

    it('should handle multi-chain portfolio tracking flow', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342';
      
      // Step 1: Get Ethereum balances
      const mockEthBalances = {
        balances: {
          [walletAddress]: {
            '0xA0b86a33E6441b8c4f27ead9083c756Cc2': { balance: '5000000000', value: 5000 },
            '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': { balance: '2000000000000000000', value: 4800 }
          }
        },
        totalValue: 9800
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEthBalances,
      } as Response);

      const ethBalanceRequest = new NextRequest(
        `http://localhost:3000/api/1inch/portfolio/balances?addresses=${walletAddress}&chainId=1`
      );

      const ethBalanceResponse = await getBalances(ethBalanceRequest);
      const ethBalanceData = await ethBalanceResponse.json();

      expect(ethBalanceResponse.status).toBe(200);
      expect(ethBalanceData.totalValue).toBe(9800);

      // Step 2: Get Polygon balances
      const mockPolygonBalances = {
        balances: {
          [walletAddress]: {
            '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': { balance: '2000000000', value: 2000 },
            '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': { balance: '1000000000000000000000', value: 800 }
          }
        },
        totalValue: 2800
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPolygonBalances,
      } as Response);

      const polygonBalanceRequest = new NextRequest(
        `http://localhost:3000/api/1inch/portfolio/balances?addresses=${walletAddress}&chainId=137`
      );

      const polygonBalanceResponse = await getBalances(polygonBalanceRequest);
      const polygonBalanceData = await polygonBalanceResponse.json();

      expect(polygonBalanceResponse.status).toBe(200);
      expect(polygonBalanceData.totalValue).toBe(2800);

      // Total portfolio value across chains
      const totalPortfolioValue = ethBalanceData.totalValue + polygonBalanceData.totalValue;
      expect(totalPortfolioValue).toBe(12600);
    });

    it('should handle limit order creation and tracking flow', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342';
      
      // Step 1: Create a limit order
      const mockLimitOrder = {
        orderHash: '0x123456789abcdef',
        status: 'active',
        makerAsset: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
        takerAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        makingAmount: '2500000000', // Sell USDC for higher price
        takingAmount: '1000000000000000000' // Get 1 ETH
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockLimitOrder,
      } as Response);

      const createOrderRequest = new NextRequest('http://localhost:3000/api/1inch/limit-orders', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          makerAddress: walletAddress,
          makerAsset: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          takerAsset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          makingAmount: '2500000000',
          takingAmount: '1000000000000000000'
        })
      });

      const createOrderResponse = await createLimitOrder(createOrderRequest);
      const createOrderData = await createOrderResponse.json();

      expect(createOrderResponse.status).toBe(200);
      expect(createOrderData.orderHash).toBe('0x123456789abcdef');
      expect(createOrderData.status).toBe('active');

      // Step 2: List user's orders
      const mockOrdersList = {
        orders: [mockLimitOrder],
        total: 1,
        page: 1
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOrdersList,
      } as Response);

      const listOrdersRequest = new NextRequest(
        `http://localhost:3000/api/1inch/limit-orders?chainId=1&makerAddress=${walletAddress}`
      );

      const listOrdersResponse = await getLimitOrders(listOrdersRequest);
      const listOrdersData = await listOrdersResponse.json();

      expect(listOrdersResponse.status).toBe(200);
      expect(listOrdersData.orders).toHaveLength(1);
      expect(listOrdersData.orders[0].orderHash).toBe('0x123456789abcdef');
    });

    it('should handle error scenarios gracefully across endpoints', async () => {
      // Test fusion quote with insufficient liquidity
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Insufficient liquidity',
      } as Response);

      const fusionRequest = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: '0xA0b86a33E6441b8c4f27ead9083c756Cc2',
          toTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          amount: '999999999999999', // Very large amount
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342'
        })
      });

      const fusionResponse = await fusionQuote(fusionRequest);
      const fusionData = await fusionResponse.json();

      expect(fusionResponse.status).toBe(400);
      expect(fusionData.error).toContain('1inch API error');

      // Test portfolio balances with invalid address
      const invalidBalanceRequest = new NextRequest(
        'http://localhost:3000/api/1inch/portfolio/balances?addresses=invalid-address&chainId=1'
      );

      const balanceResponse = await getBalances(invalidBalanceRequest);
      
      // Should handle gracefully even with invalid address
      expect([200, 400].includes(balanceResponse.status)).toBe(true);
    });
  });

  describe('Cross-Chain Scenarios', () => {
    it('should handle cross-chain quote comparisons', async () => {
      const amount = '1000000'; // 1 USDC
      const fromToken = '0xA0b86a33E6441b8c4f27ead9083c756Cc2'; // USDC on Ethereum
      const toToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // ETH

      // Ethereum quote
      const mockEthQuote = {
        toTokenAmount: '1000000000000000000',
        fromTokenAmount: amount,
        estimatedGas: 150000
      };

      // Polygon quote (different token addresses)
      const mockPolygonQuote = {
        toTokenAmount: '995000000000000000', // Slightly worse rate
        fromTokenAmount: amount,
        estimatedGas: 80000 // Lower gas on Polygon
      };

      // Mock Ethereum request
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEthQuote,
      } as Response);

      const ethRequest = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 1,
          fromTokenAddress: fromToken,
          toTokenAddress: toToken,
          amount,
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342'
        })
      });

      const ethResponse = await fusionQuote(ethRequest);
      const ethData = await ethResponse.json();

      expect(ethResponse.status).toBe(200);

      // Mock Polygon request
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPolygonQuote,
      } as Response);

      const polygonRequest = new NextRequest('http://localhost:3000/api/1inch/fusion/quote', {
        method: 'POST',
        body: JSON.stringify({
          chainId: 137,
          fromTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
          toTokenAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH on Polygon
          amount,
          walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342'
        })
      });

      const polygonResponse = await fusionQuote(polygonRequest);
      const polygonData = await polygonResponse.json();

      expect(polygonResponse.status).toBe(200);

      // Compare results
      expect(parseFloat(ethData.toTokenAmount)).toBeGreaterThan(parseFloat(polygonData.toTokenAmount));
      expect(parseInt(polygonData.estimatedGas)).toBeLessThan(parseInt(ethData.estimatedGas));
    });
  });
});