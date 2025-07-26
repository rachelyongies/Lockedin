const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying BitcoinBridge contract...");

  // Get the WBTC address for Sepolia testnet
  const WBTC_SEPOLIA = "0x92f3B59a79bFf5dc60c0d59eA13a44D082B2bdFC";

  // Deploy the contract
  const BitcoinBridge = await ethers.getContractFactory("BitcoinBridge");
  const bitcoinBridge = await BitcoinBridge.deploy(WBTC_SEPOLIA);

  await bitcoinBridge.waitForDeployment();

  const contractAddress = await bitcoinBridge.getAddress();
  console.log("BitcoinBridge deployed to:", contractAddress);
  console.log("WBTC Token Address:", WBTC_SEPOLIA);

  // Update your .env.local with this address
  console.log("\n🔧 Update your .env.local file:");
  console.log(`NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS=${contractAddress}`);

  // Verification command (run separately)
  console.log("\n📝 To verify on Etherscan, run:");
  console.log(`npx hardhat verify --network sepolia ${contractAddress} ${WBTC_SEPOLIA}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });