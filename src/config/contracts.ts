// Deployed contract addresses
export const CONTRACT_ADDRESSES = {
  // Mainnet (Ethereum)
  mainnet: {
    HTLC_ESCROW: "0x2088990997e36e3C22DF036B6ECDD95e535BB324",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8",
  },
  // Sepolia (Testnet)
  sepolia: {
    HTLC_ESCROW: "0x74A16d11aEcEb1A63b6B0080A8660dc128514444",
    WBTC: "0x29f2D40B0605204364af54EC677bD022dA425d03",
    WETH: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
  // Polygon
  polygon: {
    HTLC_ESCROW: "", // Deploy when ready
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  }
};

// Network configurations
export const NETWORKS = {
  mainnet: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
    contractAddress: CONTRACT_ADDRESSES.mainnet.HTLC_ESCROW,
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL || "https://sepolia.infura.io/v3/",
    explorer: "https://sepolia.etherscan.io",
    contractAddress: CONTRACT_ADDRESSES.sepolia.HTLC_ESCROW,
  },
  polygon: {
    chainId: 137,
    name: "Polygon Mainnet",
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
    contractAddress: CONTRACT_ADDRESSES.polygon.HTLC_ESCROW,
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    contractAddress: "",
  },
  optimism: {
    chainId: 10,
    name: "Optimism",
    rpcUrl: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    explorer: "https://optimistic.etherscan.io",
    contractAddress: "",
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
    explorer: "https://basescan.org",
    contractAddress: "",
  },
  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed.binance.org",
    explorer: "https://bscscan.com",
    contractAddress: "",
  }
};

// Default network for development
export const DEFAULT_NETWORK = "sepolia"; // Use testnet for safety

// Get contract address for current network
export function getContractAddress(network: string): string {
  return NETWORKS[network as keyof typeof NETWORKS]?.contractAddress || "";
}

// Get network config
export function getNetworkConfig(network: string) {
  return NETWORKS[network as keyof typeof NETWORKS];
}

// Get network config by chain ID
export function getNetworkConfigByChainId(chainId: number) {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
}

// Get network name by chain ID
export function getNetworkNameByChainId(chainId: number): string {
  const network = getNetworkConfigByChainId(chainId);
  return network?.name || `Chain ${chainId}`;
} 