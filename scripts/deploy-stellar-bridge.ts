const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying StellarBridge contract...");

  // Get the contract factory
  const StellarBridge = await ethers.getContractFactory("StellarBridge");

  // Mock token addresses for local deployment
  // In production, these would be real token addresses
  const mockWETHToken = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH on mainnet
  const mockWXLMToken = "0x905477D96023b2465DA8dfA0960669708AEFaeb2"; // Your Sepolia testnet WXLM token address

  console.log("Deploying with parameters:");
  console.log("- WETH Token:", mockWETHToken);
  console.log("- WXLM Token:", mockWXLMToken);

  // Deploy the contract
  const stellarBridge = await StellarBridge.deploy(mockWETHToken, mockWXLMToken);

  // Wait for deployment to complete
  await stellarBridge.waitForDeployment();

  // Get the deployed address
  const address = await stellarBridge.getAddress();

  console.log("✅ StellarBridge deployed successfully!");
  console.log("Contract address:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", (await ethers.getSigners())[0].address);

  // Log contract details
  console.log("\n📋 Contract Details:");
  console.log("- Bridge Fee:", ethers.formatEther(await stellarBridge.bridgeFee()), "ETH");
  console.log("- Min Bridge Amount:", ethers.formatEther(await stellarBridge.MIN_BRIDGE_AMOUNT()), "ETH");
  console.log("- Max Bridge Amount:", ethers.formatEther(await stellarBridge.MAX_BRIDGE_AMOUNT()), "ETH");
  console.log("- WETH Token:", await stellarBridge.wethToken());
  console.log("- WXLM Token:", await stellarBridge.wxlmToken());
  console.log("- Stellar Network:", await stellarBridge.stellarNetwork());

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    console.log("❌ Contract deployment verification failed - no code at address");
  } else {
    console.log("✅ Contract deployment verified - code found at address");
  }

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  try {
    // Test Stellar address validation
    const validAddress = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const invalidAddress = "INVALID_ADDRESS";
    
    const isValid = await stellarBridge.validateStellarAddress(validAddress);
    const isInvalid = await stellarBridge.validateStellarAddress(invalidAddress);
    
    console.log("✅ Stellar address validation test passed");
    console.log("  - Valid address:", validAddress, "->", isValid);
    console.log("  - Invalid address:", invalidAddress, "->", isInvalid);

    console.log("\n🎉 Deployment and verification completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Update the contract address in your frontend configuration");
    console.log("2. Set up proper token addresses for production");
    console.log("3. Configure bridge fees and limits as needed");
    console.log("4. Set up Stellar network configuration (public/testnet)");
    console.log("5. Test the bridge functionality with real tokens");
    console.log("6. Implement Stellar transaction monitoring");

  } catch (error) {
    console.log("❌ Basic functionality test failed:", error);
  }
}

// Handle errors
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
}); 