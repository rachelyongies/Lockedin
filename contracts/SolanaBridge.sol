// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SolanaBridge
 * @dev Handles Ethereum to Solana bridging using HTLCs.
 */
contract SolanaBridge is ReentrancyGuard, Ownable {
    event Initiated(bytes32 indexed id, address indexed initiator, string indexed solanaAddress, uint256 amount);
    event Redeemed(bytes32 indexed id, bytes32 preimage);
    event Refunded(bytes32 indexed id);

    struct Htlc {
        address payable initiator;
        string solanaAddress; // Solana recipient address
        uint256 amount;
        bytes32 hash;
        uint256 timelock;
        bool executed;
        bool refunded;
    }

    mapping(bytes32 => Htlc) public htlcs;
    IERC20 public immutable wsolToken; // Wrapped SOL token on Ethereum
    IERC20 public immutable wethToken; // Wrapped ETH token

    // Bridge fees
    uint256 public bridgeFee = 0.001 ether; // 0.001 ETH bridge fee
    uint256 public constant MIN_BRIDGE_AMOUNT = 0.01 ether; // Minimum 0.01 ETH
    uint256 public constant MAX_BRIDGE_AMOUNT = 100 ether; // Maximum 100 ETH

    constructor(address _wsolToken, address _wethToken) Ownable(msg.sender) {
        wsolToken = IERC20(_wsolToken);
        wethToken = IERC20(_wethToken);
    }

    /**
     * @dev Initiates an HTLC swap from Ethereum to Solana.
     * @param id A unique identifier for the swap.
     * @param _solanaAddress The Solana address that will receive the funds.
     * @param _hash The SHA-256 hash of the preimage.
     * @param _timelock The time (in seconds) after which the swap can be refunded.
     */
    function initiateToSolana(
        bytes32 id,
        string calldata _solanaAddress,
        bytes32 _hash,
        uint256 _timelock
    ) external payable nonReentrant {
        require(htlcs[id].initiator == address(0), "SolanaBridge: swap with this id already exists");
        require(msg.value >= MIN_BRIDGE_AMOUNT, "SolanaBridge: amount too low");
        require(msg.value <= MAX_BRIDGE_AMOUNT, "SolanaBridge: amount too high");
        require(bytes(_solanaAddress).length > 0, "SolanaBridge: invalid Solana address");
        require(_hash != bytes32(0), "SolanaBridge: invalid hash");
        require(_timelock > 3600, "SolanaBridge: timelock must be greater than 1 hour");

        // Calculate bridge fee
        uint256 bridgeFeeAmount = bridgeFee;
        uint256 transferAmount = msg.value - bridgeFeeAmount;

        htlcs[id] = Htlc({
            initiator: payable(msg.sender),
            solanaAddress: _solanaAddress,
            amount: transferAmount,
            hash: _hash,
            timelock: block.timestamp + _timelock,
            executed: false,
            refunded: false
        });

        emit Initiated(id, msg.sender, _solanaAddress, transferAmount);
    }

    /**
     * @dev Initiates an HTLC swap from Solana to Ethereum.
     * @param id A unique identifier for the swap.
     * @param _ethereumAddress The Ethereum address that will receive the funds.
     * @param _amount The amount of SOL to bridge (in lamports).
     * @param _hash The SHA-256 hash of the preimage.
     * @param _timelock The time (in seconds) after which the swap can be refunded.
     */
    function initiateFromSolana(
        bytes32 id,
        address payable _ethereumAddress,
        uint256 _amount,
        bytes32 _hash,
        uint256 _timelock
    ) external nonReentrant {
        require(htlcs[id].initiator == address(0), "SolanaBridge: swap with this id already exists");
        require(_amount >= 0.01 ether, "SolanaBridge: amount too low"); // Minimum 0.01 SOL
        require(_amount <= 1000 ether, "SolanaBridge: amount too high"); // Maximum 1000 SOL
        require(_ethereumAddress != address(0), "SolanaBridge: invalid Ethereum address");
        require(_hash != bytes32(0), "SolanaBridge: invalid hash");
        require(_timelock > 3600, "SolanaBridge: timelock must be greater than 1 hour");

        // Transfer WSOL tokens from initiator
        require(wsolToken.transferFrom(msg.sender, address(this), _amount), "SolanaBridge: transfer failed");

        htlcs[id] = Htlc({
            initiator: payable(msg.sender),
            solanaAddress: "", // Not used for Solana to Ethereum
            amount: _amount,
            hash: _hash,
            timelock: block.timestamp + _timelock,
            executed: false,
            refunded: false
        });

        emit Initiated(id, msg.sender, "", _amount);
    }

    /**
     * @dev Redeems an HTLC swap.
     * @param id The ID of the swap to redeem.
     * @param _preimage The secret preimage that hashes to the stored hash.
     */
    function redeem(bytes32 id, bytes calldata _preimage) external nonReentrant {
        Htlc storage htlc = htlcs[id];
        require(!htlc.executed, "SolanaBridge: swap already executed");
        require(!htlc.refunded, "SolanaBridge: swap already refunded");
        require(htlc.timelock > block.timestamp, "SolanaBridge: timelock has expired");
        require(sha256(abi.encodePacked(_preimage)) == htlc.hash, "SolanaBridge: invalid preimage");

        htlc.executed = true;

        // Transfer funds to redeemer
        if (bytes(htlc.solanaAddress).length > 0) {
            // Ethereum to Solana: transfer ETH to redeemer
            payable(msg.sender).transfer(htlc.amount);
        } else {
            // Solana to Ethereum: transfer WSOL to redeemer
            require(wsolToken.transfer(msg.sender, htlc.amount), "SolanaBridge: transfer failed");
        }

        emit Redeemed(id, htlc.hash);
    }

    /**
     * @dev Refunds an HTLC swap after the timelock has expired.
     * @param id The ID of the swap to refund.
     */
    function refund(bytes32 id) external nonReentrant {
        Htlc storage htlc = htlcs[id];
        require(htlc.initiator == msg.sender, "SolanaBridge: caller is not the initiator");
        require(!htlc.executed, "SolanaBridge: swap already executed");
        require(!htlc.refunded, "SolanaBridge: swap already refunded");
        require(htlc.timelock <= block.timestamp, "SolanaBridge: timelock has not expired");

        htlc.refunded = true;

        // Refund funds to initiator
        if (bytes(htlc.solanaAddress).length > 0) {
            // Ethereum to Solana: refund ETH to initiator
            payable(htlc.initiator).transfer(htlc.amount);
        } else {
            // Solana to Ethereum: refund WSOL to initiator
            require(wsolToken.transfer(htlc.initiator, htlc.amount), "SolanaBridge: transfer failed");
        }

        emit Refunded(id);
    }

    /**
     * @dev Updates the bridge fee (owner only).
     * @param _newFee The new bridge fee in wei.
     */
    function updateBridgeFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 0.01 ether, "SolanaBridge: fee too high");
        bridgeFee = _newFee;
    }

    /**
     * @dev Withdraws accumulated bridge fees (owner only).
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "SolanaBridge: no fees to withdraw");
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
        string memory solanaAddress,
        uint256 amount,
        bytes32 hash,
        uint256 timelock,
        bool executed,
        bool refunded
    ) {
        Htlc storage htlc = htlcs[id];
        return (
            htlc.initiator,
            htlc.solanaAddress,
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

    // Receive function to accept ETH
    receive() external payable {
        // Allow the contract to receive ETH for bridge fees
    }
} 