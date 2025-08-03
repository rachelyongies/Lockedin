#!/bin/zsh

set -e # exit on error

# Source the .env.local file to load the variables
if [ -f .env.local ]; then
    source .env.local
else
    echo "Error: .env.local file not found"
    exit 1
fi

# Define the chain configurations
typeset -A chains
chains["mainnet"]="$MAINNET_RPC_URL"
chains["sepolia"]="$NEXT_PUBLIC_ETH_RPC_URL"
chains["bsc"]="$BSC_RPC_URL"
chains["polygon"]="$POLYGON_RPC_URL"
chains["avalanche"]="$AVALANCHE_RPC_URL"
chains["gnosis"]="$GNOSIS_RPC_URL"
chains["arbitrum"]="$ARBITRUM_RPC_URL"
chains["optimism"]="$OPTIMISM_RPC_URL"
chains["base"]="$BASE_RPC_URL"
chains["zksync"]="$ZKSYNC_RPC_URL"
chains["linea"]="$LINEA_RPC_URL"
chains["sonic"]="$SONIC_RPC_URL"
chains["unichain"]="$UNICHAIN_RPC_URL"

# Check if chain argument is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <chain_name>"
    echo "Available chains: ${(k)chains}"
    exit 1
fi

rpc_url="${chains["$1"]}"
if [ -z "$rpc_url" ]; then
    echo "Chain '$1' not found"
    echo "Available chains: ${(k)chains}"
    exit 1
fi

echo "🚀 Deploying to chain: $1"
echo "📡 RPC URL: $rpc_url"

# Check if private key is available
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Private key not found in .env.local"
    echo "Add: PRIVATE_KEY=0x1234567890abcdef..."
    exit 1
fi

echo "🔐 Using private key from .env.local"
WALLET_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "📱 Wallet address: $WALLET_ADDRESS"

# Deploy based on chain type
if [ "$1" = "zksync" ]; then
    echo "🔧 Deploying to zkSync (special deployment method)"
    forge script script/DeployEscrowFactoryZkSync.s.sol --zksync --fork-url $rpc_url --private-key $PRIVATE_KEY --broadcast -vvvv
else
    echo "🔧 Deploying to standard EVM chain"
    PRIVATE_KEY=$PRIVATE_KEY FUSION_RELAYER_ADDRESS=$FUSION_RELAYER_ADDRESS FEE_COLLECTOR_ADDRESS=$FEE_COLLECTOR_ADDRESS forge script script/DeployEscrowFactory.s.sol --fork-url $rpc_url --broadcast -vvvv --via-ir --optimize --optimizer-runs 200
fi

echo "✅ Deployment completed for $1" 