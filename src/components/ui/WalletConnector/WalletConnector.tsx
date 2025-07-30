'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useWalletStore } from '@/store/useWalletStore';
import { useToast } from '@/components/ui/Toast';

// Extend Window interface for MetaMask (solana is defined in solana-wallet.ts)
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

// Wallet types and their configurations
interface WalletConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  chain: 'ethereum' | 'solana';
  isInstalled: boolean;
  installUrl: string;
  gradient: string;
  color: string;
}

// Beautiful wallet icons with proper branding
const WalletIcons = {
  metamask: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.49 1L13.5 8.99L14.5 5.5L21.49 1Z" fill="#E2761B"/>
      <path d="M2.51 1L13.4 9.1L9.5 5.5L2.51 1Z" fill="#E4761B"/>
      <path d="M18.5 17.5L16.5 21.5L21 22.5L22.5 18L18.5 17.5Z" fill="#E4761B"/>
      <path d="M1.5 18L3 22.5L7.5 21.5L5.5 17.5L1.5 18Z" fill="#E4761B"/>
      <path d="M6.5 12.5L5 14.5L6.5 15.5L6.5 12.5Z" fill="#E4761B"/>
      <path d="M17.5 12.5L17.5 15.5L19 14.5L17.5 12.5Z" fill="#E4761B"/>
      <path d="M7.5 21.5L12.5 19.5L8.5 16.5L7.5 21.5Z" fill="#E4761B"/>
      <path d="M11.5 19.5L16.5 21.5L15.5 16.5L11.5 19.5Z" fill="#E4761B"/>
    </svg>
  ),
  phantom: (
    <svg className="w-8 h-8" viewBox="0 0 128 128" fill="currentColor">
      <rect width="128" height="128" rx="64" fill="url(#phantom-gradient)"/>
      <path d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.4314 23C32.6898 23 13.7208 41.7651 13.7208 64.9142H2.27881C2.27881 28.8117 31.4668 0 67.4314 0C103.396 0 132.584 28.8117 132.584 64.9142H110.584ZM110.584 128H99.142C99.142 104.851 80.173 86.0859 56.4314 86.0859C32.6898 86.0859 13.7208 104.851 13.7208 128H2.27881C2.27881 91.8975 31.4668 63.0859 67.4314 63.0859C103.396 63.0859 132.584 91.8975 132.584 128H110.584Z" fill="white"/>
      <defs>
        <linearGradient id="phantom-gradient" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="#534BB1"/>
          <stop offset="1" stopColor="#551BF9"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  walletconnect: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  ),
  coinbase: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  )
};

interface WalletConnectorProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  showModal?: boolean;
  onModalClose?: () => void;
}

export const WalletConnector: React.FC<WalletConnectorProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  showModal = false,
  onModalClose
}) => {
  // Wallet store
  const {
    isConnected,
    account,
    connect,
    disconnect,
    status: walletStatus,
    isConnecting,
    walletType
  } = useWalletStore();

  // Toast notifications
  const { addToast } = useToast();

  // Local state
  const [isModalOpen, setIsModalOpen] = useState(showModal);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Available wallets with beautiful styling
  const [availableWallets, setAvailableWallets] = useState<WalletConfig[]>([
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: 'metamask',
      description: 'The most popular Ethereum wallet',
      chain: 'ethereum',
      isInstalled: false,
      installUrl: 'https://metamask.io/download/',
      gradient: 'from-orange-400 to-orange-600',
      color: 'text-orange-600'
    },
    {
      id: 'phantom',
      name: 'Phantom',
      icon: 'phantom',
      description: 'The most popular Solana wallet',
      chain: 'solana',
      isInstalled: false,
      installUrl: 'https://phantom.app/',
      gradient: 'from-purple-500 to-purple-700',
      color: 'text-purple-600'
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: 'walletconnect',
      description: 'Connect any wallet via QR code',
      chain: 'ethereum',
      isInstalled: true,
      installUrl: '',
      gradient: 'from-blue-500 to-blue-700',
      color: 'text-blue-600'
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: 'coinbase',
      description: 'Secure wallet from Coinbase',
      chain: 'ethereum',
      isInstalled: false,
      installUrl: 'https://wallet.coinbase.com/',
      gradient: 'from-green-500 to-green-700',
      color: 'text-green-600'
    }
  ]);

  // Check wallet availability and connection on mount
  useEffect(() => {
    checkWalletAvailability();
    
    // Force check if wallet is actually connected
    const checkExistingConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
          
          if (accounts && accounts.length > 0 && !isConnected) {
            await connect('metamask');
          }
        } catch (error) {
          // Silent error handling
        }
      }
    };
    
    checkExistingConnection();
  }, [isConnected, connect]);

  // Update modal state when showModal prop changes
  useEffect(() => {
    setIsModalOpen(showModal);
  }, [showModal]);


  // Check which wallets are installed
  const checkWalletAvailability = () => {
    const updatedWallets = availableWallets.map(wallet => {
      let isInstalled = false;

      switch (wallet.id) {
        case 'metamask':
          isInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
          break;
        case 'phantom':
          isInstalled = typeof window !== 'undefined' && typeof window.solana !== 'undefined' && !!window.solana?.isPhantom;
          break;
        case 'walletconnect':
          isInstalled = true; // Always available
          break;
        case 'coinbase':
          isInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
          break;
        default:
          isInstalled = false;
      }

      return { ...wallet, isInstalled };
    });

    setAvailableWallets(updatedWallets);
  };

  // Handle wallet connection
  const handleWalletConnect = async (walletId: string) => {
    try {
      setConnectingWallet(walletId);
      
      // Check if wallet is installed
      const wallet = availableWallets.find(w => w.id === walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (!wallet.isInstalled) {
        // Open install URL
        window.open(wallet.installUrl, '_blank');
        addToast({ 
          type: 'info', 
          message: `Please install ${wallet.name} and try again` 
        });
        return;
      }

      // Connect to wallet
      await connect(walletId as 'metamask' | 'phantom' | 'walletconnect' | 'coinbase');
      
      addToast({ 
        type: 'success', 
        message: `Connected to ${wallet.name} successfully!` 
      });

      // Close modal
      setIsModalOpen(false);
      onModalClose?.();

    } catch (error) {
      console.error('Wallet connection error:', error);
      addToast({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to connect wallet' 
      });
    } finally {
      setConnectingWallet(null);
    }
  };

  // Handle wallet disconnection
  const handleWalletDisconnect = async () => {
    try {
      await disconnect();
      addToast({ 
        type: 'success', 
        message: 'Wallet disconnected successfully!' 
      });
    } catch (error) {
      addToast({ 
        type: 'error', 
        message: 'Failed to disconnect wallet' 
      });
    }
  };

  // Open wallet selection modal
  const openWalletModal = () => {
    setIsModalOpen(true);
  };

  // Close wallet selection modal
  const closeWalletModal = () => {
    setIsModalOpen(false);
    onModalClose?.();
  };

  // If wallet is connected, show beautiful connected state
  if (isConnected && account) {
    return (
      <motion.div 
        className={className}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onHoverStart={() => setIsButtonHovered(true)}
        onHoverEnd={() => setIsButtonHovered(false)}
      >
        <Button
          variant="success"
          size={size}
          onClick={handleWalletDisconnect}
          className="group relative overflow-hidden bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600 transition-all duration-300 px-5 py-3"
        >
          <div className="flex items-center gap-4 w-full">
            {/* MetaMask Icon for MetaMask wallet */}
            {walletType === 'metamask' ? (
              <img 
                src="/images/wallets/metamask.svg" 
                alt="MetaMask" 
                className="w-5 h-5"
              />
            ) : (
              <motion.div 
                className="w-2 h-2 bg-white rounded-full"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
            
            {/* Connected text and address */}
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold">Connected</span>
              <span className="font-mono text-xs opacity-90">
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </span>
            </div>
            
            {/* Disconnect icon - spins when button is hovered */}
            <motion.div
              className="ml-1"
              animate={{ 
                rotate: isButtonHovered ? 360 : 0
              }}
              transition={{ 
                duration: 0.6,
                ease: "easeInOut"
              }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </motion.div>
            
            {/* Spacer to maintain button width */}
            <div className="flex-1"></div>
          </div>
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div 
        className={className}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          variant={variant === 'outline' ? 'primary' : variant === 'gradient' ? 'primary' : variant}
          size={size}
          onClick={openWalletModal}
          disabled={isConnecting}
          className={`
            relative overflow-hidden group
            ${variant === 'gradient' ? 
              'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl' : 
              ''
            }
            ${!isConnected && !isConnecting && variant !== 'gradient' ? 
              'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl' : 
              ''
            }
            transition-all duration-300 ease-out
          `}
        >
          {/* Animated background for gradient variant */}
          {variant === 'gradient' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
              animate={{
                background: [
                  "linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899)",
                  "linear-gradient(90deg, #EC4899, #3B82F6, #8B5CF6)",
                  "linear-gradient(90deg, #8B5CF6, #EC4899, #3B82F6)",
                  "linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899)",
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          )}

          <div className="relative flex items-center gap-2">
            {isConnecting ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <motion.svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ 
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </motion.svg>
                <span className="font-semibold">Connect Wallet</span>
                <motion.div
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  initial={{ x: -5 }}
                  animate={{ x: 0 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              </>
            )}
          </div>
        </Button>
      </motion.div>

      {/* Beautiful Wallet Selection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeWalletModal}
        title="Connect Your Wallet"
        size="md"
      >
        <div className="space-y-6">
          <div className="grid gap-4">
            {availableWallets.map((wallet, index) => (
              <motion.button
                key={wallet.id}
                onClick={() => handleWalletConnect(wallet.id)}
                disabled={connectingWallet === wallet.id || !wallet.isInstalled}
                className={`
                  group relative overflow-hidden rounded-xl border-2 transition-all duration-300
                  ${wallet.isInstalled 
                    ? `border-gray-200 hover:border-${wallet.color.split('-')[1]}-300 hover:shadow-lg cursor-pointer bg-white hover:bg-gradient-to-r hover:from-${wallet.color.split('-')[1]}-50 hover:to-white` 
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                  }
                  ${connectingWallet === wallet.id ? `bg-gradient-to-r from-${wallet.color.split('-')[1]}-50 to-white border-${wallet.color.split('-')[1]}-300 shadow-lg` : ''}
                `}
                whileHover={wallet.isInstalled ? { 
                  scale: 1.02,
                  y: -2
                } : {}}
                whileTap={wallet.isInstalled ? { scale: 0.98 } : {}}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.1
                }}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className={`flex-shrink-0 p-2 rounded-lg bg-gradient-to-br ${wallet.gradient} shadow-lg`}>
                    {WalletIcons[wallet.icon as keyof typeof WalletIcons]}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{wallet.name}</span>
                      {!wallet.isInstalled && (
                        <motion.span 
                          className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium"
                          animate={{ 
                            scale: [1, 1.05, 1],
                            opacity: [0.8, 1, 0.8]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          Install
                        </motion.span>
                      )}
                      {wallet.chain === 'solana' && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                          Solana
                        </span>
                      )}
                      {wallet.chain === 'ethereum' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                          Ethereum
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{wallet.description}</p>
                  </div>

                  {connectingWallet === wallet.id ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Spinner size="sm" />
                    </motion.div>
                  ) : (
                    <motion.div
                      className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${wallet.color}`}
                      whileHover={{ x: 3 }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  )}
                </div>

                {/* Hover effect overlay */}
                {wallet.isInstalled && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          <motion.div 
            className="pt-6 border-t border-gray-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">
                By connecting a wallet, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</a>
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secure connection</span>
              </div>
            </div>
          </motion.div>
        </div>
      </Modal>
    </>
  );
}; 