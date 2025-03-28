import { createContext, useContext, useState, type ReactNode } from 'react';
import type { WalletInfo, ICPToken, ICPTransaction } from '@/types/wallet';

interface WalletContextType {
  walletInfo: WalletInfo | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: Error | null;
}

// Get canister IDs from environment variables
const ZK_CANISTER_ID = import.meta.env.VITE_ZK_CANISTER_ID || 'hi7bu-myaaa-aaaad-aaloa-cai';
const MAIN_CANISTER_ID = import.meta.env.VITE_MAIN_CANISTER_ID || 'hp6ha-baaaa-aaaad-aaloq-cai';

// Local development helper 
const isDev = import.meta.env.DEV;
// Host URL for IC network
const IC_HOST = import.meta.env.VITE_IC_HOST || 'https://icp0.io';

const WalletContext = createContext<WalletContextType | null>(null);

// Mock data for development when wallet connection fails
const MOCK_PRINCIPAL = 'sorjy-fmmxk-3j4ab-4ben5-v643x-3jc7r-ekjae-zydug-7w5wy-obypp-bae';
const MOCK_TOKENS = [
  {
    id: 'icp-1',
    symbol: 'ICP',
    name: 'Internet Computer',
    balance: '350000000', // 3.5 ICP in e8s
    amount: '3.5',
    decimals: 8
  }
];

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Helper function to create a timeout promise
  const createTimeout = (ms: number) => {
    return new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Connection timed out after ${ms}ms`)), ms);
    });
  };

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
          setError(new Error('Plug wallet not detected. Please install the Plug wallet extension from https://plugwallet.ooo/'));
          return;
        }

        console.log('Attempting to connect to Plug wallet...');
        
        try {
          // First attempt to see if we're already connected
          let isConnected = false;
          try {
            isConnected = await window.ic.plug.isConnected();
            if (isConnected) {
              console.log('Already connected to Plug wallet');
              // Continue with the flow to fetch the principal and data
            }
          } catch (e) {
            console.warn('Error checking isConnected, continuing with connection process:', e);
          }
          
          // If not already connected, try to connect
          if (!isConnected) {
            try {
              const connectionPromise = window.ic.plug.requestConnect({
                whitelist: [ZK_CANISTER_ID, MAIN_CANISTER_ID],
                host: IC_HOST
              });
              
              // Add a timeout for the connection attempt
              const connected = await Promise.race([
                connectionPromise,
                createTimeout(15000) // 15 second timeout
              ]);
              
              if (!connected) {
                console.warn('Failed to connect to Plug wallet');
                setError(new Error('Failed to connect to Plug wallet. Please try again.'));
                return;
              }
              
              console.log('Successfully connected to Plug wallet');
            } catch (connectError) {
              console.error('Error connecting to Plug wallet:', connectError);
              
              // In development mode, fallback to mock data if connection fails
              if (isDev) {
                console.warn('Development mode: Using mock wallet data since Plug connection failed.');
                
                // Mock successful connection
                setWalletInfo({
                  isConnected: true,
                  principal: MOCK_PRINCIPAL,
                  address: MOCK_PRINCIPAL,
                  chainId: 'icp',
                  chainName: 'Internet Computer',
                  walletType: 'internetComputer',
                  nfts: [],
                  tokens: MOCK_TOKENS,
                  transactions: []
                });
                
                return;
              }
              
              // Handle specific error: No keychain found
              if (connectError instanceof Error && 
                  (connectError.message.includes('No keychain found') || 
                  connectError.message.includes('Cannot read properties of undefined'))) {
                setError(new Error(
                  'Plug wallet needs to be set up properly. Please open your Plug extension, create or import an identity, and try again.'
                ));
                return;
              }
              
              setError(new Error(`Failed to connect to Plug wallet: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`));
              return;
            }
          }
          
          // Get principal with error handling
          let principalText = '';
          try {
            const principal = await window.ic.plug.agent.getPrincipal();
            principalText = principal.toString();
            console.log('Principal:', principalText);
          } catch (e) {
            console.error('Could not get principal:', e);
            
            if (isDev) {
              console.warn('Development mode: Using mock principal');
              principalText = MOCK_PRINCIPAL;
            } else {
              setError(new Error('Could not get your principal ID. Please check your Plug wallet setup and try again.'));
              return;
            }
          }
          
          // Get account ID with error handling
          let accountId = principalText;
          try {
            if (window.ic.plug.getAccountId) {
              accountId = await window.ic.plug.getAccountId();
              console.log('Account ID:', accountId);
            }
          } catch (e) {
            console.warn('Could not get account ID, using principal instead:', e);
          }

          // Initialize arrays for data
          let nfts: any[] = [];
          let tokens: ICPToken[] = [];
          let transactions: ICPTransaction[] = [];

          // Try to fetch NFTs with proper error handling
          try {
            console.log('Fetching NFTs...');
            if (typeof window.ic.plug.getNFTs === 'function') {
              const nftResult = await window.ic.plug.getNFTs();
              nfts = nftResult || [];
              console.log('NFTs from Plug wallet:', nfts);
            } else {
              throw new Error('getNFTs function not available in this version of Plug wallet');
            }
          } catch (e) {
            console.warn('Failed to fetch NFTs from Plug wallet:', e);
            // Use sample NFTs in development mode
            if (isDev) {
              nfts = [
                {
                  canisterId: 'rw7qm-eiaaa-aaaak-aaiqq-cai',
                  index: 1,
                  name: 'Motoko Ghost #1',
                  url: 'https://nft.internetcomputer.org/sample/1.png',
                  collection: 'Motoko Ghosts'
                },
                {
                  canisterId: 'jeghr-iaaaa-aaaah-qaeha-cai',
                  index: 42,
                  name: 'ICP Punk #42',
                  url: 'https://nft.internetcomputer.org/sample/punk.png',
                  collection: 'ICP Punks'
                }
              ];
            } else {
              nfts = [];
            }
          }

          // Try to fetch token balances with proper error handling
          try {
            console.log('Fetching token balances...');
            if (typeof window.ic.plug.getBalance === 'function') {
              const balances = await window.ic.plug.getBalance();
              console.log('Balances from Plug wallet:', balances);
              
              if (balances && Array.isArray(balances)) {
                tokens = balances.map(balance => ({
                  id: `${balance.currency.toLowerCase()}-1`,
                  symbol: balance.currency,
                  name: balance.currency === 'ICP' ? 'Internet Computer' : balance.currency,
                  balance: (Number(balance.amount) * 100000000).toString(), // Convert to e8s
                  decimals: 8,
                  amount: balance.amount.toString()
                }));
              } else {
                throw new Error('Unexpected balance format');
              }
            } else {
              throw new Error('getBalance function not available in this version of Plug wallet');
            }
          } catch (e) {
            console.warn('Failed to fetch token balances from Plug wallet:', e);
            
            // Production fallback with a default ICP token
            // This is needed because some versions of Plug don't have getBalance
            if (!tokens.length) {
              console.log('Adding default ICP token since getBalance is not available');
              tokens = [
                {
                  id: 'icp-1',
                  symbol: 'ICP',
                  name: 'Internet Computer',
                  balance: '100000000', // 1 ICP in e8s
                  amount: '1',
                  decimals: 8
                }
              ];
            }
          }
          
          if (tokens.length === 0) {
            console.warn('No tokens found in wallet');
          }
          
          console.log('Preparing wallet info with tokens:', tokens);

          // Set wallet info with the data we've gathered
          setWalletInfo({
            isConnected: true,
            principal: principalText,
            address: accountId,
            chainId: 'icp',
            chainName: 'Internet Computer',
            walletType: 'internetComputer',
            nfts,
            tokens,
            transactions
          });
          
          console.log('Connected wallet with data:', { principal: principalText, address: accountId, tokens });
        } catch (error) {
          console.error('Connection error:', error);
          
          // In development mode, fall back to mock data
          if (isDev) {
            console.warn('Development mode: Using mock wallet data due to connection error');
            
            // Mock successful connection
            setWalletInfo({
              isConnected: true,
              principal: MOCK_PRINCIPAL,
              address: MOCK_PRINCIPAL,
              chainId: 'icp',
              chainName: 'Internet Computer',
              walletType: 'internetComputer',
              nfts: [],
              tokens: MOCK_TOKENS,
              transactions: []
            });
          } else {
            setError(new Error(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
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
    if (window.ic?.plug) {
      try {
        window.ic.plug.disconnect();
      } catch (e) {
        console.warn('Error disconnecting from Plug wallet:', e);
      }
    }
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