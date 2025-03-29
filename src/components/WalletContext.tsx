import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { WalletInfo, ICPToken, ICPTransaction } from '@/types/wallet';
import toast from 'react-hot-toast';
import { getICPTokenData } from '@/services/ledger';
import { ICP_LEDGER_CANISTER_ID } from '@/constants';
import { 
  connectToStoicWallet, 
  disconnectFromStoicWallet, 
  getStoicBalances,
  type StoicConnectionResult
} from '@/services/stoic-wallet';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { type WalletType } from './WalletSelector';
import { AuthClient } from '@dfinity/auth-client';
import { checkForPlugWallet, getConnectionProtocol } from '@/utils/wallet-utils';

// Constants
const ZK_CANISTER_ID = import.meta.env.VITE_ZK_CANISTER_ID || 'hjhzy-qyaaa-aaaak-qc3nq-cai';
const MAIN_CANISTER_ID = import.meta.env.VITE_MAIN_CANISTER_ID || 'hrf2i-lyaaa-aaaak-qc3na-cai';
const CONNECTION_CHECK_INTERVAL = 10000; // 10 seconds

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

// Helper function to detect Plug wallet version
const detectPlugVersion = async (): Promise<string> => {
  try {
    const plug = (window as any).ic.plug;
    
    // Check for version info if available
    if (plug.VERSION || plug.version) {
      return plug.VERSION || plug.version;
    }
    
    // Detect by available methods
    if (typeof plug.isConnected === 'function') {
      return 'modern';
    }
    
    return 'legacy';
  } catch (error) {
    console.error('Error detecting Plug version:', error);
    return 'unknown';
  }
};

// Retry wrapper function for wallet operations
const withRetry = async <T,>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
  operationName = 'operation'
): Promise<T> => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${attempt + 1} for ${operationName} failed:`, error);
      lastError = error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`All ${maxRetries} attempts for ${operationName} failed`);
  throw lastError;
};

// Export the context type for use in test files
export interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connect: (walletType?: WalletType) => Promise<any>;
  disconnect: () => Promise<void>;
  error: Error | null;
  walletInfo: WalletInfo | null;
  activeWallet: WalletType | null;
}

// Define the shape of wallet data returned from connect
interface WalletData {
  principal: string;
  accountId: string;
  nfts: any[];
  tokens: ICPToken[];
  usingMockData: boolean;
  walletType: WalletType;
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
  VERSION?: string;
  version?: string;
}

const defaultWalletContext: WalletContextType = {
  isConnected: false,
  isConnecting: false,
  connect: async () => null,
  disconnect: async () => {},
  error: null,
  walletInfo: null,
  activeWallet: null
};

const WalletContext = createContext<WalletContextType>(defaultWalletContext);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionCheckerInterval, setConnectionCheckerInterval] = useState<number | null>(null);
  const [activeWallet, setActiveWallet] = useState<WalletType | null>(null);

  // Function to refresh wallet data
  const refreshData = async () => {
    console.log('Refreshing wallet data...');
    // This function would typically update token balances, transactions, etc.
    // For now it's just a placeholder
  };

  // Function to check connection status periodically for Plug
  const startConnectionMonitoring = (plug: ICPlug) => {
    // Clear any existing interval
    if (connectionCheckerInterval) {
      window.clearInterval(connectionCheckerInterval);
    }
    
    // Set up new monitoring interval
    const intervalId = window.setInterval(async () => {
      try {
        // Only check if the plug object has the isConnected method
        if (typeof plug.isConnected === 'function') {
          const connected = await plug.isConnected();
          if (!connected && walletInfo?.isConnected) {
            console.warn('Wallet disconnected unexpectedly');
            setWalletInfo(null);
            setActiveWallet(null);
            toast.error('Wallet disconnected. Please reconnect.');
            window.clearInterval(intervalId);
            setConnectionCheckerInterval(null);
          }
        }
      } catch (error) {
        console.error('Error checking connection status:', error);
      }
    }, CONNECTION_CHECK_INTERVAL);
    
    setConnectionCheckerInterval(intervalId);
    
    return () => {
      window.clearInterval(intervalId);
      setConnectionCheckerInterval(null);
    };
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (connectionCheckerInterval) {
        window.clearInterval(connectionCheckerInterval);
      }
    };
  }, [connectionCheckerInterval]);

  // Connect to Stoic Wallet
  const connectStoic = async (silentMode = false): Promise<WalletData | null> => {
    try {
      console.log('Connecting to Stoic wallet...');
      
      // Connect to Stoic wallet
      const connectionResult = await connectToStoicWallet();
      
      if (!connectionResult) {
        throw new Error('Failed to connect to Stoic wallet');
      }
      
      const { principal, agent } = connectionResult;
      const principalText = principal.toString();
      console.log('Connected to Stoic wallet with principal:', principalText);
      
      // Fetch ICP token data directly from ledger
      let tokens: ICPToken[] = [];
      let usingMockData = false;
      
      try {
        // Get token data from ledger canister
        const icpToken = await getICPTokenData(principalText);
        tokens = [icpToken];
        console.log('Successfully fetched token balance:', icpToken);
      } catch (error) {
        console.error('Failed to fetch token balance:', error);
        
        if (isDev) {
          tokens = MOCK_TOKENS;
          usingMockData = true;
          console.warn('Using mock tokens in development mode');
        } else {
          throw error;
        }
      }
      
      // Return wallet data
      const walletData: WalletData = {
        principal: principalText,
        accountId: principalText, // Stoic doesn't provide a standard account ID
        nfts: [],
        tokens,
        usingMockData,
        walletType: 'stoic'
      };
      
      // Update context state
      setWalletInfo({
        isConnected: true,
        principal: principalText,
        address: principalText,
        chainId: 'icp',
        chainName: 'Internet Computer',
        walletType: 'stoic',
        tokens,
        transactions: []
      });
      
      // Set active wallet
      setActiveWallet('stoic');
      
      // Save connection state
      localStorage.setItem('wallet_connected', 'true');
      localStorage.setItem('wallet_type', 'stoic');
      
      if (!silentMode) {
        toast.success('Successfully connected to Stoic wallet');
      }
      
      return walletData;
    } catch (error) {
      console.error('Error connecting to Stoic wallet:', error);
      
      if (!silentMode) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error('Failed to connect to Stoic wallet');
        }
      }
      
      throw error;
    }
  };

  // Connect to Plug Wallet
  const connectPlug = async (silentMode = false): Promise<WalletData | null> => {
    try {
      console.log('Connecting to Plug wallet...');
      
      // Check if Plug is available using the utility function
      const plugExists = await checkForPlugWallet();
      
      if (!plugExists) {
        if (!silentMode) {
          toast.error('Plug wallet not detected. Please install the Plug extension.');
        }
        throw new Error('Plug wallet not detected');
      }
      
      // Get connection protocol info
      const { useHttps, host } = getConnectionProtocol();
      console.log(`Connecting to Plug with host: ${host}, using HTTPS: ${useHttps}`);
      
      // Use type assertion to access Plug methods
      const plug = (window as any).ic.plug as ICPlug;
      
      // Detect Plug wallet version to apply appropriate strategy
      const plugVersion = await detectPlugVersion();
      console.log('Detected Plug Version:', plugVersion);
      
      let isConnected = false;
      
      // Check if we're already connected based on version
      try {
        if (typeof plug.isConnected === 'function') {
          isConnected = await withRetry(
            async () => {
              const connected = await plug.isConnected!();
              console.log('Plug connection check:', connected ? 'Connected' : 'Not connected');
              return connected;
            },
            3,
            500,
            'isConnected check'
          );
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
        ].filter(Boolean);
        
        console.log('Requesting connection with whitelist:', canisterIds);
        
        isConnected = await withRetry(
          () => plug.requestConnect({
            whitelist: canisterIds,
            host: useHttps ? 'https://icp0.io' : 'http://localhost:8000'
          }),
          3,
          1000,
          'requestConnect'
        );
        
        if (!isConnected) {
          throw new Error('Failed to connect to wallet');
        }
      }
      
      // Get principal with retry
      const principal = await withRetry(
        () => plug.getPrincipal(),
        3,
        500,
        'getPrincipal'
      );
      const principalText = principal.toString();
      console.log('Connected with principal:', principalText);
      
      // Initialize variables for NFTs and tokens
      let nfts: any[] = [];
      let tokens: ICPToken[] = [];
      let usingMockTokens = false;
      
      // Try to create an agent if needed for ledger operations
      if (!plug.agent && typeof plug.createAgent === 'function') {
        console.log('Creating agent for ledger interactions');
        await withRetry(
          () => plug.createAgent!({ 
            whitelist: [
              ICP_LEDGER_CANISTER_ID,
              ZK_CANISTER_ID,
              MAIN_CANISTER_ID
            ], 
            host: useHttps ? 'https://icp0.io' : 'http://localhost:8000'
          }),
          3,
          500,
          'createAgent'
        );
      } else {
        console.log('Using existing agent for ledger interactions');
      }
      
      // Get real ICP token data from the ledger
      console.log(`Getting token data for principal: ${principalText}`);
      
      try {
        // Always get token balance directly from the ledger canister for consistency
        const icpToken = await withRetry(
          () => getICPTokenData(principalText),
          2,
          1000,
          'getICPTokenData'
        );
        tokens = [icpToken];
        
        console.log('Successfully fetched ICP balance from ledger:', icpToken);
        
        if (!silentMode) {
          toast.success('Successfully connected to your wallet');
        }
      } catch (ledgerError) {
        console.error('Failed to fetch balance from ledger:', ledgerError);
        
        if (isDev) {
          // Use mock tokens in development mode
          tokens = MOCK_TOKENS;
          usingMockTokens = true;
          console.warn('Using mock tokens in development mode');
        } else {
          throw ledgerError;
        }
      }
      
      // Get accountId if the function exists
      let accountId = '';
      try {
        if (typeof plug.getAccountId === 'function') {
          accountId = await withRetry(
            () => plug.getAccountId!(),
            2,
            500,
            'getAccountId'
          );
          console.log('Account ID:', accountId);
        }
      } catch (error) {
        console.error('Failed to get account ID:', error);
      }
      
      // Prepare the wallet data
      const walletData: WalletData = {
        principal: principalText,
        accountId: accountId || principalText,
        nfts,
        tokens,
        usingMockData: usingMockTokens,
        walletType: 'plug'
      };
      
      console.log('Wallet data prepared:', walletData);
      
      // Update the context state
      setWalletInfo({
        isConnected: true,
        principal: principalText,
        address: accountId || principalText,
        chainId: 'icp',
        chainName: 'Internet Computer',
        walletType: 'plug',
        tokens,
        transactions: []
      });
      
      // Set active wallet
      setActiveWallet('plug');
      
      // Save connection state
      localStorage.setItem('wallet_connected', 'true');
      localStorage.setItem('wallet_type', 'plug');
      
      return walletData;
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  };

  const connect = async (walletType: WalletType = 'stoic') => {
    setIsConnecting(true);
    setError(null);
    
    try {
      let result = null;
      
      if (walletType === 'stoic') {
        result = await connectStoic();
      } else if (walletType === 'plug') {
        result = await connectPlug();
      } else {
        throw new Error(`Unsupported wallet type: ${walletType}`);
      }
      
      // Trigger data refresh after connection
      await refreshData();
      
      // Return the result
      return result;
    } catch (error) {
      console.error(`Error connecting to ${walletType} wallet:`, error);
      setError(error instanceof Error ? error : new Error(`Unknown ${walletType} connection error`));
      toast.error(error instanceof Error ? error.message : `Failed to connect to ${walletType} wallet`);
      setWalletInfo(null);
      setActiveWallet(null);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      // Handle disconnection based on active wallet
      if (activeWallet === 'stoic') {
        await disconnectFromStoicWallet();
      } else if (activeWallet === 'plug') {
        // Disconnect from Plug
        if (window.hasOwnProperty('ic') && (window as any).ic?.hasOwnProperty('plug')) {
          const plug = (window as any).ic.plug as ICPlug;
          if (typeof plug.disconnect === 'function') {
            await plug.disconnect();
          }
        }
        
        // Clear connection monitoring interval
        if (connectionCheckerInterval) {
          window.clearInterval(connectionCheckerInterval);
          setConnectionCheckerInterval(null);
        }
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
    
    // Clear wallet state
    setWalletInfo(null);
    setActiveWallet(null);
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('wallet_type');
    toast.success('Wallet disconnected');
  };

  // Check for existing authentication on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      const walletConnected = localStorage.getItem('wallet_connected') === 'true';
      const walletType = localStorage.getItem('wallet_type') as WalletType | null;
      
      if (walletConnected && walletType) {
        console.log(`Found existing ${walletType} wallet connection, attempting to reconnect...`);
        
        try {
          setIsConnecting(true);
          
          if (walletType === 'stoic') {
            // Create auth client and check if authenticated
            const authClient = await AuthClient.create();
            const isAuthenticated = await authClient.isAuthenticated();
            
            if (isAuthenticated) {
              console.log('Found existing Stoic authentication, reconnecting...');
              await connectStoic();
            } else {
              console.log('Previous Stoic session expired, clearing local storage');
              localStorage.removeItem('wallet_connected');
              localStorage.removeItem('wallet_type');
            }
          } else if (walletType === 'plug') {
            // Check if Plug exists in the window
            const plugExists = await checkForPlugWallet();
            
            if (plugExists) {
              const plug = (window as any).ic.plug as ICPlug;
              
              if (typeof plug.isConnected === 'function') {
                const isConnected = await plug.isConnected();
                
                if (isConnected) {
                  console.log('Found existing Plug connection, reconnecting...');
                  await connectPlug();
                } else {
                  console.log('Previous Plug session expired, clearing local storage');
                  localStorage.removeItem('wallet_connected');
                  localStorage.removeItem('wallet_type');
                }
              }
            }
          }
        } catch (error) {
          console.error('Error reconnecting to wallet:', error);
          localStorage.removeItem('wallet_connected');
          localStorage.removeItem('wallet_type');
        } finally {
          setIsConnecting(false);
        }
      }
    };
    
    checkExistingConnection();
  }, []);

  // Context value
  const contextValue = {
    isConnected: !!walletInfo?.isConnected,
    isConnecting,
    connect,
    disconnect,
    error,
    walletInfo,
    activeWallet
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext); 