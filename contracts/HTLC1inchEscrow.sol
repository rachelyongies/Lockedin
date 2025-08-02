// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title HTLC1inchEscrow
 * @dev HTLC (Hash Time-Locked Contract) with 1inch Fusion integration for secure cross-chain swaps
 * This contract provides escrow functionality for atomic swaps between different blockchains
 * using 1inch Fusion API for optimal routing and execution
 */
contract HTLC1inchEscrow is Ownable, ReentrancyGuard {
    constructor(address _fusionRelayer, address _feeCollector) Ownable(msg.sender) {
        require(_fusionRelayer != address(0), "Invalid fusion relayer address");
        require(_feeCollector != address(0), "Invalid fee collector address");
        fusionRelayer = _fusionRelayer;
        feeCollector = _feeCollector;
    }
    using SafeERC20 for IERC20;

    // HTLC structure
    struct HTLC {
        address initiator;        // User initiating the swap
        address resolver;         // User resolving the swap
        address fromToken;        // Token being swapped from
        address toToken;          // Token being swapped to
        uint256 amount;           // Amount of fromToken
        uint256 expectedAmount;   // Expected amount of toToken
        bytes32 secretHash;       // Hash of the secret
        uint256 timelock;         // Timestamp when HTLC expires
        bool executed;            // Whether HTLC has been executed
        bool refunded;            // Whether HTLC has been refunded
        string orderId;           // 1inch Fusion order ID
        bool orderSubmitted;      // Whether 1inch order has been submitted
    }

    // Events
    event HTLCCreated(
        bytes32 indexed htlcId,
        address indexed initiator,
        address indexed resolver,
        address fromToken,
        address toToken,
        uint256 amount,
        uint256 expectedAmount,
        bytes32 secretHash,
        uint256 timelock
    );

    event HTLCExecuted(
        bytes32 indexed htlcId,
        address indexed resolver,
        bytes32 secret,
        uint256 actualAmount
    );

    event HTLCRefunded(
        bytes32 indexed htlcId,
        address indexed initiator
    );

    event OrderSubmitted(
        bytes32 indexed htlcId,
        string orderId,
        address indexed initiator
    );

    event OrderExecuted(
        bytes32 indexed htlcId,
        string orderId,
        uint256 actualAmount
    );

    // State variables
    mapping(bytes32 => HTLC) public htlcContracts;
    mapping(bytes32 => bool) public htlcExistsMap;
    
    // 1inch Fusion configuration
    address public fusionRelayer;
    uint256 public minTimelock = 1 hours;
    uint256 public maxTimelock = 7 days;
    uint256 public protocolFee = 5; // 0.05% (5 basis points)
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Fee collection
    address public feeCollector;
    mapping(address => uint256) public collectedFees;

    // Modifiers
    modifier htlcExists(bytes32 htlcId) {
        require(htlcExistsMap[htlcId], "HTLC does not exist");
        _;
    }

    modifier htlcNotExecuted(bytes32 htlcId) {
        require(!htlcContracts[htlcId].executed, "HTLC already executed");
        _;
    }

    modifier htlcNotRefunded(bytes32 htlcId) {
        require(!htlcContracts[htlcId].refunded, "HTLC already refunded");
        _;
    }

    modifier timelockNotExpired(bytes32 htlcId) {
        require(block.timestamp < htlcContracts[htlcId].timelock, "HTLC timelock expired");
        _;
    }

    modifier timelockExpired(bytes32 htlcId) {
        require(block.timestamp >= htlcContracts[htlcId].timelock, "HTLC timelock not expired");
        _;
    }



    /**
     * @dev Create a new HTLC for cross-chain swap
     * @param resolver Address of the user resolving the swap
     * @param fromToken Token being swapped from
     * @param toToken Token being swapped to
     * @param amount Amount of fromToken
     * @param expectedAmount Expected amount of toToken
     * @param secretHash Hash of the secret (preimage)
     * @param timelock Timestamp when HTLC expires
     */
    function createHTLC(
        address resolver,
        address fromToken,
        address toToken,
        uint256 amount,
        uint256 expectedAmount,
        bytes32 secretHash,
        uint256 timelock
    ) external nonReentrant {
        require(resolver != address(0), "Invalid resolver address");
        require(fromToken != address(0), "Invalid fromToken address");
        require(toToken != address(0), "Invalid toToken address");
        require(amount > 0, "Amount must be greater than 0");
        require(expectedAmount > 0, "Expected amount must be greater than 0");
        require(timelock >= block.timestamp + minTimelock, "Timelock too short");
        require(timelock <= block.timestamp + maxTimelock, "Timelock too long");
        require(secretHash != bytes32(0), "Invalid secret hash");

        // Generate unique HTLC ID
        bytes32 htlcId = keccak256(abi.encodePacked(
            msg.sender,
            resolver,
            fromToken,
            toToken,
            amount,
            expectedAmount,
            secretHash,
            timelock,
            block.timestamp
        ));

        require(!htlcExistsMap[htlcId], "HTLC already exists");

        // Transfer tokens to escrow
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amount);

        // Create HTLC
        htlcContracts[htlcId] = HTLC({
            initiator: msg.sender,
            resolver: resolver,
            fromToken: fromToken,
            toToken: toToken,
            amount: amount,
            expectedAmount: expectedAmount,
            secretHash: secretHash,
            timelock: timelock,
            executed: false,
            refunded: false,
            orderId: "",
            orderSubmitted: false
        });

        htlcExistsMap[htlcId] = true;

        emit HTLCCreated(
            htlcId,
            msg.sender,
            resolver,
            fromToken,
            toToken,
            amount,
            expectedAmount,
            secretHash,
            timelock
        );
    }

    /**
     * @dev Submit 1inch Fusion order for HTLC execution
     * @param htlcId HTLC identifier
     * @param orderId 1inch Fusion order ID
     */
    function submitOrder(
        bytes32 htlcId,
        string calldata orderId
    ) external htlcExists(htlcId) htlcNotExecuted(htlcId) htlcNotRefunded(htlcId) timelockNotExpired(htlcId) {
        HTLC storage htlc = htlcContracts[htlcId];
        require(msg.sender == htlc.initiator, "Only initiator can submit order");
        require(!htlc.orderSubmitted, "Order already submitted");
        require(bytes(orderId).length > 0, "Invalid order ID");

        htlc.orderId = orderId;
        htlc.orderSubmitted = true;

        emit OrderSubmitted(htlcId, orderId, msg.sender);
    }

    /**
     * @dev Execute HTLC with secret (preimage)
     * @param htlcId HTLC identifier
     * @param secret Secret (preimage) that hashes to secretHash
     */ 
    function executeHTLC(
        bytes32 htlcId,
        bytes32 secret
    ) external htlcExists(htlcId) htlcNotExecuted(htlcId) htlcNotRefunded(htlcId) timelockNotExpired(htlcId) {
        HTLC storage htlc = htlcContracts[htlcId];
        require(msg.sender == htlc.resolver, "Only resolver can execute HTLC");
        require(keccak256(abi.encodePacked(secret)) == htlc.secretHash, "Invalid secret");

        htlc.executed = true;

        // Calculate protocol fee
        uint256 feeAmount = (htlc.amount * protocolFee) / FEE_DENOMINATOR;
        uint256 transferAmount = htlc.amount - feeAmount;

        // Transfer tokens to resolver
        IERC20(htlc.fromToken).safeTransfer(htlc.resolver, transferAmount);

        // Collect protocol fee
        if (feeAmount > 0) {
            IERC20(htlc.fromToken).safeTransfer(feeCollector, feeAmount);
            collectedFees[htlc.fromToken] += feeAmount;
        }

        emit HTLCExecuted(htlcId, msg.sender, secret, transferAmount);
    }

    /**
     * @dev Execute HTLC with 1inch Fusion order completion
     * @param htlcId HTLC identifier
     * @param secret Secret (preimage) that hashes to secretHash
     * @param actualAmount Actual amount received from 1inch swap
     */
    function executeHTLCWithSwap(
        bytes32 htlcId,
        bytes32 secret,
        uint256 actualAmount
    ) external htlcExists(htlcId) htlcNotExecuted(htlcId) htlcNotRefunded(htlcId) timelockNotExpired(htlcId) {
        HTLC storage htlc = htlcContracts[htlcId];
        require(msg.sender == htlc.resolver, "Only resolver can execute HTLC");
        require(keccak256(abi.encodePacked(secret)) == htlc.secretHash, "Invalid secret");
        require(htlc.orderSubmitted, "Order not submitted");
        require(actualAmount > 0, "Invalid actual amount");

        htlc.executed = true;

        // Transfer swapped tokens to resolver
        IERC20(htlc.toToken).safeTransfer(htlc.resolver, actualAmount);

        emit HTLCExecuted(htlcId, msg.sender, secret, actualAmount);
        emit OrderExecuted(htlcId, htlc.orderId, actualAmount);
    }

    /**
     * @dev Refund HTLC if timelock has expired
     * @param htlcId HTLC identifier
     */
    function refundHTLC(
        bytes32 htlcId
    ) external htlcExists(htlcId) htlcNotExecuted(htlcId) htlcNotRefunded(htlcId) timelockExpired(htlcId) {
        HTLC storage htlc = htlcContracts[htlcId];
        require(msg.sender == htlc.initiator, "Only initiator can refund HTLC");

        htlc.refunded = true;

        // Return tokens to initiator
        IERC20(htlc.fromToken).safeTransfer(htlc.initiator, htlc.amount);

        emit HTLCRefunded(htlcId, msg.sender);
    }

    /**
     * @dev Get HTLC details
     * @param htlcId HTLC identifier
     */
    function getHTLC(bytes32 htlcId) external view returns (HTLC memory) {
        require(htlcExistsMap[htlcId], "HTLC does not exist");
        return htlcContracts[htlcId];
    }

    /**
     * @dev Update fusion relayer address (owner only)
     * @param _fusionRelayer New fusion relayer address
     */
    function setFusionRelayer(address _fusionRelayer) external onlyOwner {
        require(_fusionRelayer != address(0), "Invalid fusion relayer address");
        fusionRelayer = _fusionRelayer;
    }

    /**
     * @dev Update fee collector address (owner only)
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector address");
        feeCollector = _feeCollector;
    }

    /**
     * @dev Update protocol fee (owner only)
     * @param _protocolFee New protocol fee in basis points
     */
    function setProtocolFee(uint256 _protocolFee) external onlyOwner {
        require(_protocolFee <= 100, "Protocol fee too high"); // Max 1%
        protocolFee = _protocolFee;
    }

    /**
     * @dev Update timelock limits (owner only)
     * @param _minTimelock Minimum timelock duration
     * @param _maxTimelock Maximum timelock duration
     */
    function setTimelockLimits(uint256 _minTimelock, uint256 _maxTimelock) external onlyOwner {
        require(_minTimelock < _maxTimelock, "Invalid timelock limits");
        minTimelock = _minTimelock;
        maxTimelock = _maxTimelock;
    }

    /**
     * @dev Withdraw collected fees (owner only)
     * @param token Token address to withdraw fees for
     * @param amount Amount to withdraw
     */
    function withdrawFees(address token, uint256 amount) external onlyOwner {
        require(amount <= collectedFees[token], "Insufficient collected fees");
        collectedFees[token] -= amount;
        IERC20(token).safeTransfer(feeCollector, amount);
    }

    /**
     * @dev Emergency function to recover stuck tokens (owner only)
     * @param token Token address to recover
     * @param to Recipient address
     * @param amount Amount to recover
     */
    function emergencyRecover(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient address");
        IERC20(token).safeTransfer(to, amount);
    }
} 