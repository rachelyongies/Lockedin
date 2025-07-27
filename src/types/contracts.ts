import { ethers } from 'ethers';

// Reusable HTLC struct type matching Solidity struct
export interface HTLC {
  initiator: string;
  resolver: string;
  amount: bigint;
  secretHash: string;
  timelock: bigint;
  executed: boolean;
  refunded: boolean;
  partialFillsEnabled: boolean;
  totalFilled: bigint;
  maxPartialFills: bigint;
  currentFills: bigint;
}

// Simplified type for contract methods - using ethers.Contract directly
export type Fusion1inchBitcoinBridge = ethers.Contract;
export type BitcoinBridge = ethers.Contract;

// Export contract factory functions - focusing on connect only
export const Fusion1inchBitcoinBridge__factory = {
  connect(address: string, provider: ethers.Provider | ethers.Signer): Fusion1inchBitcoinBridge {
    // Complete ABI matching our actual contract
    const abi = [
      // Main HTLC functions
      "function initiateFusionHTLC(bytes32 secretHash, address resolver, uint256 timelock, bool partialFillsEnabled, string bitcoinHTLCAddress) external payable",
      "function redeemHTLC(bytes32 id, bytes32 preimage) external",
      "function refundHTLC(bytes32 id) external",
      "function depositTokens(bytes32 id, uint256 amount) external",
      "function relayerRedeem(bytes32 id, bytes32 preimage, uint256 fillAmount) external",
      
      // View functions  
      "function getHTLC(bytes32 id) external view returns (tuple(address initiator, address resolver, uint256 amount, bytes32 secretHash, uint256 timelock, bool executed, bool refunded, bool partialFillsEnabled, uint256 totalFilled, uint256 maxPartialFills, uint256 currentFills))",
      "function getHTLCFills(bytes32 id) external view returns (bytes32[] memory)",
      "function getBitcoinHTLCAddress(bytes32 id) external view returns (string memory)",
      "function getRemainingAmount(bytes32 id) external view returns (uint256)",
      "function isHTLCActive(bytes32 id) external view returns (bool)",
      "function getFillPercentage(bytes32 id) external view returns (uint256)",
      
      // Admin view functions
      "function minStakeAmount() external view returns (uint256)",
      "function relayerRewardRate() external view returns (uint256)",
      "function maxPartialFills() external view returns (uint256)",
      "function minTimelock() external view returns (uint256)",
      "function maxTimelock() external view returns (uint256)",
      "function fusionProtocol() external view returns (address)",
      
      // Admin functions
      "function setFusionProtocol(address _fusionProtocol) external",
      "function setRelayerRewardRate(uint256 _rate) external", 
      "function setMinStakeAmount(uint256 _amount) external",
      "function setTimelockLimits(uint256 _min, uint256 _max) external",
      "function setMaxPartialFills(uint256 _max) external",
      "function pause() external",
      "function unpause() external",
      "function emergencyWithdraw(address token, uint256 amount) external",
      
      // Relayer functions
      "function registerRelayer() external payable",
      "function deactivateRelayer(address relayer) external",
      "function authorizeResolver(address resolver) external",
      "function deauthorizeResolver(address resolver) external",
      
      // Events
      "event HTLCInitiated(bytes32 indexed id, address indexed initiator, address indexed resolver, uint256 amount, bytes32 secretHash, uint256 timelock, bool partialFillsEnabled, string bitcoinHTLCAddress)",
      "event HTLCRedeemed(bytes32 indexed id, bytes32 secretHash, bytes32 preimage, uint256 amount, address resolver)",
      "event HTLCRefunded(bytes32 indexed id, uint256 amount, address initiator)",
      "event PartialFill(bytes32 indexed id, uint256 fillAmount, uint256 remainingAmount, address indexed filler, uint256 timestamp)",
      "event RelayerRegistered(address indexed relayer, uint256 stakeAmount, uint256 timestamp)",
      "event RelayerDeactivated(address indexed relayer, uint256 timestamp)",
      "event Paused(address account)",
      "event Unpaused(address account)"
    ];
    
    return new ethers.Contract(address, abi, provider) as Fusion1inchBitcoinBridge;
  }
};

export const BitcoinBridge__factory = {
  connect(address: string, provider: ethers.Provider | ethers.Signer): BitcoinBridge {
    // Legacy contract ABI
    const abi = [
      "function initiate(bytes32 secretHash, address receiver, uint256 timelock) external payable",
      "function redeem(bytes32 secret) external", 
      "function refund(bytes32 secretHash) external",
      "event Initiated(bytes32 indexed id, address indexed initiator, address indexed resolver, uint256 amount)",
      "event Redeemed(bytes32 indexed id, bytes32 preimage)",
      "event Refunded(bytes32 indexed id)"
    ];
    
    return new ethers.Contract(address, abi, provider) as BitcoinBridge;
  }
};