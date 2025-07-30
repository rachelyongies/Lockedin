import { ethers, run, network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env.local
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function main() {
  console.time("⏱ Deployment time");
  
  // Configure provider with better timeout settings
  const provider = ethers.provider;
  
  // Get network context with retry
  let networkInfo;
  let retries = 3;
  while (retries > 0) {
    try {
      networkInfo = await provider.getNetwork();
      break;
    } catch (error) {
      console.log(`⚠️  Network connection attempt failed. Retries left: ${retries - 1}`);
      retries--;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
    }
  }
  
  console.log(`🌐 Network: ${network.name} (chainId: ${networkInfo.chainId})`);
  console.log("Deploying Fusion1inchBitcoinBridge contract...");
  console.log(`🔍 Debug - FUSION_PROTOCOL_SEPOLIA env var: ${process.env.FUSION_PROTOCOL_SEPOLIA}`);

  // Network-specific addresses
  const addresses = {
    sepolia: {
      fusionProtocol: process.env.FUSION_PROTOCOL_SEPOLIA || null
    },
    localhost: {
      fusionProtocol: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" // Mock address for local testing
    }
  };

  const networkConfig = addresses[network.name];
  if (!networkConfig) {
    throw new Error(`❌ Network ${network.name} not supported. Add configuration to addresses object.`);
  }

  const { fusionProtocol: FUSION_PROTOCOL_ADDRESS } = networkConfig;

  // Strict validation for production networks
  if (network.name === "sepolia" || network.name === "mainnet") {
    if (!FUSION_PROTOCOL_ADDRESS || FUSION_PROTOCOL_ADDRESS === "0x0000000000000000000000000000000000000000") {
      throw new Error(`❌ You must set FUSION_PROTOCOL_SEPOLIA environment variable to a valid Fusion+ contract address.
      
🔧 Set in your .env file:
FUSION_PROTOCOL_SEPOLIA=0x[actual_fusion_contract_address]

📖 Get the address from: https://docs.1inch.io/docs/fusion-plus/introduction`);
    }
  }

  console.log("🔗 Contract addresses:");
  console.log(`   Fusion Protocol: ${FUSION_PROTOCOL_ADDRESS}`);

  // Get deployer info
  const [deployer] = await ethers.getSigners();
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(deployerBalance)} ETH`);

  if (deployerBalance < ethers.parseEther("0.01")) {
    console.log("⚠️  WARNING: Low deployer balance. You may need more ETH for deployment.");
  }

  // Deploy the contract
  const Fusion1inchBitcoinBridge = await ethers.getContractFactory("Fusion1inchBitcoinBridge");
  
  console.log("🚀 Deploying contract...");
  const fusionBridge = await Fusion1inchBitcoinBridge.deploy(
    FUSION_PROTOCOL_ADDRESS
  );

  await fusionBridge.waitForDeployment();
  console.timeEnd("⏱ Deployment time");

  const contractAddress = await fusionBridge.getAddress();
  const deploymentTx = fusionBridge.deploymentTransaction();
  
  console.log("✅ Fusion1inchBitcoinBridge deployed successfully!");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Transaction Hash: ${deploymentTx.hash}`);
  console.log(`⛽ Gas Used: ${deploymentTx.gasLimit.toString()}`);

  // Save deployment artifacts
  const deploymentData = {
    network: network.name,
    chainId: networkInfo.chainId.toString(),
    contractAddress,
    transactionHash: deploymentTx.hash,
    fusionProtocolAddress: FUSION_PROTOCOL_ADDRESS,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment data
  const deploymentFile = path.join(deploymentsDir, `fusion-bridge-${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log(`💾 Deployment data saved to: ${deploymentFile}`);

  // Update environment variables template
  console.log("\n🔧 Add these to your .env.local file:");
  console.log(`NEXT_PUBLIC_FUSION_BRIDGE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_FUSION_PROTOCOL_ADDRESS=${FUSION_PROTOCOL_ADDRESS}`);

  // Automated verification (with retry)
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("\n🔍 Attempting contract verification...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [FUSION_PROTOCOL_ADDRESS],
      });
      console.log("✅ Contract verified on Etherscan!");
    } catch (error) {
      console.log("⚠️  Verification failed (this is normal for new deployments):");
      console.log(error.message);
      console.log("\n📝 Manual verification command:");
      console.log(`npx hardhat verify --network ${network.name} ${contractAddress} ${FUSION_PROTOCOL_ADDRESS}`);
    }
  }

  // Post-deployment setup instructions
  console.log("\n🚀 Next steps for contract setup:");
  console.log("1. 📋 Authorize resolver addresses:");
  console.log(`   fusionBridge.authorizeResolver("0x[resolver_address]")`);
  console.log("2. 👥 Register relayers with stake:");
  console.log(`   fusionBridge.registerRelayer() with value: ${ethers.formatEther(await fusionBridge.minStakeAmount())} ETH`);
  console.log("3. 🔧 Configure timelock limits if needed");
  console.log("4. 🧪 Test with small amounts on testnet");
  console.log("5. 🔗 Update frontend with new contract address");

  // Contract features summary
  console.log("\n📋 Deployed contract features:");
  console.log("- ✅ True BTC ↔ ETH atomic swaps (no WBTC dependency)");
  console.log("- ✅ HTLC with partial fills support");
  console.log("- ✅ 1inch Fusion+ integration for optimal rates");
  console.log("- ✅ Bitcoin HTLC address coordination");
  console.log("- ✅ Automated relayer system");
  console.log("- ✅ Enhanced security (ReentrancyGuard, Pausable)");
  console.log("- ✅ Emergency functions for admin");
  console.log("- ✅ Cross-chain secret hash preservation");

  return {
    contractAddress,
    transactionHash: deploymentTx.hash,
    network: network.name
  };
}

main()
  .then((result) => {
    console.log(`\n🎉 Deployment completed successfully on ${result.network}!`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });