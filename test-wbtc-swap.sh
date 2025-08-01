#!/bin/zsh

set -e

echo "🪙 Testing WBTC Swap Setup..."

# Source environment variables
if [ -f .env.local ]; then
    source .env.local
    echo "✅ Environment loaded"
else
    echo "❌ .env.local not found"
    exit 1
fi

# Get wallet address
WALLET_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "📱 Wallet: $WALLET_ADDRESS"

# Show WBTC addresses
echo ""
echo "🪙 WBTC Token Addresses:"
echo "  Mainnet: $WBTC_MAINNET"
echo "  Sepolia: $WBTC_SEPOLIA"
echo "  Polygon: $WBTC_POLYGON"

echo ""
echo "🔄 Supported Swap Pairs:"
echo "  ETH ↔ WBTC (Wrapped Bitcoin)"
echo "  USDC ↔ WBTC"
echo "  DAI ↔ WBTC"
echo "  Any ERC20 ↔ WBTC"

echo ""
echo "📋 How WBTC Swaps Work:"
echo "1. User deposits ETH/USDC/DAI on Ethereum"
echo "2. HTLC locks the funds with a secret hash"
echo "3. Resolver deposits WBTC on destination chain"
echo "4. Secret is revealed to unlock both sides"
echo "5. User receives WBTC (1:1 with Bitcoin value)"

echo ""
echo "🚀 Ready to deploy and test!"
echo "  Test on Sepolia: ./deploy.sh sepolia"
echo "  Deploy to mainnet: ./deploy.sh mainnet"
echo ""
echo "💡 Note: WBTC = Wrapped Bitcoin (1 WBTC = 1 BTC)"
echo "   This is the easiest way to test Bitcoin swaps!" 