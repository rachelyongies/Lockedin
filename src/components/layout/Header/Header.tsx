'use client';

import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/Button';
import { QuickTooltip } from '@/components/ui/Tooltip';

// Environment-based feature flags
const FEATURES = {
  TESTNET: process.env.NEXT_PUBLIC_ENABLE_TESTNET === 'true',
  ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  MULTICHAIN: process.env.NEXT_PUBLIC_ENABLE_MULTICHAIN === 'true',
  BETA_FEATURES: process.env.NEXT_PUBLIC_ENABLE_BETA === 'true',
} as const;

// Network configurations with testnet support
const NETWORK_CONFIG = {
  mainnet: {
    ethereum: { 
      name: 'Ethereum', 
      chainId: 1,
      rpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL,
    },
    bitcoin: { 
      name: 'Bitcoin', 
      network: 'mainnet',
      rpcUrl: process.env.NEXT_PUBLIC_BTC_RPC_URL,
    },
  },
  testnet: {
    ethereum: { 
      name: 'Sepolia', 
      chainId: 11155111,
      rpcUrl: process.env.NEXT_PUBLIC_ETH_TESTNET_RPC_URL,
    },
    bitcoin: { 
      name: 'Bitcoin Testnet', 
      network: 'testnet',
      rpcUrl: process.env.NEXT_PUBLIC_BTC_TESTNET_RPC_URL,
    },
  },
} as const;

// Type definitions for wallet and network hooks
interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isLoading: boolean;
  error: string | null;
}

interface NetworkState {
  ethereum: { name: string; status: 'connected' | 'connecting' | 'disconnected' | 'error' };
  bitcoin: { name: string; status: 'connected' | 'connecting' | 'disconnected' | 'error' };
}

interface WalletActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

interface HeaderProps {
  className?: string;
  // Inject dependencies for testing
  walletState?: WalletState;
  walletActions?: WalletActions;
  networkState?: NetworkState;
  // Global UI state
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: (isOpen: boolean) => void;
  // Environment override for testing
  environment?: 'mainnet' | 'testnet';
}

export const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ 
    className,
    walletState,
    walletActions,
    networkState,
    isMobileMenuOpen: globalMobileMenuOpen,
    onMobileMenuToggle,
    environment = FEATURES.TESTNET ? 'testnet' : 'mainnet',
    ...props 
  }, ref) => {
    const pathname = usePathname();
    const [localMobileMenuOpen, setLocalMobileMenuOpen] = useState(false);
    
    // Use global state if provided, otherwise local state
    const isMobileMenuOpen = globalMobileMenuOpen ?? localMobileMenuOpen;
    const setMobileMenuOpen = onMobileMenuToggle ?? setLocalMobileMenuOpen;

    // Get current network config
    const currentNetworks = NETWORK_CONFIG[environment];

    // Navigation items with feature flag support
    const getNavItems = useCallback(() => {
      const baseItems = [
        { href: '/', label: 'Bridge', emoji: '🌉' },
        { href: '/transactions', label: 'Transactions', emoji: '📊' },
      ];

      const conditionalItems = [
        ...(FEATURES.ANALYTICS ? [{ href: '/analytics', label: 'Analytics', emoji: '📈' }] : []),
        ...(FEATURES.MULTICHAIN ? [{ href: '/multichain', label: 'Multi-Chain', emoji: '⛓️' }] : []),
        { href: '/docs', label: 'Documentation', emoji: '📚' },
      ];

      return [...baseItems, ...conditionalItems];
    }, []);

    const navItems = getNavItems();

    const isActivePath = useCallback((href: string) => {
      if (href === '/') {
        return pathname === '/';
      }
      return pathname?.startsWith(href) || false;
    }, [pathname]);

    const toggleMobileMenu = useCallback(() => {
      setMobileMenuOpen(!isMobileMenuOpen);
    }, [isMobileMenuOpen, setMobileMenuOpen]);

    // Close mobile menu on route change
    useEffect(() => {
      setMobileMenuOpen(false);
    }, [pathname, setMobileMenuOpen]);

    // Handle escape key to close mobile menu
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isMobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      };

      if (isMobileMenuOpen) {
        document.addEventListener('keydown', handleEscape);
        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }, [isMobileMenuOpen, setMobileMenuOpen]);

    const formatAddress = useCallback((address: string) => {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }, []);

    return (
      <motion.header
        ref={ref}
        className={cn(
          'sticky top-0 z-40 w-full',
          'bg-card-background/80 backdrop-blur-lg',
          'border-b border-border-color/50',
          'supports-[backdrop-filter]:bg-card-background/60',
          className
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        {...props}
      >
        {/* Environment Banner for Non-Production */}
        {(FEATURES.TESTNET || environment === 'testnet') && (
          <div className="bg-warning/20 border-b border-warning/30 px-4 py-1">
            <div className="container mx-auto">
              <p className="text-xs text-center text-warning font-medium">
                ⚠️ {environment === 'testnet' ? 'TESTNET' : 'DEVELOPMENT'} ENVIRONMENT - Not for production use
              </p>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex-shrink-0">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  environment === 'testnet' 
                    ? "bg-gradient-to-br from-warning to-orange-500"
                    : "bg-gradient-to-br from-primary-500 to-accent-500"
                )}>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                    UniteDefi
                  </h1>
                  {environment === 'testnet' && (
                    <span className="px-1.5 py-0.5 bg-warning/20 text-warning text-xs font-medium rounded">
                      TESTNET
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary -mt-1">
                  {currentNetworks.ethereum.name} ⟷ {currentNetworks.bitcoin.name} Bridge
                </p>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8" role="navigation" aria-label="Main navigation">
              {navItems.map((item) => (
                <NavLink 
                  key={item.href}
                  href={item.href} 
                  active={isActivePath(item.href)}
                >
                  {item.label}
                </NavLink>
              ))}
              
              {/* Beta Features Badge */}
              {FEATURES.BETA_FEATURES && (
                <QuickTooltip text="Beta features enabled">
                  <span className="px-2 py-1 bg-accent-500/20 text-accent-400 text-xs font-medium rounded-full">
                    BETA
                  </span>
                </QuickTooltip>
              )}
            </nav>

            {/* Network Status & Wallet */}
            <div className="flex items-center gap-3">
              {/* Network Status Indicators */}
              <Suspense fallback={<NetworkStatusSkeleton />}>
                <NetworkStatus 
                  networkState={networkState} 
                  environment={environment}
                  networks={currentNetworks}
                />
              </Suspense>

              {/* Wallet Connection */}
              <Suspense fallback={<WalletSkeleton />}>
                <WalletConnection 
                  walletState={walletState}
                  walletActions={walletActions}
                  formatAddress={formatAddress}
                  environment={environment}
                />
              </Suspense>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden p-2"
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                <motion.div
                  animate={{ rotate: isMobileMenuOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMobileMenuOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </motion.div>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              id="mobile-menu"
              className="md:hidden border-t border-border-color/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
            >
              <div className="px-4 py-4 space-y-3 bg-card-background/95 backdrop-blur-sm">
                {/* Mobile Navigation */}
                <nav role="navigation" aria-label="Mobile navigation">
                  <div className="space-y-2">
                    {navItems.map((item) => (
                      <MobileNavLink 
                        key={item.href}
                        href={item.href} 
                        active={isActivePath(item.href)}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.emoji} {item.label}
                      </MobileNavLink>
                    ))}
                  </div>
                </nav>

                {/* Environment Info */}
                {environment === 'testnet' && (
                  <div className="p-2 bg-warning/10 border border-warning/30 rounded-lg">
                    <p className="text-xs text-warning">
                      🧪 Using {currentNetworks.ethereum.name} and {currentNetworks.bitcoin.name}
                    </p>
                  </div>
                )}

                {/* Mobile Network Status */}
                <Suspense fallback={<div className="h-8 bg-background-tertiary animate-pulse rounded" />}>
                  <MobileNetworkStatus 
                    networkState={networkState} 
                    environment={environment}
                    networks={currentNetworks}
                  />
                </Suspense>

                {/* Mobile Wallet */}
                <Suspense fallback={<div className="h-10 bg-background-tertiary animate-pulse rounded" />}>
                  <MobileWalletConnection 
                    walletState={walletState}
                    walletActions={walletActions}
                    environment={environment}
                  />
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    );
  }
);

Header.displayName = 'Header';

// Navigation Link Component
interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ href, children, active = false, className, ...props }, ref) => (
    <motion.a
      ref={ref}
      href={href}
      className={cn(
        'relative px-3 py-2 text-sm font-medium transition-colors duration-200',
        'hover:text-primary-400 focus:text-primary-400',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/50 rounded-md',
        active 
          ? 'text-primary-400' 
          : 'text-text-secondary hover:text-text-primary',
        className
      )}
      aria-current={active ? 'page' : undefined}
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
      {active && (
        <motion.div
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
          layoutId="activeTab"
          initial={false}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
        />
      )}
    </motion.a>
  )
);

NavLink.displayName = 'NavLink';

// Mobile Navigation Link Component
interface MobileNavLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const MobileNavLink = React.forwardRef<HTMLAnchorElement, MobileNavLinkProps>(
  ({ href, children, active = false, onClick, className, ...props }, ref) => (
    <motion.a
      ref={ref}
      href={href}
      onClick={onClick}
      className={cn(
        'block px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
        active 
          ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500' 
          : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary',
        className
      )}
      aria-current={active ? 'page' : undefined}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
    </motion.a>
  )
);

MobileNavLink.displayName = 'MobileNavLink';

// Network Status Component
interface NetworkStatusProps {
  networkState?: NetworkState;
  environment: 'mainnet' | 'testnet';
  networks: typeof NETWORK_CONFIG.mainnet | typeof NETWORK_CONFIG.testnet;
}

const NetworkStatus = React.forwardRef<HTMLDivElement, NetworkStatusProps>(
  ({ networkState, environment, networks }, ref) => {
    // Default state for SSR safety
    const defaultNetworks: NetworkState = {
      ethereum: { name: networks.ethereum.name, status: 'disconnected' },
      bitcoin: { name: networks.bitcoin.name, status: 'disconnected' },
    };

    const networkStatus = networkState || defaultNetworks;

    return (
      <div ref={ref} className="hidden sm:flex items-center gap-2">
        <NetworkIndicator 
          network="ETH" 
          status={networkStatus.ethereum.status}
          environment={environment}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
            </svg>
          }
        />
        <NetworkIndicator 
          network="BTC" 
          status={networkStatus.bitcoin.status}
          environment={environment}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z"/>
            </svg>
          }
        />
      </div>
    );
  }
);

NetworkStatus.displayName = 'NetworkStatus';

// Mobile Network Status Component
const MobileNetworkStatus = React.forwardRef<HTMLDivElement, NetworkStatusProps>(
  ({ networkState, environment, networks }, ref) => {
    const defaultNetworks: NetworkState = {
      ethereum: { name: networks.ethereum.name, status: 'disconnected' },
      bitcoin: { name: networks.bitcoin.name, status: 'disconnected' },
    };

    const networkStatus = networkState || defaultNetworks;

    return (
      <div ref={ref} className="flex items-center justify-between pt-3 border-t border-border-color/30">
        <span className="text-sm text-text-tertiary">Networks:</span>
        <div className="flex items-center gap-3">
          <NetworkIndicator 
            network="ETH" 
            status={networkStatus.ethereum.status}
            environment={environment}
            compact
          />
          <NetworkIndicator 
            network="BTC" 
            status={networkStatus.bitcoin.status}
            environment={environment}
            compact
          />
        </div>
      </div>
    );
  }
);

MobileNetworkStatus.displayName = 'MobileNetworkStatus';

// Wallet Connection Component
interface WalletConnectionProps {
  walletState?: WalletState;
  walletActions?: WalletActions;
  formatAddress: (address: string) => string;
  environment: 'mainnet' | 'testnet';
}

const WalletConnection = React.forwardRef<HTMLDivElement, WalletConnectionProps>(
  ({ walletState, walletActions, formatAddress, environment }, ref) => {
    // Default state for SSR safety
    const defaultState: WalletState = {
      isConnected: false,
      address: null,
      chainId: null,
      isLoading: false,
      error: null,
    };

    const defaultActions: WalletActions = {
      connect: async () => console.warn('Wallet actions not provided'),
      disconnect: async () => console.warn('Wallet actions not provided'),
    };

    const wallet = walletState || defaultState;
    const actions = walletActions || defaultActions;

    if (wallet.isLoading) {
      return <WalletSkeleton />;
    }

    if (wallet.isConnected && wallet.address) {
      return (
        <motion.div 
          ref={ref}
          className="flex items-center gap-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <QuickTooltip text={`Connected: ${wallet.address} (${environment})`}>
            <Button
              variant="glass"
              size="sm"
              className="font-mono text-xs"
              onClick={actions.disconnect}
            >
              <div className={cn(
                "w-2 h-2 rounded-full mr-2",
                environment === 'testnet' ? 'bg-warning' : 'bg-success'
              )} />
              {formatAddress(wallet.address)}
            </Button>
          </QuickTooltip>
        </motion.div>
      );
    }

    return (
      <div ref={ref} className="hidden sm:flex">
        <Button
          variant="primary"
          size="sm"
          onClick={actions.connect}
          disabled={wallet.isLoading}
        >
          {wallet.isLoading ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      </div>
    );
  }
);

WalletConnection.displayName = 'WalletConnection';

// Mobile Wallet Connection Component
interface MobileWalletConnectionProps {
  walletState?: WalletState;
  walletActions?: WalletActions;
  environment: 'mainnet' | 'testnet';
}

const MobileWalletConnection = React.forwardRef<HTMLDivElement, MobileWalletConnectionProps>(
  ({ walletState, walletActions, environment }, ref) => {
    const defaultState: WalletState = {
      isConnected: false,
      address: null,
      chainId: null,
      isLoading: false,
      error: null,
    };

    const defaultActions: WalletActions = {
      connect: async () => console.warn('Wallet actions not provided'),
      disconnect: async () => console.warn('Wallet actions not provided'),
    };

    const wallet = walletState || defaultState;
    const actions = walletActions || defaultActions;

    if (!wallet.isConnected && !wallet.isLoading) {
      return (
        <div ref={ref}>
          <Button
            variant={environment === 'testnet' ? 'warning' : 'primary'}
            size="sm"
            onClick={actions.connect}
            className="w-full"
            disabled={wallet.isLoading}
          >
            {wallet.isLoading ? 'Connecting...' : `Connect Wallet${environment === 'testnet' ? ' (Testnet)' : ''}`}
          </Button>
        </div>
      );
    }

    return null;
  }
);

MobileWalletConnection.displayName = 'MobileWalletConnection';

// Network Indicator Component
interface NetworkIndicatorProps {
  network: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  environment: 'mainnet' | 'testnet';
  icon?: React.ReactNode;
  compact?: boolean;
}

const NetworkIndicator = React.forwardRef<HTMLDivElement, NetworkIndicatorProps>(
  ({ network, status, environment, icon, compact = false, ...props }, ref) => {
    const statusConfig = {
      connected: { 
        color: environment === 'testnet' ? 'text-warning' : 'text-success', 
        bg: environment === 'testnet' ? 'bg-warning/20' : 'bg-success/20', 
        dot: environment === 'testnet' ? 'bg-warning' : 'bg-success' 
      },
      connecting: { color: 'text-warning', bg: 'bg-warning/20', dot: 'bg-warning' },
      disconnected: { color: 'text-text-tertiary', bg: 'bg-background-tertiary', dot: 'bg-text-tertiary' },
      error: { color: 'text-error', bg: 'bg-error/20', dot: 'bg-error' },
    };

    const config = statusConfig[status];

    return (
      <QuickTooltip text={`${network} network: ${status} (${environment})`}>
        <motion.div
          ref={ref}
          className={cn(
            'flex items-center gap-2 rounded-md border border-border-color/50',
            config.bg,
            compact ? 'px-1.5 py-0.5' : 'px-2 py-1'
          )}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-label={`${network} network status: ${status} on ${environment}`}
          {...props}
        >
          {icon && (
            <div className={cn('flex-shrink-0', config.color)}>
              {icon}
            </div>
          )}
          <span className={cn('text-xs font-medium', config.color)}>
            {network}
          </span>
          <div className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
        </motion.div>
      </QuickTooltip>
    );
  }
);

NetworkIndicator.displayName = 'NetworkIndicator';

// Loading Skeletons
const NetworkStatusSkeleton = () => (
  <div className="hidden sm:flex items-center gap-2">
    <div className="h-6 w-16 bg-background-tertiary animate-pulse rounded" />
    <div className="h-6 w-16 bg-background-tertiary animate-pulse rounded" />
  </div>
);

const WalletSkeleton = () => (
  <div className="hidden sm:block h-8 w-24 bg-background-tertiary animate-pulse rounded" />
);

export { Header as default };