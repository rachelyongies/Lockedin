
import hre from "hardhat";

const { ethers } = require("hardhat");


async function main() {
  console.log("Deploying SolanaBridge contract...");

  // Get the contract factory
  const SolanaBridge = await hre.ethers.getContractFactory("SolanaBridge");

  // Mock token addresses for deployment
  // In production, these would be real token addresses
  const mockWSOLToken = "0x905477D96023b2465DA8dfA0960669708AEFaeb2"; // EVM wallet address for WSOL token 
  const mockWETHToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // Real WETH address

  // Deploy the contract
  const solanaBridge = await SolanaBridge.deploy(mockWSOLToken, mockWETHToken);

  await solanaBridge.waitForDeployment();

  const address = await solanaBridge.getAddress();
  console.log(`SolanaBridge deployed to: ${address}`);

  // Log deployment info
  console.log("Deployment Info:");
  console.log("- Contract: SolanaBridge");
  console.log("- Address:", address);
  console.log("- WSOL Token:", mockWSOLToken);
  console.log("- WETH Token:", mockWETHToken);
  console.log("- Owner:", await solanaBridge.owner());
  console.log("- Bridge Fee:", hre.ethers.formatEther(await solanaBridge.bridgeFee()), "ETH");

  // Verify the deployment
  console.log("\nVerifying deployment...");
  const deployedCode = await hre.ethers.provider.getCode(address);
  if (deployedCode === "0x") {
    throw new Error("Contract deployment failed - no code at address");
  }
  console.log("✅ Contract deployed successfully!");

  return address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 