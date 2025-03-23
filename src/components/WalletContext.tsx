import React, { createContext, useContext, useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, getCurrentWalletInfo } from '@/services/api';
import type { WalletInfo } from '@/types/wallet';

interface WalletContextType {
  walletInfo: WalletInfo | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check if wallet is already connected
    const checkWallet = async () => {
      const currentWallet = await getCurrentWalletInfo();
      if (currentWallet) {
        setWalletInfo(currentWallet);
      }
    };
    checkWallet();
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    try {
      const wallet = await connectWallet('internetComputer');
      if (wallet) {
        setWalletInfo(wallet);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await disconnectWallet();
      setWalletInfo(null);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  return (
    <WalletContext.Provider value={{ walletInfo, isConnecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 