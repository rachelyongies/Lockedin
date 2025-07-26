// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BitcoinBridge
 * @dev Handles Bitcoin to Ethereum bridging using HTLCs.
 */
contract BitcoinBridge is ReentrancyGuard, Ownable {
    event Initiated(bytes32 indexed id, address indexed initiator, address indexed resolver, uint256 amount);
    event Redeemed(bytes32 indexed id, bytes32 preimage);
    event Refunded(bytes32 indexed id);

    struct Htlc {
        address payable initiator;
        address payable resolver;
        uint256 amount;
        bytes32 hash;
        uint256 timelock;
        bool executed;
        bool refunded;
    }

    mapping(bytes32 => Htlc) public htlcs;
    IERC20 public immutable wbtcToken;

    constructor(address _wbtcToken) Ownable(msg.sender) {
        wbtcToken = IERC20(_wbtcToken);
    }

    /**
     * @dev Initiates an HTLC swap.
     * @param id A unique identifier for the swap.
     * @param _resolver The address that can redeem the funds.
     * @param _hash The SHA-256 hash of the preimage.
     * @param _timelock The time (in seconds) after which the swap can be refunded.
     */
    function initiate(
        bytes32 id,
        address payable _resolver,
        bytes32 _hash,
        uint256 _timelock
    ) external payable nonReentrant {
        require(htlcs[id].initiator == address(0), "BitcoinBridge: swap with this id already exists");
        require(msg.value > 0, "BitcoinBridge: amount must be greater than 0");
        require(_resolver != address(0), "BitcoinBridge: invalid resolver address");
        require(_hash != bytes32(0), "BitcoinBridge: invalid hash");
        require(_timelock > 3600, "BitcoinBridge: timelock must be greater than 1 hour");

        htlcs[id] = Htlc({
            initiator: payable(msg.sender),
            resolver: _resolver,
            amount: msg.value,
            hash: _hash,
            timelock: block.timestamp + _timelock,
            executed: false,
            refunded: false
        });

        emit Initiated(id, msg.sender, _resolver, msg.value);
    }

    /**
     * @dev Redeems an HTLC swap.
     * @param id The ID of the swap to redeem.
     * @param _preimage The secret preimage that hashes to the stored hash.
     */
    function redeem(bytes32 id, bytes calldata _preimage) external nonReentrant {
        Htlc storage htlc = htlcs[id];
        require(htlc.resolver == msg.sender, "BitcoinBridge: caller is not the resolver");
        require(!htlc.executed, "BitcoinBridge: swap already executed");
        require(!htlc.refunded, "BitcoinBridge: swap already refunded");
        require(htlc.timelock > block.timestamp, "BitcoinBridge: timelock has expired");
        require(sha256(abi.encodePacked(_preimage)) == htlc.hash, "BitcoinBridge: invalid preimage");

        htlc.executed = true;
        payable(htlc.resolver).transfer(htlc.amount);

        emit Redeemed(id, htlc.hash);
    }

    /**
     * @dev Refunds an HTLC swap after the timelock has expired.
     * @param id The ID of the swap to refund.
     */
    function refund(bytes32 id) external nonReentrant {
        Htlc storage htlc = htlcs[id];
        require(htlc.initiator == msg.sender, "BitcoinBridge: caller is not the initiator");
        require(!htlc.executed, "BitcoinBridge: swap already executed");
        require(!htlc.refunded, "BitcoinBridge: swap already refunded");
        require(htlc.timelock <= block.timestamp, "BitcoinBridge: timelock has not expired");

        htlc.refunded = true;
        payable(htlc.initiator).transfer(htlc.amount);

        emit Refunded(id);
    }

    // Emergency functions
    function emergencyPause() external onlyOwner {
        // Implementation for emergency pause
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
} 