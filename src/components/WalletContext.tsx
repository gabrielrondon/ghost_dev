'use client'

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
import { useWallet } from '@/hooks/use-wallet';

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
  principal: string | null;
  accountId: string | null;
  tokens: ICPToken[];
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
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
  principal: null,
  accountId: null,
  tokens: [],
  connect: async () => {},
  disconnect: async () => {},
  isLoading: false,
  error: null
};

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();

  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
} 