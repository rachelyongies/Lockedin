// Token Validation Service for 1inch API Integration
import { Token } from '@/types/bridge';

export interface TokenPairValidation {
  isValid: boolean;
  reason?: string;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  supportedNetworks: string[];
}

export class TokenValidationService {
  private static instance: TokenValidationService;
  
  // Supported tokens for 1inch APIs (Ethereum mainnet only)
  private readonly SUPPORTED_TOKENS = {
    'ETH': {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      decimals: 18,
      network: 'ethereum'
    },
    'WBTC': {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      decimals: 8,
      network: 'ethereum'
    },
    'USDT': {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      decimals: 6,
      network: 'ethereum'
    },
    'USDC': {
      address: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
      decimals: 6,
      network: 'ethereum'
    },
    'WETH': {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
      network: 'ethereum'
    }
  };

  // High-liquidity trading pairs that work well with 1inch
  private readonly RECOMMENDED_PAIRS = [
    ['WBTC', 'ETH'],
    ['WBTC', 'USDT'],
    ['WBTC', 'USDC'],
    ['ETH', 'USDT'],
    ['ETH', 'USDC'],
    ['USDT', 'USDC'],
    ['WETH', 'USDT'],
    ['WETH', 'USDC']
  ];

  static getInstance(): TokenValidationService {
    if (!TokenValidationService.instance) {
      TokenValidationService.instance = new TokenValidationService();
    }
    return TokenValidationService.instance;
  }

  validateTokenPair(fromToken: Token, toToken: Token): TokenPairValidation {
    console.log('🔍 Validating token pair for 1inch APIs:', {
      from: `${fromToken.symbol} (${fromToken.network})`,
      to: `${toToken.symbol} (${toToken.network})`
    });

    // Check if tokens are supported
    const fromSupported = this.isTokenSupported(fromToken);
    const toSupported = this.isTokenSupported(toToken);

    if (!fromSupported.isSupported) {
      return {
        isValid: false,
        reason: `Source token ${fromToken.symbol} is not supported. ${fromSupported.reason}`,
        supportedNetworks: ['ethereum']
      };
    }

    if (!toSupported.isSupported) {
      return {
        isValid: false,
        reason: `Destination token ${toToken.symbol} is not supported. ${toSupported.reason}`,
        supportedNetworks: ['ethereum']
      };
    }

    // Get token addresses
    const fromTokenAddress = this.getTokenAddress(fromToken);
    const toTokenAddress = this.getTokenAddress(toToken);

    if (!fromTokenAddress || !toTokenAddress) {
      return {
        isValid: false,
        reason: 'Unable to resolve token addresses for 1inch APIs',
        supportedNetworks: ['ethereum']
      };
    }

    // Check if it's a recommended high-liquidity pair
    const isRecommended = this.isPairRecommended(fromToken.symbol, toToken.symbol);

    return {
      isValid: true,
      fromTokenAddress,
      toTokenAddress,
      supportedNetworks: ['ethereum'],
      ...(isRecommended && { recommendation: 'High liquidity pair - optimal for trading' })
    };
  }

  private isTokenSupported(token: Token): { isSupported: boolean; reason?: string } {
    // Handle Bitcoin -> WBTC mapping
    if (token.network === 'bitcoin' || token.symbol === 'BTC') {
      return { isSupported: true }; // Will be mapped to WBTC
    }

    // Check if token is in supported list
    if (this.SUPPORTED_TOKENS[token.symbol as keyof typeof this.SUPPORTED_TOKENS]) {
      return { isSupported: true };
    }

    // Check if it's an Ethereum token with valid address
    if (token.network === 'ethereum' && 'address' in token && (token as { address: string }).address) {
      return { isSupported: true }; // Valid Ethereum token with address
    }

    // Non-Ethereum networks not supported by 1inch
    if (token.network !== 'ethereum') {
      return {
        isSupported: false,
        reason: `1inch only supports Ethereum mainnet tokens. ${token.network} not supported.`
      };
    }

    return {
      isSupported: false,
      reason: 'Token not found in supported list and no valid Ethereum address provided.'
    };
  }

  getTokenAddress(token: Token): string {
    // Handle native ETH
    if (token.symbol === 'ETH' || token.symbol === 'Ethereum') {
      return this.SUPPORTED_TOKENS.ETH.address;
    }
    
    // Handle Bitcoin network tokens -> WBTC
    if (token.network === 'bitcoin' || token.symbol === 'BTC') {
      return this.SUPPORTED_TOKENS.WBTC.address;
    }
    
    // Check supported tokens list
    const supportedToken = this.SUPPORTED_TOKENS[token.symbol as keyof typeof this.SUPPORTED_TOKENS];
    if (supportedToken) {
      return supportedToken.address;
    }

    // For Ethereum tokens, use the address property
    if (token.network === 'ethereum' && 'address' in token) {
      return (token as { address: string }).address || '';
    }

    return '';
  }

  private isPairRecommended(fromSymbol: string, toSymbol: string): boolean {
    // Map BTC to WBTC for checking
    const mappedFrom = fromSymbol === 'BTC' ? 'WBTC' : fromSymbol;
    const mappedTo = toSymbol === 'BTC' ? 'WBTC' : toSymbol;

    return this.RECOMMENDED_PAIRS.some(pair => 
      (pair[0] === mappedFrom && pair[1] === mappedTo) ||
      (pair[0] === mappedTo && pair[1] === mappedFrom)
    );
  }

  getSupportedTokens(): Array<{ symbol: string; address: string; decimals: number; network: string }> {
    return Object.entries(this.SUPPORTED_TOKENS).map(([symbol, info]) => ({
      symbol,
      ...info
    }));
  }

  getRecommendedPairs(): string[][] {
    return [...this.RECOMMENDED_PAIRS];
  }

  // Get optimal amount in wei for the token
  convertToWei(amount: string, token: Token): string {
    const decimals = this.getTokenDecimals(token);
    const [integer, decimal = ''] = amount.split('.');
    const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
    return (integer + paddedDecimal).replace(/^0+/, '') || '0';
  }

  getTokenDecimals(token: Token): number {
    // Handle Bitcoin -> WBTC mapping
    if (token.network === 'bitcoin' || token.symbol === 'BTC') {
      return this.SUPPORTED_TOKENS.WBTC.decimals;
    }

    // Check supported tokens list
    const supportedToken = this.SUPPORTED_TOKENS[token.symbol as keyof typeof this.SUPPORTED_TOKENS];
    if (supportedToken) {
      return supportedToken.decimals;
    }

    // Use token's decimals property
    return token.decimals || 18;
  }
}

export const tokenValidationService = TokenValidationService.getInstance();