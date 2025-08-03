#!/bin/zsh

echo "🔧 Setting up environment variables..."

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "📁 .env.local file already exists"
    echo "📝 Adding/updating environment variables..."
    
    # Backup existing file
    cp .env.local .env.local.backup
    echo "✅ Backup created: .env.local.backup"
else
    echo "📁 Creating new .env.local file..."
fi

# Create/update .env.local with the necessary variables
cat > .env.local << 'EOF'
# API Keys
NEXT_PUBLIC_1INCH_API_KEY=your_1inch_api_key_here

# Public RPC URLs (these are safe to expose in frontend)
NEXT_PUBLIC_ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Private variables (keep these secret)
PRIVATE_KEY=your_private_key_here
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
BASE_RPC_URL=https://mainnet.base.org
ZKSYNC_RPC_URL=https://mainnet.era.zksync.io

# Contract addresses (update with your deployed addresses)
HTLC_ESCROW_ADDRESS_ETHEREUM=your_deployed_contract_address_here
HTLC_ESCROW_ADDRESS_POLYGON=your_deployed_contract_address_here
HTLC_ESCROW_ADDRESS_SEPOLIA=your_deployed_contract_address_here

# Fusion addresses (update with your addresses)
FUSION_RELAYER_ADDRESS=your_wallet_address_here
FEE_COLLECTOR_ADDRESS=your_wallet_address_here

# Token addresses
WBTC_MAINNET=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
WBTC_SEPOLIA=0x29f2D40B0605204364af54EC677bD022dA425d03
WBTC_POLYGON=0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6
EOF

echo "✅ Environment variables template set up successfully!"
echo ""
echo "📋 What was added:"
echo "  • NEXT_PUBLIC_1INCH_API_KEY (placeholder)"
echo "  • NEXT_PUBLIC_ETH_RPC_URL (Sepolia placeholder)"
echo "  • NEXT_PUBLIC_MAINNET_RPC_URL (Ethereum placeholder)"
echo "  • NEXT_PUBLIC_POLYGON_RPC_URL (Polygon placeholder)"
echo "  • All placeholder variables"
echo ""
echo "🔐 IMPORTANT: Update the placeholders with your real values!"
echo "  • Replace 'your_1inch_api_key_here' with your actual 1inch API key"
echo "  • Replace 'your_private_key_here' with your actual private key"
echo "  • Replace 'YOUR_ALCHEMY_API_KEY' with your actual Alchemy API key"
echo "  • Update contract addresses with your deployed contract addresses"
echo ""
echo "🚀 You can now start your frontend:"
echo "  npm run dev"
echo ""
echo "🌐 Visit: http://localhost:3000/live-bridge" 