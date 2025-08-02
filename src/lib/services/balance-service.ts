import { ethers } from 'ethers';
import { TokenBalance } from '@/store/useWalletStore';

// ERC20 ABI for balanceOf function
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// Native token addresses per chain
const NATIVE_TOKEN_ADDRESSES: Record<number, string> = {
  1: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe', // Ethereum Mainnet
  137: '0x0000000000000000000000000000000000001010', // Polygon
  56: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe', // BSC
  11155111: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe', // Sepolia
  80001: '0x0000000000000000000000000000000000001010' // Mumbai
};

export interface BalanceServiceConfig {
  rpcUrl: string;
  chainId: number;
}

export class BalanceService {
  private provider: ethers.JsonRpcProvider;
  private chainId: number;

  constructor(config: BalanceServiceConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.chainId = config.chainId;
  }

  /**
   * Fetch native token balance (ETH, MATIC, etc.)
   */
  async getNativeBalance(address: string): Promise<TokenBalance> {
    try {
      const balance = await this.provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      
      // Get token info based on chain
      const tokenInfo = this.getNativeTokenInfo();
      
      return {
        address: NATIVE_TOKEN_ADDRESSES[this.chainId] || NATIVE_TOKEN_ADDRESSES[1],
        symbol: tokenInfo.symbol,
        decimals: 18,
        balance: balance.toString(),
        formattedBalance,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error fetching native balance:', error);
      throw new Error(`Failed to fetch ${this.getNativeTokenInfo().symbol} balance`);
    }
  }

  /**
   * Fetch ERC20 token balance
   */
  async getERC20Balance(tokenAddress: string, walletAddress: string): Promise<TokenBalance> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      
      // Fetch balance and token info in parallel
      const [balance, decimals, symbol, name] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
        contract.symbol(),
        contract.name()
      ]);

      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      return {
        address: tokenAddress.toLowerCase(),
        symbol,
        decimals,
        balance: balance.toString(),
        formattedBalance,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error fetching ERC20 balance:', error);
      throw new Error(`Failed to fetch token balance for ${tokenAddress}`);
    }
  }

  /**
   * Fetch multiple token balances
   */
  async getMultipleBalances(
    walletAddress: string, 
    tokenAddresses: string[]
  ): Promise<Record<string, TokenBalance>> {
    const balances: Record<string, TokenBalance> = {};
    
    // Fetch native balance
    const nativeBalance = await this.getNativeBalance(walletAddress);
    balances[nativeBalance.address] = nativeBalance;
    
    // Fetch ERC20 balances
    const erc20Promises = tokenAddresses
      .filter(addr => addr.toLowerCase() !== NATIVE_TOKEN_ADDRESSES[1].toLowerCase())
      .map(async (tokenAddress) => {
        try {
          const balance = await this.getERC20Balance(tokenAddress, walletAddress);
          return { [balance.address]: balance };
        } catch (error) {
          console.warn(`Failed to fetch balance for ${tokenAddress}:`, error);
          return {};
        }
      });

    const erc20Results = await Promise.all(erc20Promises);
    erc20Results.forEach(result => {
      Object.assign(balances, result);
    });

    return balances;
  }

  /**
   * Get native token info based on chain ID
   */
  private getNativeTokenInfo(): { symbol: string; name: string } {
    switch (this.chainId) {
      case 1: // Ethereum Mainnet
        return { symbol: 'ETH', name: 'Ethereum' };
      case 137: // Polygon
        return { symbol: 'MATIC', name: 'Polygon' };
      case 56: // BSC
        return { symbol: 'BNB', name: 'BNB Smart Chain' };
      case 11155111: // Sepolia
        return { symbol: 'ETH', name: 'Sepolia ETH' };
      case 80001: // Mumbai
        return { symbol: 'MATIC', name: 'Mumbai MATIC' };
      default:
        return { symbol: 'ETH', name: 'Ethereum' };
    }
  }

  /**
   * Get USD value for a token (placeholder - integrate with price API)
   */
  async getUSDValue(symbol: string, amount: string): Promise<number> {
    // TODO: Integrate with CoinGecko, 1inch, or other price APIs
    const mockPrices: Record<string, number> = {
      'ETH': 2000,
      'MATIC': 0.8,
      'BNB': 300,
      'WBTC': 40000,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1
    };
    
    const price = mockPrices[symbol] || 1;
    return parseFloat(amount) * price;
  }
}

// Factory function to create balance service for different networks
export function createBalanceService(chainId: number, rpcUrl?: string): BalanceService {
  const defaultRpcUrls: Record<number, string> = {
    1: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    137: 'https://polygon-rpc.com',
    56: 'https://bsc-dataseed.binance.org',
    11155111: 'https://eth-sepolia.g.alchemy.com/public',
    80001: 'https://rpc-mumbai.maticvigil.com'
  };

  const config: BalanceServiceConfig = {
    rpcUrl: rpcUrl || defaultRpcUrls[chainId] || defaultRpcUrls[1],
    chainId
  };

  return new BalanceService(config);
} 