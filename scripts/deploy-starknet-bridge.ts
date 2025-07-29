import hre from "hardhat";

async function main() {
  console.log("Deploying StarknetBridge contract...");

  // Get the contract factory
  const StarknetBridge = await hre.ethers.getContractFactory("StarknetBridge");

  // Mock token addresses for local deployment
  // In production, these would be real token addresses
  const mockWETHToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH on mainnet
  const mockWSTARKToken = "0x070ed3c953df4131094cf7f5e1d25ad1f77c0c04f7ab36b743160c59dd292581"; // Starknet address

  console.log("Deploying with parameters:");
  console.log("- WETH Token:", mockWETHToken);
  console.log("- WSTARK Token:", mockWSTARKToken);

  // Deploy the contract
  const starknetBridge = await StarknetBridge.deploy(mockWETHToken, mockWSTARKToken);

  // Wait for deployment to complete
  await starknetBridge.waitForDeployment();

  // Get the deployed address
  const address = await starknetBridge.getAddress();

  console.log("✅ StarknetBridge deployed successfully!");
  console.log("Contract address:", address);
  console.log("Network:", (await hre.ethers.provider.getNetwork()).name);
  console.log("Deployer:", (await hre.ethers.getSigners())[0].address);

  // Log contract details
  console.log("\n📋 Contract Details:");
  console.log("- Bridge Fee:", hre.ethers.formatEther(await starknetBridge.bridgeFee()), "ETH");
  console.log("- Min Bridge Amount:", hre.ethers.formatEther(await starknetBridge.MIN_BRIDGE_AMOUNT()), "ETH");
  console.log("- Max Bridge Amount:", hre.ethers.formatEther(await starknetBridge.MAX_BRIDGE_AMOUNT()), "ETH");
  console.log("- WETH Token:", await starknetBridge.wethToken());
  console.log("- WSTARK Token:", await starknetBridge.wstarkToken());

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const code = await hre.ethers.provider.getCode(address);
  if (code === "0x") {
    console.log("❌ Contract deployment verification failed - no code at address");
  } else {
    console.log("✅ Contract deployment verified - code found at address");
  }

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  try {
    // Test address conversion
    const testAddress = "0x1234567890123456789012345678901234567890";
    const convertedAddress = await starknetBridge.convertStarknetAddress(testAddress);
    console.log("✅ Address conversion test passed");
    console.log("  - Input:", testAddress);
    console.log("  - Converted:", convertedAddress.toString());

    console.log("\n🎉 Deployment and verification completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Update the contract address in your frontend configuration");
    console.log("2. Set up proper token addresses for production");
    console.log("3. Configure bridge fees and limits as needed");
    console.log("4. Test the bridge functionality with real tokens");

  } catch (error) {
    console.log("❌ Basic functionality test failed:", error);
  }
}

// Handle errors
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
}); 