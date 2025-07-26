// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Fusion1inchBitcoinBridge
 * @dev Enhanced Bitcoin to Ethereum bridging using HTLCs with 1inch Fusion+ integration.
 * @notice This contract extends the basic BitcoinBridge with advanced features:
 *         - 1inch Fusion+ protocol integration for optimal rates
 *         - Partial fill support for large orders
 *         - Relayer and resolver system for automated execution
 *         - Cross-chain secret hash coordination with Bitcoin scripts
 *         - Enhanced security and monitoring features
 */
contract Fusion1inchBitcoinBridge is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Enhanced Events for 1inch Fusion+ integration with Bitcoin coordination
    event HTLCInitiated(
        bytes32 indexed id, 
        address indexed initiator, 
        address indexed resolver, 
        uint256 amount,
        bytes32 secretHash,
        uint256 timelock,
        bool partialFillsEnabled,
        string bitcoinHTLCAddress
    );
    
    event HTLCRedeemed(
        bytes32 indexed id, 
        bytes32 secretHash, 
        bytes32 preimage,
        uint256 amount,
        address resolver
    );
    
    event HTLCRefunded(bytes32 indexed id, uint256 amount, address initiator);
    
    event PartialFill(
        bytes32 indexed id,
        uint256 fillAmount,
        uint256 remainingAmount,
        address filler,
        bytes32 fillHash
    );
    
    event FusionOrderCreated(
        bytes32 indexed htlcId,
        bytes32 indexed fusionOrderId,
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minToAmount
    );
    
    event ResolverRegistered(address indexed resolver, bool active);
    event RelayerReward(address indexed relayer, uint256 reward);

    // Enhanced HTLC structure for Fusion+ features
    struct FusionHTLC {
        address payable initiator;          // Original sender
        address payable resolver;           // Authorized claimer
        uint256 totalAmount;               // Total swap amount
        uint256 filledAmount;              // Amount filled so far
        bytes32 secretHash;                // SHA-256 hash of secret
        uint256 timelock;                  // Expiration timestamp
        bool executed;                     // Fully redeemed
        bool refunded;                     // Refunded to initiator
        bool partialFillsEnabled;          // Allow partial execution
        address fromToken;                 // Source token (ETH = address(0))
        address toToken;                   // Target token
        uint256 minToAmount;               // Minimum acceptable output
        bytes32 fusionOrderId;             // 1inch Fusion order ID
        uint256 createdAt;                 // Creation timestamp
        bytes32[] fillHashes;              // Array of partial fill hashes
    }

    // Relayer system for automated execution
    struct Relayer {
        bool active;                       // Can execute swaps
        uint256 stake;                     // Staked amount for slashing
        uint256 successCount;              // Successful executions
        uint256 failureCount;              // Failed executions
        uint256 lastActiveTime;            // Last activity timestamp
    }

    // State variables
    mapping(bytes32 => FusionHTLC) public htlcs;
    mapping(address => Relayer) public relayers;
    mapping(bytes32 => bool) public usedSecrets;        // Prevent secret reuse
    mapping(address => bool) public authorizedResolvers; // Approved resolvers
    mapping(bytes32 => string) public bitcoinHTLCAddresses; // Bitcoin HTLC addresses for cross-chain coordination
    
    address public fusionProtocol;                       // 1inch Fusion+ contract
    uint256 public relayerRewardRate = 100;             // Basis points (1%)
    uint256 public minStakeAmount = 0.1 ether;          // Minimum relayer stake
    uint256 public maxTimelock = 7 days;                // Maximum timelock duration
    uint256 public minTimelock = 1 hours;               // Minimum timelock duration
    
    // Partial fill tracking
    mapping(bytes32 => uint256) public fillCounts;
    uint256 public maxPartialFills = 10;                // Maximum partial fills per HTLC

    constructor(
        address _fusionProtocol
    ) Ownable(msg.sender) {
        fusionProtocol = _fusionProtocol;
    }

    modifier onlyAuthorizedResolver() {
        require(authorizedResolvers[msg.sender], "Fusion1inchBitcoinBridge: unauthorized resolver");
        _;
    }

    modifier onlyActiveRelayer() {
        require(relayers[msg.sender].active, "Fusion1inchBitcoinBridge: relayer not active");
        _;
    }

    modifier validTimelock(uint256 _timelock) {
        require(_timelock >= minTimelock, "Fusion1inchBitcoinBridge: timelock too short");
        require(_timelock <= maxTimelock, "Fusion1inchBitcoinBridge: timelock too long");
        _;
    }

    /**
     * @dev Initiates an enhanced HTLC swap with 1inch Fusion+ integration for true BTC<->ETH atomic swaps
     * @param id Unique identifier for the swap
     * @param _resolver Address that can redeem the funds
     * @param _secretHash SHA-256 hash of the preimage (must match Bitcoin HTLC)
     * @param _timelock Duration in seconds for the timelock
     * @param _fromToken Source token address (address(0) for ETH)
     * @param _toToken Target token address
     * @param _minToAmount Minimum acceptable output amount
     * @param _partialFillsEnabled Whether to allow partial fills
     * @param _fusionOrderId Associated 1inch Fusion order ID
     * @param _bitcoinHTLCAddress Bitcoin HTLC address for cross-chain coordination
     */
    function initiateFusionHTLC(
        bytes32 id,
        address payable _resolver,
        bytes32 _secretHash,
        uint256 _timelock,
        address _fromToken,
        address _toToken,
        uint256 _minToAmount,
        bool _partialFillsEnabled,
        bytes32 _fusionOrderId,
        string calldata _bitcoinHTLCAddress
    ) external payable nonReentrant whenNotPaused validTimelock(_timelock) {
        _validateHTLCInitiation(id, _resolver, _secretHash, _bitcoinHTLCAddress);

        uint256 amount = _processDeposit(_fromToken);
        uint256 finalTimelock = block.timestamp + _timelock;

        htlcs[id] = FusionHTLC({
            initiator: payable(msg.sender),
            resolver: _resolver,
            totalAmount: amount,
            filledAmount: 0,
            secretHash: _secretHash,
            timelock: finalTimelock,
            executed: false,
            refunded: false,
            partialFillsEnabled: _partialFillsEnabled,
            fromToken: _fromToken,
            toToken: _toToken,
            minToAmount: _minToAmount,
            fusionOrderId: _fusionOrderId,
            createdAt: block.timestamp,
            fillHashes: new bytes32[](0)
        });

        _finalizeHTLCInitiation(id, _secretHash, _bitcoinHTLCAddress, amount, finalTimelock, _partialFillsEnabled, _fusionOrderId, _fromToken, _toToken, _minToAmount);
    }

    function _validateHTLCInitiation(
        bytes32 id,
        address _resolver,
        bytes32 _secretHash,
        string calldata _bitcoinHTLCAddress
    ) internal view {
        require(htlcs[id].initiator == address(0), "Fusion1inchBitcoinBridge: HTLC already exists");
        require(_resolver != address(0), "Fusion1inchBitcoinBridge: invalid resolver");
        require(_secretHash != bytes32(0), "Fusion1inchBitcoinBridge: invalid secret hash");
        require(!usedSecrets[_secretHash], "Fusion1inchBitcoinBridge: secret hash already used");
        require(authorizedResolvers[_resolver], "Fusion1inchBitcoinBridge: resolver not authorized");
        require(bytes(_bitcoinHTLCAddress).length > 0, "Fusion1inchBitcoinBridge: invalid Bitcoin HTLC address");
    }

    function _processDeposit(address _fromToken) internal returns (uint256 amount) {
        if (_fromToken == address(0)) {
            // ETH deposit
            require(msg.value > 0, "Fusion1inchBitcoinBridge: ETH amount required");
            amount = msg.value;
        } else {
            // ERC20 deposit
            require(msg.value == 0, "Fusion1inchBitcoinBridge: ETH not allowed for ERC20 swaps");
            // Amount will be transferred in separate call for gas efficiency
            amount = 0; // Will be set when tokens are deposited
        }
    }

    function _finalizeHTLCInitiation(
        bytes32 id,
        bytes32 _secretHash,
        string calldata _bitcoinHTLCAddress,
        uint256 amount,
        uint256 finalTimelock,
        bool _partialFillsEnabled,
        bytes32 _fusionOrderId,
        address _fromToken,
        address _toToken,
        uint256 _minToAmount
    ) internal {
        // Store Bitcoin HTLC address for cross-chain coordination
        bitcoinHTLCAddresses[id] = _bitcoinHTLCAddress;
        
        // Mark secret hash as used to prevent replay attacks
        usedSecrets[_secretHash] = true;

        emit HTLCInitiated(
            id, 
            msg.sender, 
            htlcs[id].resolver, 
            amount, 
            _secretHash, 
            finalTimelock,
            _partialFillsEnabled,
            _bitcoinHTLCAddress
        );

        if (_fusionOrderId != bytes32(0)) {
            emit FusionOrderCreated(id, _fusionOrderId, _fromToken, _toToken, amount, _minToAmount);
        }
    }

    /**
     * @dev Deposits ERC20 tokens for an existing HTLC
     * @param id HTLC identifier
     * @param amount Amount of tokens to deposit
     */
    function depositTokens(bytes32 id, uint256 amount) external nonReentrant whenNotPaused {
        FusionHTLC storage htlc = htlcs[id];
        require(htlc.initiator == msg.sender, "Fusion1inchBitcoinBridge: not initiator");
        require(htlc.fromToken != address(0), "Fusion1inchBitcoinBridge: ETH HTLC");
        require(htlc.totalAmount == 0, "Fusion1inchBitcoinBridge: already funded");
        require(amount > 0, "Fusion1inchBitcoinBridge: invalid amount");

        htlc.totalAmount = amount;
        IERC20(htlc.fromToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Redeems an HTLC swap (supports partial fills)
     * @param id HTLC identifier
     * @param _preimage Secret preimage
     * @param fillAmount Amount to fill (0 for full amount)
     */
    function redeemHTLC(
        bytes32 id, 
        bytes calldata _preimage,
        uint256 fillAmount
    ) external nonReentrant whenNotPaused {
        FusionHTLC storage htlc = htlcs[id];
        require(htlc.resolver == msg.sender, "Fusion1inchBitcoinBridge: unauthorized");
        require(!htlc.executed && !htlc.refunded, "Fusion1inchBitcoinBridge: HTLC not active");
        require(htlc.timelock > block.timestamp, "Fusion1inchBitcoinBridge: expired");
        require(sha256(abi.encodePacked(_preimage)) == htlc.secretHash, "Fusion1inchBitcoinBridge: invalid preimage");

        uint256 remainingAmount = htlc.totalAmount - htlc.filledAmount;
        require(remainingAmount > 0, "Fusion1inchBitcoinBridge: fully filled");

        // Determine fill amount
        uint256 actualFillAmount;
        if (fillAmount == 0 || fillAmount >= remainingAmount) {
            // Full redemption
            actualFillAmount = remainingAmount;
            htlc.executed = true;
        } else {
            // Partial redemption
            require(htlc.partialFillsEnabled, "Fusion1inchBitcoinBridge: partial fills disabled");
            require(fillCounts[id] < maxPartialFills, "Fusion1inchBitcoinBridge: too many partial fills");
            actualFillAmount = fillAmount;
        }

        htlc.filledAmount += actualFillAmount;
        fillCounts[id]++;

        // Generate unique fill hash for tracking
        bytes32 fillHash = keccak256(abi.encodePacked(id, actualFillAmount, block.timestamp, fillCounts[id]));
        htlc.fillHashes.push(fillHash);

        // Transfer funds
        if (htlc.fromToken == address(0)) {
            // ETH transfer
            payable(htlc.resolver).transfer(actualFillAmount);
        } else {
            // ERC20 transfer
            IERC20(htlc.fromToken).safeTransfer(htlc.resolver, actualFillAmount);
        }

        emit HTLCRedeemed(id, htlc.secretHash, keccak256(_preimage), actualFillAmount, htlc.resolver);

        if (htlc.partialFillsEnabled && !htlc.executed) {
            emit PartialFill(id, actualFillAmount, htlc.totalAmount - htlc.filledAmount, msg.sender, fillHash);
        }
    }

    /**
     * @dev Refunds an expired HTLC
     * @param id HTLC identifier
     */
    function refundHTLC(bytes32 id) external nonReentrant {
        FusionHTLC storage htlc = htlcs[id];
        require(htlc.initiator == msg.sender, "Fusion1inchBitcoinBridge: not initiator");
        require(!htlc.executed && !htlc.refunded, "Fusion1inchBitcoinBridge: HTLC not active");
        require(htlc.timelock <= block.timestamp, "Fusion1inchBitcoinBridge: not expired");

        uint256 refundAmount = htlc.totalAmount - htlc.filledAmount;
        require(refundAmount > 0, "Fusion1inchBitcoinBridge: nothing to refund");

        htlc.refunded = true;

        // Transfer remaining funds back to initiator
        if (htlc.fromToken == address(0)) {
            payable(htlc.initiator).transfer(refundAmount);
        } else {
            IERC20(htlc.fromToken).safeTransfer(htlc.initiator, refundAmount);
        }

        emit HTLCRefunded(id, refundAmount, htlc.initiator);
    }

    /**
     * @dev Automated relayer execution
     * @param id HTLC identifier
     * @param _preimage Secret preimage
     * @param fillAmount Amount to fill
     */
    function relayerRedeem(
        bytes32 id,
        bytes calldata _preimage,
        uint256 fillAmount
    ) external onlyActiveRelayer nonReentrant whenNotPaused {
        // Execute redemption on behalf of resolver
        FusionHTLC storage htlc = htlcs[id];
        require(htlc.timelock > block.timestamp + 300, "Fusion1inchBitcoinBridge: too close to expiration");

        // Temporarily authorize relayer
        address originalResolver = htlc.resolver;
        htlc.resolver = payable(msg.sender);
        
        // Execute redemption
        this.redeemHTLC(id, _preimage, fillAmount);
        
        // Restore original resolver
        htlc.resolver = payable(originalResolver);
        
        // Update relayer stats
        relayers[msg.sender].successCount++;
        relayers[msg.sender].lastActiveTime = block.timestamp;

        // Pay relayer reward
        uint256 reward = (fillAmount * relayerRewardRate) / 10000;
        payable(msg.sender).transfer(reward);
        
        emit RelayerReward(msg.sender, reward);
    }

    // Relayer management functions
    function registerRelayer() external payable {
        require(msg.value >= minStakeAmount, "Fusion1inchBitcoinBridge: insufficient stake");
        
        relayers[msg.sender] = Relayer({
            active: true,
            stake: msg.value,
            successCount: 0,
            failureCount: 0,
            lastActiveTime: block.timestamp
        });

        emit ResolverRegistered(msg.sender, true);
    }

    function deactivateRelayer(address relayer) external onlyOwner {
        relayers[relayer].active = false;
        emit ResolverRegistered(relayer, false);
    }

    // Resolver management
    function authorizeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = true;
        emit ResolverRegistered(resolver, true);
    }

    function deauthorizeResolver(address resolver) external onlyOwner {
        authorizedResolvers[resolver] = false;
        emit ResolverRegistered(resolver, false);
    }

    // View functions
    function getHTLC(bytes32 id) external view returns (FusionHTLC memory) {
        return htlcs[id];
    }

    function getHTLCFills(bytes32 id) external view returns (bytes32[] memory) {
        return htlcs[id].fillHashes;
    }

    function getBitcoinHTLCAddress(bytes32 id) external view returns (string memory) {
        return bitcoinHTLCAddresses[id];
    }

    function getRemainingAmount(bytes32 id) external view returns (uint256) {
        FusionHTLC storage htlc = htlcs[id];
        return htlc.totalAmount - htlc.filledAmount;
    }

    function isHTLCActive(bytes32 id) external view returns (bool) {
        FusionHTLC storage htlc = htlcs[id];
        return !htlc.executed && !htlc.refunded && htlc.timelock > block.timestamp;
    }

    function getFillPercentage(bytes32 id) external view returns (uint256) {
        FusionHTLC storage htlc = htlcs[id];
        if (htlc.totalAmount == 0) return 0;
        return (htlc.filledAmount * 10000) / htlc.totalAmount; // Basis points
    }

    // Admin functions
    function setFusionProtocol(address _fusionProtocol) external onlyOwner {
        fusionProtocol = _fusionProtocol;
    }

    function setRelayerRewardRate(uint256 _rate) external onlyOwner {
        require(_rate <= 1000, "Fusion1inchBitcoinBridge: rate too high"); // Max 10%
        relayerRewardRate = _rate;
    }

    function setMinStakeAmount(uint256 _amount) external onlyOwner {
        minStakeAmount = _amount;
    }

    function setTimelockLimits(uint256 _min, uint256 _max) external onlyOwner {
        require(_min < _max, "Fusion1inchBitcoinBridge: invalid limits");
        minTimelock = _min;
        maxTimelock = _max;
    }

    function setMaxPartialFills(uint256 _max) external onlyOwner {
        maxPartialFills = _max;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency functions
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    // Receive function for ETH deposits
    receive() external payable {
        // Allow ETH deposits for gas and rewards
    }
}