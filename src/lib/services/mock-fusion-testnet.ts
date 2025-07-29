import { Token, BridgeQuote } from '@/types/bridge';

// Mock 1inch Fusion API for testnet development
// Based on hashlocked-cli approach for testnet atomic swaps
export class MockFusionTestnetService {
  async getQuote(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<BridgeQuote> {
    console.log('MockFusion getQuote called with:', { fromToken: fromToken.symbol, toToken: toToken.symbol, amount, walletAddress });
    
    // Validate amount
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw new Error(`Invalid amount for mock quote: ${amount}`);
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Testnet exchange rates (based on approximate mainnet rates)
    const mockRates: Record<string, number> = {
      'ETH-BTC': 0.041,     // 1 ETH ≈ 0.041 BTC
      'BTC-ETH': 24.39,     // 1 BTC ≈ 24.39 ETH
      'ETH-WETH': 1,        // 1:1 wrapping
      'WETH-ETH': 1,        // 1:1 unwrapping
      'ETH-WBTC': 0.041,    // Same as ETH-BTC
      'WBTC-ETH': 24.39,    // Same as BTC-ETH
      'WETH-BTC': 0.041,    // WETH same as ETH
      'BTC-WETH': 24.39,    // BTC to WETH same as BTC to ETH
    };

    const pairKey = `${fromToken.symbol}-${toToken.symbol}`;
    const rate = mockRates[pairKey] || 1;
    const fromAmount = parseFloat(amount);
    
    // Calculate output amount with simulated slippage
    const slippage = 0.003; // 0.3% slippage
    const toAmount = fromAmount * rate * (1 - slippage);

    // Generate realistic quote data for testnet
    return {
      id: `testnet_${Math.random().toString(36).substring(2, 11)}`,
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: toAmount.toString(),
      exchangeRate: rate.toString(),
      networkFee: '0.001', // Testnet network fee (much lower)
      protocolFee: '0',    // No protocol fee for atomic swaps
      totalFee: '0.001',
      estimatedTime: '5-10 minutes', // HTLC atomic swap time
      minimumReceived: (toAmount * 0.98).toString(), // 2% additional slippage tolerance
      priceImpact: '0.1', // 0.1% price impact
      expiresAt: Date.now() + 30000, // 30 seconds quote validity
    };
  }

  async createOrder(
    fromToken: Token,
    toToken: Token,
    amount: string,
    walletAddress: string
  ): Promise<any> {
    // Mock HTLC order creation for testnet
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const orderId = `htlc_testnet_${Math.random().toString(36).substring(2, 11)}`;
    
    return {
      orderId,
      orderStatus: 'pending',
      fromToken: {
        address: fromToken.address || '0x0000000000000000000000000000000000000000',
        decimals: fromToken.decimals || 18,
        symbol: fromToken.symbol,
        name: fromToken.name || fromToken.symbol,
        logoURI: fromToken.logoUrl || '',
      },
      toToken: {
        address: toToken.address || '0x0000000000000000000000000000000000000000',
        decimals: toToken.decimals || 8,
        symbol: toToken.symbol,
        name: toToken.name || toToken.symbol,
        logoURI: toToken.logoUrl || '',
      },
      fromTokenAmount: amount,
      toTokenAmount: (parseFloat(amount) * 0.041 * 0.997).toString(), // ETH->BTC with slippage
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour HTLC timelock
      priceImpact: '0.1',
      estimatedGas: 150000,
      gasCostUSD: '5.00',
      gasCost: '0.001',
      protocols: [{
        name: 'HTLC Atomic Swap',
        part: 100,
        fromTokenAddress: fromToken.address || '0x0000000000000000000000000000000000000000',
        toTokenAddress: toToken.address || '0x0000000000000000000000000000000000000000',
      }],
    };
  }

  async getOrderStatus(orderId: string): Promise<any> {
    // Mock HTLC order status for testnet
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Simulate different order states for testing
    const statuses = ['pending', 'open', 'filled'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      orderId,
      orderStatus: 'filled', // For demo purposes, always return filled
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 4000000, // Sepolia block numbers
      updatedAt: Date.now(),
      error: undefined,
    };
  }

  // Additional testnet helpers
  getSupportedTestnetPairs(): Array<{ from: string; to: string }> {
    return [
      { from: 'ETH', to: 'BTC' },
      { from: 'BTC', to: 'ETH' },
      { from: 'ETH', to: 'WETH' },
      { from: 'WETH', to: 'ETH' },
      { from: 'ETH', to: 'WBTC' },
      { from: 'WBTC', to: 'ETH' },
    ];
  }
}

export const mockFusionAPI = new MockFusionTestnetService();