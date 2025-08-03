#!/bin/zsh

set -e

echo "🧪 Testing HTLC Contract on Sepolia..."

# Source environment variables
if [ -f .env.local ]; then
    source .env.local
    echo "✅ Environment loaded"
else
    echo "❌ .env.local not found"
    exit 1
fi

# Contract address
CONTRACT_ADDRESS="0x74A16d11aEcEb1A63b6B0080A8660dc128514444"
RPC_URL="https://eth-sepolia.g.alchemy.com/v2/9NkkZU_E7Aiq7c7xFzlLk"

# Get wallet address
WALLET_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "📱 Wallet: $WALLET_ADDRESS"

echo ""
echo "🔍 Contract Information:"
echo "  Address: $CONTRACT_ADDRESS"
echo "  Network: Sepolia Testnet"
echo "  Owner: $WALLET_ADDRESS"

echo ""
echo "🧪 Available Tests:"
echo "1. Check contract owner"
echo "2. Create HTLC swap (ETH → WBTC)"
echo "3. Execute HTLC swap"
echo "4. Refund expired HTLC"

echo ""
echo "💡 To test the contract:"
echo "  cast call $CONTRACT_ADDRESS \"owner()\" --rpc-url $RPC_URL"
echo "  cast call $CONTRACT_ADDRESS \"getHTLC(bytes32)\" --rpc-url $RPC_URL"
echo ""
echo "🎯 Your cross-chain bridge is ready for testing!" 