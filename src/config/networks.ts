// 🌐 PRODUCTION NETWORK CONFIGURATIONS
// Supports mainnet and testnet for real world deployment

export interface NetworkConfig {
  id: number;
  name: string;
  type: 'mainnet' | 'testnet';
  currency: string;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
  isEnabled: boolean;
  confirmations: number;
  gasConfig: {
    standard: number;
    fast: number;
    instant: number;
  };
}

// 🚀 ETHEREUM NETWORKS
export const ETHEREUM_NETWORKS: NetworkConfig[] = [
  {
    id: 1,
    name: 'Ethereum Mainnet',
    type: 'mainnet',
    currency: 'ETH',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_MAINNET_RPC || 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    isEnabled: process.env.NEXT_PUBLIC_ENABLE_MAINNET === 'true',
    confirmations: 12,
    gasConfig: {
      standard: 21,
      fast: 35,
      instant: 50
    }
  },
  {
    id: 11155111,
    name: 'Sepolia Testnet',
    type: 'testnet',
    currency: 'ETH',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://sepolia.gateway.tenderly.co',
    explorerUrl: 'https://sepolia.etherscan.io',
    faucetUrl: 'https://sepoliafaucet.com/',
    isEnabled: process.env.NEXT_PUBLIC_ENABLE_TESTNET === 'true',
    confirmations: 3,
    gasConfig: {
      standard: 10,
      fast: 15,
      instant: 20
    }
  }
];

// ⚡ BITCOIN NETWORKS
export const BITCOIN_NETWORKS = [
  {
    id: 0,
    name: 'Bitcoin Mainnet',
    type: 'mainnet' as const,
    currency: 'BTC',
    rpcUrl: process.env.NEXT_PUBLIC_BITCOIN_MAINNET_RPC || 'https://mempool.space/api',
    explorerUrl: 'https://mempool.space',
    isEnabled: process.env.NEXT_PUBLIC_ENABLE_MAINNET === 'true',
    confirmations: 6,
    gasConfig: {
      standard: 10, // sat/vB
      fast: 20,
      instant: 50
    }
  },
  {
    id: 1,
    name: 'Bitcoin Testnet4',
    type: 'testnet' as const,
    currency: 'BTC',
    rpcUrl: process.env.NEXT_PUBLIC_BITCOIN_RPC_URL || 'https://mempool.space/testnet4/api',
    explorerUrl: 'https://mempool.space/testnet4',
    faucetUrl: 'https://coinfaucet.eu/en/btc-testnet/',
    isEnabled: process.env.NEXT_PUBLIC_ENABLE_TESTNET === 'true',
    confirmations: 1,
    gasConfig: {
      standard: 1,
      fast: 3,
      instant: 10
    }
  }
];

// 🟣 SOLANA NETWORKS
export const SOLANA_NETWORKS = [
  {
    id: 101,
    name: 'Solana Mainnet',
    type: 'mainnet' as const,
    currency: 'SOL',
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    isEnabled: process.env.NEXT_PUBLIC_ENABLE_MAINNET === 'true',
    confirmations: 32,
    gasConfig: {
      standard: 5000, // lamports
      fast: 10000,
      instant: 20000
    }
  },
  {
    id: 103,
    name: 'Solana Devnet',
    type: 'testnet' as const,
    currency: 'SOL',
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    explorerUrl: 'https://solscan.io/?cluster=devnet',
    faucetUrl: 'https://faucet.solana.com/',
    isEnabled: process.env.NEXT_PUBLIC_ENABLE_TESTNET === 'true',
    confirmations: 32,
    gasConfig: {
      standard: 5000,
      fast: 10000,
      instant: 20000
    }
  }
];

// 🌐 ALL NETWORKS COMBINED
export const ALL_NETWORKS = [
  ...ETHEREUM_NETWORKS,
  ...BITCOIN_NETWORKS,
  ...SOLANA_NETWORKS
];

// 🎯 PRODUCTION CONTRACT ADDRESSES
export const CONTRACT_ADDRESSES = {
  // Real deployed contracts
  ethereum: {
    mainnet: {
      fusionBridge: '0x0000000000000000000000000000000000000000', // Deploy to mainnet
      htlcFactory: '0x0000000000000000000000000000000000000000'
    },
    sepolia: {
      fusionBridge: process.env.NEXT_PUBLIC_FUSION_BRIDGE_CONTRACT || '0x342EB13550e171606BEdcE6492E549Fc19678435',
      htlcFactory: '0x0000000000000000000000000000000000000000' // To be deployed
    }
  }
};

// 🔧 NETWORK UTILITIES
export class NetworkManager {
  static getNetworkById(id: number): NetworkConfig | undefined {
    return ALL_NETWORKS.find(network => network.id === id);
  }

  static getEnabledNetworks(): NetworkConfig[] {
    return ALL_NETWORKS.filter(network => network.isEnabled);
  }

  static getMainnetNetworks(): NetworkConfig[] {
    return ALL_NETWORKS.filter(network => 
      network.type === 'mainnet' && network.isEnabled
    );
  }

  static getTestnetNetworks(): NetworkConfig[] {
    return ALL_NETWORKS.filter(network => 
      network.type === 'testnet' && network.isEnabled
    );
  }

  static getContractAddress(network: 'ethereum', chainId: number, contract: string): string {
    const networkName = chainId === 1 ? 'mainnet' : 'sepolia';
    return CONTRACT_ADDRESSES[network][networkName][contract as keyof typeof CONTRACT_ADDRESSES.ethereum.mainnet] || '';
  }

  static async checkNetworkHealth(network: NetworkConfig): Promise<boolean> {
    try {
      const response = await fetch(network.rpcUrl);
      return response.ok;
    } catch {
      return false;
    }
  }

  // 🚀 Get Production Configuration
  static getProductionConfig() {
    return {
      isMainnetEnabled: process.env.NEXT_PUBLIC_ENABLE_MAINNET === 'true',
      isTestnetEnabled: process.env.NEXT_PUBLIC_ENABLE_TESTNET === 'true',
      debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
      enabledNetworks: this.getEnabledNetworks(),
      deployedContracts: CONTRACT_ADDRESSES
    };
  }
}