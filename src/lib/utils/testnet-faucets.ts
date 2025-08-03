// Testnet faucet utilities for testing 1inch integration

export const TESTNET_FAUCETS = {
  // Ethereum Goerli Testnet
  GOERLI: {
    name: 'Goerli Testnet',
    chainId: 5,
    rpcUrl: 'https://goerli.infura.io/v3/your-project-id',
    explorer: 'https://goerli.etherscan.io',
    faucets: {
      ETH: [
        'https://goerlifaucet.com/',
        'https://faucet.goerli.mudit.blog/',
        'https://goerli-faucet.pk910.de/',
      ],
      USDC: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
      WETH: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    }
  },
  
  // Ethereum Sepolia Testnet
  SEPOLIA: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/your-project-id',
    explorer: 'https://sepolia.etherscan.io',
    faucets: {
      ETH: [
        'https://sepoliafaucet.com/',
        'https://faucet.sepolia.dev/',
        'https://sepolia-faucet.pk910.de/',
      ],
      USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    }
  }
} as const;

// Get faucet URLs for a specific network and token
export function getFaucetUrls(network: 'GOERLI' | 'SEPOLIA', token: string): string[] {
  const networkConfig = TESTNET_FAUCETS[network];
  
  if (token === 'ETH') {
    return networkConfig.faucets.ETH;
  }
  
  return [];
}

// Check if wallet has sufficient balance for testing
export async function checkWalletBalance(
  walletAddress: string, 
  network: 'GOERLI' | 'SEPOLIA',
  minBalance: string = '0.01'
): Promise<{ hasBalance: boolean; balance: string; network: string }> {
  try {
    const networkConfig = TESTNET_FAUCETS[network];
    const provider = new (window as any).ethereum;
    
    // Request account access
    await provider.request({ method: 'eth_requestAccounts' });
    
    // Get balance
    const balanceHex = await provider.request({
      method: 'eth_getBalance',
      params: [walletAddress, 'latest']
    });
    
    const balance = (parseInt(balanceHex, 16) / Math.pow(10, 18)).toString();
    const hasBalance = parseFloat(balance) >= parseFloat(minBalance);
    
    return {
      hasBalance,
      balance,
      network: networkConfig.name
    };
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    return {
      hasBalance: false,
      balance: '0',
      network: TESTNET_FAUCETS[network].name
    };
  }
}

// Switch to testnet network
export async function switchToTestnet(network: 'GOERLI' | 'SEPOLIA'): Promise<boolean> {
  try {
    const networkConfig = TESTNET_FAUCETS[network];
    const provider = new (window as any).ethereum;
    
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${networkConfig.chainId.toString(16)}` }],
    });
    
    return true;
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${TESTNET_FAUCETS[network].chainId.toString(16)}`,
            chainName: TESTNET_FAUCETS[network].name,
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: [TESTNET_FAUCETS[network].rpcUrl],
            blockExplorerUrls: [TESTNET_FAUCETS[network].explorer]
          }],
        });
        return true;
      } catch (addError) {
        console.error('Error adding network:', addError);
        return false;
      }
    }
    return false;
  }
}

// Get testnet configuration
export function getTestnetConfig(network: 'GOERLI' | 'SEPOLIA') {
  return TESTNET_FAUCETS[network];
}

// Validate testnet address
export function isValidTestnetAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
} 