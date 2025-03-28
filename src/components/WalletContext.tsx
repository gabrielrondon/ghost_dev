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

      // Detect wallet type from URL params if present
      const urlParams = new URLSearchParams(window.location.search);
      const walletType = urlParams.get('wallet') as 'internetComputer' | 'ethereum' || 'internetComputer';

      if (walletType === 'internetComputer') {
        // Check if Plug wallet is installed
        if (!window.ic?.plug) {
          setError(new Error('Plug wallet not detected. Please install Plug wallet extension.'));
          return;
        }

        try {
          // Connect to Plug wallet
          const connected = await window.ic.plug.requestConnect({
            whitelist: [],
          });

          if (!connected) {
            setError(new Error('Failed to connect to Plug wallet'));
            return;
          }

          // Get agent principal
          const principal = await window.ic.plug.agent.getPrincipal();
          const principalText = principal.toString();

          // Try to fetch NFTs, but catch any errors to prevent blocking the flow
          let nfts = [];
          try {
            nfts = await window.ic.plug.getNFTs() || [];
            console.log('NFTs from Plug wallet:', nfts);
          } catch (e) {
            console.warn('Failed to fetch NFTs from Plug wallet', e);
            // Use mock NFTs for testing
            nfts = [
              {
                canisterId: 'rw7qm-eiaaa-aaaak-aaiqq-cai',
                index: 1,
                name: 'Motoko Ghost #1',
                url: 'https://nft.internetcomputer.org/sample/1.png',
                collection: 'Motoko Ghosts'
              }
            ];
          }

          // Mock token data for development
          const mockTokens = [
            {
              id: 'icp-1',
              symbol: 'ICP',
              name: 'Internet Computer',
              balance: '1500000000',
              decimals: 8,
              amount: '15.00',
              usdValue: 6.42
            },
            {
              id: 'ckbtc-1',
              symbol: 'ckBTC',
              name: 'Chain Key Bitcoin',
              balance: '2500000',
              decimals: 8,
              amount: '0.025',
              usdValue: 1200
            }
          ];

          // Mock transaction data for development
          const mockTransactions = [
            {
              id: 'tx-1',
              type: 'receive' as const,
              amount: '5.00',
              token: 'ICP',
              timestamp: Date.now().toString(),
              blockHeight: '12345',
              from: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
              to: principalText,
              status: 'completed' as const
            },
            {
              id: 'tx-2',
              type: 'send' as const,
              amount: '2.50',
              token: 'ICP',
              timestamp: (Date.now() - 86400000).toString(),
              blockHeight: '12340',
              from: principalText,
              to: 'qoctq-giaaa-aaaaa-aaaea-cai',
              status: 'completed' as const
            }
          ];

          setWalletInfo({
            isConnected: true,
            principal: principalText,
            address: principalText,
            chainId: 'icp',
            chainName: 'Internet Computer',
            walletType: 'internetComputer',
            nfts,
            tokens: mockTokens,
            transactions: mockTransactions
          });
        } catch (e) {
          console.error('Error connecting to IC wallet:', e);
          setError(new Error(`Failed to connect to IC wallet: ${e instanceof Error ? e.message : 'Unknown error'}`));
        }
      } else {
        setError(new Error('Ethereum wallets not supported in this version'));
      }
    } catch (error) {
      console.error('Connection error:', error);
      setError(new Error(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`));
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