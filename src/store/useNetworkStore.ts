import { create } from 'zustand';

export interface NetworkStatus {
  name: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastChecked: number;
  isReadyForBridging: boolean;
  blockHeight?: number;
  latency?: number;
}

export interface NetworkState {
  ethereum: NetworkStatus;
  bitcoin: NetworkStatus;
  environment: 'mainnet' | 'testnet';
}

interface NetworkActions {
  // Update network status
  updateNetworkStatus: (network: 'ethereum' | 'bitcoin', status: NetworkStatus) => void;
  
  // Check network health
  checkNetworkHealth: (network: 'ethereum' | 'bitcoin') => Promise<void>;
  
  // Set environment
  setEnvironment: (environment: 'mainnet' | 'testnet') => void;
  
  // Get network readiness for bridging
  isNetworkReady: (network: 'ethereum' | 'bitcoin') => boolean;
  
  // Get both networks ready status
  areNetworksReady: () => boolean;
}

export const useNetworkStore = create<NetworkState & NetworkActions>((set, get) => ({
  // Initial state
  ethereum: {
    name: 'Ethereum',
    status: 'disconnected',
    lastChecked: Date.now(),
    isReadyForBridging: false,
  },
  bitcoin: {
    name: 'Bitcoin',
    status: 'disconnected',
    lastChecked: Date.now(),
    isReadyForBridging: false,
  },
  environment: process.env.NEXT_PUBLIC_ENABLE_TESTNET === 'true' ? 'testnet' : 'mainnet',

  // Actions
  updateNetworkStatus: (network, status) => {
    set((state) => ({
      [network]: {
        ...state[network],
        ...status,
        lastChecked: Date.now(),
      }
    }));
  },

  checkNetworkHealth: async (network) => {
    const state = get();
    const currentNetwork = state[network];
    
    // Set connecting status
    set((state) => ({
      [network]: {
        ...state[network],
        status: 'connecting',
        lastChecked: Date.now(),
      }
    }));

    try {
      // Simulate network health check
      // In a real implementation, this would ping RPC endpoints
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, simulate successful connection
      const isHealthy = Math.random() > 0.1; // 90% success rate
      
      if (isHealthy) {
        set((state) => ({
          [network]: {
            ...state[network],
            status: 'connected',
            isReadyForBridging: true,
            lastChecked: Date.now(),
            blockHeight: Math.floor(Math.random() * 1000000) + 1000000,
            latency: Math.floor(Math.random() * 100) + 50,
          }
        }));
      } else {
        set((state) => ({
          [network]: {
            ...state[network],
            status: 'error',
            isReadyForBridging: false,
            lastChecked: Date.now(),
          }
        }));
      }
    } catch (error) {
      set((state) => ({
        [network]: {
          ...state[network],
          status: 'error',
          isReadyForBridging: false,
          lastChecked: Date.now(),
        }
      }));
    }
  },

  setEnvironment: (environment) => {
    set({ environment });
  },

  isNetworkReady: (network) => {
    const state = get();
    return state[network].status === 'connected' && state[network].isReadyForBridging;
  },

  areNetworksReady: () => {
    const state = get();
    return state.ethereum.isReadyForBridging && state.bitcoin.isReadyForBridging;
  },
}));

// Auto-check network health on mount
if (typeof window !== 'undefined') {
  const store = useNetworkStore.getState();
  
  // Check networks every 30 seconds
  setInterval(() => {
    store.checkNetworkHealth('ethereum');
    store.checkNetworkHealth('bitcoin');
  }, 30000);
  
  // Initial check
  setTimeout(() => {
    store.checkNetworkHealth('ethereum');
    store.checkNetworkHealth('bitcoin');
  }, 1000);
} 