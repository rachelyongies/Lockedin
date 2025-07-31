// 📊 Data Aggregation Service - Real API integrations for DeFi routing
// Integrates 1inch Fusion, CoinGecko, DeFiLlama, and other real data sources

import { MarketConditions, RouteProposal, RouteStep } from '../agents/types';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price?: number;
  marketCap?: number;
  volume24h?: number;
  geckoId?: string; // CoinGecko slug mapping
}

export interface DEXInfo {
  name: string;
  factory: string;
  router: string;
  liquidityUSD: number;
  volume24h: number;
  fees: number; // percentage
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockTime: number;
  gasPrice: {
    fast: number;
    standard: number;
    safe: number;
  };
  congestion: number; // 0-1 scale
}

// Token metadata mapping for address → symbol → geckoId conversion
export interface TokenMetadata {
  [address: string]: {
    symbol: string;
    geckoId: string;
    decimals: number;
    name: string;
  };
}

// Gas price memory for dynamic fallbacks
export interface GasOracleMemory {
  ethereum: {
    history: Array<{ timestamp: number; fast: number; standard: number; safe: number }>;
    rollingAverage: { fast: number; standard: number; safe: number };
    lastUpdate: number;
  };
  polygon: {
    history: Array<{ timestamp: number; fast: number; standard: number; safe: number }>;
    rollingAverage: { fast: number; standard: number; safe: number };
    lastUpdate: number;
  };
}

// 1inch Fusion API types
export interface FusionQuoteParams {
  src: string;
  dst: string;
  amount: string;
  from: string;
  receiver?: string;
  preset?: 'fast' | 'medium' | 'slow';
  fee?: string;
  gasLimit?: string;
  connectorTokens?: string;
  complexityLevel?: number;
  mainRouteParts?: number;
  parts?: number;
  gasPrice?: string;
}

export interface FusionQuoteResponse {
  toAmount: string;
  tx: {
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
  };
  protocols: Array<Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>>;
}

export interface FusionOrderStatus {
  orderHash: string;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  createdAt: number;
  filledAt?: number;
  fills: Array<{
    txHash: string;
    filledAmount: string;
    timestamp: number;
  }>;
}

export class DataAggregationService {
  private readonly INCH_BASE_URL = 'https://api.1inch.dev';
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private readonly DEFILLAMA_BASE_URL = 'https://api.llama.fi';
  
  private apiKeys: {
    oneInch?: string;
    coinGecko?: string;
    infura?: string;
    alchemy?: string;
  };

  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private readonly DEFAULT_CACHE_TTL = 30000; // 30 seconds

  // Token metadata mapping for proper ID conversion
  private tokenMetadata: TokenMetadata = {};
  
  // Gas oracle memory for dynamic fallbacks
  private gasOracleMemory: GasOracleMemory = {
    ethereum: {
      history: [],
      rollingAverage: { fast: 25, standard: 18, safe: 12 },
      lastUpdate: 0
    },
    polygon: {
      history: [],
      rollingAverage: { fast: 45, standard: 32, safe: 22 },
      lastUpdate: 0
    }
  };

  constructor(apiKeys: {
    oneInch?: string;
    coinGecko?: string;
    infura?: string;
    alchemy?: string;
  } = {}) {
    this.apiKeys = apiKeys;
    this.initializeTokenMetadata();
  }

  // Initialize token metadata mapping
  private initializeTokenMetadata(): void {
    // Ethereum mainnet tokens
    this.tokenMetadata = {
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': {
        symbol: 'WETH',
        geckoId: 'ethereum',
        decimals: 18,
        name: 'Wrapped Ether'
      },
      '0xA0b86a33E6441E3e3f4069b80b0c0ee29C5b7e09': {
        symbol: 'USDC',
        geckoId: 'usd-coin',
        decimals: 6,
        name: 'USD Coin'
      },
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': {
        symbol: 'USDT',
        geckoId: 'tether',
        decimals: 6,
        name: 'Tether USD'
      },
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
        symbol: 'DAI',
        geckoId: 'dai',
        decimals: 18,
        name: 'Dai Stablecoin'
      },
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': {
        symbol: 'WBTC',
        geckoId: 'wrapped-bitcoin',
        decimals: 8,
        name: 'Wrapped BTC'
      },
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': {
        symbol: 'UNI',
        geckoId: 'uniswap',
        decimals: 18,
        name: 'Uniswap'
      },
      '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9': {
        symbol: 'AAVE',
        geckoId: 'aave',
        decimals: 18,
        name: 'Aave Token'
      }
    };
  }

  // Convert token address/symbol to CoinGecko ID
  private getGeckoId(tokenIdentifier: string): string {
    // Check if it's an address
    if (tokenIdentifier.startsWith('0x') && tokenIdentifier.length === 42) {
      const metadata = this.tokenMetadata[tokenIdentifier.toLowerCase()];
      return metadata?.geckoId || tokenIdentifier;
    }
    
    // Check if it's a symbol
    const symbolToGecko: Record<string, string> = {
      'ETH': 'ethereum',
      'WETH': 'ethereum',
      'BTC': 'bitcoin',
      'WBTC': 'wrapped-bitcoin',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'DAI': 'dai',
      'MATIC': 'matic-network',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'AVAX': 'avalanche-2'
    };
    
    return symbolToGecko[tokenIdentifier.toUpperCase()] || tokenIdentifier.toLowerCase();
  }

  // Update gas oracle memory with new data
  private updateGasOracleMemory(network: 'ethereum' | 'polygon', gasData: { fast: number; standard: number; safe: number }): void {
    const now = Date.now();
    const oracle = this.gasOracleMemory[network];
    
    // Add to history
    oracle.history.push({ timestamp: now, ...gasData });
    
    // Keep only last 100 entries (rolling window)
    if (oracle.history.length > 100) {
      oracle.history = oracle.history.slice(-100);
    }
    
    // Calculate rolling average from last 10 entries
    const recentHistory = oracle.history.slice(-10);
    if (recentHistory.length > 0) {
      oracle.rollingAverage = {
        fast: Math.round(recentHistory.reduce((sum, h) => sum + h.fast, 0) / recentHistory.length),
        standard: Math.round(recentHistory.reduce((sum, h) => sum + h.standard, 0) / recentHistory.length),
        safe: Math.round(recentHistory.reduce((sum, h) => sum + h.safe, 0) / recentHistory.length)
      };
    }
    
    oracle.lastUpdate = now;
  }

  // Get dynamic gas fallback based on historical data
  private getDynamicGasFallback(network: 'ethereum' | 'polygon'): { fast: number; standard: number; safe: number } {
    const oracle = this.gasOracleMemory[network];
    
    // If we have recent data (within 10 minutes), use rolling average
    if (Date.now() - oracle.lastUpdate < 600000 && oracle.history.length > 0) {
      return oracle.rollingAverage;
    }
    
    // Otherwise use hardcoded fallbacks
    return network === 'ethereum' 
      ? { fast: 25, standard: 18, safe: 12 }
      : { fast: 45, standard: 32, safe: 22 };
  }

  // ===== 1INCH FUSION API INTEGRATION =====

  async getFusionQuote(params: FusionQuoteParams, chainId: number = 1): Promise<FusionQuoteResponse> {
    const cacheKey = `fusion-quote-${JSON.stringify(params)}-${chainId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as FusionQuoteResponse;

    const url = `${this.INCH_BASE_URL}/fusion/quoter/v1.0/${chainId}/quote/receive`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKeys.oneInch) {
      headers['Authorization'] = `Bearer ${this.apiKeys.oneInch}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`1inch Fusion API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(cacheKey, data, 10000); // 10 second cache for quotes
      return data;
    } catch (error) {
      console.error('Failed to get 1inch Fusion quote:', error);
      throw new Error(`Failed to get routing quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFusionOrderStatus(orderHash: string, chainId: number = 1): Promise<FusionOrderStatus> {
    const url = `${this.INCH_BASE_URL}/fusion/relayer/v1.0/${chainId}/order/status/${orderHash}`;
    
    const headers: Record<string, string> = {};
    if (this.apiKeys.oneInch) {
      headers['Authorization'] = `Bearer ${this.apiKeys.oneInch}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`1inch order status error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get order status:', error);
      throw error;
    }
  }

  async getAvailableTokens(chainId: number = 1): Promise<Record<string, TokenInfo>> {
    const cacheKey = `tokens-${chainId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as Record<string, TokenInfo>;

    const url = `${this.INCH_BASE_URL}/swap/v5.0/${chainId}/tokens`;
    
    const headers: Record<string, string> = {};
    if (this.apiKeys.oneInch) {
      headers['Authorization'] = `Bearer ${this.apiKeys.oneInch}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`1inch tokens API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Enhance token data with CoinGecko IDs
      const enhancedTokens: Record<string, TokenInfo> = {};
      for (const [address, tokenData] of Object.entries(data.tokens)) {
        const token = tokenData as TokenInfo;
        enhancedTokens[address] = {
          ...token,
          geckoId: this.getGeckoId(address)
        };
      }
      
      this.setCache(cacheKey, enhancedTokens, 300000); // 5 minute cache for token list
      return enhancedTokens;
    } catch (error) {
      console.error('Failed to get available tokens:', error);
      return this.getFallbackTokens(chainId);
    }
  }

  // ===== COINGECKO API INTEGRATION =====

  async getTokenPrices(tokenIdentifiers: string[]): Promise<Record<string, number>> {
    // Convert identifiers to CoinGecko IDs
    const geckoIds = tokenIdentifiers.map(id => this.getGeckoId(id));
    const cacheKey = `prices-${geckoIds.join(',')}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as Record<string, number>;

    const url = `${this.COINGECKO_BASE_URL}/simple/price`;
    const params = new URLSearchParams({
      ids: geckoIds.join(','),
      vs_currencies: 'usd',
      include_market_cap: 'true',
      include_24hr_vol: 'true'
    });

    const headers: Record<string, string> = {};
    if (this.apiKeys.coinGecko) {
      headers['x-cg-demo-api-key'] = this.apiKeys.coinGecko;
    }

    try {
      const response = await fetch(`${url}?${params}`, { headers });
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const prices: Record<string, number> = {};
      
      // Map back from geckoIds to original identifiers
      for (let i = 0; i < tokenIdentifiers.length; i++) {
        const originalId = tokenIdentifiers[i];
        const geckoId = geckoIds[i];
        const priceData = data[geckoId];
        
        if (priceData && priceData.usd) {
          prices[originalId] = priceData.usd;
        }
      }

      this.setCache(cacheKey, prices, this.DEFAULT_CACHE_TTL);
      return prices;
    } catch (error) {
      console.error('Failed to get token prices:', error);
      return this.getFallbackPrices(tokenIdentifiers);
    }
  }

  async getMarketData(): Promise<{
    totalMarketCap: number;
    totalVolume: number;
    marketCapChange24h: number;
    dominance: Record<string, number>;
  }> {
    const cacheKey = 'market-global';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as {
      totalMarketCap: number;
      totalVolume: number;
      marketCapChange24h: number;
      dominance: Record<string, number>;
    };

    const url = `${this.COINGECKO_BASE_URL}/global`;
    
    const headers: Record<string, string> = {};
    if (this.apiKeys.coinGecko) {
      headers['x-cg-demo-api-key'] = this.apiKeys.coinGecko;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`CoinGecko global API error: ${response.status}`);
      }

      const data = await response.json();
      const result = {
        totalMarketCap: data.data.total_market_cap.usd,
        totalVolume: data.data.total_volume.usd,
        marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
        dominance: {
          btc: data.data.market_cap_percentage.btc,
          eth: data.data.market_cap_percentage.eth
        }
      };

      this.setCache(cacheKey, result, 60000); // 1 minute cache
      return result;
    } catch (error) {
      console.error('Failed to get global market data:', error);
      return this.getFallbackMarketData();
    }
  }

  // ===== DEFILLAMA API INTEGRATION =====

  async getProtocolLiquidity(): Promise<Record<string, number>> {
    const cacheKey = 'protocol-tvl';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as Record<string, number>;

    const url = `${this.DEFILLAMA_BASE_URL}/protocols`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`DeFiLlama API error: ${response.status}`);
      }

      const protocols = await response.json();
      const liquidity: Record<string, number> = {};
      
      // Focus on DEX protocols
      const dexProtocols = protocols.filter((p: Record<string, unknown>) => 
        p.category === 'Dexes' && typeof p.tvl === 'number' && p.tvl > 1000000 // Filter for DEXs with >$1M TVL
      );

      for (const protocol of dexProtocols) {
        liquidity[protocol.name.toLowerCase()] = protocol.tvl;
      }

      this.setCache(cacheKey, liquidity, 300000); // 5 minute cache
      return liquidity;
    } catch (error) {
      console.error('Failed to get protocol liquidity:', error);
      return this.getFallbackLiquidity();
    }
  }

  async getChainTVL(): Promise<Record<string, number>> {
    const cacheKey = 'chain-tvl';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as Record<string, number>;

    const url = `${this.DEFILLAMA_BASE_URL}/v2/chains`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`DeFiLlama chains API error: ${response.status}`);
      }

      const chains = await response.json();
      const chainTVL: Record<string, number> = {};

      for (const chain of chains) {
        chainTVL[chain.name.toLowerCase()] = chain.tvl;
      }

      this.setCache(cacheKey, chainTVL, 300000); // 5 minute cache
      return chainTVL;
    } catch (error) {
      console.error('Failed to get chain TVL:', error);
      return this.getFallbackChainTVL();
    }
  }

  // ===== NETWORK DATA AGGREGATION =====

  async getNetworkConditions(): Promise<MarketConditions> {
    const cacheKey = 'network-conditions';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as MarketConditions;

    try {
      const [marketData, chainTVL, prices] = await Promise.all([
        this.getMarketData().catch(() => this.getFallbackMarketData()),
        this.getChainTVL().catch(() => this.getFallbackChainTVL()),
        this.getTokenPrices(['ethereum', 'bitcoin', 'matic-network']).catch(() => ({}))
      ]);

      // Get gas prices for major networks with memory update
      const gasPrices = await this.getGasPrices();
      
      const conditions: MarketConditions = {
        timestamp: Date.now(),
        networkCongestion: {
          ethereum: this.calculateCongestion('ethereum', gasPrices.ethereum),
          polygon: this.calculateCongestion('polygon', gasPrices.polygon),
          bsc: 0.3, // Fallback values
          arbitrum: 0.2,
          bitcoin: 0.4,
          stellar: 0.1,
          solana: 0.25,
          starknet: 0.15
        },
        gasPrices,
        volatility: {
          overall: this.calculateVolatility(marketData.marketCapChange24h),
          tokenSpecific: {
            'ethereum': Math.abs(marketData.marketCapChange24h) / 100,
            'bitcoin': Math.abs(marketData.marketCapChange24h * 0.8) / 100
          }
        },
        liquidity: {
          overall: this.normalizeLiquidity(marketData.totalVolume),
          perDEX: await this.getDEXLiquidity()
        },
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      this.setCache(cacheKey, conditions, this.DEFAULT_CACHE_TTL);
      return conditions;
    } catch (error) {
      console.error('Failed to get network conditions:', error);
      return this.getFallbackNetworkConditions();
    }
  }

  async getGasPrices(): Promise<MarketConditions['gasPrices']> {
    try {
      // For Ethereum - use Etherscan API
      const ethGasResponse = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');
      let ethGas = this.getDynamicGasFallback('ethereum');
      
      if (ethGasResponse.ok) {
        const gasData = await ethGasResponse.json();
        if (gasData.status === '1') {
          ethGas = {
            fast: parseInt(gasData.result.FastGasPrice),
            standard: parseInt(gasData.result.StandardGasPrice),
            safe: parseInt(gasData.result.SafeGasPrice)
          };
          // Update gas oracle memory
          this.updateGasOracleMemory('ethereum', ethGas);
        }
      }

      return {
        ethereum: ethGas,
        polygon: this.getDynamicGasFallback('polygon') // Use dynamic fallback for Polygon
      };
    } catch (error) {
      console.error('Failed to get gas prices:', error);
      return {
        ethereum: this.getDynamicGasFallback('ethereum'),
        polygon: this.getDynamicGasFallback('polygon')
      };
    }
  }

  async getGasOracle(): Promise<{ fast: number; standard: number; safe: number }> {
    try {
      const gasPrices = await this.getGasPrices();
      return gasPrices.ethereum;
    } catch (error) {
      console.error('Failed to get gas oracle data:', error);
      return this.getDynamicGasFallback('ethereum');
    }
  }

  // ===== ROUTE OPTIMIZATION =====

  async findOptimalRoutes(
    fromToken: string,
    toToken: string,
    amount: string,
    fromAddress: string,
    chainId: number = 1
  ): Promise<RouteProposal[]> {
    try {
      // Get token prices for price impact calculation
      const [fromPrice, toPrice] = await Promise.all([
        this.getTokenPrices([this.getGeckoId(fromToken)]),
        this.getTokenPrices([this.getGeckoId(toToken)])
      ]);

      // Get quote from 1inch Fusion
      const fusionQuote = await this.getFusionQuote({
        src: fromToken,
        dst: toToken,
        amount,
        from: fromAddress
      }, chainId);

      // Calculate price impact
      const priceImpact = this.calculatePriceImpact(
        amount,
        fusionQuote.toAmount,
        fromPrice[this.getGeckoId(fromToken)] || 1,
        toPrice[this.getGeckoId(toToken)] || 1,
        this.getTokenDecimals(fromToken),
        this.getTokenDecimals(toToken)
      );

      // Convert to RouteProposal format with proper calculations
      const route: RouteProposal = {
        id: `fusion-${Date.now()}`,
        fromToken,
        toToken,
        amount,
        path: this.convertProtocolsToSteps(fusionQuote.protocols, fromToken, toToken, amount, fusionQuote.toAmount),
        estimatedGas: fusionQuote.tx.gas,
        estimatedTime: 30, // Approximate time in seconds
        estimatedOutput: fusionQuote.toAmount,
        priceImpact: priceImpact.toFixed(4),
        confidence: 0.9, // High confidence for 1inch
        risks: this.assessRouteRisks(fusionQuote.protocols, priceImpact),
        advantages: this.identifyRouteAdvantages(fusionQuote.protocols),
        proposedBy: 'fusion-agent'
      };

      return [route];
    } catch (error) {
      console.error('Failed to find optimal routes:', error);
      return [];
    }
  }

  // ===== CALCULATION METHODS =====

  // Calculate price impact based on expected vs actual output
  private calculatePriceImpact(
    inputAmount: string,
    outputAmount: string,
    inputPrice: number,
    outputPrice: number,
    inputDecimals: number,
    outputDecimals: number
  ): number {
    try {
      const inputAmountNormalized = parseFloat(inputAmount) / Math.pow(10, inputDecimals);
      const outputAmountNormalized = parseFloat(outputAmount) / Math.pow(10, outputDecimals);
      
      const expectedOutput = (inputAmountNormalized * inputPrice) / outputPrice;
      const actualOutput = outputAmountNormalized;
      
      const priceImpact = Math.abs((expectedOutput - actualOutput) / expectedOutput);
      return Math.min(priceImpact, 1); // Cap at 100%
    } catch (error) {
      console.error('Failed to calculate price impact:', error);
      return 0.001; // Default 0.1% price impact
    }
  }

  // Get token decimals from metadata
  private getTokenDecimals(tokenAddress: string): number {
    const metadata = this.tokenMetadata[tokenAddress.toLowerCase()];
    return metadata?.decimals || 18; // Default to 18 decimals
  }

  // Convert 1inch protocols to RouteStep with proper amount calculations
  private convertProtocolsToSteps(
    protocols: FusionQuoteResponse['protocols'],
    fromToken: string,
    toToken: string,
    totalInputAmount: string,
    totalOutputAmount: string
  ): RouteStep[] {
    const steps: RouteStep[] = [];
    
    for (const protocolSet of protocols) {
      let remainingInput = totalInputAmount;
      let currentToken = fromToken;
      
      for (let i = 0; i < protocolSet.length; i++) {
        const protocol = protocolSet[i];
        
        // Calculate amount for this step based on protocol part percentage
        const stepInputAmount = this.calculateStepAmount(remainingInput, protocol.part);
        const stepOutputAmount = i === protocolSet.length - 1 
          ? totalOutputAmount // Last step gets remaining output
          : this.estimateStepOutput(stepInputAmount, protocol.name);
        
        steps.push({
          protocol: protocol.name,
          fromToken: protocol.fromTokenAddress,
          toToken: protocol.toTokenAddress,
          amount: stepInputAmount,
          estimatedOutput: stepOutputAmount,
          fee: this.getProtocolFee(protocol.name)
        });

        remainingInput = stepOutputAmount;
        currentToken = protocol.toTokenAddress;
      }
    }

    return steps;
  }

  // Calculate step amount based on protocol part percentage
  private calculateStepAmount(totalAmount: string, partPercentage: number): string {
    const amount = BigInt(totalAmount);
    const partAmount = (amount * BigInt(Math.round(partPercentage * 100))) / BigInt(10000);
    return partAmount.toString();
  }

  // Estimate step output (simplified - in production would use more sophisticated calculation)
  private estimateStepOutput(inputAmount: string, protocolName: string): string {
    // Apply protocol-specific fee
    const fee = this.getProtocolFeeRate(protocolName);
    const amount = BigInt(inputAmount);
    const output = amount - (amount * BigInt(Math.round(fee * 10000))) / BigInt(10000);
    return output.toString();
  }

  // Get protocol fee as string percentage
  private getProtocolFee(protocolName: string): string {
    const feeRate = this.getProtocolFeeRate(protocolName);
    return (feeRate * 100).toFixed(2); // Convert to percentage string
  }

  // Get protocol fee rate
  private getProtocolFeeRate(protocolName: string): number {
    const fees: Record<string, number> = {
      'UNISWAP_V2': 0.003,
      'UNISWAP_V3': 0.003,
      'SUSHISWAP': 0.003,
      'CURVE': 0.0004,
      'BALANCER': 0.001,
      '1INCH_LIMIT_ORDER': 0.0,
      'default': 0.003
    };
    
    return fees[protocolName.toUpperCase()] || fees['default'];
  }

  // Assess route risks based on protocols and price impact
  private assessRouteRisks(protocols: FusionQuoteResponse['protocols'], priceImpact: number): string[] {
    const risks: string[] = [];
    
    if (priceImpact > 0.05) risks.push('high-slippage');
    if (priceImpact > 0.01) risks.push('slippage');
    
    const protocolNames = protocols.flat().map(p => p.name.toLowerCase());
    
    if (protocolNames.length > 3) risks.push('complex-route');
    if (protocolNames.some(name => name.includes('limit') || name.includes('order'))) {
      risks.push('execution-delay');
    }
    
    risks.push('mev'); // Always present in public mempool
    
    return risks;
  }

  // Identify route advantages
  private identifyRouteAdvantages(protocols: FusionQuoteResponse['protocols']): string[] {
    const advantages: string[] = [];
    const protocolNames = protocols.flat().map(p => p.name.toLowerCase());
    
    advantages.push('best-price'); // 1inch typically provides good prices
    advantages.push('gas-optimized'); // Fusion optimizes gas
    
    if (protocolNames.some(name => name.includes('curve'))) {
      advantages.push('low-slippage');
    }
    
    if (protocolNames.length > 1) {
      advantages.push('multi-dex-routing');
    }
    
    return advantages;
  }

  // ===== UTILITY METHODS =====

  private calculateCongestion(network: string, gasPrice: Record<string, unknown>): number {
    // Simple congestion calculation based on gas prices
    if (network === 'ethereum') {
      const fast = gasPrice.fast as number;
      if (typeof fast === 'number') {
        if (fast > 100) return 0.9;
        if (fast > 50) return 0.7;
        if (fast > 25) return 0.5;
      }
      return 0.3;
    }
    return 0.3; // Default moderate congestion
  }

  private calculateVolatility(marketCapChange: number): number {
    return Math.min(Math.abs(marketCapChange) / 10, 1); // Normalize to 0-1
  }

  private normalizeLiquidity(totalVolume: number): number {
    // Normalize based on typical market volumes
    return Math.min(totalVolume / 100000000000, 1); // $100B as max reference
  }

  private async getDEXLiquidity(): Promise<Record<string, number>> {
    try {
      const protocolLiquidity = await this.getProtocolLiquidity();
      const normalized: Record<string, number> = {};
      
      const maxTVL = Math.max(...Object.values(protocolLiquidity));
      
      for (const [protocol, tvl] of Object.entries(protocolLiquidity)) {
        normalized[protocol] = tvl / maxTVL; // Normalize to 0-1
      }
      
      return normalized;
    } catch (error) {
      return {
        'uniswap': 0.9,
        'sushiswap': 0.6,
        'curve': 0.7,
        'balancer': 0.4
      };
    }
  }

  // ===== CACHING SYSTEM =====

  private getFromCache(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: unknown, ttl: number = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup old cache entries periodically
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > v.ttl) {
          this.cache.delete(k);
        }
      }
    }
  }

  // ===== FALLBACK DATA =====

  private getFallbackTokens(chainId: number): Record<string, TokenInfo> {
    const mainnetTokens: Record<string, TokenInfo> = {};
    
    // Convert metadata to TokenInfo format
    for (const [address, metadata] of Object.entries(this.tokenMetadata)) {
      mainnetTokens[address] = {
        address,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        geckoId: metadata.geckoId
      };
    }
    
    return chainId === 1 ? mainnetTokens : {};
  }

  private getFallbackPrices(tokenIdentifiers: string[]): Record<string, number> {
    const fallbackPrices: Record<string, number> = {
      'ethereum': 2300,
      'bitcoin': 43000,
      'matic-network': 0.85,
      'usd-coin': 1.0,
      'tether': 1.0,
      'dai': 1.0,
      'wrapped-bitcoin': 43000,
      'uniswap': 6.5,
      'aave': 95
    };
    
    const result: Record<string, number> = {};
    for (const tokenId of tokenIdentifiers) {
      const geckoId = this.getGeckoId(tokenId);
      result[tokenId] = fallbackPrices[geckoId] || 1;
    }
    
    return result;
  }

  private getFallbackMarketData() {
    return {
      totalMarketCap: 1500000000000, // $1.5T
      totalVolume: 50000000000, // $50B
      marketCapChange24h: -2.5,
      dominance: {
        btc: 52.0,
        eth: 17.0
      }
    };
  }

  private getFallbackLiquidity(): Record<string, number> {
    return {
      'uniswap': 6500000000,
      'sushiswap': 2100000000,
      'curve': 4200000000,
      'balancer': 1800000000,
      'pancakeswap': 3100000000
    };
  }

  private getFallbackChainTVL(): Record<string, number> {
    return {
      'ethereum': 28000000000,
      'bsc': 4500000000,
      'polygon': 1200000000,
      'arbitrum': 2800000000,
      'optimism': 800000000
    };
  }

  private getFallbackNetworkConditions(): MarketConditions {
    return {
      timestamp: Date.now(),
      networkCongestion: {
        ethereum: 0.6,
        polygon: 0.3,
        bsc: 0.4,
        arbitrum: 0.2,
        bitcoin: 0.5,
        stellar: 0.1,
        solana: 0.3,
        starknet: 0.2
      },
      gasPrices: {
        ethereum: this.getDynamicGasFallback('ethereum'),
        polygon: this.getDynamicGasFallback('polygon')
      },
      volatility: {
        overall: 0.15,
        tokenSpecific: {
          'ethereum': 0.12,
          'bitcoin': 0.10
        }
      },
      liquidity: {
        overall: 0.8,
        perDEX: {
          'uniswap': 0.9,
          'sushiswap': 0.6,
          'curve': 0.7,
          'balancer': 0.4
        }
      },
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
  }

  // ===== PUBLIC API =====

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    latency: Record<string, number>;
  }> {
    const services: Record<string, boolean> = {};
    const latency: Record<string, number> = {};

    // Test 1inch API
    const start1inch = Date.now();
    try {
      await fetch(`${this.INCH_BASE_URL}/healthcheck`, { 
        method: 'HEAD',
        headers: this.apiKeys.oneInch ? { 'Authorization': `Bearer ${this.apiKeys.oneInch}` } : {}
      });
      services['1inch'] = true;
      latency['1inch'] = Date.now() - start1inch;
    } catch {
      services['1inch'] = false;
      latency['1inch'] = -1;
    }

    // Test CoinGecko API
    const startCG = Date.now();
    try {
      const response = await fetch(`${this.COINGECKO_BASE_URL}/ping`);
      services['coingecko'] = response.ok;
      latency['coingecko'] = Date.now() - startCG;
    } catch {
      services['coingecko'] = false;
      latency['coingecko'] = -1;
    }

    // Test DeFiLlama API
    const startDL = Date.now();
    try {
      const response = await fetch(`${this.DEFILLAMA_BASE_URL}/protocols?$limit=1`);
      services['defillama'] = response.ok;
      latency['defillama'] = Date.now() - startDL;
    } catch {
      services['defillama'] = false;
      latency['defillama'] = -1;
    }

    const healthyServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices >= totalServices / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, services, latency };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0.85 // Would need proper tracking for real hit rate
    };
  }

  // Get gas oracle memory stats
  getGasOracleStats(): GasOracleMemory {
    return { ...this.gasOracleMemory };
  }

  // Update token metadata (for adding new tokens)
  updateTokenMetadata(address: string, metadata: TokenMetadata[string]): void {
    this.tokenMetadata[address.toLowerCase()] = metadata;
  }
}