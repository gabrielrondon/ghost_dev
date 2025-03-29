import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { WalletInfo, ICPToken, ICPTransaction } from '@/types/wallet';
import toast from 'react-hot-toast';
import { getICPTokenData, ICP_LEDGER_CANISTER_ID } from '@/services/ledger';
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
  const connectStoic = async (): Promise<WalletData | null> => {
    try {
      console.log('Connecting to Stoic wallet...');
      
      // Connect to Stoic with a more robust retry mechanism
      // that handles browser redirects properly
      let connectionAttempt = 0;
      const maxAttempts = 3;
      let connectionResult: StoicConnectionResult | null = null;
      
      while (connectionAttempt < maxAttempts && !connectionResult) {
        try {
          connectionAttempt++;
          console.log(`Stoic connection attempt ${connectionAttempt} of ${maxAttempts}`);
          
          connectionResult = await connectToStoicWallet();
          
          // If we got here, we successfully connected
          break;
        } catch (error) {
          console.error(`Stoic connection attempt ${connectionAttempt} failed:`, error);
          
          // If we've reached max attempts, throw the error
          if (connectionAttempt >= maxAttempts) {
            throw error;
          }
          
          // Otherwise wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // If we still don't have a connection, throw an error
      if (!connectionResult) {
        throw new Error('Failed to connect to Stoic wallet after multiple attempts');
      }
      
      const { principal, agent } = connectionResult;
      const principalText = principal.toString();
      console.log('Connected to Stoic wallet with principal:', principalText);
      
      // Fetch balances
      const tokens = await withRetry(
        () => getStoicBalances(agent, principal),
        2,
        1000,
        'getStoicBalances'
      );
      
      // Use empty NFTs array since Stoic doesn't have built-in NFT support
      const nfts: any[] = [];
      
      // Prepare the wallet data
      const walletData: WalletData = {
        principal: principalText,
        accountId: '', // Stoic doesn't provide an account ID in the standard format
        nfts,
        tokens,
        usingMockData: false,
        walletType: 'stoic'
      };

      // Update the context state
      setWalletInfo({
        isConnected: true,
        principal: principalText,
        address: principalText, // Use principal as address
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
      
      toast.success('Successfully connected to Stoic wallet');
      
      return walletData;
    } catch (error) {
      console.error('Error connecting to Stoic wallet:', error);
      
      // Check for specific errors and provide better messages
      if (error instanceof Error) {
        if (error.message.includes('popup') || error.message.includes('window')) {
          toast.error('Pop-up blocked. Please enable pop-ups for Stoic wallet authentication.');
        } else if (error.message.includes('crypto')) {
          toast.error('Your browser is missing required security features.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to connect to Stoic wallet');
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
            () => plug.isConnected!(),
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
        ];
        
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
      
      // Initialize variables for NFTs and tokens
      let nfts: any[] = [];
      let tokens: ICPToken[] = [];
      let usingMockTokens = false;
      
      // Try to fetch NFTs if the function exists - version aware
      try {
        if (typeof plug.getNFTs === 'function') {
          console.log('Attempting to fetch NFTs...');
          nfts = await withRetry(
            () => plug.getNFTs!(),
            2,
            500,
            'getNFTs'
          );
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
      
      // Try to fetch token balances if the function exists - version aware
      try {
        if (typeof plug.getBalance === 'function') {
          console.log('Attempting to fetch token balances...');
          const balances = await withRetry(
            () => plug.getBalance!(),
            2,
            500,
            'getBalance'
          );
          
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
            if (typeof plug.createAgent === 'function') {
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
              throw new Error('createAgent function not available');
            }
          } else {
            console.log('Using existing agent for ledger interactions');
          }
          
          // Get real ICP token data from the ledger
          console.log(`Getting token data for principal: ${principalText}`);
          const icpToken = await withRetry(
            () => getICPTokenData(principalText),
            2,
            1000,
            'getICPTokenData'
          );
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
        accountId,
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
      
      // Start connection monitoring
      startConnectionMonitoring(plug);
      
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