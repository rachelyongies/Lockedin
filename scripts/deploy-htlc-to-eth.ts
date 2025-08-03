import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying HTLC1inchEscrow to Ethereum...");

  // Get the contract factory
  const HTLC1inchEscrow = await ethers.getContractFactory("HTLC1inchEscrow");

  // Deploy the contract
  // Note: You'll need to provide actual addresses for fusionRelayer and feeCollector
  const fusionRelayer = "0x0000000000000000000000000000000000000000"; // Replace with actual address
  const feeCollector = "0x0000000000000000000000000000000000000000"; // Replace with actual address

  console.log("📋 Deployment parameters:");
  console.log("  - Fusion Relayer:", fusionRelayer);
  console.log("  - Fee Collector:", feeCollector);

  const htlcEscrow = await HTLC1inchEscrow.deploy(fusionRelayer, feeCollector);

  await htlcEscrow.waitForDeployment();

  const address = await htlcEscrow.getAddress();
  console.log("✅ HTLC1inchEscrow deployed to:", address);

  // Verify the deployment
  console.log("🔍 Verifying deployment...");
  const deployedCode = await ethers.provider.getCode(address);
  if (deployedCode === "0x") {
    throw new Error("Contract deployment failed - no code at address");
  }
  console.log("✅ Contract verification successful");

  // Log deployment info
  console.log("\n📊 Deployment Summary:");
  console.log("  Contract: HTLC1inchEscrow");
  console.log("  Address:", address);
  console.log("  Network: Ethereum Mainnet");
  console.log("  Chain ID: 1");

  // Save deployment info to a file
  const deploymentInfo = {
    contract: "HTLC1inchEscrow",
    address: address,
    network: "ethereum",
    chainId: 1,
    deployer: await htlcEscrow.signer.getAddress(),
    fusionRelayer: fusionRelayer,
    feeCollector: feeCollector,
    deploymentTime: new Date().toISOString()
  };

  console.log("\n💾 Deployment info saved to deployment-info.json");
  console.log("📝 Remember to update your environment variables with the new contract address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 