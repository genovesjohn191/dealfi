import { create } from 'zustand';
import { User } from './types';
import { ethers } from 'ethers';

interface Web3State {
  address: string | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  updateBalance: (balance: string) => void;
}

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUserRole: (role: User['role']) => void;
  completeOnboarding: () => void;
}

export const useWeb3Store = create<Web3State>((set) => ({
  address: null,
  balance: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: async () => {
    set({ isConnecting: true, error: null });
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to connect your wallet');
      }

      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      // Get balance
      const balance = await provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);

      set({
        address,
        balance: balanceInEth,
        isConnected: true,
        isConnecting: false
      });

      // Listen for account changes
      window.ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length === 0) {
          set({ address: null, balance: null, isConnected: false });
        } else {
          const newAddress = accounts[0];
          const newBalance = await provider.getBalance(newAddress);
          set({ 
            address: newAddress,
            balance: ethers.formatEther(newBalance)
          });
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

      // Listen for disconnect
      window.ethereum.on('disconnect', () => {
        set({ address: null, balance: null, isConnected: false });
      });

    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
        isConnecting: false
      });
    }
  },
  disconnect: () => {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
      window.ethereum.removeAllListeners('disconnect');
    }
    set({
      address: null,
      balance: null,
      isConnected: false,
      error: null
    });
  },
  updateBalance: (balance) => set({ balance })
}));

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateUserRole: (role) => 
    set((state) => ({
      user: state.user ? { ...state.user, role } : null
    })),
  completeOnboarding: () =>
    set((state) => ({
      user: state.user ? { ...state.user, onboarded: true } : null
    }))
}));