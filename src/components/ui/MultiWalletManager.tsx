'use client';

import { useState, useEffect } from 'react';
import { WalletConnector } from './WalletConnector/WalletConnector';
import { WalletAddress } from './WalletAddress';
import { ManualBitcoinInput } from './ManualBitcoinInput';
import { useBitcoinWallet } from '@/hooks/useBitcoinWallet';
import { useWalletStore } from '@/store/useWalletStore';

interface MultiWalletState {
  ethWallet: {
    connected: boolean;
    address: string | null;
    provider: string | null;
  };
  btcWallet: {
    connected: boolean;
    address: string | null;
    provider: string | null;
  };
}

interface MultiWalletManagerProps {
  onConnect?: (wallet: 'eth' | 'btc', address: string) => void;
  onDisconnect?: (wallet: 'eth' | 'btc') => void;
  network?: 'mainnet' | 'testnet';
  className?: string;
}

export function MultiWalletManager({ 
  onConnect, 
  onDisconnect, 
  network: initialNetwork = 'testnet',
  className = '' 
}: MultiWalletManagerProps) {
  // Internal network state that can be toggled
  const [selectedNetwork, setSelectedNetwork] = useState<'mainnet' | 'testnet'>(initialNetwork);
  const {
    isConnected: isEthConnected,
    address: ethAddress,
    account,
    disconnect: disconnectEth,
    isIntentionallyDisconnected
  } = useWalletStore();

  // Use custom Bitcoin wallet hook (eliminates duplicate state)
  const {
    isConnected: isBtcConnected,
    address: btcAddress,
    provider: btcProvider,
    isConnecting: isConnectingBtc,
    error: btcError,
    connect: connectBtc,
    connectManual: connectBtcManual,
    disconnect: disconnectBtc,
    clearError: clearBtcError,
    getSupportedWallets,
    validateAddress: validateBtcAddress
  } = useBitcoinWallet({
    network: selectedNetwork,
    onConnect: (address) => onConnect?.('btc', address),
    onDisconnect: () => onDisconnect?.('btc')
  });

  // Simplified state (network derived from prop, no duplication)
  const [walletState, setWalletState] = useState<MultiWalletState>({
    ethWallet: {
      connected: false,
      address: null,
      provider: null,
    },
    btcWallet: {
      connected: false,
      address: null,
      provider: null,
    }
  });

  const [showBtcWalletOptions, setShowBtcWalletOptions] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [isChangingNetwork, setIsChangingNetwork] = useState(false);

  // Sync ETH wallet state and handle connection events
  useEffect(() => {
    const actualAddress = ethAddress || account?.address;
    const wasConnected = walletState.ethWallet.connected;
    
    // Respect intentional disconnect - if user disconnected, ignore MetaMask's browser-level connection
    const effectivelyConnected = isEthConnected && !isIntentionallyDisconnected;
    const isNowConnected = effectivelyConnected && !!actualAddress;
    
    console.log('🔍 MultiWalletManager ETH sync:', {
      isEthConnected,
      isIntentionallyDisconnected,
      effectivelyConnected,
      isNowConnected,
      actualAddress,
      wasConnected
    });
    
    setWalletState(prev => ({
      ...prev,
      ethWallet: {
        connected: effectivelyConnected,
        address: effectivelyConnected ? (actualAddress || null) : null,
        provider: effectivelyConnected ? 'metamask' : null,
      }
    }));
    
    // Only call onConnect when transitioning from disconnected to connected (and not intentionally disconnected)
    if (!wasConnected && isNowConnected && onConnect && !isIntentionallyDisconnected) {
      onConnect('eth', actualAddress);
    }
  }, [isEthConnected, ethAddress, account, onConnect, walletState.ethWallet.connected, isIntentionallyDisconnected]);

  // Sync BTC wallet state (network always matches prop)
  useEffect(() => {
    setWalletState(prev => ({
      ...prev,
      btcWallet: {
        connected: isBtcConnected,
        address: btcAddress,
        provider: btcProvider,
      }
    }));
  }, [isBtcConnected, btcAddress, btcProvider]);


  const handleEthDisconnect = () => {
    try {
      disconnectEth();
      onDisconnect?.('eth');
    } catch (err) {
      console.error('Failed to disconnect ETH wallet:', err);
    }
  };

  const handleBtcConnect = async (provider: 'phantom' | 'xverse') => {
    try {
      await connectBtc(provider);
      setShowBtcWalletOptions(false);
    } catch (err) {
      // Error is handled by the hook
      console.error(`Failed to connect ${provider}:`, err);
    }
  };

  const handleManualConnect = async (address: string) => {
    try {
      await connectBtcManual(address);
      setShowManualInput(false);
      setShowBtcWalletOptions(false);
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to connect manual address:', err);
    }
  };

  const handleBtcDisconnect = async () => {
    try {
      await disconnectBtc();
    } catch (err) {
      console.error('Failed to disconnect BTC wallet:', err);
    }
  };

  const handleAddressCopy = (walletType: 'eth' | 'btc') => {
    console.log(`${walletType.toUpperCase()} address copied`);
  };

  const handleNetworkToggle = async (newNetwork: 'mainnet' | 'testnet') => {
    if (newNetwork === selectedNetwork) return;
    
    setIsChangingNetwork(true);
    
    try {
      // If Bitcoin wallet is connected, disconnect first since network is changing
      if (isBtcConnected) {
        await handleBtcDisconnect();
        console.log(`Bitcoin wallet disconnected due to network change from ${selectedNetwork} to ${newNetwork}`);
      }
      
      setSelectedNetwork(newNetwork);
      clearBtcError();
      
      // Call parent callback to notify about network change
      // This could be used to show a toast notification
      console.log(`Network changed to ${newNetwork}`);
      
    } catch (err) {
      console.error('Failed to change network:', err);
    } finally {
      setIsChangingNetwork(false);
    }
  };

  const isTestnet = selectedNetwork === 'testnet';

  // Show manual input modal
  if (showManualInput) {
    return (
      <div className={`${className}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <ManualBitcoinInput
              network={selectedNetwork}
              onConnect={handleManualConnect}
              onCancel={() => setShowManualInput(false)}
              validateAddress={validateBtcAddress}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2 text-text-primary">Connect Your Wallets</h3>
        <p className="text-sm text-text-secondary mb-6">
          Connect both wallets to enable cross-chain bridging
        </p>
      </div>
      
      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg border-2 transition-all ${
          walletState.ethWallet.connected 
            ? 'border-green-200 bg-green-50 dark:border-green-600 dark:bg-green-900/20' 
            : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              walletState.ethWallet.connected ? 'bg-green-500' : 'bg-gray-400'
            }`}>
              <span className="text-white text-xs font-bold">Ξ</span>
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">Ethereum</div>
              {walletState.ethWallet.connected && walletState.ethWallet.address ? (
                <WalletAddress 
                  address={walletState.ethWallet.address}
                  network="eth"
                  isTestnet={isTestnet}
                  className="text-xs"
                  length={6}
                  onCopy={() => handleAddressCopy('eth')}
                />
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400">Not connected</div>
              )}
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg border-2 transition-all ${
          walletState.btcWallet.connected 
            ? 'border-orange-200 bg-orange-50 dark:border-orange-600 dark:bg-orange-900/20' 
            : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              walletState.btcWallet.connected ? 'bg-orange-500' : 'bg-gray-400'
            }`}>
              <span className="text-white text-xs font-bold">₿</span>
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">Bitcoin</div>
              {walletState.btcWallet.connected && walletState.btcWallet.address ? (
                <WalletAddress 
                  address={walletState.btcWallet.address}
                  network="btc"
                  isTestnet={isTestnet}
                  className="text-xs"
                  length={6}
                  onCopy={() => handleAddressCopy('btc')}
                />
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400">Not connected</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ethereum Wallet Connection */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Ethereum Network
        </div>
        {walletState.ethWallet.connected ? (
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-600">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">Ξ</span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {walletState.ethWallet.provider === 'metamask' ? 'MetaMask' : 'Ethereum Wallet'}
                </div>
                <WalletAddress 
                  address={walletState.ethWallet.address!}
                  network="eth"
                  isTestnet={isTestnet}
                  className="text-xs"
                  onCopy={() => handleAddressCopy('eth')}
                />
              </div>
            </div>
            <button
              onClick={handleEthDisconnect}
              className="px-3 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <WalletConnector 
            variant="outline"
            size="md"
            className="w-full"
          />
        )}
      </div>

      {/* Bitcoin Wallet Connection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Bitcoin Network
          </div>
          {/* Network Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Network:</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => handleNetworkToggle('testnet')}
                disabled={isChangingNetwork}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                  selectedNetwork === 'testnet'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                } ${isChangingNetwork ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Testnet
                {isChangingNetwork && selectedNetwork !== 'testnet' && (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
              <button
                onClick={() => handleNetworkToggle('mainnet')}
                disabled={isChangingNetwork}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                  selectedNetwork === 'mainnet'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                } ${isChangingNetwork ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Mainnet
                {isChangingNetwork && selectedNetwork !== 'mainnet' && (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                )}
              </button>
            </div>
          </div>
        </div>
        {walletState.btcWallet.connected ? (
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-600">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">₿</span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {walletState.btcWallet.provider === 'phantom' && 'Phantom'}
                  {walletState.btcWallet.provider === 'xverse' && 'Xverse'}
                  {walletState.btcWallet.provider === 'manual' && 'Manual'}
                </div>
                <WalletAddress 
                  address={walletState.btcWallet.address!}
                  network="btc"
                  isTestnet={isTestnet}
                  className="text-xs"
                  onCopy={() => handleAddressCopy('btc')}
                />
              </div>
            </div>
            <button
              onClick={handleBtcDisconnect}
              className="px-3 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {!showBtcWalletOptions ? (
              <button
                onClick={() => setShowBtcWalletOptions(true)}
                className="w-full flex items-center justify-center p-4 rounded-lg border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:border-orange-600 dark:hover:border-orange-400 dark:hover:bg-orange-900/20 transition-all"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Connect Bitcoin Wallet
                </span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Choose Bitcoin Wallet
                  </span>
                  <button
                    onClick={() => {
                      setShowBtcWalletOptions(false);
                      clearBtcError();
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
                
                {getSupportedWallets().map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => {
                      if (wallet.id === 'manual') {
                        setShowManualInput(true);
                      } else {
                        handleBtcConnect(wallet.id as 'phantom' | 'xverse');
                      }
                    }}
                    disabled={!wallet.available || isConnectingBtc}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      wallet.available && !isConnectingBtc
                        ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50 dark:border-orange-600 dark:hover:border-orange-400 dark:hover:bg-orange-900/20 cursor-pointer'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {wallet.id === 'phantom' && 'P'}
                          {wallet.id === 'xverse' && 'X'}
                          {wallet.id === 'manual' && '✏️'}
                        </span>
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {wallet.name}
                        </div>
                        {!wallet.available && wallet.id !== 'manual' && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Not installed
                          </div>
                        )}
                      </div>
                    </div>
                    {isConnectingBtc && (
                      <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Enhanced error visibility */}
        {btcError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-600">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-red-800 dark:text-red-200">
                  Connection Failed
                </div>
                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {btcError}
                </div>
              </div>
              <button
                onClick={clearBtcError}
                className="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-200"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Connection Progress */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Connection Progress
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${
              walletState.ethWallet.connected ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Ethereum wallet {walletState.ethWallet.connected ? 'connected' : 'pending'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${
              walletState.btcWallet.connected ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Bitcoin wallet {walletState.btcWallet.connected ? 'connected' : 'pending'}
            </span>
          </div>
        </div>
        
        {walletState.ethWallet.connected && walletState.btcWallet.connected && (
          <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-md border border-green-200 dark:border-green-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Ready for cross-chain bridging!
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}