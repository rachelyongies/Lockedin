#!/bin/zsh

set -e

echo "🔍 Testing wallet setup..."

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✅ .env.local file found"
    source .env.local
    
    # Check if private key is set
    if [ -n "$PRIVATE_KEY" ]; then
        echo "✅ Private key found"
        # Get wallet address from private key
        WALLET_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
        echo "📱 Wallet address: $WALLET_ADDRESS"
    else
        echo "❌ Private key not found in .env"
        echo "   Add: PRIVATE_KEY=0x1234567890abcdef..."
    fi
    
    # Check RPC URLs
    if [ -n "$MAINNET_RPC_URL" ]; then
        echo "✅ Mainnet RPC URL found"
    else
        echo "❌ Mainnet RPC URL not found"
        echo "   Add: MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
    fi
    
else
    echo "❌ .env.local file not found"
    echo "   Create .env.local file with your wallet details"
fi

echo ""
echo "📋 Next steps:"
echo "1. Add your private key to .env"
echo "2. Add RPC URLs to .env"
echo "3. Run: ./deploy.sh mainnet" 