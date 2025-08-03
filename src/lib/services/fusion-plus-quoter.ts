import { ethers } from 'ethers';

export interface FusionPlusQuoteParams {
  srcChain: number;
  dstChain: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  amount: string; // Amount in wei
  walletAddress: string;
  enableEstimate?: boolean;
  fee?: number; // Fee in bps (100 = 1%)
  isPermit2?: boolean;
  permit?: string;
}

export interface FusionPlusQuoteResponse {
  quoteId: string;
  srcTokenAmount: string;
  dstTokenAmount: string;
  presets: {
    fast: PresetConfig;
    medium: PresetConfig;
    slow: PresetConfig;
  };
  timeLocks: {
    srcWithdrawal: number;
    srcPublicWithdrawal: number;
    srcCancellation: number;
    srcPublicCancellation: number;
    dstWithdrawal: number;
    dstPublicWithdrawal: number;
    dstCancellation: number;
  };
  srcEscrowFactory: string;
  dstEscrowFactory: string;
  srcSafetyDeposit: string;
  dstSafetyDeposit: string;
  whitelist: string[];
  recommendedPreset: 'fast' | 'medium' | 'slow';
  prices: {
    usd: {
      srcToken: string;
      dstToken: string;
    };
  };
  volume: {
    usd: {
      srcToken: string;
      dstToken: string;
    };
  };
  priceImpactPercent: number;
  autoK: number;
  k: number;
  mxK: number;
}

export interface PresetConfig {
  auctionDuration: number;
  startAuctionIn: number;
  initialRateBump: number;
  auctionStartAmount: string;
  startAmount: string;
  auctionEndAmount: string;
  exclusiveResolver: string | null;
  costInDstToken: string;
  points: Array<{
    delay: number;
    coefficient: number;
  }>;
  allowPartialFills: boolean;
  allowMultipleFills: boolean;
  gasCost: {
    gasBumpEstimate: number;
    gasPriceEstimate: string;
  };
  secretsCount: number;
}

export class FusionPlusQuoterService {
  private apiKey: string;
  private baseUrl = 'https://api.1inch.dev/fusion-plus/quoter/v1.0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get a cross-chain quote from 1inch Fusion+ API via server endpoint
   */
  async getQuote(params: FusionPlusQuoteParams): Promise<FusionPlusQuoteResponse> {
    try {
      // Validate parameters
      console.log('🔍 Validating quote parameters:', params);
      
      if (!params.srcChain || !params.dstChain) {
        throw new Error('Source and destination chain IDs are required');
      }
      
      if (!params.srcTokenAddress || !params.dstTokenAddress) {
        throw new Error('Source and destination token addresses are required');
      }
      
      if (!params.amount || params.amount === '0') {
        throw new Error('Valid amount is required');
      }
      
      if (!params.walletAddress) {
        throw new Error('Wallet address is required');
      }

      // Construct query parameters
      const queryParams = new URLSearchParams({
        srcChain: params.srcChain.toString(),
        dstChain: params.dstChain.toString(),
        srcTokenAddress: params.srcTokenAddress,
        dstTokenAddress: params.dstTokenAddress,
        amount: params.amount,
        walletAddress: params.walletAddress,
        enableEstimate: (params.enableEstimate ?? true).toString(),
        isPermit2: (params.isPermit2 ?? false).toString(),
      });

      // Only add fee parameter if it's greater than 0 to avoid "cannot use fee without source" error
      if (params.fee && params.fee > 0) {
        queryParams.append('fee', params.fee.toString());
      }

      // Add permit if provided
      if (params.permit) {
        queryParams.append('permit', params.permit);
      }

      // Use server-side API route to avoid CORS and API key exposure
      const url = `/api/1inch/fusion-quote?${queryParams.toString()}`;
      
      console.log('🔄 Making 1inch Fusion+ quote request via server:', url);
      console.log('📋 Query parameters:', Object.fromEntries(queryParams.entries()));

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 1inch Fusion+ API error:', response.status, errorText);
        throw new Error(`Fusion+ API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ 1inch Fusion+ quote received:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to get Fusion+ quote:', error);
      throw error;
    }
  }

  /**
   * Example: Get ETH → WBTC quote across chains
   */
  async getETHtoBTCQuote(
    ethAmount: string, // Amount in ETH (will be converted to wei)
    walletAddress: string,
    srcChain: number = 1, // Ethereum mainnet
    dstChain: number = 1   // Same chain for now (cross-chain BTC not directly supported)
  ): Promise<FusionPlusQuoteResponse> {
    const params: FusionPlusQuoteParams = {
      srcChain,
      dstChain,
      srcTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH
      dstTokenAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC mainnet
      amount: ethers.parseEther(ethAmount).toString(), // Convert ETH to wei
      walletAddress,
      enableEstimate: true,
      // Remove fee to avoid "cannot use fee without source" error
      isPermit2: false
    };

    return this.getQuote(params);
  }

  /**
   * Example: Get USDC Ethereum → USDC Polygon quote
   */
  async getUSDCCrossChainQuote(
    usdcAmount: string, // Amount in USDC (6 decimals)
    walletAddress: string
  ): Promise<FusionPlusQuoteResponse> {
    const params: FusionPlusQuoteParams = {
      srcChain: 1, // Ethereum
      dstChain: 137, // Polygon
      srcTokenAddress: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8', // USDC Ethereum
      dstTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC Polygon
      amount: ethers.parseUnits(usdcAmount, 6).toString(), // USDC has 6 decimals
      walletAddress,
      enableEstimate: true,
      // Remove fee to avoid "cannot use fee without source" error
      isPermit2: false
    };

    return this.getQuote(params);
  }

  /**
   * Get testnet quote (Sepolia ETH → WBTC)
   */
  async getSepoliaTestnetQuote(
    ethAmount: string,
    walletAddress: string
  ): Promise<FusionPlusQuoteResponse> {
    const params: FusionPlusQuoteParams = {
      srcChain: 11155111, // Sepolia
      dstChain: 11155111, // Sepolia (same chain)
      srcTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH
      dstTokenAddress: '0x29f2D40B0605204364af54EC677bD022dA425d03', // WBTC Sepolia
      amount: ethers.parseEther(ethAmount).toString(),
      walletAddress,
      enableEstimate: true,
      // Remove fee to avoid "cannot use fee without source" error
      isPermit2: false
    };

    return this.getQuote(params);
  }
}

// Example usage function
export async function example1inchFusionPlusQuote() {
  const apiKey = process.env.NEXT_PUBLIC_1INCH_API_KEY;
  if (!apiKey) {
    throw new Error('1inch API key not found in environment variables');
  }

  const quoter = new FusionPlusQuoterService(apiKey);
  const walletAddress = '0x742d35Cc6335C6Cc5C8E7b9f1Be34BA4E3a4b5F4'; // Example wallet

  try {
    // Example 1: ETH → WBTC on Ethereum
    console.log('🔄 Getting ETH → WBTC quote...');
    const ethToBtcQuote = await quoter.getETHtoBTCQuote('0.1', walletAddress);
    console.log('💰 ETH → WBTC Quote:', ethToBtcQuote);

    // Example 2: Cross-chain USDC
    console.log('🔄 Getting cross-chain USDC quote...');
    const crossChainQuote = await quoter.getUSDCCrossChainQuote('100', walletAddress);
    console.log('🌉 Cross-chain Quote:', crossChainQuote);

    // Example 3: Sepolia testnet
    console.log('🔄 Getting Sepolia testnet quote...');
    const testnetQuote = await quoter.getSepoliaTestnetQuote('0.01', walletAddress);
    console.log('🧪 Testnet Quote:', testnetQuote);

  } catch (error) {
    console.error('❌ Quote failed:', error);
  }
}

// Factory function
export function createFusionPlusQuoter(apiKey?: string): FusionPlusQuoterService {
  const key = apiKey || process.env.NEXT_PUBLIC_1INCH_API_KEY;
  if (!key) {
    throw new Error('1inch API key required');
  }
  return new FusionPlusQuoterService(key);
}