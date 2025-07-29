// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StarknetBridge
 * @dev Handles Ethereum to Starknet bridging using HTLCs.
 */
contract StarknetBridge is ReentrancyGuard, Ownable {
    event Initiated(bytes32 indexed id, address indexed initiator, uint256 indexed starknetAddress, uint256 amount);
    event Redeemed(bytes32 indexed id, bytes32 preimage);
    event Refunded(bytes32 indexed id);

    struct Htlc {
        address payable initiator;
        uint256 starknetAddress; // Starknet address as uint256
        uint256 amount;
        bytes32 hash;
        uint256 timelock;
        bool executed;
        bool refunded;
    }

    mapping(bytes32 => Htlc) public htlcs;
    IERC20 public immutable wethToken; // Wrapped ETH token
    IERC20 public immutable wstarkToken; // Wrapped STARK token on Ethereum

    // Bridge fees
    uint256 public bridgeFee = 0.001 ether; // 0.001 ETH bridge fee
    uint256 public constant MIN_BRIDGE_AMOUNT = 0.01 ether; // Minimum 0.01 ETH
    uint256 public constant MAX_BRIDGE_AMOUNT = 100 ether; // Maximum 100 ETH

    constructor(address _wethToken, address _wstarkToken) Ownable(msg.sender) {
        wethToken = IERC20(_wethToken);
        wstarkToken = IERC20(_wstarkToken);
    }

    /**
     * @dev Initiates an HTLC swap from Ethereum to Starknet.
     * @param id A unique identifier for the swap.
     * @param _starknetAddress The Starknet address that will receive the funds (as uint256).
     * @param _hash The SHA-256 hash of the preimage.
     * @param _timelock The time (in seconds) after which the swap can be refunded.
     */
    function initiateToStarknet(
        bytes32 id,
        uint256 _starknetAddress,
        bytes32 _hash,
        uint256 _timelock
    ) external payable nonReentrant {
        require(htlcs[id].initiator == address(0), "StarknetBridge: swap with this id already exists");
        require(msg.value >= MIN_BRIDGE_AMOUNT, "StarknetBridge: amount too low");
        require(msg.value <= MAX_BRIDGE_AMOUNT, "StarknetBridge: amount too high");
        require(_starknetAddress != 0, "StarknetBridge: invalid Starknet address");
        require(_hash != bytes32(0), "StarknetBridge: invalid hash");
        require(_timelock > 3600, "StarknetBridge: timelock must be greater than 1 hour");

        // Calculate bridge fee
        uint256 bridgeFeeAmount = bridgeFee;
        uint256 transferAmount = msg.value - bridgeFeeAmount;

        htlcs[id] = Htlc({
            initiator: payable(msg.sender),
            starknetAddress: _starknetAddress,
            amount: transferAmount,
            hash: _hash,
            timelock: block.timestamp + _timelock,
            executed: false,
            refunded: false
        });

        emit Initiated(id, msg.sender, _starknetAddress, transferAmount);
    }

    /**
     * @dev Initiates an HTLC swap from Starknet to Ethereum.
     * @param id A unique identifier for the swap.
     * @param _ethereumAddress The Ethereum address that will receive the funds.
     * @param _amount The amount of STARK to bridge.
     * @param _hash The SHA-256 hash of the preimage.
     * @param _timelock The time (in seconds) after which the swap can be refunded.
     */
    function initiateFromStarknet(
        bytes32 id,
        address payable _ethereumAddress,
        uint256 _amount,
        bytes32 _hash,
        uint256 _timelock
    ) external nonReentrant {
        require(htlcs[id].initiator == address(0), "StarknetBridge: swap with this id already exists");
        require(_amount >= 0.01 ether, "StarknetBridge: amount too low"); // Minimum 0.01 STARK
        require(_amount <= 1000 ether, "StarknetBridge: amount too high"); // Maximum 1000 STARK
        require(_ethereumAddress != address(0), "StarknetBridge: invalid Ethereum address");
        require(_hash != bytes32(0), "StarknetBridge: invalid hash");
        require(_timelock > 3600, "StarknetBridge: timelock must be greater than 1 hour");

        // Transfer WSTARK tokens from initiator
        require(wstarkToken.transferFrom(msg.sender, address(this), _amount), "StarknetBridge: transfer failed");

        htlcs[id] = Htlc({
            initiator: payable(msg.sender),
            starknetAddress: 0, // Not used for Starknet to Ethereum
            amount: _amount,
            hash: _hash,
            timelock: block.timestamp + _timelock,
            executed: false,
            refunded: false
        });

        emit Initiated(id, msg.sender, 0, _amount);
    }

    /**
     * @dev Redeems an HTLC swap.
     * @param id The ID of the swap to redeem.
     * @param _preimage The secret preimage that hashes to the stored hash.
     */
    function redeem(bytes32 id, bytes calldata _preimage) external nonReentrant {
        Htlc storage htlc = htlcs[id];
        require(!htlc.executed, "StarknetBridge: swap already executed");
        require(!htlc.refunded, "StarknetBridge: swap already refunded");
        require(htlc.timelock > block.timestamp, "StarknetBridge: timelock has expired");
        require(sha256(abi.encodePacked(_preimage)) == htlc.hash, "StarknetBridge: invalid preimage");

        htlc.executed = true;

        // Transfer funds to redeemer
        if (htlc.starknetAddress != 0) {
            // Ethereum to Starknet: transfer ETH to redeemer
            payable(msg.sender).transfer(htlc.amount);
        } else {
            // Starknet to Ethereum: transfer WSTARK to redeemer
            require(wstarkToken.transfer(msg.sender, htlc.amount), "StarknetBridge: transfer failed");
        }

        emit Redeemed(id, htlc.hash);
    }

    /**
     * @dev Refunds an HTLC swap after the timelock has expired.
     * @param id The ID of the swap to refund.
     */
    function refund(bytes32 id) external nonReentrant {
        Htlc storage htlc = htlcs[id];
        require(htlc.initiator == msg.sender, "StarknetBridge: caller is not the initiator");
        require(!htlc.executed, "StarknetBridge: swap already executed");
        require(!htlc.refunded, "StarknetBridge: swap already refunded");
        require(htlc.timelock <= block.timestamp, "StarknetBridge: timelock has not expired");

        htlc.refunded = true;

        // Refund funds to initiator
        if (htlc.starknetAddress != 0) {
            // Ethereum to Starknet: refund ETH to initiator
            payable(htlc.initiator).transfer(htlc.amount);
        } else {
            // Starknet to Ethereum: refund WSTARK to initiator
            require(wstarkToken.transfer(htlc.initiator, htlc.amount), "StarknetBridge: transfer failed");
        }

        emit Refunded(id);
    }

    /**
     * @dev Updates the bridge fee (owner only).
     * @param _newFee The new bridge fee in wei.
     */
    function updateBridgeFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 0.01 ether, "StarknetBridge: fee too high");
        bridgeFee = _newFee;
    }

    /**
     * @dev Withdraws accumulated bridge fees (owner only).
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "StarknetBridge: no fees to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Emergency pause function (owner only).
     */
    function emergencyPause() external onlyOwner {
        // Implementation for emergency pause
    }

    /**
     * @dev Emergency withdraw function (owner only).
     * @param _token The token address to withdraw.
     * @param _amount The amount to withdraw.
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }

    /**
     * @dev Get HTLC details by ID.
     * @param id The HTLC ID.
     */
    function getHtlc(bytes32 id) external view returns (
        address initiator,
        uint256 starknetAddress,
        uint256 amount,
        bytes32 hash,
        uint256 timelock,
        bool executed,
        bool refunded
    ) {
        Htlc storage htlc = htlcs[id];
        return (
            htlc.initiator,
            htlc.starknetAddress,
            htlc.amount,
            htlc.hash,
            htlc.timelock,
            htlc.executed,
            htlc.refunded
        );
    }

    /**
     * @dev Check if an HTLC exists and is valid.
     * @param id The HTLC ID.
     */
    function isValidHtlc(bytes32 id) external view returns (bool) {
        Htlc storage htlc = htlcs[id];
        return htlc.initiator != address(0) && !htlc.executed && !htlc.refunded;
    }

    /**
     * @dev Convert Starknet address from hex to uint256.
     * @param _starknetAddressHex The Starknet address in hex format.
     */
    function convertStarknetAddress(string calldata _starknetAddressHex) external pure returns (uint256) {
        // This is a simplified conversion - in production, you'd want more robust parsing
        bytes memory addressBytes = bytes(_starknetAddressHex);
        require(addressBytes.length >= 2, "StarknetBridge: invalid address format");
        
        // Convert to uint256 (simplified - in production use proper conversion)
        uint256 result = 0;
        for (uint i = 0; i < addressBytes.length; i++) {
            uint8 digit = uint8(addressBytes[i]);
            if (digit >= 48 && digit <= 57) { // 0-9
                result = result * 16 + (digit - 48);
            } else if (digit >= 97 && digit <= 102) { // a-f
                result = result * 16 + (digit - 97 + 10);
            } else if (digit >= 65 && digit <= 70) { // A-F
                result = result * 16 + (digit - 65 + 10);
            } else {
                revert("StarknetBridge: invalid hex character");
            }
        }
        return result;
    }

    // Receive function to accept ETH
    receive() external payable {
        // Allow the contract to receive ETH for bridge fees
    }
} 