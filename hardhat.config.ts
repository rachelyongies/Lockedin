require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
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
    sepolia: {
      url: process.env.NEXT_PUBLIC_ETH_RPC_URL || "https://eth-sepolia.public.blastapi.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [
        // Test account - NEVER use for mainnet
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      ],
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
