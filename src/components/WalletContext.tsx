import { createContext, useContext, useState, type ReactNode } from 'react';
import type { WalletInfo } from '@/lib/wallet';

interface WalletContextType {
  walletInfo: WalletInfo | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: Error | null;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Check if wallet was previously connected
      const currentWallet = await window.ic?.plug?.getPrincipal();
      if (currentWallet) {
        const walletData: WalletInfo = {
          isConnected: true,
          address: currentWallet.toString(),
          principal: currentWallet.toString(),
          walletType: 'internetComputer',
          chainId: 'icp',
          chainName: 'Internet Computer'
        };
        setWalletInfo(walletData);
        return;
      }

      // Connect to wallet
      const connected = await window.ic?.plug?.requestConnect({
        whitelist: [],
        host: 'https://ic0.app'
      });

      if (!connected) throw new Error('Failed to connect wallet');

      const principal = await window.ic?.plug?.getPrincipal();
      if (!principal) throw new Error('Failed to get principal');

      const walletData: WalletInfo = {
        isConnected: true,
        address: principal.toString(),
        principal: principal.toString(),
        walletType: 'internetComputer',
        chainId: 'icp',
        chainName: 'Internet Computer'
      };
      setWalletInfo(walletData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect wallet'));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setWalletInfo(null);
    setError(null);
  };

  return (
    <WalletContext.Provider value={{ walletInfo, connect, disconnect, isConnecting, error }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
} 