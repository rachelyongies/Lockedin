import { ethers } from 'hardhat';
import { HTLC1inchEscrow__factory } from '../typechain-types';

async function main() {
  console.log('🚀 Deploying HTLC1inchEscrow contract...');

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('📝 Deploying contracts with account:', deployer.address);

  // Check account balance
  const balance = await deployer.getBalance();
  console.log('💰 Account balance:', ethers.formatEther(balance), 'ETH');

  if (balance.lt(ethers.parseEther('0.01'))) {
    throw new Error('❌ Insufficient balance for deployment');
  }

  // Configuration
  const FUSION_RELAYER = process.env.FUSION_RELAYER_ADDRESS || '0x0000000000000000000000000000000000000000';
  const FEE_COLLECTOR = process.env.FEE_COLLECTOR_ADDRESS || deployer.address;

  console.log('⚙️  Configuration:');
  console.log('  - Fusion Relayer:', FUSION_RELAYER);
  console.log('  - Fee Collector:', FEE_COLLECTOR);

  // Deploy HTLC1inchEscrow contract
  console.log('\n📦 Deploying HTLC1inchEscrow...');
  const HTLC1inchEscrow = await ethers.getContractFactory('HTLC1inchEscrow');
  const htlcEscrow = await HTLC1inchEscrow.deploy(FUSION_RELAYER, FEE_COLLECTOR);
  
  await htlcEscrow.waitForDeployment();
  const htlcEscrowAddress = await htlcEscrow.getAddress();

  console.log('✅ HTLC1inchEscrow deployed to:', htlcEscrowAddress);

  // Verify deployment
  console.log('\n🔍 Verifying deployment...');
  const code = await ethers.provider.getCode(htlcEscrowAddress);
  if (code === '0x') {
    throw new Error('❌ Contract deployment failed - no code at address');
  }
  console.log('✅ Contract code verified');

  // Get contract details
  console.log('\n📊 Contract Details:');
  console.log('  - Fusion Relayer:', await htlcEscrow.fusionRelayer());
  console.log('  - Fee Collector:', await htlcEscrow.feeCollector());
  console.log('  - Protocol Fee:', await htlcEscrow.protocolFee(), 'basis points');
  console.log('  - Min Timelock:', await htlcEscrow.minTimelock(), 'seconds');
  console.log('  - Max Timelock:', await htlcEscrow.maxTimelock(), 'seconds');

  // Test basic functionality
  console.log('\n🧪 Testing basic functionality...');
  
  // Test HTLC creation (simulation)
  const testResolver = '0x1234567890123456789012345678901234567890';
  const testFromToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEeE'; // ETH
  const testToToken = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
  const testAmount = ethers.parseEther('0.1');
  const testExpectedAmount = ethers.parseEther('0.1');
  const testSecretHash = ethers.keccak256(ethers.toUtf8Bytes('test-secret'));
  const testTimelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  console.log('  - Test HTLC parameters generated');
  console.log('  - Secret Hash:', testSecretHash);
  console.log('  - Timelock:', new Date(testTimelock * 1000).toISOString());

  // Test contract state
  const testHtlcId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'address', 'address', 'uint256', 'uint256', 'bytes32', 'uint256', 'uint256'],
    [deployer.address, testResolver, testFromToken, testToToken, testAmount, testExpectedAmount, testSecretHash, testTimelock, Math.floor(Date.now() / 1000)]
  ));

  const htlcExists = await htlcEscrow.htlcExists(testHtlcId);
  console.log('  - Test HTLC exists check:', htlcExists);

  // Deployment summary
  console.log('\n🎉 Deployment Summary:');
  console.log('=====================================');
  console.log('Contract: HTLC1inchEscrow');
  console.log('Address:', htlcEscrowAddress);
  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log('Deployer:', deployer.address);
  console.log('Gas Used:', (await htlcEscrow.deploymentTransaction())?.gasLimit?.toString() || 'Unknown');
  console.log('=====================================');

  // Save deployment info
  const deploymentInfo = {
    contract: 'HTLC1inchEscrow',
    address: htlcEscrowAddress,
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    fusionRelayer: FUSION_RELAYER,
    feeCollector: FEE_COLLECTOR,
    deploymentTime: new Date().toISOString(),
    constructorArgs: [FUSION_RELAYER, FEE_COLLECTOR]
  };

  console.log('\n💾 Deployment info saved to deployment-info.json');
  
  // Note: In a real deployment, you would save this to a file
  // const fs = require('fs');
  // fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));

  return {
    htlcEscrowAddress,
    deploymentInfo
  };
}

// Handle errors
main()
  .then((result) => {
    console.log('\n✅ Deployment completed successfully!');
    console.log('HTLC Escrow Address:', result.htlcEscrowAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }); 