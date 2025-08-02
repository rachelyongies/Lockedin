// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SolanaHTLC
 * @dev HTLC contract for Solana cross-chain bridging
 * This is a simplified version - in production, you'd use Solana's native programs
 */
contract SolanaHTLC is Ownable, ReentrancyGuard {
    struct HTLC {
        address sender;
        address recipient;
        string solanaAddress;
        uint256 amount;
        bytes32 secretHash;
        uint256 timelock;
        bool isActive;
        bool isCompleted;
        bool isRefunded;
    }

    mapping(bytes32 => HTLC) public htlcMap;
    mapping(bytes32 => bool) public htlcExistsMap;

    event HTLCCreated(
        bytes32 indexed htlcId,
        address indexed sender,
        address indexed recipient,
        string solanaAddress,
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock
    );

    event HTLCCompleted(
        bytes32 indexed htlcId,
        address indexed recipient,
        bytes32 secret
    );

    event HTLCRefunded(
        bytes32 indexed htlcId,
        address indexed sender
    );

    modifier htlcExists(bytes32 htlcId) {
        require(htlcExistsMap[htlcId], "HTLC does not exist");
        _;
    }

    modifier htlcActive(bytes32 htlcId) {
        require(htlcMap[htlcId].isActive, "HTLC is not active");
        _;
    }

    modifier htlcNotExpired(bytes32 htlcId) {
        require(block.timestamp < htlcMap[htlcId].timelock, "HTLC has expired");
        _;
    }

    modifier htlcExpired(bytes32 htlcId) {
        require(block.timestamp >= htlcMap[htlcId].timelock, "HTLC has not expired");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Create HTLC for Solana cross-chain swap
     */
    function createHTLC(
        address recipient,
        string memory solanaAddress,
        bytes32 secretHash,
        uint256 timelock
    ) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        require(timelock > block.timestamp, "Timelock must be in the future");
        require(bytes(solanaAddress).length > 0, "Invalid Solana address");

        bytes32 htlcId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            solanaAddress,
            msg.value,
            secretHash,
            timelock,
            block.timestamp
        ));

        require(!htlcExistsMap[htlcId], "HTLC already exists");

        HTLC memory htlc = HTLC({
            sender: msg.sender,
            recipient: recipient,
            solanaAddress: solanaAddress,
            amount: msg.value,
            secretHash: secretHash,
            timelock: timelock,
            isActive: true,
            isCompleted: false,
            isRefunded: false
        });

        htlcMap[htlcId] = htlc;
        htlcExistsMap[htlcId] = true;

        emit HTLCCreated(
            htlcId,
            msg.sender,
            recipient,
            solanaAddress,
            msg.value,
            secretHash,
            timelock
        );
    }

    /**
     * @dev Complete HTLC by providing the secret
     */
    function completeHTLC(
        bytes32 htlcId,
        bytes32 secret
    ) external htlcExists(htlcId) htlcActive(htlcId) htlcNotExpired(htlcId) nonReentrant {
        HTLC storage htlc = htlcMap[htlcId];
        
        require(msg.sender == htlc.recipient, "Only recipient can complete HTLC");
        require(keccak256(abi.encodePacked(secret)) == htlc.secretHash, "Invalid secret");
        require(!htlc.isCompleted, "HTLC already completed");
        require(!htlc.isRefunded, "HTLC already refunded");

        htlc.isActive = false;
        htlc.isCompleted = true;

        // Transfer funds to recipient
        (bool success, ) = htlc.recipient.call{value: htlc.amount}("");
        require(success, "Transfer failed");

        emit HTLCCompleted(htlcId, htlc.recipient, secret);
    }

    /**
     * @dev Refund HTLC if expired
     */
    function refundHTLC(bytes32 htlcId) external htlcExists(htlcId) htlcActive(htlcId) htlcExpired(htlcId) nonReentrant {
        HTLC storage htlc = htlcMap[htlcId];
        
        require(msg.sender == htlc.sender, "Only sender can refund HTLC");
        require(!htlc.isCompleted, "HTLC already completed");
        require(!htlc.isRefunded, "HTLC already refunded");

        htlc.isActive = false;
        htlc.isRefunded = true;

        // Return funds to sender
        (bool success, ) = htlc.sender.call{value: htlc.amount}("");
        require(success, "Transfer failed");

        emit HTLCRefunded(htlcId, htlc.sender);
    }

    /**
     * @dev Get HTLC details
     */
    function getHTLC(bytes32 htlcId) external view returns (HTLC memory) {
        require(htlcExistsMap[htlcId], "HTLC does not exist");
        return htlcMap[htlcId];
    }

    /**
     * @dev Check if HTLC exists
     */
    function htlcExistsCheck(bytes32 htlcId) external view returns (bool) {
        return htlcExistsMap[htlcId];
    }

    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
} 