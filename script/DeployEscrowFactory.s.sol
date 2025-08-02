// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/HTLC1inchEscrow.sol";

contract DeployEscrowFactory is Script {
    function run() external {
        string memory privateKeyHex = vm.envString("PRIVATE_KEY");
        string memory privateKeyWithPrefix = string.concat("0x", privateKeyHex);
        uint256 deployerPrivateKey = vm.parseUint(privateKeyWithPrefix);
        vm.startBroadcast(deployerPrivateKey);

        // Deploy HTLC1inchEscrow contract
        // Note: Replace these addresses with actual 1inch Fusion+ addresses
        address fusionRelayer = vm.envAddress("FUSION_RELAYER_ADDRESS");
        address feeCollector = vm.envAddress("FEE_COLLECTOR_ADDRESS");
        
        HTLC1inchEscrow htlcEscrow = new HTLC1inchEscrow(fusionRelayer, feeCollector);
        
        console.log("HTLC1inchEscrow deployed to:", address(htlcEscrow));
        console.log("Fusion Relayer:", fusionRelayer);
        console.log("Fee Collector:", feeCollector);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Network: EVM Compatible");
        console.log("Supports: ETH, WBTC, USDC, and other ERC20 tokens");

        vm.stopBroadcast();
    }
} 