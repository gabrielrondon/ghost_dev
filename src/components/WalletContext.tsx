import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { WalletInfo, ICPToken, ICPTransaction } from '@/types/wallet';
import toast from 'react-hot-toast';
import { getICPTokenData, ICP_LEDGER_CANISTER_ID } from '@/services/ledger';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';

// Constants
const ZK_CANISTER_ID = import.meta.env.VITE_ZK_CANISTER_ID || 'hjhzy-qyaaa-aaaak-qc3nq-cai';
const MAIN_CANISTER_ID = import.meta.env.VITE_MAIN_CANISTER_ID || 'hrf2i-lyaaa-aaaak-qc3na-cai';

// Sample NFTs for development/testing
const SAMPLE_NFTS = [
  { canister: 'qoctq-giaaa-aaaaa-aaaea-cai', index: 1, name: 'Sample NFT 1', url: 'https://nftpng.net/img1.png' },
  { canister: 'qoctq-giaaa-aaaaa-aaaea-cai', index: 2, name: 'Sample NFT 2', url: 'https://nftpng.net/img2.png' }
];

// Mock tokens for development/testing
const MOCK_TOKENS: ICPToken[] = [
  {
    id: 'icp-mock',
    symbol: 'ICP',
    name: 'Internet Computer',
    balance: '500000000', // 5 ICP in e8s
    amount: '5',
    decimals: 8
  },
  {
    id: 'xtc-mock',
    symbol: 'XTC',
    name: 'Cycles Token',
    balance: '1000000000', // 10 XTC
    amount: '10',
    decimals: 8
  }
];

// Determine if we're in development mode
const isDev = import.meta.env.DEV === true;

interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<any>;
  disconnect: () => Promise<void>;
  error: Error | null;
  walletInfo: WalletInfo | null;
}

// Define the shape of wallet data returned from connect
interface WalletData {
  principal: string;
  accountId: string;
  nfts: any[];
  tokens: ICPToken[];
  usingMockData: boolean;
}

interface ICPlug {
  requestConnect: (options: { whitelist: string[]; host?: string }) => Promise<boolean>;
  getPrincipal: () => Promise<Principal>;
  getNFTs?: () => Promise<any[]>;
  createActor: <T>(options: { canisterId: string; interfaceFactory: IDL.InterfaceFactory }) => Promise<T>;
  isConnected?: () => Promise<boolean>;
  createAgent?: (options: { whitelist: string[]; host?: string }) => Promise<any>;
  agent?: any;
  getAccountId?: () => Promise<string>;
  disconnect?: () => Promise<void>;
  getBalance?: () => Promise<any[]>;
}

const defaultWalletContext: WalletContextType = {
  isConnected: false,
  isConnecting: false,
  connect: async () => null,
  disconnect: async () => {},
  error: null,
  walletInfo: null
};

const WalletContext = createContext<WalletContextType>(defaultWalletContext);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Function to refresh wallet data
  const refreshData = async () => {
    console.log('Refreshing wallet data...');
    // This function would typically update token balances, transactions, etc.
    // For now it's just a placeholder
  };

  const connect = async () => {
    if (!('ic' in window && 'plug' in (window as any).ic)) {
      toast.error('Plug wallet not found. Please install the Plug extension first.');
      return null;
    }

    // Use type assertion to access Plug methods
    const plug = (window as any).ic.plug as ICPlug;

    setIsConnecting(true);
    setError(null);
    
    try {
      let isConnected = false;
      
      // Check if we're already connected
      try {
        if (plug.isConnected) {
          isConnected = await plug.isConnected();
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
      
      // If not connected, request connection
      if (!isConnected) {
        const canisterIds = [
          ZK_CANISTER_ID,
          MAIN_CANISTER_ID,
          ICP_LEDGER_CANISTER_ID
        ];
        
        console.log('Requesting connection with whitelist:', canisterIds);
        
        isConnected = await plug.requestConnect({
          whitelist: canisterIds,
          host: import.meta.env.VITE_IC_HOST || 'https://icp0.io'
        });
        
        if (!isConnected) {
          throw new Error('Failed to connect to wallet');
        }
      }
      
      // Get principal
      const principal = await plug.getPrincipal();
      const principalText = principal.toString();
      
      // Initialize variables for NFTs and tokens
      let nfts: any[] = [];
      let tokens: ICPToken[] = [];
      let usingMockTokens = false;
      
      // Try to fetch NFTs if the function exists
      try {
        if (plug.getNFTs) {
          console.log('Attempting to fetch NFTs...');
          nfts = await plug.getNFTs();
          console.log('Successfully fetched NFTs:', nfts);
        } else {
          console.log('getNFTs function not available in this version of Plug');
          if (isDev) {
            nfts = SAMPLE_NFTS;
          }
        }
      } catch (nftError) {
        console.error('Failed to fetch NFTs:', nftError);
        if (isDev) {
          nfts = SAMPLE_NFTS;
        }
      }
      
      // Try to fetch token balances if the function exists
      try {
        if (plug.getBalance) {
          console.log('Attempting to fetch token balances...');
          const balances = await plug.getBalance();
          
          // Map wallet balances to our token format
          tokens = balances.map(balance => ({
            id: `${balance.symbol.toLowerCase()}-${Math.random().toString(36).substring(2, 9)}`,
            symbol: balance.symbol,
            name: balance.name,
            balance: balance.amount.toString(),
            amount: (Number(balance.amount) / 10**8).toString(),
            decimals: 8
          }));
          
          console.log('Successfully fetched token balances:', tokens);
        } else {
          console.log('getBalance function not available in this version of Plug');
          throw new Error('getBalance function not available');
        }
      } catch (tokenError) {
        console.error('Failed to fetch token balances:', tokenError);

        // Try to fetch ICP balance directly from the ledger canister
        try {
          console.log('Attempting to fetch balance directly from ICP ledger canister...');
          
          // Create an agent specifically for the ledger with the right canister ID
          if (!plug.agent) {
            console.log('Creating new agent for ledger interactions');
            if (plug.createAgent) {
              await plug.createAgent({ 
                whitelist: [
                  ICP_LEDGER_CANISTER_ID,
                  ZK_CANISTER_ID,
                  MAIN_CANISTER_ID
                ], 
                host: import.meta.env.VITE_IC_HOST || 'https://icp0.io'
              });
            } else {
              throw new Error('createAgent function not available');
            }
          } else {
            console.log('Using existing agent for ledger interactions');
          }
          
          // Get real ICP token data from the ledger
          console.log(`Getting token data for principal: ${principalText}`);
          const icpToken = await getICPTokenData(principalText);
          tokens = [icpToken];
          
          console.log('Successfully fetched ICP balance from ledger:', icpToken);
          toast.success('Successfully connected to your wallet');
        } catch (ledgerError) {
          console.error('Failed to fetch balance from ledger:', ledgerError);
          let errorDetail = '';
          
          if (ledgerError instanceof Error) {
            errorDetail = ledgerError.message;
            
            // Check specific error types
            if (errorDetail.includes('Canister') && errorDetail.includes('not found')) {
              console.error('Missing canister error: Ensure the ledger canister is in the whitelist');
              toast.error('Missing canister access. Please disconnect and try again');
            } else if (errorDetail.includes('Failed to fetch') || errorDetail.includes('network error')) {
              console.error('Network error: Cannot connect to the IC network');
              toast.error('Network connectivity issue. Please check your connection');
            }
          }
          
          if (isDev) {
            // Use mock tokens in development mode
            tokens = MOCK_TOKENS;
            usingMockTokens = true;
            toast.error('Using mock tokens for development');
          } else if (tokens.length === 0) {
            // Fallback in production with a minimal token entry
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
            usingMockTokens = true;
            toast.error('Using placeholder token balance due to: ' + (errorDetail || 'Unknown error'));
          }
        }
      }
      
      // Get accountId if the function exists
      let accountId = '';
      try {
        if (plug.getAccountId) {
          accountId = await plug.getAccountId();
          console.log('Account ID:', accountId);
        }
      } catch (error) {
        console.error('Failed to get account ID:', error);
      }
      
      // Prepare the wallet data
      const walletData: WalletData = {
        principal: principalText,
        accountId,
        nfts,
        tokens,
        usingMockData: usingMockTokens,
      };
      
      console.log('Wallet data prepared:', walletData);
      
      // Update the context state
      setWalletInfo({
        isConnected: true,
        principal: principalText,
        address: accountId || principalText,
        chainId: 'icp',
        chainName: 'Internet Computer',
        walletType: 'internetComputer',
        tokens,
        transactions: []
      });
      
      // Save connection state
      localStorage.setItem('wallet_connected', 'true');
      
      // Trigger data refresh after connection
      await refreshData();
      
      // Return the wallet data
      return walletData;
    } catch (error) {
      console.error('Connection error:', error);
      setError(error instanceof Error ? error : new Error('Unknown connection error'));
      toast.error(error instanceof Error ? error.message : 'Failed to connect to wallet');
      setWalletInfo(null);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      if ('ic' in window && 'plug' in (window as any).ic) {
        const plug = (window as any).ic.plug as ICPlug;
        if (plug.disconnect) {
          await plug.disconnect();
        }
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
    
    // Clear wallet state
    setWalletInfo(null);
    localStorage.removeItem('wallet_connected');
    toast.success('Wallet disconnected');
  };

  // Context value
  const contextValue = {
    isConnected: !!walletInfo?.isConnected,
    isConnecting,
    connect,
    disconnect,
    error,
    walletInfo
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext); 