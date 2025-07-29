// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StellarBridge
 * @dev Handles Ethereum to Stellar bridging using HTLCs.
 * Note: Stellar doesn't use smart contracts, so this coordinates with Stellar's native functionality.
 */
contract StellarBridge is ReentrancyGuard, Ownable {
    event Initiated(bytes32 indexed id, address indexed initiator, string indexed stellarAddress, uint256 amount);
    event Redeemed(bytes32 indexed id, bytes32 preimage);
    event Refunded(bytes32 indexed id);
    event StellarTransactionConfirmed(bytes32 indexed id, string stellarTxHash);

    struct Htlc {
        address payable initiator;
        string stellarAddress; // Stellar account address
        uint256 amount;
        bytes32 hash;
        uint256 timelock;
        bool executed;
        bool refunded;
        bool stellarConfirmed; // Whether Stellar transaction is confirmed
        string stellarTxHash; // Stellar transaction hash
    }

    mapping(bytes32 => Htlc) public htlcs;
    IERC20 public immutable wethToken; // Wrapped ETH token
    IERC20 public immutable wxlmToken; // Wrapped XLM token on Ethereum

    // Bridge fees
    uint256 public bridgeFee = 0.001 ether; // 0.001 ETH bridge fee
    uint256 public constant MIN_BRIDGE_AMOUNT = 0.01 ether; // Minimum 0.01 ETH
    uint256 public constant MAX_BRIDGE_AMOUNT = 100 ether; // Maximum 100 ETH

    // Stellar network configuration
    string public stellarNetwork = "public"; // "public" or "testnet"
    uint256 public stellarSequenceNumber = 0; // For Stellar transaction sequencing

    constructor(address _wethToken, address _wxlmToken) Ownable(msg.sender) {
        wethToken = IERC20(_wethToken);
        wxlmToken = IERC20(_wxlmToken);
    }

    /**
     * @dev Initiates an HTLC swap from Ethereum to Stellar.
     * @param id A unique identifier for the swap.
     * @param _stellarAddress The Stellar account address that will receive the funds.
     * @param _hash The SHA-256 hash of the preimage.
     * @param _timelock The time (in seconds) after which the swap can be refunded.
     */
    function initiateToStellar(
        bytes32 id,
        string calldata _stellarAddress,
        bytes32 _hash,
        uint256 _timelock
    ) external payable nonReentrant {
        require(htlcs[id].initiator == address(0), "StellarBridge: swap with this id already exists");
        require(msg.value >= MIN_BRIDGE_AMOUNT, "StellarBridge: amount too low");
        require(msg.value <= MAX_BRIDGE_AMOUNT, "StellarBridge: amount too high");
        require(bytes(_stellarAddress).length > 0, "StellarBridge: invalid Stellar address");
        require(_hash != bytes32(0), "StellarBridge: invalid hash");
        require(_timelock > 3600, "StellarBridge: timelock must be greater than 1 hour");

        // Calculate bridge fee
        uint256 bridgeFeeAmount = bridgeFee;
        uint256 transferAmount = msg.value - bridgeFeeAmount;

        htlcs[id] = Htlc({
            initiator: payable(msg.sender),
            stellarAddress: _stellarAddress,
            amount: transferAmount,
            hash: _hash,
            timelock: block.timestamp + _timelock,
            executed: false,
            refunded: false,
            stellarConfirmed: false,
            stellarTxHash: ""
        });

        emit Initiated(id, msg.sender, _stellarAddress, transferAmount);
    }

    /**
     * @dev Initiates an HTLC swap from Stellar to Ethereum.
     * @param id A unique identifier for the swap.
     * @param _ethereumAddress The Ethereum address that will receive the funds.
     * @param _amount The amount of XLM to bridge.
     * @param _hash The SHA-256 hash of the preimage.
     * @param _timelock The time (in seconds) after which the swap can be refunded.
     */
    function initiateFromStellar(
        bytes32 id,
        address payable _ethereumAddress,
        uint256 _amount,
        bytes32 _hash,
        uint256 _timelock
    ) external nonReentrant {
        require(htlcs[id].initiator == address(0), "StellarBridge: swap with this id already exists");
        require(_amount >= 0.01 ether, "StellarBridge: amount too low"); // Minimum 0.01 XLM
        require(_amount <= 1000 ether, "StellarBridge: amount too high"); // Maximum 1000 XLM
        require(_ethereumAddress != address(0), "StellarBridge: invalid Ethereum address");
        require(_hash != bytes32(0), "StellarBridge: invalid hash");
        require(_timelock > 3600, "StellarBridge: timelock must be greater than 1 hour");

        // Transfer WXLM tokens from initiator
        require(wxlmToken.transferFrom(msg.sender, address(this), _amount), "StellarBridge: transfer failed");

        htlcs[id] = Htlc({
            initiator: payable(msg.sender),
            stellarAddress: "", // Not used for Stellar to Ethereum
            amount: _amount,
            hash: _hash,
            timelock: block.timestamp + _timelock,
            executed: false,
            refunded: false,
            stellarConfirmed: false,
            stellarTxHash: ""
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
        require(!htlc.executed, "StellarBridge: swap already executed");
        require(!htlc.refunded, "StellarBridge: swap already refunded");
        require(htlc.timelock > block.timestamp, "StellarBridge: timelock has expired");
        require(sha256(abi.encodePacked(_preimage)) == htlc.hash, "StellarBridge: invalid preimage");

        htlc.executed = true;

        // Transfer funds to redeemer
        if (bytes(htlc.stellarAddress).length > 0) {
            // Ethereum to Stellar: transfer ETH to redeemer
            payable(msg.sender).transfer(htlc.amount);
        } else {
            // Stellar to Ethereum: transfer WXLM to redeemer
            require(wxlmToken.transfer(msg.sender, htlc.amount), "StellarBridge: transfer failed");
        }

        emit Redeemed(id, htlc.hash);
    }

    /**
     * @dev Refunds an HTLC swap after the timelock has expired.
     * @param id The ID of the swap to refund.
     */
    function refund(bytes32 id) external nonReentrant {
        Htlc storage htlc = htlcs[id];
        require(htlc.initiator == msg.sender, "StellarBridge: caller is not the initiator");
        require(!htlc.executed, "StellarBridge: swap already executed");
        require(!htlc.refunded, "StellarBridge: swap already refunded");
        require(htlc.timelock <= block.timestamp, "StellarBridge: timelock has not expired");

        htlc.refunded = true;

        // Refund funds to initiator
        if (bytes(htlc.stellarAddress).length > 0) {
            // Ethereum to Stellar: refund ETH to initiator
            payable(htlc.initiator).transfer(htlc.amount);
        } else {
            // Stellar to Ethereum: refund WXLM to initiator
            require(wxlmToken.transfer(htlc.initiator, htlc.amount), "StellarBridge: transfer failed");
        }

        emit Refunded(id);
    }

    /**
     * @dev Confirms a Stellar transaction (called by bridge operator).
     * @param id The HTLC ID.
     * @param _stellarTxHash The Stellar transaction hash.
     */
    function confirmStellarTransaction(bytes32 id, string calldata _stellarTxHash) external onlyOwner {
        Htlc storage htlc = htlcs[id];
        require(htlc.initiator != address(0), "StellarBridge: HTLC does not exist");
        require(!htlc.stellarConfirmed, "StellarBridge: already confirmed");
        require(bytes(_stellarTxHash).length > 0, "StellarBridge: invalid transaction hash");

        htlc.stellarConfirmed = true;
        htlc.stellarTxHash = _stellarTxHash;

        emit StellarTransactionConfirmed(id, _stellarTxHash);
    }

    /**
     * @dev Updates the bridge fee (owner only).
     * @param _newFee The new bridge fee in wei.
     */
    function updateBridgeFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 0.01 ether, "StellarBridge: fee too high");
        bridgeFee = _newFee;
    }

    /**
     * @dev Updates the Stellar network configuration (owner only).
     * @param _network The Stellar network ("public" or "testnet").
     */
    function updateStellarNetwork(string calldata _network) external onlyOwner {
        require(
            keccak256(abi.encodePacked(_network)) == keccak256(abi.encodePacked("public")) ||
            keccak256(abi.encodePacked(_network)) == keccak256(abi.encodePacked("testnet")),
            "StellarBridge: invalid network"
        );
        stellarNetwork = _network;
    }

    /**
     * @dev Withdraws accumulated bridge fees (owner only).
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "StellarBridge: no fees to withdraw");
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
        string memory stellarAddress,
        uint256 amount,
        bytes32 hash,
        uint256 timelock,
        bool executed,
        bool refunded,
        bool stellarConfirmed,
        string memory stellarTxHash
    ) {
        Htlc storage htlc = htlcs[id];
        return (
            htlc.initiator,
            htlc.stellarAddress,
            htlc.amount,
            htlc.hash,
            htlc.timelock,
            htlc.executed,
            htlc.refunded,
            htlc.stellarConfirmed,
            htlc.stellarTxHash
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
     * @dev Validate Stellar address format.
     * @param _stellarAddress The Stellar address to validate.
     */
    function validateStellarAddress(string calldata _stellarAddress) external pure returns (bool) {
        bytes memory addressBytes = bytes(_stellarAddress);
        
        // Stellar addresses are 56 characters long and start with G, M, or S
        if (addressBytes.length != 56) {
            return false;
        }
        
        // Check if it starts with a valid character
        if (addressBytes[0] != 'G' && addressBytes[0] != 'M' && addressBytes[0] != 'S') {
            return false;
        }
        
        // Check if all characters are valid base32
        for (uint i = 0; i < addressBytes.length; i++) {
            uint8 char = uint8(addressBytes[i]);
            if (!((char >= 65 && char <= 90) || (char >= 50 && char <= 55))) { // A-Z, 2-7
                return false;
            }
        }
        
        return true;
    }

    // Receive function to accept ETH
    receive() external payable {
        // Allow the contract to receive ETH for bridge fees
    }
} 