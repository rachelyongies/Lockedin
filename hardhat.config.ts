import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true  // Enable IR optimizer to fix "Stack too deep" errors
    }
  },
  networks: {
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      timeout: 60000,
      gas: 2100000,
      gasPrice: 20000000000 // 20 gwei
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      timeout: 60000,
      gas: 2100000,
      gasPrice: 30000000000 // 30 gwei
    },
    sepolia: {
      url: process.env.NEXT_PUBLIC_ETH_RPC_URL || "https://eth-sepolia.g.alchemy.com/public",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      timeout: 60000,
      gas: 2100000,
      gasPrice: 8000000000
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hardhat: {
      chainId: 31337
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
