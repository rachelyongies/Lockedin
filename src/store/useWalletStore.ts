import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WalletState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  address?: string;
  
  // Network state
  chainId?: number;
  isCorrectNetwork: boolean;
  isSwitchingNetwork: boolean;
  
  // Actions
  setConnected: (connected: boolean, address?: string) => void;
  setConnecting: (connecting: boolean) => void;
  setNetwork: (chainId: number, isCorrect: boolean) => void;
  setSwitchingNetwork: (switching: boolean) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      // Initial state
      isConnected: false,
      isConnecting: false,
      address: undefined,
      chainId: undefined,
      isCorrectNetwork: true,
      isSwitchingNetwork: false,
      
      // Actions
      setConnected: (connected, address) =>
        set({ isConnected: connected, address, isConnecting: false }),
      
      setConnecting: (connecting) =>
        set({ isConnecting: connecting }),
      
      setNetwork: (chainId, isCorrect) =>
        set({ chainId, isCorrectNetwork: isCorrect, isSwitchingNetwork: false }),
      
      setSwitchingNetwork: (switching) =>
        set({ isSwitchingNetwork: switching }),
      
      disconnect: () =>
        set({
          isConnected: false,
          isConnecting: false,
          address: undefined,
          chainId: undefined,
          isCorrectNetwork: true,
          isSwitchingNetwork: false,
        }),
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({
        // Only persist essential state, not loading states
        isConnected: state.isConnected,
        address: state.address,
        chainId: state.chainId,
        isCorrectNetwork: state.isCorrectNetwork,
      }),
    }
  )
);