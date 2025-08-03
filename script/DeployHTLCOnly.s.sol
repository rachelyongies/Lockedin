// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/HTLC1inchEscrow.sol";

contract DeployHTLCOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy HTLC1inchEscrow contract
        address fusionRelayer = vm.envAddress("FUSION_RELAYER_ADDRESS");
        address feeCollector = vm.envAddress("FEE_COLLECTOR_ADDRESS");
        
        HTLC1inchEscrow htlcEscrow = new HTLC1inchEscrow(fusionRelayer, feeCollector);
        
        console.log("HTLC1inchEscrow deployed to:", address(htlcEscrow));
        console.log("Fusion Relayer:", fusionRelayer);
        console.log("Fee Collector:", feeCollector);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Network: Sepolia Testnet");
        console.log("Supports: ETH, WBTC, USDC, and other ERC20 tokens");

        vm.stopBroadcast();
    }
} 