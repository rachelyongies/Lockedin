'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { multiWalletManager, PRODUCTION_WALLETS } from '@/lib/wallets/multi-wallet-manager';
import { NetworkManager } from '@/config/networks';
import { useToast } from '@/components/ui/Toast';
import { useNetworkStore } from '@/store/useNetworkStore';
import { ALL_TOKENS, ETHEREUM_TOKENS, SOLANA_TOKENS, STARKNET_TOKENS, STELLAR_TOKENS, BITCOIN_TOKENS } from '@/config/tokens';

interface ConnectedWallet {
  name: string;
  address: string;
  chainId: number;
  status: 'loading' | 'ready' | 'error' | 'disconnected';
  type: string;
  balance?: string;
  lastUpdated: number;
  networkName?: string;
  networkType?: 'mainnet' | 'testnet' | 'devnet';
  selectedAsset?: string; // Track selected asset for each wallet
}

interface WalletBalance {
  token: string;
  balance: string;
  usdValue?: number;
  symbol: string;
}

interface WalletSummary {
  totalWallets: number;
  totalBalance: number;
  connectedWallets: number;
  readyWallets: number;
  networks: string[];
}

export default function MultiWalletPage() {
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([]);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedWalletToConnect, setSelectedWalletToConnect] = useState<string>('');
  const [summary, setSummary] = useState<WalletSummary>({
    totalWallets: 0,
    totalBalance: 0,
    connectedWallets: 0,
    readyWallets: 0,
    networks: []
  });
  const { addToast } = useToast();
  const { isNetworkReady } = useNetworkStore();

  // Auto-detect available wallets on mount
  useEffect(() => {
    // Add a delay to ensure extensions are fully loaded
    const timer = setTimeout(() => {
      detectAvailableWallets();
      detectExistingConnections();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Refresh wallet states every 5 seconds
  useEffect(() => {
    const refreshWallets = async () => {
      await updateWalletStates();
    };

    refreshWallets();
    const interval = setInterval(refreshWallets, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-connect all available wallets
  const autoConnectAllWallets = useCallback(async () => {
    setIsAutoConnecting(true);

    // First, detect available wallets
    const detectedWallets = PRODUCTION_WALLETS.filter(wallet => wallet.isInstalled());

    if (detectedWallets.length === 0) {
      addToast({
        message: '❌ No wallets detected. Please install MetaMask, Phantom, or other supported wallets.',
        type: 'error'
      });
      setIsAutoConnecting(false);
      return;
    }

    addToast({
      message: `🔄 Auto-connecting ${detectedWallets.length} detected wallets...`,
      type: 'info'
    });

    // Connect wallets one by one to ensure proper prompts
    for (const wallet of detectedWallets) {
      try {
        addToast({
          message: `🔗 Connecting ${wallet.name}...`,
          type: 'info'
        });

        // Try to connect to the first available chain for each wallet
        const chainId = wallet.chainIds[0];

        // Add a small delay to ensure wallet prompts don't conflict
        await new Promise(resolve => setTimeout(resolve, 500));

        const result = await multiWalletManager.connectWallet(wallet.name, chainId);

        if (result.success) {
          addToast({
            message: `✅ ${wallet.name} connected successfully!`,
            type: 'success'
          });

          // Immediately fetch balance for this wallet
          setTimeout(async () => {
            await updateWalletStates();
          }, 1000);
        } else {
          addToast({
            message: `❌ Failed to connect ${wallet.name}: ${result.error}`,
            type: 'error'
          });
        }
      } catch (error) {
        addToast({
          message: `❌ Error connecting ${wallet.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error'
        });
      }
    }

    setIsAutoConnecting(false);

    // Final refresh of all wallet states
    await updateWalletStates();

    addToast({
      message: '🎉 Auto-connection completed! Check your connected wallets below.',
      type: 'success'
    });
  }, [addToast]);

  // Detect available wallets
  const detectAvailableWallets = () => {
    try {
      // Wait for extensions to be fully initialized
      if (typeof window === 'undefined') return;

      const detected = PRODUCTION_WALLETS
        .filter(wallet => {
          try {
            return wallet.isInstalled();
          } catch (error) {
            console.warn(`Error detecting ${wallet.name}:`, error);
            return false;
          }
        })
        .map(wallet => wallet.name);

      setAvailableWallets(detected);

      if (detected.length > 0) {
        addToast({
          message: `🔍 Detected ${detected.length} wallet(s): ${detected.join(', ')}`,
          type: 'info'
        });
      } else {
        addToast({
          message: '❌ No wallets detected. Please install MetaMask, Phantom, or other supported wallets.',
          type: 'warning'
        });
      }
    } catch (error) {
      console.error('Error in detectAvailableWallets:', error);
      addToast({
        message: '⚠️ Error detecting wallets. Please refresh the page.',
        type: 'error'
      });
    }
  };

  // Detect existing wallet connections from the main app
  const detectExistingConnections = async () => {
    try {
      // Check for existing MetaMask connection
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
        if (accounts && accounts.length > 0) {
          // MetaMask is already connected
          const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;

          // Add to multi-wallet manager
          const result = await multiWalletManager.connectWallet('MetaMask', parseInt(chainId, 16));
          if (result.success) {
            addToast({
              message: `✅ Imported existing MetaMask connection`,
              type: 'success'
            });
          }
        }
      }

      // Check for existing Phantom connection
      if (typeof window !== 'undefined' && (window as unknown as { solana?: { isPhantom?: boolean; isConnected?: boolean } }).solana?.isPhantom) {
        const solanaProvider = (window as unknown as { solana?: { isPhantom?: boolean; isConnected?: boolean } }).solana;
        if (solanaProvider?.isConnected) {
          // Phantom is already connected
          const result = await multiWalletManager.connectWallet('Phantom', 101); // Default to mainnet
          if (result.success) {
            addToast({
              message: `✅ Imported existing Phantom connection`,
              type: 'success'
            });
          }
        }
      }
    } catch (error) {
      console.warn('Error detecting existing connections:', error);
    }
  };

  // Update wallet states
  const updateWalletStates = async () => {
    try {
      // First refresh all wallet states (this will fetch balances)
      await multiWalletManager.refreshAllWalletStates();

      const states = multiWalletManager.getAllWalletStates();
      const walletList: ConnectedWallet[] = [];

      states.forEach((state, name) => {
        const network = NetworkManager.getNetworkById(state.chainId);

        // Get the actual wallet type from the connected wallets
        const connectedWallet = multiWalletManager.getConnectedWallets().find(w => w.name === name);
        const walletType = connectedWallet?.type || 'evm';

        // console.log(`🔍 Wallet ${name} type detection:`, {
        //   name,
        //   connectedWalletType: connectedWallet?.type,
        //   finalType: walletType,
        //   chainId: state.chainId,
        //   balance: state.balance
        // });

        walletList.push({
          name,
          address: state.address,
          chainId: state.chainId,
          status: state.status,
          type: walletType, // Use actual wallet type
          balance: state.balance,
          lastUpdated: state.lastUpdated,
          networkName: network?.name,
          networkType: network?.type
        });
      });

      setConnectedWallets(walletList);

      // Update summary
      const networks = [...new Set(walletList.map(w => w.networkName).filter((name): name is string => Boolean(name)))];
      setSummary({
        totalWallets: availableWallets.length,
        totalBalance: walletList.reduce((sum, w) => {
          const balance = parseFloat(w.balance || '0') || 0;
          const price = getTokenPrice(w.selectedAsset || 'ETH');
          return sum + (balance * price);
        }, 0),
        connectedWallets: walletList.length,
        readyWallets: walletList.filter(w => w.status === 'ready').length,
        networks
      });
    } catch (error) {
      console.error('Error updating wallet states:', error);
      // Don't show error toast to user, just log it
    }
  };





  // Disconnect wallet
  const handleDisconnect = async (walletName: string) => {
    try {
      // First try to disconnect from multi-wallet manager
      const success = await multiWalletManager.disconnectWallet(walletName);

      // Also try to disconnect from the main app if it's MetaMask
      if (walletName === 'MetaMask' && typeof window !== 'undefined' && window.ethereum) {
        try {
          // Request disconnection from MetaMask
          await window.ethereum.request({ method: 'wallet_requestPermissions', params: [] });
        } catch (mmError) {
          console.warn('MetaMask disconnect error:', mmError);
        }
      }

      // Also try to disconnect from Phantom
      if (walletName === 'Phantom' && typeof window !== 'undefined' && (window as unknown as { solana?: { isPhantom?: boolean; disconnect?: () => Promise<void> } }).solana?.isPhantom) {
        try {
          await (window as unknown as { solana?: { disconnect?: () => Promise<void> } }).solana?.disconnect?.();
        } catch (phantomError) {
          console.warn('Phantom disconnect error:', phantomError);
        }
      }

      if (success) {
        addToast({ message: `🔌 ${walletName} disconnected`, type: 'info' });
        // Refresh wallet states after disconnect
        await updateWalletStates();
      }
    } catch (error) {
      addToast({ message: `❌ Disconnect error: ${error}`, type: 'error' });
    }
  };

  // Handle asset selection for a wallet
  const handleAssetSelection = async (walletName: string, assetSymbol: string) => {
    // Check if wallet is connected
    const wallet = connectedWallets.find(w => w.name === walletName);

    if (!wallet || wallet.status !== 'ready') {
      // Wallet not connected, try to connect it
      addToast({
        message: `🔗 Connecting ${walletName} to fetch ${assetSymbol} balance...`,
        type: 'info'
      });

      try {
        // Find the wallet config
        const walletConfig = PRODUCTION_WALLETS.find(w => w.name === walletName);
        if (walletConfig) {
          const result = await multiWalletManager.connectWallet(walletName, walletConfig.chainIds[0]);
          if (result.success) {
            addToast({
              message: `✅ ${walletName} connected successfully!`,
              type: 'success'
            });
            // Update wallet states to get balance
            await updateWalletStates();
          } else {
            addToast({
              message: `❌ Failed to connect ${walletName}: ${result.error}`,
              type: 'error'
            });
            return;
          }
        }
      } catch (error) {
        addToast({
          message: `❌ Connection error: ${error}`,
          type: 'error'
        });
        return;
      }
    }

    // Update the selected asset
    setConnectedWallets(prev => prev.map(wallet =>
      wallet.name === walletName
        ? { ...wallet, selectedAsset: assetSymbol }
        : wallet
    ));

    // Fetch specific token balance
    await fetchTokenBalance(walletName, assetSymbol);

    addToast({
      message: `🔄 Switched to ${assetSymbol} for ${walletName}`,
      type: 'info'
    });
  };

  // Connect specific wallet
  const handleConnectSpecificWallet = async (walletName: string) => {
    setSelectedWalletToConnect(walletName);
    setShowConnectModal(true);
  };

  // Connect wallet from modal
  const connectWalletFromModal = async () => {
    if (!selectedWalletToConnect) return;

    try {
      const walletConfig = PRODUCTION_WALLETS.find(w => w.name === selectedWalletToConnect);
      if (walletConfig) {
        // Close modal immediately to show the wallet extension popup
        setShowConnectModal(false);
        setSelectedWalletToConnect('');

        addToast({
          message: `🔗 Connecting ${selectedWalletToConnect}...`,
          type: 'info'
        });

        // Add a small delay to ensure modal is closed before wallet popup appears
        setTimeout(async () => {
          try {
            // Add retry logic for Phantom specifically
            let result;
            let retryCount = 0;
            const maxRetries = 2;

            do {
              result = await multiWalletManager.connectWallet(selectedWalletToConnect, walletConfig.chainIds[0]);
              retryCount++;

              if (!result.success && retryCount < maxRetries) {
                console.log(`Retry ${retryCount} for ${selectedWalletToConnect}...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              }
            } while (!result.success && retryCount < maxRetries);

            if (result.success) {
              addToast({
                message: `✅ ${selectedWalletToConnect} connected successfully!`,
                type: 'success'
              });
              await updateWalletStates();
            } else {
              addToast({
                message: `❌ Failed to connect ${selectedWalletToConnect}: ${result.error}`,
                type: 'error'
              });
            }
          } catch (error) {
            addToast({
              message: `❌ Connection error: ${error}`,
              type: 'error'
            });
          }
        }, 100);
      }
    } catch (error) {
      addToast({
        message: `❌ Connection error: ${error}`,
        type: 'error'
      });
    }
  };

  // Fetch specific token balance
  const fetchTokenBalance = async (walletName: string, tokenSymbol: string) => {
    try {
      const wallet = connectedWallets.find(w => w.name === walletName);
      if (!wallet) return;

      // Get token info
      const token = ALL_TOKENS.find(t => t.symbol === tokenSymbol);
      if (!token) return;

      let balance = '0';

      if (wallet.type === 'evm') {
        // For EVM wallets, fetch ERC20 token balance
        if (tokenSymbol === 'ETH' || tokenSymbol === 'WETH') {
                  // Native ETH balance
        const provider = multiWalletManager.getWalletProvider(walletName);
        if (provider && (provider as unknown as { request?: (params: { method: string; params: string[] }) => Promise<string> }).request) {
          const balanceHex = await (provider as unknown as { request: (params: { method: string; params: string[] }) => Promise<string> }).request({
            method: 'eth_getBalance',
            params: [wallet.address, 'latest']
          });
            balance = (parseInt(balanceHex, 16) / Math.pow(10, 18)).toString();
            console.log(`💰 ${walletName} ${tokenSymbol} balance: ${balance} (raw hex: ${balanceHex})`);
          }
        } else {
          // ERC20 token balance - fetch from contract
          try {
            const provider = multiWalletManager.getWalletProvider(walletName);
            if (provider && (provider as unknown as { request?: (params: { method: string; params: string[] }) => Promise<string> }).request) {
              // Get token address from config
              const tokenConfig = ETHEREUM_TOKENS[wallet.chainId]?.find(t => t.symbol === tokenSymbol);
              if (tokenConfig && 'address' in tokenConfig) {
                const tokenContract = new (window as any).ethers.Contract(
                  tokenConfig.address,
                  ['function balanceOf(address) view returns (uint256)'],
                  provider
                );
                const tokenBalance = await tokenContract.balanceOf(wallet.address);
                balance = (parseInt(tokenBalance, 16) / Math.pow(10, tokenConfig.decimals || 18)).toString();
                console.log(`💰 ${walletName} ${tokenSymbol} balance: ${balance} (real)`);
              } else {
                balance = '0';
                console.log(`💰 ${walletName} ${tokenSymbol} balance: ${balance} (token config not found)`);
              }
            } else {
              balance = '0';
              console.log(`💰 ${walletName} ${tokenSymbol} balance: ${balance} (provider not available)`);
            }
          } catch (error) {
            balance = '0';
            console.log(`💰 ${walletName} ${tokenSymbol} balance: ${balance} (error: ${error})`);
          }
        }
      } else if (wallet.type === 'solana') {
        // For Solana wallets, fetch SPL token balance
        const provider = multiWalletManager.getWalletProvider(walletName);
        if (provider && (provider as unknown as { getBalance?: () => Promise<{ value: number }> }).getBalance) {
          if (tokenSymbol === 'SOL' || tokenSymbol === 'WSOL') {
            // Native SOL balance
            const balanceData = await (provider as unknown as { getBalance: () => Promise<{ value: number }> }).getBalance();
            balance = (balanceData.value / Math.pow(10, 9)).toString();
            console.log(`💰 ${walletName} ${tokenSymbol} balance: ${balance} (raw lamports: ${balanceData.value})`);
          } else {
            // SPL token balance - for now, use mock (would need SPL token program integration)
            balance = '0';
            console.log(`💰 ${walletName} ${tokenSymbol} balance: ${balance} (SPL token - not implemented yet)`);
          }
        }
      }

      // Update the wallet balance
      setConnectedWallets(prev => prev.map(w =>
        w.name === walletName
          ? { ...w, balance, selectedAsset: tokenSymbol }
          : w
      ));

      console.log(`✅ Updated ${walletName} ${tokenSymbol} balance: ${balance}`);
    } catch (error) {
      console.warn(`Failed to fetch ${tokenSymbol} balance for ${walletName}:`, error);
    }
  };



  // Get available tokens for a specific network
  const getAvailableTokensForNetwork = (chainId: number, networkType?: string, walletType?: string) => {
    // console.log(`🔍 Getting tokens for chainId: ${chainId}, networkType: ${networkType}, walletType: ${walletType}`);

    let tokens: Array<{ symbol: string; name: string; logoUrl?: string }> = [];

    // Map chainId to network type for token lookup
    if (networkType === 'mainnet' || chainId === 1) {
      if (walletType === 'solana') {
        // For Solana wallets, prioritize Solana tokens
        tokens = [...(SOLANA_TOKENS['mainnet-beta'] || []), ...(ETHEREUM_TOKENS[1] || []), ...(STARKNET_TOKENS['mainnet'] || []), ...(STELLAR_TOKENS['public'] || []), ...(BITCOIN_TOKENS['mainnet'] || [])];
      } else {
        // For EVM wallets, prioritize Ethereum tokens
        tokens = [...(ETHEREUM_TOKENS[1] || []), ...(SOLANA_TOKENS['mainnet-beta'] || []), ...(STARKNET_TOKENS['mainnet'] || []), ...(STELLAR_TOKENS['public'] || []), ...(BITCOIN_TOKENS['mainnet'] || [])];
      }
    } else if (networkType === 'testnet' || chainId === 11155111) {
      if (walletType === 'solana') {
        tokens = [...(SOLANA_TOKENS['devnet'] || []), ...(ETHEREUM_TOKENS[11155111] || []), ...(STARKNET_TOKENS['goerli'] || []), ...(STELLAR_TOKENS['testnet'] || []), ...(BITCOIN_TOKENS['testnet'] || [])];
      } else {
        tokens = [...(ETHEREUM_TOKENS[11155111] || []), ...(SOLANA_TOKENS['devnet'] || []), ...(STARKNET_TOKENS['goerli'] || []), ...(STELLAR_TOKENS['testnet'] || []), ...(BITCOIN_TOKENS['testnet'] || [])];
      }
    } else {
      // Fallback to all tokens
      tokens = ALL_TOKENS;
    }

    // console.log(`📦 Found ${tokens.length} tokens:`, tokens.map(t => t.symbol));

    return tokens.map(token => ({
      value: token.symbol,
      label: `${token.symbol} - ${token.name}`,
      icon: token.logoUrl,
      disabled: false
    }));
  };

  // Get token options for dropdown
  const getTokenOptionsForDropdown = (chainId: number, networkType?: string, walletType?: string) => {
    return getAvailableTokensForNetwork(chainId, networkType, walletType);
  };

  // Get token price for USD conversion (mock prices)
  const getTokenPrice = (symbol: string): number => {
    const prices: Record<string, number> = {
      'ETH': 2000,
      'WETH': 2000,
      'WBTC': 40000,
      'BTC': 40000,
      'SOL': 100,
      'WSOL': 100,
      'STARK': 1.5,
      'WSTARK': 1.5,
      'XLM': 0.1,
      'WXLM': 0.1,
      'USDC': 1,
      'USDT': 1
    };
    return prices[symbol] || 1;
  };

  // Get wallet icon path
  const getWalletIconPath = (walletName: string): string => {
    const iconMap: Record<string, string> = {
      'WalletConnect': 'wallet-connect.png',
      'Phantom': 'phantom.png',
      'MetaMask': 'metamask.svg',
      'Coinbase': 'coinbase.svg',
      'xDeFi': 'xdefi.svg',
      'Rabby': 'rabby.png'
    };
    return iconMap[walletName] || 'default.svg';
  };



  return (
    <>
      {/* Global Tooltip Portal - Completely outside PageWrapper */}
      <div className="fixed inset-0 pointer-events-none z-[9999]">
        <div
          id="global-tooltip"
          className="absolute px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 transition-opacity duration-200 max-w-xs"
          style={{ display: 'none' }}
        >
          <div>
            <div className="font-semibold mb-2">How to Use:</div>
            <div className="space-y-1 text-xs">
              <div>1. Install wallets (MetaMask, Phantom, etc.)</div>
              <div>2. Click &quot;Auto-Connect All&quot; to connect</div>
              <div>3. Monitor balances in real-time</div>
              <div>4. Use &quot;Refresh &amp; Re-detect&quot; if needed</div>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>

      <PageWrapper
        title="Multi-Wallet Manager"
        description="Connect multiple wallets simultaneously - MetaMask, Phantom, Rabby, and more!"
      >
        <div className="min-h-screen bg-gray-900 text-white">
          {/* Hero Section */}
          <div className="relative overflow-hidden py-16">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <motion.h1
                  className="text-4xl md:text-6xl font-bold text-white"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  Connect your wallets and aggregate your assets
                </motion.h1>
                <motion.div
                  className="relative group"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                >
                  <div
                    className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center cursor-help hover:bg-blue-600 transition-colors"
                    onMouseEnter={(e) => {
                      const tooltip = document.getElementById('global-tooltip');
                      if (tooltip) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        tooltip.style.display = 'block';
                        tooltip.style.left = `${rect.left + rect.width / 2}px`;
                        tooltip.style.top = `${rect.top - 10}px`;
                        tooltip.style.transform = 'translateX(-50%)';
                        tooltip.style.opacity = '1';
                      }
                    }}
                    onMouseLeave={() => {
                      const tooltip = document.getElementById('global-tooltip');
                      if (tooltip) {
                        tooltip.style.opacity = '0';
                        setTimeout(() => {
                          tooltip.style.display = 'none';
                        }, 200);
                      }
                    }}
                  >
                    <span className="text-white font-bold text-sm">i</span>
                  </div>
                </motion.div>
              </div>
              <motion.p
                className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Automatically detect and connect all your wallets for seamless cross-chain DeFi experience



              </motion.p>

              {/* Live Stats */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{summary.totalWallets}</div>
                  <div className="text-blue-100">Available Wallets</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{summary.connectedWallets}</div>
                  <div className="text-blue-100">Connected</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{summary.readyWallets}</div>
                  <div className="text-blue-100">Ready</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">${summary.totalBalance.toFixed(2)}</div>
                  <div className="text-blue-100">Total Balance (USD)</div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Auto-Detection & Quick Actions */}
            <motion.section
              className="mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-center mb-8">
                {/* <h2 className="text-3xl font-bold text-white mb-4">Smart Wallet Detection</h2> */}
                <p className="text-gray-300 mb-6">
                  {availableWallets.length > 0
                    ? `Detected ${availableWallets.length} wallet(s) in your browser`
                    : 'No wallets detected. Please install MetaMask, Phantom, or other supported wallets.'
                  }
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={autoConnectAllWallets}
                  disabled={isAutoConnecting}
                  className="px-8 py-4"
                >
                  {isAutoConnecting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Auto-Connecting...
                    </>
                  ) : (
                    <>
                      🔄 Auto-Connect All ({availableWallets.length})
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={async () => {
                    try {
                      // Refresh combines re-detect and update states
                      detectAvailableWallets();
                      await updateWalletStates();
                      addToast({ message: '🔄 Wallets re-detected and states refreshed', type: 'info' });
                    } catch (error) {
                      addToast({ message: `❌ Refresh error: ${error}`, type: 'error' });
                    }
                  }}
                  className="px-8 py-4"
                >
                  🔄 Refresh & Re-detect
                </Button>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    setSelectedWalletToConnect('WalletConnect');
                    setShowConnectModal(true);
                  }}
                  className="px-8 py-4"
                >
                  📱 Connect Mobile Wallet
                </Button>
              </div>

              {/* Detected Wallets List */}
              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >


                {/* Debug Info - Uncomment again if we want to use it to debug wallet connectivity*/}
                {/* <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="text-sm font-semibold text-gray-200 mb-2">Debug Information:</h4>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Total PRODUCTION_WALLETS: {PRODUCTION_WALLETS.length}</div>
                  <div>Detected wallets: {availableWallets.join(', ') || 'None'}</div>
                  <div>Connected wallets: {connectedWallets.length}</div>
                  <div>Auto-connecting: {isAutoConnecting ? '✅ Yes' : '❌ No'}</div>
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div className="font-semibold text-gray-200 mb-1">Actual Detection Results:</div>
                    {PRODUCTION_WALLETS.map(wallet => (
                      <div key={wallet.name} className="text-xs">
                        {wallet.name}: {wallet.isInstalled() ? '✅' : '❌'}
                      </div>
                    ))}
                  </div>
                  {typeof window !== 'undefined' && (
                    <>
                      <div>Window.ethereum: {window.ethereum ? '✅ Available' : '❌ Not available'}</div>
                      <div>Window.solana: {(window as any).solana ? '✅ Available' : '❌ Not available'}</div>
                      {window.ethereum && (
                        <>
                          <div>MetaMask: {window.ethereum.isMetaMask ? '✅ Detected' : '❌ Not MetaMask'}</div>
                          <div>Phantom (via ethereum): {(window.ethereum as any)?.isPhantom ? '✅ Detected' : '❌ Not Phantom'}</div>
                          <div>Rabby (via ethereum): {(window.ethereum as any)?.isRabby ? '✅ Detected' : '❌ Not Rabby'}</div>
                          <div>Rabby (via providers): {(window.ethereum as any)?.providers?.some((p: any) => p.isRabby) ? '✅ Detected' : '❌ Not in providers'}</div>
                          <div>Rabby (window.rabby): {(window as any).rabby ? '✅ Detected' : '❌ Not found'}</div>
                          <div>Coinbase (via ethereum): {(window.ethereum as any)?.isCoinbaseWallet ? '✅ Detected' : '❌ Not Coinbase'}</div>
                          <div>Providers count: {(window.ethereum as any)?.providers?.length || 0}</div>
                          {(window.ethereum as any)?.providers && (
                            <div>Providers: {(window.ethereum as any).providers.map((p: any, i: number) => 
                              `${i}: ${p.isMetaMask ? 'MetaMask' : p.isRabby ? 'Rabby' : p.isPhantom ? 'Phantom' : p.isCoinbaseWallet ? 'Coinbase' : 'Unknown'}`
                            ).join(', ')}</div>
                          )}
                        </>
                      )}
                      {(window as any).solana && (
                        <>
                          <div>Solana.isPhantom: {(window as any).solana?.isPhantom ? '✅ Yes' : '❌ No'}</div>
                          <div>Solana.isConnected: {(window as any).solana?.isConnected ? '✅ Yes' : '❌ No'}</div>
                        </>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={testWalletDetection}
                    className="w-full"
                  >
                    🔍 Test Wallet Detection (Check Console)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={testBalanceFetching}
                    className="w-full"
                >
                    💰 Test Balance Fetching (Check Console)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      console.log('🔍 Testing Phantom specifically...');
                      const phantomWallet = connectedWallets.find(w => w.name === 'Phantom');
                      if (phantomWallet) {
                        console.log('Phantom wallet found:', phantomWallet);
                        const provider = multiWalletManager.getWalletProvider('Phantom');
                        console.log('Phantom provider:', provider);
                        
                        if (provider) {
                          try {
                            console.log('Phantom provider methods:', Object.keys(provider));
                            
                            let balanceData = null;
                            
                            // Method 1: Try getBalance() directly
                            if ((provider as any).getBalance) {
                              console.log('Trying provider.getBalance()...');
                              try {
                                balanceData = await (provider as any).getBalance();
                                console.log('getBalance() result:', balanceData);
                              } catch (error) {
                                console.log('getBalance() failed:', error);
                              }
                            }
                            
                            // Method 2: Try connection.getBalance()
                            if (!balanceData && (provider as any).connection?.getBalance) {
                              console.log('Trying provider.connection.getBalance()...');
                              try {
                                const publicKey = (provider as any).publicKey;
                                if (publicKey) {
                                  balanceData = await (provider as any).connection.getBalance(publicKey);
                                  console.log('connection.getBalance() result:', balanceData);
                                }
                              } catch (error) {
                                console.log('connection.getBalance() failed:', error);
                              }
                            }
                            
                            // Method 3: Try request method
                            if (!balanceData && (provider as any).request) {
                              console.log('Trying provider.request()...');
                              try {
                                balanceData = await (provider as any).request({ method: 'getBalance' });
                                console.log('request() result:', balanceData);
                              } catch (error) {
                                console.log('request() failed:', error);
                              }
                            }
                            
                            // Method 4: Try direct property access
                            if (!balanceData && (provider as any).balance) {
                              console.log('Trying provider.balance...');
                              balanceData = (provider as any).balance;
                              console.log('provider.balance result:', balanceData);
                            }
                            
                            console.log('Final Phantom balance data:', balanceData);
                            
                            if (balanceData) {
                              let lamports = 0;
                              
                              // Handle different balance data formats
                              if (typeof balanceData === 'number') {
                                lamports = balanceData;
                              } else if (balanceData && typeof balanceData.value === 'number') {
                                lamports = balanceData.value;
                              } else if (balanceData && typeof balanceData.lamports === 'number') {
                                lamports = balanceData.lamports;
                              } else if (balanceData && typeof balanceData.balance === 'number') {
                                lamports = balanceData.balance;
                              }
                              
                              if (lamports > 0) {
                                const balance = (lamports / Math.pow(10, 9)).toString();
                                console.log('Phantom SOL balance:', balance);
                                
                                // Update immediately
                                setConnectedWallets(prev => prev.map(w => 
                                  w.name === 'Phantom' 
                                    ? { ...w, balance, selectedAsset: 'SOL' }
                                    : w
                                ));
                                
                                addToast({ 
                                  message: `✅ Phantom balance updated: ${balance} SOL`, 
                                  type: 'success' 
                                });
                              } else {
                                console.warn('Invalid balance data format:', balanceData);
                                addToast({ 
                                  message: `❌ Invalid balance data format`, 
                                  type: 'error' 
                                });
                              }
                            } else {
                              console.warn('No balance data found');
                              addToast({ 
                                message: `❌ No balance data found`, 
                                type: 'error' 
                              });
                            }
                          } catch (error) {
                            console.error('Phantom balance error:', error);
                            addToast({ 
                              message: `❌ Phantom balance error: ${error}`, 
                              type: 'error' 
                            });
                          }
                        }
                      } else {
                        console.log('Phantom wallet not found in connected wallets');
                      }
                    }}
                    className="w-full"
                  >
                    👻 Test Phantom Balance Only
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      console.log('🐰 Testing Rabby specifically...');
                      const rabbyWallet = connectedWallets.find(w => w.name === 'Rabby');
                      if (rabbyWallet) {
                        console.log('Rabby wallet found:', rabbyWallet);
                        const provider = multiWalletManager.getWalletProvider('Rabby');
                        console.log('Rabby provider:', provider);
                        
                        if (provider) {
                          try {
                            console.log('Rabby provider methods:', Object.keys(provider));
                            
                            // Try to get accounts
                            const accounts = await (provider as any).request({ method: 'eth_accounts' });
                            console.log('Rabby accounts:', accounts);
                            
                            if (accounts && accounts.length > 0) {
                              // Try to get balance
                              const balanceHex = await (provider as any).request({ 
                                method: 'eth_getBalance', 
                                params: [accounts[0], 'latest'] 
                              });
                              const balance = (parseInt(balanceHex, 16) / Math.pow(10, 18)).toString();
                              console.log('Rabby ETH balance:', balance);
                              
                              // Get chain ID
                              const chainIdHex = await (provider as any).request({ method: 'eth_chainId' });
                              const chainId = parseInt(chainIdHex, 16);
                              console.log('Rabby chain ID:', chainId);
                              
                              // Update immediately
                              setConnectedWallets(prev => prev.map(w => 
                                w.name === 'Rabby' 
                                  ? { ...w, balance, selectedAsset: 'ETH', chainId }
                                  : w
                              ));
                              
                              addToast({ 
                                message: `✅ Rabby balance updated: ${balance} ETH`, 
                                type: 'success' 
                              });
                            } else {
                              console.warn('No accounts found in Rabby');
                              addToast({ 
                                message: `❌ No accounts found in Rabby`, 
                                type: 'error' 
                              });
                            }
                          } catch (error) {
                            console.error('Rabby balance error:', error);
                            addToast({ 
                              message: `❌ Rabby balance error: ${error}`, 
                              type: 'error' 
                            });
                          }
                        } else {
                          console.log('Rabby provider not found');
                          addToast({ 
                            message: `❌ Rabby provider not found`, 
                            type: 'error' 
                          });
                        }
                      } else {
                        console.log('Rabby wallet not found in connected wallets');
                        addToast({ 
                          message: `❌ Rabby wallet not found in connected wallets`, 
                          type: 'error' 
                        });
                      }
                    }}
                    className="w-full"
                  >
                    🐰 Test Rabby Balance Only
                  </Button>
                </div>
              </div> */}

                <div className="flex flex-wrap justify-center gap-3">
                  {availableWallets.map((walletName) => {
                    const isConnected = connectedWallets.some(w => w.name === walletName);

                    return (
                      <motion.div
                        key={walletName}
                        className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer ${isConnected
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => !isConnected && handleConnectSpecificWallet(walletName)}
                        title={isConnected ? `${walletName} is already connected` : `Click to connect ${walletName}`}
                      >
                        <img
                          src={`/images/wallets/${getWalletIconPath(walletName)}`}
                          alt={walletName}
                          className="w-4 h-4"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/wallets/default.svg';
                          }}
                        />
                        <span className="font-semibold">{walletName}</span>
                        {isConnected && <span className="text-green-600">✓</span>}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.section>

            {/* Connected Wallets Dashboard */}
            <AnimatePresence>
              {connectedWallets.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6 }}
                  className="mb-12"
                >
                  <h2 className="text-3xl font-bold text-white mb-8 text-center">Connected Wallets Dashboard</h2>

                  {/* Network Status */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">Network Status</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${isNetworkReady('ethereum')
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Ethereum Network Ready
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${isNetworkReady('bitcoin')
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Bitcoin Network Ready
                      </div>
                    </div>
                  </div>

                  {/* Network Summary */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">Active Networks</h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.networks.map((network) => (
                        <span
                          key={network}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          🌐 {network}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Wallets Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {connectedWallets.map((wallet, index) => (
                      <motion.div
                        key={`${wallet.name}-${wallet.address}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card className="p-6 border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300 bg-gray-800 border-gray-700 h-96 flex flex-col">
                          {/* Wallet Header */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                                <img
                                  src={`/images/wallets/${getWalletIconPath(wallet.name)}`}
                                  alt={wallet.name}
                                  className="w-8 h-8 object-contain"
                                  onError={(e) => {
                                    // Fallback to first letter if icon fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.parentElement?.querySelector('.fallback-icon');
                                    if (fallback) {
                                      (fallback as HTMLElement).style.display = 'flex';
                                    }
                                  }}
                                />
                                <div className="fallback-icon hidden w-8 h-8 items-center justify-center">
                                  <span className="text-white font-bold text-sm">
                                    {wallet.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <h3 className="font-bold text-lg text-white">{wallet.name}</h3>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-1 rounded-full ${wallet.networkType === 'mainnet' ? 'bg-green-100 text-green-600' :
                                      wallet.networkType === 'testnet' ? 'bg-yellow-100 text-yellow-600' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {wallet.networkType?.toUpperCase() || 'UNKNOWN'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {wallet.networkName || `Chain ${wallet.chainId}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Status Indicator */}
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${wallet.status === 'ready' ? 'bg-green-100 text-green-800' :
                                wallet.status === 'loading' ? 'bg-yellow-100 text-yellow-800 animate-pulse' :
                                  wallet.status === 'error' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                              }`}>
                              {wallet.status === 'ready' ? '✅ Ready' :
                                wallet.status === 'loading' ? '⏳ Loading' :
                                  wallet.status === 'error' ? '❌ Error' :
                                    '⚪ Disconnected'}
                            </div>
                          </div>

                          {/* Address */}
                          <div className="mb-4">
                            <div className="text-sm text-gray-300 mb-1">Address:</div>
                            <div className="font-mono text-xs bg-black text-white p-2 rounded border truncate">
                              {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Not connected'}
                            </div>
                          </div>

                          {/* Asset Selection */}
                          <div className="mb-4">
                            <div className="text-sm text-gray-300 mb-1">Asset:</div>
                            <div className="text-sm text-gray-400 mb-2">
                              Available tokens: {getTokenOptionsForDropdown(wallet.chainId, wallet.networkType, wallet.type).length}
                            </div>
                            <Select
                              value={wallet.selectedAsset || (wallet.type === 'solana' ? 'SOL' : 'ETH')}
                              onValueChange={(value: string | string[]) => {
                                if (typeof value === 'string') {
                                  handleAssetSelection(wallet.name, value);
                                }
                              }}
                              options={getTokenOptionsForDropdown(wallet.chainId, wallet.networkType, wallet.type)}
                              placeholder="Select asset..."
                            />
                          </div>

                          {/* Balance */}
                          <div className="mb-4">
                            <div className="text-sm text-gray-300 mb-1">Balance:</div>
                            <div
                              className="text-lg font-semibold text-white cursor-pointer hover:text-blue-400 transition-colors"
                              onClick={() => fetchTokenBalance(wallet.name, wallet.selectedAsset || (wallet.type === 'solana' ? 'SOL' : 'ETH'))}
                              title="Click to refresh balance"
                            >
                              {wallet.balance ? (
                                <>
                                  {parseFloat(wallet.balance) > 0.0001
                                    ? parseFloat(wallet.balance).toFixed(4)
                                    : parseFloat(wallet.balance).toFixed(8)
                                  } {wallet.selectedAsset || (wallet.type === 'solana' ? 'SOL' : 'ETH')}
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                                  <span className="text-gray-500">Loading...</span>
                                </div>
                              )}
                            </div>
                            {wallet.balance && parseFloat(wallet.balance) > 0 && (
                              <div className="text-sm text-gray-400">
                                ≈ ${(parseFloat(wallet.balance) * getTokenPrice(wallet.selectedAsset || (wallet.type === 'solana' ? 'SOL' : 'ETH'))).toFixed(2)} USD
                              </div>
                            )}
                            {wallet.selectedAsset && wallet.selectedAsset !== (wallet.type === 'solana' ? 'SOL' : 'ETH') && (
                              <div className="text-xs text-blue-400 mt-1">
                                💡 Click to refresh {wallet.selectedAsset} balance
                              </div>
                            )}
                          </div>

                          {/* Last Updated */}
                          <div className="text-xs text-gray-400 mb-4">
                            Last updated: {new Date(wallet.lastUpdated).toLocaleTimeString()}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 mt-auto">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                // Copy address to clipboard
                                navigator.clipboard.writeText(wallet.address);
                                addToast({ message: 'Address copied to clipboard!', type: 'success' });
                              }}
                            >
                              📋 Copy
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex-1"
                              onClick={async () => {
                                try {
                                  addToast({ message: `🔄 Refreshing ${wallet.name} balance...`, type: 'info' });
                                  await updateWalletStates();
                                  addToast({ message: `✅ ${wallet.name} balance refreshed`, type: 'success' });
                                } catch (error) {
                                  addToast({ message: `❌ Failed to refresh balance: ${error}`, type: 'error' });
                                }
                              }}
                            >
                              🔄 Refresh
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleDisconnect(wallet.name)}
                            >
                              🔌 Disconnect
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Instructions */}

          </div>

          {/* Connect Wallet Modal */}
          <Modal
            isOpen={showConnectModal}
            onClose={() => {
              setShowConnectModal(false);
              setSelectedWalletToConnect('');
            }}
            title={`Connect ${selectedWalletToConnect}`}
            size="sm"
          >
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <img
                    src={`/images/wallets/${getWalletIconPath(selectedWalletToConnect)}`}
                    alt={selectedWalletToConnect}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/wallets/default.svg';
                    }}
                  />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Connect {selectedWalletToConnect}
                </h3>
                <p className="text-gray-300 text-sm">
                  {selectedWalletToConnect === 'WalletConnect'
                    ? 'Click "Connect" to scan a QR code with your mobile wallet (MetaMask, Trust Wallet, etc.) and approve the connection.'
                    : `Click "Connect" to open your ${selectedWalletToConnect} extension and approve the connection. The popup will appear automatically.`
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowConnectModal(false);
                    setSelectedWalletToConnect('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={connectWalletFromModal}
                  className="flex-1"
                >
                  Connect {selectedWalletToConnect}
                </Button>
              </div>
            </div>
          </Modal>

        </div>
      </PageWrapper>
    </>

  );
}