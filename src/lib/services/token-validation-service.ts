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
  
  // Network configurations for 1inch API support
  private readonly NETWORK_CONFIG = {
    1: { name: 'ethereum', nativeSymbol: 'ETH' },     // Ethereum mainnet
    137: { name: 'polygon', nativeSymbol: 'MATIC' }, // Polygon
    42161: { name: 'arbitrum', nativeSymbol: 'ETH' }, // Arbitrum
    56: { name: 'bsc', nativeSymbol: 'BNB' }          // BSC
  };

  // Supported tokens for 1inch APIs (Multi-network)
  private readonly SUPPORTED_TOKENS = {
    // Ethereum mainnet (chainId: 1)
    1: {
      'ETH': {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        decimals: 18,
        symbol: 'ETH'
      },
      'WETH': {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        decimals: 18,
        symbol: 'WETH'
      },
      'WBTC': {
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        decimals: 8,
        symbol: 'WBTC'
      },
      'USDT': {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6,
        symbol: 'USDT'
      },
      'USDC': {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        decimals: 6,
        symbol: 'USDC'
      },
      'DAI': {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        decimals: 18,
        symbol: 'DAI'
      }
    },
    // Polygon (chainId: 137)
    137: {
      'MATIC': {
        address: '0x0000000000000000000000000000000000001010',
        decimals: 18,
        symbol: 'MATIC'
      },
      'WMATIC': {
        address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        decimals: 18,
        symbol: 'WMATIC'
      },
      'WETH': {
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        decimals: 18,
        symbol: 'WETH'
      },
      'WBTC': {
        address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
        decimals: 8,
        symbol: 'WBTC'
      },
      'USDT': {
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        decimals: 6,
        symbol: 'USDT'
      },
      'USDC': {
        address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        decimals: 6,
        symbol: 'USDC'
      }
    },
    // Arbitrum (chainId: 42161)
    42161: {
      'ETH': {
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        symbol: 'ETH'
      },
      'WETH': {
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        decimals: 18,
        symbol: 'WETH'
      },
      'WBTC': {
        address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        decimals: 8,
        symbol: 'WBTC'
      },
      'USDT': {
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        decimals: 6,
        symbol: 'USDT'
      },
      'USDC': {
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        decimals: 6,
        symbol: 'USDC'
      },
      'ARB': {
        address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        decimals: 18,
        symbol: 'ARB'
      }
    },
    // BSC (chainId: 56)
    56: {
      'BNB': {
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        symbol: 'BNB'
      },
      'WBNB': {
        address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        decimals: 18,
        symbol: 'WBNB'
      },
      'BTCB': {
        address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        decimals: 18,
        symbol: 'BTCB'
      },
      'USDT': {
        address: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 18,
        symbol: 'USDT'
      },
      'USDC': {
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        decimals: 18,
        symbol: 'USDC'
      },
      'BUSD': {
        address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        decimals: 18,
        symbol: 'BUSD'
      }
    }
  };

  // High-liquidity trading pairs by network
  private readonly RECOMMENDED_PAIRS = {
    1: [ // Ethereum
      ['WBTC', 'ETH'], ['WBTC', 'USDT'], ['WBTC', 'USDC'], ['WBTC', 'DAI'],
      ['ETH', 'USDT'], ['ETH', 'USDC'], ['ETH', 'DAI'],
      ['USDT', 'USDC'], ['USDT', 'DAI'], ['USDC', 'DAI'],
      ['WETH', 'USDT'], ['WETH', 'USDC'], ['WETH', 'DAI']
    ],
    137: [ // Polygon  
      ['MATIC', 'WETH'], ['MATIC', 'USDT'], ['MATIC', 'USDC'],
      ['WMATIC', 'WETH'], ['WMATIC', 'USDT'], ['WMATIC', 'USDC'],
      ['WETH', 'USDT'], ['WETH', 'USDC'], ['WETH', 'WBTC'],
      ['USDT', 'USDC'], ['WBTC', 'USDT'], ['WBTC', 'USDC']
    ],
    42161: [ // Arbitrum
      ['ETH', 'USDT'], ['ETH', 'USDC'], ['ETH', 'ARB'],
      ['WETH', 'USDT'], ['WETH', 'USDC'], ['WETH', 'ARB'],
      ['ARB', 'USDT'], ['ARB', 'USDC'], ['USDT', 'USDC'],
      ['WBTC', 'ETH'], ['WBTC', 'USDT'], ['WBTC', 'USDC']
    ],
    56: [ // BSC
      ['BNB', 'USDT'], ['BNB', 'USDC'], ['BNB', 'BUSD'],
      ['WBNB', 'USDT'], ['WBNB', 'USDC'], ['WBNB', 'BUSD'],
      ['BTCB', 'USDT'], ['BTCB', 'USDC'], ['BTCB', 'BUSD'],
      ['USDT', 'USDC'], ['USDT', 'BUSD'], ['USDC', 'BUSD']
    ]
  };

  static getInstance(): TokenValidationService {
    if (!TokenValidationService.instance) {
      TokenValidationService.instance = new TokenValidationService();
    }
    return TokenValidationService.instance;
  }

  validateTokenPair(fromToken: Token, toToken: Token, chainId?: number): TokenPairValidation {
    console.log('🔍 Validating token pair for 1inch APIs:', {
      from: `${fromToken.symbol} (${fromToken.network})`,
      to: `${toToken.symbol} (${toToken.network})`,
      requestedChainId: chainId
    });

    // Detect chainId from tokens or use provided chainId
    const targetChainId = chainId || this.detectChainIdFromToken(fromToken) || this.detectChainIdFromToken(toToken) || 1;
    
    // Validate that this chainId is supported by 1inch
    if (!this.NETWORK_CONFIG[targetChainId]) {
      return {
        isValid: false,
        reason: `Chain ID ${targetChainId} is not supported by 1inch APIs`,
        supportedNetworks: Object.values(this.NETWORK_CONFIG).map(n => n.name)
      };
    }

    // Check if tokens are supported on this network
    const fromSupported = this.isTokenSupported(fromToken, targetChainId);
    const toSupported = this.isTokenSupported(toToken, targetChainId);

    if (!fromSupported.isSupported) {
      return {
        isValid: false,
        reason: `Source token ${fromToken.symbol} is not supported on ${this.NETWORK_CONFIG[targetChainId].name}. ${fromSupported.reason}`,
        supportedNetworks: Object.values(this.NETWORK_CONFIG).map(n => n.name)
      };
    }

    if (!toSupported.isSupported) {
      return {
        isValid: false,
        reason: `Destination token ${toToken.symbol} is not supported on ${this.NETWORK_CONFIG[targetChainId].name}. ${toSupported.reason}`,
        supportedNetworks: Object.values(this.NETWORK_CONFIG).map(n => n.name)
      };
    }

    // Get token addresses for the specific network
    const fromTokenAddress = this.getTokenAddress(fromToken, targetChainId);
    const toTokenAddress = this.getTokenAddress(toToken, targetChainId);

    if (!fromTokenAddress || !toTokenAddress) {
      return {
        isValid: false,
        reason: `Unable to resolve token addresses for 1inch APIs on ${this.NETWORK_CONFIG[targetChainId].name}`,
        supportedNetworks: Object.values(this.NETWORK_CONFIG).map(n => n.name)
      };
    }

    // Check if it's a recommended high-liquidity pair
    const isRecommended = this.isPairRecommended(fromToken.symbol, toToken.symbol, targetChainId);

    return {
      isValid: true,
      fromTokenAddress,
      toTokenAddress,
      supportedNetworks: Object.values(this.NETWORK_CONFIG).map(n => n.name),
      ...(isRecommended && { recommendation: `High liquidity pair on ${this.NETWORK_CONFIG[targetChainId].name} - optimal for trading` })
    };
  }

  private detectChainIdFromToken(token: Token): number | null {
    // Direct chainId from token
    if ('chainId' in token && typeof token.chainId === 'number') {
      return token.chainId;
    }

    // Map network names to default chainIds
    switch (token.network) {
      case 'ethereum': return 1;
      case 'polygon': return 137;
      case 'arbitrum': return 42161;
      case 'bsc': return 56;
      default: return null;
    }
  }

  private isTokenSupported(token: Token, chainId: number): { isSupported: boolean; reason?: string } {
    // Handle Bitcoin -> WBTC mapping (only on Ethereum/Arbitrum)
    if ((token.network === 'bitcoin' || token.symbol === 'BTC') && (chainId === 1 || chainId === 42161)) {
      return { isSupported: true }; // Will be mapped to WBTC
    }

    // Check if chainId is supported
    if (!this.SUPPORTED_TOKENS[chainId]) {
      return {
        isSupported: false,
        reason: `Chain ID ${chainId} not supported by 1inch APIs.`
      };
    }

    // Check if token is in supported list for this network
    const networkTokens = this.SUPPORTED_TOKENS[chainId];
    if (networkTokens[token.symbol]) {
      return { isSupported: true };
    }

    // Check if it's a valid token with address for this network
    if ('address' in token && (token as { address: string }).address) {
      // Basic validation - could be extended with more checks
      return { isSupported: true };
    }

    return {
      isSupported: false,
      reason: `Token ${token.symbol} not found in supported list for ${this.NETWORK_CONFIG[chainId]?.name || `chain ${chainId}`}.`
    };
  }

  getTokenAddress(token: Token, chainId?: number): string {
    const targetChainId = chainId || this.detectChainIdFromToken(token) || 1;
    
    // Handle Bitcoin -> WBTC mapping (only on Ethereum/Arbitrum)
    if ((token.network === 'bitcoin' || token.symbol === 'BTC')) {
      if (targetChainId === 1 && this.SUPPORTED_TOKENS[1]['WBTC']) {
        return this.SUPPORTED_TOKENS[1]['WBTC'].address;
      }
      if (targetChainId === 42161 && this.SUPPORTED_TOKENS[42161]['WBTC']) {
        return this.SUPPORTED_TOKENS[42161]['WBTC'].address;
      }
    }
    
    // Check supported tokens list for the specific network
    const networkTokens = this.SUPPORTED_TOKENS[targetChainId];
    if (networkTokens && networkTokens[token.symbol]) {
      return networkTokens[token.symbol].address;
    }

    // For tokens with explicit address property, use it
    if ('address' in token && (token as { address: string }).address) {
      return (token as { address: string }).address;
    }

    return '';
  }

  private isPairRecommended(fromSymbol: string, toSymbol: string, chainId: number): boolean {
    // Map BTC to WBTC for checking (only on networks that support WBTC)
    const mappedFrom = (fromSymbol === 'BTC' && (chainId === 1 || chainId === 42161)) ? 'WBTC' : fromSymbol;
    const mappedTo = (toSymbol === 'BTC' && (chainId === 1 || chainId === 42161)) ? 'WBTC' : toSymbol;

    // Get recommended pairs for this network
    const networkPairs = this.RECOMMENDED_PAIRS[chainId] || [];
    
    return networkPairs.some(pair => 
      (pair[0] === mappedFrom && pair[1] === mappedTo) ||
      (pair[0] === mappedTo && pair[1] === mappedFrom)
    );
  }

  getSupportedTokens(chainId?: number): Array<{ symbol: string; address: string; decimals: number; network: string; chainId: number }> {
    if (chainId) {
      const networkTokens = this.SUPPORTED_TOKENS[chainId] || {};
      return Object.entries(networkTokens).map(([symbol, info]) => ({
        symbol,
        ...info,
        network: this.NETWORK_CONFIG[chainId]?.name || 'unknown',
        chainId
      }));
    }

    // Return all tokens from all networks
    const allTokens: Array<{ symbol: string; address: string; decimals: number; network: string; chainId: number }> = [];
    Object.entries(this.SUPPORTED_TOKENS).forEach(([chainIdStr, networkTokens]) => {
      const chainId = parseInt(chainIdStr);
      Object.entries(networkTokens).forEach(([symbol, info]) => {
        allTokens.push({
          symbol,
          ...info,
          network: this.NETWORK_CONFIG[chainId]?.name || 'unknown',
          chainId
        });
      });
    });
    return allTokens;
  }

  getRecommendedPairs(chainId?: number): string[][] {
    if (chainId) {
      return [...(this.RECOMMENDED_PAIRS[chainId] || [])];
    }
    
    // Return all pairs from all networks
    const allPairs: string[][] = [];
    Object.values(this.RECOMMENDED_PAIRS).forEach(networkPairs => {
      allPairs.push(...networkPairs);
    });
    return allPairs;
  }

  getSupportedNetworks(): Array<{ chainId: number; name: string; nativeSymbol: string }> {
    return Object.entries(this.NETWORK_CONFIG).map(([chainIdStr, config]) => ({
      chainId: parseInt(chainIdStr),
      ...config
    }));
  }

  // Get optimal amount in wei for the token
  convertToWei(amount: string, token: Token, chainId?: number): string {
    const decimals = this.getTokenDecimals(token, chainId);
    const [integer, decimal = ''] = amount.split('.');
    const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
    return (integer + paddedDecimal).replace(/^0+/, '') || '0';
  }

  getTokenDecimals(token: Token, chainId?: number): number {
    const targetChainId = chainId || this.detectChainIdFromToken(token) || 1;
    
    // Handle Bitcoin -> WBTC mapping
    if (token.network === 'bitcoin' || token.symbol === 'BTC') {
      if (targetChainId === 1 && this.SUPPORTED_TOKENS[1]['WBTC']) {
        return this.SUPPORTED_TOKENS[1]['WBTC'].decimals;
      }
      if (targetChainId === 42161 && this.SUPPORTED_TOKENS[42161]['WBTC']) {
        return this.SUPPORTED_TOKENS[42161]['WBTC'].decimals;
      }
    }

    // Check supported tokens list for the specific network
    const networkTokens = this.SUPPORTED_TOKENS[targetChainId];
    if (networkTokens && networkTokens[token.symbol]) {
      return networkTokens[token.symbol].decimals;
    }

    // Use token's decimals property
    return token.decimals || 18;
  }
}

export const tokenValidationService = TokenValidationService.getInstance();