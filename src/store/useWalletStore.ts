import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

/**
 * Supported wallet types for the bridge
 */
export type WalletType = 
  | 'metamask'
  | 'walletconnect' 
  | 'coinbase'
  | 'injected'
  | 'ledger'
  | 'trezor'

/**
 * Connection status for the wallet
 */
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting' 
  | 'connected'
  | 'reconnecting'
  | 'error'

/**
 * Helper function to safely extract error code
 */
function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code)
  }
  return 'UNKNOWN_ERROR'
}

/**
 * Categorized error types for better error handling
 */
export type WalletErrorCategory = 
  | 'connection'
  | 'network'
  | 'transaction'
  | 'balance'
  | 'permission'
  | 'unknown'

/**
 * Network/Chain information
 */
export interface NetworkInfo {
  chainId: number
  name: string
  currency: string
  rpcUrl: string
  blockExplorerUrl: string
  isTestnet: boolean
}

/**
 * Token balance information
 */
export interface TokenBalance {
  address: string
  symbol: string
  decimals: number
  balance: string // Raw balance as string to avoid precision issues
  formattedBalance: string // Human-readable balance
  usdValue?: number
  lastUpdated: number
}

/**
 * Account information
 */
export interface AccountInfo {
  address: string
  ensName?: string
  avatar?: string
  balances: Record<string, TokenBalance>
  lastBalanceUpdate: number
}

/**
 * Wallet connection error with categorization
 */
export interface WalletError {
  code: string
  message: string
  category: WalletErrorCategory
  details?: unknown
  timestamp: number
}

/**
 * Wallet store state
 */
export interface WalletState {
  // Connection state
  status: ConnectionStatus
  walletType: WalletType | null
  account: AccountInfo | null
  network: NetworkInfo | null
  error: WalletError | null
  
  // Settings
  autoConnect: boolean
  preferredWallet: WalletType | null
  
  // UI state
  isConnecting: boolean
  isReconnecting: boolean
  showWalletModal: boolean
  
  // Legacy compatibility
  isConnected: boolean
  address?: string
  chainId?: number
  isCorrectNetwork: boolean
  isSwitchingNetwork: boolean
  
  // Actions
  connect: (walletType: WalletType) => Promise<void>
  disconnect: () => Promise<void>
  switchNetwork: (chainId: number) => Promise<void>
  updateBalances: (tokenAddresses?: string[]) => Promise<void>
  updateAccount: (account: Partial<AccountInfo>) => void
  setError: (error: WalletError | null) => void
  clearError: () => void
  setShowWalletModal: (show: boolean) => void
  setAutoConnect: (enabled: boolean) => void
  setPreferredWallet: (walletType: WalletType | null) => void
  
  // Legacy action compatibility
  setConnected: (connected: boolean, address?: string) => void
  setConnecting: (connecting: boolean) => void
  setNetwork: (chainId: number, isCorrect: boolean) => void
  setSwitchingNetwork: (switching: boolean) => void
  
  // Computed getters
  getTokenBalance: (address: string) => TokenBalance | null
  getTotalUsdValue: () => number
}

// Balance cache TTL (5 minutes) - Enhanced caching logic
const BALANCE_CACHE_TTL = 5 * 60 * 1000

/**
 * Create error with category for better error handling
 */
function createWalletError(
  message: string, 
  category: WalletErrorCategory, 
  code?: string | number
): WalletError {
  return {
    code: code?.toString() || 'UNKNOWN_ERROR',
    message,
    category,
    timestamp: Date.now()
  }
}

/**
 * Default network configurations
 */
export const DEFAULT_NETWORKS: Record<number, NetworkInfo> = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    currency: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorerUrl: 'https://etherscan.io',
    isTestnet: false
  },
  5: {
    chainId: 5,
    name: 'Goerli Testnet',
    currency: 'ETH',
    rpcUrl: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    blockExplorerUrl: 'https://goerli.etherscan.io',
    isTestnet: true
  }
}

/**
 * Create wallet store with persistence and immer for immutable updates
 */
export const useWalletStore = create<WalletState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      status: 'disconnected',
      walletType: null,
      account: null,
      network: null,
      error: null,
      autoConnect: false,
      preferredWallet: null,
      isConnecting: false,
      isReconnecting: false,
      showWalletModal: false,

      // Legacy compatibility computed properties
      get isConnected() {
        return get().status === 'connected' && !!get().account
      },

      get address() {
        return get().account?.address
      },

      get chainId() {
        return get().network?.chainId
      },

      get isCorrectNetwork() {
        const network = get().network
        return !network || network.chainId === 1 || network.chainId === 5 // Support mainnet and goerli
      },

      get isSwitchingNetwork() {
        return get().status === 'connecting' && !!get().network
      },

      // Computed getters
      getTokenBalance: (address: string) => {
        const account = get().account
        if (!account) return null
        return account.balances[address.toLowerCase()] || null
      },

      getTotalUsdValue: () => {
        const account = get().account
        if (!account) return 0
        
        return Object.values(account.balances).reduce((total, balance) => {
          return total + (balance.usdValue || 0)
        }, 0)
      },

      // Actions
      connect: async (walletType: WalletType) => {
        set((state) => {
          state.isConnecting = true
          state.status = 'connecting'
          state.walletType = walletType
          state.error = null
        })

        try {
          // TODO: Implement actual wallet connection logic
          // This is a placeholder that simulates connection
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Mock successful connection
          const mockAccount: AccountInfo = {
            address: '0x742d35Cc6634C0532925a3b8D45fb9af0332da',
            ensName: 'user.eth',
            balances: {},
            lastBalanceUpdate: Date.now()
          }

          const mockNetwork = DEFAULT_NETWORKS[1] // Ethereum mainnet

          set((state) => {
            state.status = 'connected'
            state.account = mockAccount
            state.network = mockNetwork
            state.isConnecting = false
            state.showWalletModal = false
            if (state.autoConnect) {
              state.preferredWallet = walletType
            }
          })

          // Update balances after connection
          get().updateBalances()

        } catch (error: unknown) {
          set((state) => {
            state.status = 'error'
            state.error = createWalletError(
              (error as Error).message || 'Failed to connect wallet',
              'connection',
              getErrorCode(error) || 'CONNECTION_FAILED'
            )
            state.isConnecting = false
          })

          throw error
        }
      },

      disconnect: async () => {
        try {
          // TODO: Implement actual wallet disconnection logic
          
          set((state) => {
            state.status = 'disconnected'
            state.walletType = null
            state.account = null
            state.network = null
            state.error = null
            state.isConnecting = false
            state.isReconnecting = false
            state.showWalletModal = false
          })

        } catch (error: unknown) {
          console.error('Error disconnecting wallet:', error)
          // Even if disconnection fails, reset the state
          set((state) => {
            state.status = 'disconnected'
            state.walletType = null
            state.account = null
            state.network = null
          })
        }
      },

      switchNetwork: async (chainId: number) => {
        const targetNetwork = DEFAULT_NETWORKS[chainId]
        if (!targetNetwork) {
          throw new Error(`Unsupported network: ${chainId}`)
        }

        try {
          // TODO: Implement actual network switching logic
          await new Promise(resolve => setTimeout(resolve, 500))

          set((state) => {
            state.network = targetNetwork
          })

          // Update balances after network switch
          get().updateBalances()

        } catch (error: unknown) {
          set((state) => {
            state.error = createWalletError(
              (error as Error).message || 'Failed to switch network',
              'network',
              getErrorCode(error) || 'NETWORK_SWITCH_FAILED'
            )
          })

          throw error
        }
      },

      updateBalances: async (tokenAddresses?: string[]) => {
        const { account, network } = get()
        if (!account || !network) {
          set((state) => {
            state.error = createWalletError(
              'Wallet not connected',
              'connection'
            )
          })
          return
        }

        // TTL-based balance caching logic
        const now = Date.now()
        const cacheExpired = now - account.lastBalanceUpdate > BALANCE_CACHE_TTL
        
        if (!tokenAddresses && !cacheExpired) {
          // Cache is still valid, no need to update
          console.log('Balance cache still valid, skipping update')
          return
        }

        try {
          // TODO: Implement actual balance fetching logic
          // This is a placeholder with mock data
          const mockBalances: Record<string, TokenBalance> = {
            'eth': {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'ETH',
              decimals: 18,
              balance: '1500000000000000000', // 1.5 ETH
              formattedBalance: '1.5',
              usdValue: 3000,
              lastUpdated: now
            },
            'wbtc': {
              address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
              symbol: 'WBTC',
              decimals: 8,
              balance: '5000000', // 0.05 WBTC
              formattedBalance: '0.05',
              usdValue: 2000,
              lastUpdated: now
            }
          }

          set((state) => {
            if (state.account) {
              if (tokenAddresses) {
                // Update only specific tokens (selective update)
                tokenAddresses.forEach(address => {
                  const mockKey = address === '0x0000000000000000000000000000000000000000' ? 'eth' : 'wbtc'
                  if (mockBalances[mockKey]) {
                    state.account!.balances[address.toLowerCase()] = mockBalances[mockKey]
                  }
                })
              } else {
                // Full refresh
                state.account.balances = mockBalances
                state.account.lastBalanceUpdate = now
              }
            }
          })

        } catch (error: unknown) {
          console.error('Error updating balances:', error)
          
          set((state) => {
            state.error = createWalletError(
              'Failed to update token balances',
              'balance',
              'BALANCE_UPDATE_FAILED'
            )
          })
        }
      },

      updateAccount: (accountUpdate: Partial<AccountInfo>) => {
        set((state) => {
          if (state.account) {
            Object.assign(state.account, accountUpdate)
          }
        })
      },

      setError: (error: WalletError | null) => {
        set((state) => {
          state.error = error
        })
      },

      clearError: () => {
        set((state) => {
          state.error = null
        })
      },

      setShowWalletModal: (show: boolean) => {
        set((state) => {
          state.showWalletModal = show
        })
      },

      setAutoConnect: (enabled: boolean) => {
        set((state) => {
          state.autoConnect = enabled
        })
      },

      setPreferredWallet: (walletType: WalletType | null) => {
        set((state) => {
          state.preferredWallet = walletType
        })
      },

      // Legacy compatibility actions
      setConnected: (connected: boolean, address?: string) => {
        set((state) => {
          if (connected && address) {
            state.status = 'connected'
            state.account = {
              address,
              balances: {},
              lastBalanceUpdate: Date.now()
            }
          } else {
            state.status = 'disconnected'
            state.account = null
          }
          state.isConnecting = false
        })
      },

      setConnecting: (connecting: boolean) => {
        set((state) => {
          state.isConnecting = connecting
          if (connecting) {
            state.status = 'connecting'
          }
        })
      },

      setNetwork: (chainId: number, isCorrect: boolean) => {
        set((state) => {
          const networkInfo = DEFAULT_NETWORKS[chainId]
          if (networkInfo) {
            state.network = networkInfo
          }
          state.isSwitchingNetwork = false
        })
      },

      setSwitchingNetwork: (switching: boolean) => {
        set((state) => {
          state.isSwitchingNetwork = switching
        })
      }
    })),
    {
      name: 'chaincrossing-wallet-store',
      storage: createJSONStorage(() => localStorage),
      
      // Only persist user preferences, not sensitive connection state
      partialize: (state) => ({
        autoConnect: state.autoConnect,
        preferredWallet: state.preferredWallet
      }),
      
      // Hydration handling
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset connection state on hydration
          state.status = 'disconnected'
          state.account = null
          state.network = null
          state.error = null
          state.isConnecting = false
          state.isReconnecting = false
          state.showWalletModal = false
          
          // Auto-reconnect if enabled and preferred wallet is set
          if (state.autoConnect && state.preferredWallet) {
            // Delay auto-reconnect to avoid hydration mismatch
            setTimeout(() => {
              walletAutoReconnect.attemptReconnect()
            }, 100)
          }
        }
      }
    }
  )
)

/**
 * Auto-reconnect functionality (external to store for better control)
 */
class WalletAutoReconnect {
  private static instance: WalletAutoReconnect
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 2000
  private isReconnecting = false
  
  static getInstance(): WalletAutoReconnect {
    if (!WalletAutoReconnect.instance) {
      WalletAutoReconnect.instance = new WalletAutoReconnect()
    }
    return WalletAutoReconnect.instance
  }
  
  async attemptReconnect(): Promise<void> {
    const state = useWalletStore.getState()
    
    if (
      this.isReconnecting || 
      state.status === 'connected' || 
      !state.preferredWallet ||
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      return
    }
    
    this.isReconnecting = true
    useWalletStore.setState({ isReconnecting: true })
    
    try {
      await state.connect(state.preferredWallet)
      this.reconnectAttempts = 0 // Reset on success
      console.log('Auto-reconnect successful')
    } catch (error) {
      this.reconnectAttempts++
      console.warn(`Reconnection attempt ${this.reconnectAttempts} failed:`, error)
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.attemptReconnect(), this.reconnectDelay * this.reconnectAttempts)
      } else {
        // Set error after max attempts
        useWalletStore.getState().setError(
          createWalletError(
            'Failed to reconnect after multiple attempts',
            'connection',
            'RECONNECT_FAILED'
          )
        )
      }
    } finally {
      this.isReconnecting = false
      useWalletStore.setState({ isReconnecting: false })
    }
  }
  
  reset(): void {
    this.reconnectAttempts = 0
    this.isReconnecting = false
  }
  
  getStatus() {
    return {
      isReconnecting: this.isReconnecting,
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    }
  }
}

export const walletAutoReconnect = WalletAutoReconnect.getInstance()

/**
 * Wallet store hooks for specific use cases
 */

// Connection status hooks
export const useWalletConnection = () => {
  return useWalletStore((state) => ({
    status: state.status,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    walletType: state.walletType,
    connect: state.connect,
    disconnect: state.disconnect
  }))
}

// Account information hooks
export const useWalletAccount = () => {
  return useWalletStore((state) => ({
    account: state.account,
    network: state.network,
    getTotalUsdValue: state.getTotalUsdValue,
    updateBalances: state.updateBalances
  }))
}

// Balance hooks
export const useTokenBalances = () => {
  return useWalletStore((state) => ({
    balances: state.account?.balances || {},
    getTokenBalance: state.getTokenBalance,
    updateBalances: state.updateBalances,
    lastUpdated: state.account?.lastBalanceUpdate
  }))
}

// Error handling hooks
export const useWalletError = () => {
  return useWalletStore((state) => ({
    error: state.error,
    hasError: !!state.error,
    errorCategory: state.error?.category,
    setError: state.setError,
    clearError: state.clearError
  }))
}

// UI state hooks
export const useWalletUI = () => {
  return useWalletStore((state) => ({
    showWalletModal: state.showWalletModal,
    setShowWalletModal: state.setShowWalletModal
  }))
}

// Settings hooks
export const useWalletSettings = () => {
  return useWalletStore((state) => ({
    autoConnect: state.autoConnect,
    preferredWallet: state.preferredWallet,
    setAutoConnect: state.setAutoConnect,
    setPreferredWallet: state.setPreferredWallet
  }))
}

/**
 * Enhanced utility hook that provides comprehensive wallet status
 */
export function useWalletStatus() {
  return useWalletStore((state) => ({
    status: state.status,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    isReconnecting: state.isReconnecting,
    hasError: !!state.error,
    errorCategory: state.error?.category,
    isCorrectNetwork: state.isCorrectNetwork,
    isSwitchingNetwork: state.isSwitchingNetwork,
    canConnect: state.status === 'disconnected' && !state.isConnecting && !state.isReconnecting,
    needsNetworkSwitch: state.status === 'connected' && !state.isCorrectNetwork
  }))
}

/**
 * Utility function to format wallet address
 */
export const formatWalletAddress = (address: string, length = 6): string => {
  if (!address) return ''
  if (address.length <= length * 2) return address
  return `${address.slice(0, length)}...${address.slice(-length)}`
}

/**
 * Utility function to get wallet display name
 */
export const getWalletDisplayName = (walletType: WalletType): string => {
  const names: Record<WalletType, string> = {
    metamask: 'MetaMask',
    walletconnect: 'WalletConnect',
    coinbase: 'Coinbase Wallet',
    injected: 'Injected Wallet',
    ledger: 'Ledger',
    trezor: 'Trezor'
  }
  return names[walletType] || walletType
}

/**
 * Utility function to get wallet icon based on wallet type
 */
export function getWalletIcon(walletType: WalletType): string {
  const iconMap: Record<WalletType, string> = {
    metamask: '🦊',
    walletconnect: '🔗',
    coinbase: '🔵',
    injected: '💼',
    ledger: '📘',
    trezor: '⚡'
  }
  return iconMap[walletType] || '💼'
}