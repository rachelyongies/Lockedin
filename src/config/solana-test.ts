// Solana Test Configuration
export const SOLANA_TEST_CONFIG = {
  // Test wallet address
  testWalletAddress: 'AcXsCPgSPknuk8odssi1osVVT3NqAAQNctPfiWpu7uZN',
  
  // Devnet configuration
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    wsUrl: 'wss://api.devnet.solana.com',
    explorerUrl: 'https://solscan.io/?cluster=devnet',
    chainId: 'devnet',
  },
  
  // Testnet configuration
  testnet: {
    rpcUrl: 'https://api.testnet.solana.com',
    wsUrl: 'wss://api.testnet.solana.com',
    explorerUrl: 'https://solscan.io/?cluster=testnet',
    chainId: 'testnet',
  },
  
  // Token addresses for devnet
  tokens: {
    SOL: {
      address: 'AcXsCPgSPknuk8odssi1osVVT3NqAAQNctPfiWpu7uZN', // Native SOL
      decimals: 9,
      symbol: 'SOL',
    },
    WSOL: {
      address: 'AcXsCPgSPknuk8odssi1osVVT3NqAAQNctPfiWpu7uZN', // Wrapped SOL (same as native on devnet)
      decimals: 9,
      symbol: 'WSOL',
    },
  },
  
  // Bridge configuration for testing
  bridge: {
    minAmount: 0.001, // Minimum bridge amount in SOL
    maxAmount: 100,   // Maximum bridge amount in SOL
    defaultTimelock: 3600, // 1 hour default timelock
    fee: 0.0001,      // Bridge fee in SOL
  },
  
  // Test data
  testData: {
    // Mock balances for testing
    mockBalances: {
      SOL: '10.5',    // 10.5 SOL
      WSOL: '5.2',    // 5.2 WSOL
      ETH: '2.0',     // 2.0 ETH
      BTC: '0.1',     // 0.1 BTC
    },
    
    // Mock exchange rates for testing
    exchangeRates: {
      'ETH_SOL': 0.05,  // 1 ETH = 0.05 SOL
      'SOL_ETH': 20,    // 1 SOL = 20 ETH
      'BTC_SOL': 0.75,  // 1 BTC = 0.75 SOL
      'SOL_BTC': 1.33,  // 1 SOL = 1.33 BTC
    },
  },
};

// Helper function to get Solana network configuration
export function getSolanaNetworkConfig(network: 'devnet' | 'testnet' = 'devnet') {
  return SOLANA_TEST_CONFIG[network];
}

// Helper function to get token configuration
export function getSolanaTokenConfig(symbol: string) {
  return SOLANA_TEST_CONFIG.tokens[symbol as keyof typeof SOLANA_TEST_CONFIG.tokens];
}

// Helper function to get test balance
export function getTestBalance(symbol: string): string {
  return SOLANA_TEST_CONFIG.testData.mockBalances[symbol as keyof typeof SOLANA_TEST_CONFIG.testData.mockBalances] || '0';
}

// Helper function to get exchange rate
export function getExchangeRate(fromSymbol: string, toSymbol: string): number {
  const key = `${fromSymbol}_${toSymbol}` as keyof typeof SOLANA_TEST_CONFIG.testData.exchangeRates;
  return SOLANA_TEST_CONFIG.testData.exchangeRates[key] || 1;
} 