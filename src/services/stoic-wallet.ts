import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { ICP_LEDGER_CANISTER_ID, getICPTokenData } from './ledger';
import type { ICPToken } from '@/types/wallet';

// Constants for Stoic Wallet
const STOIC_HOST = 'https://www.stoicwallet.com';

// Basic utility for formatting e8s to ICP
export function formatICPBalance(e8s: bigint): string {
  const icpBalance = Number(e8s) / 100_000_000;
  return icpBalance.toFixed(8);
}

// Interface for the result of a Stoic wallet connection
export interface StoicConnectionResult {
  identity: Identity;
  principal: Principal;
  agent: HttpAgent;
}

// Get a token's symbol based on its canister ID
function getTokenSymbol(canisterId: string): string {
  if (canisterId === ICP_LEDGER_CANISTER_ID) {
    return 'ICP';
  }
  return 'UNKNOWN';
}

// Get a token's name based on its canister ID
function getTokenName(canisterId: string): string {
  if (canisterId === ICP_LEDGER_CANISTER_ID) {
    return 'Internet Computer';
  }
  return 'Unknown Token';
}

/**
 * Check if we're in a browser environment
 * This is important for crypto API access
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Connect to Stoic Wallet
 * @returns Promise with the connection result
 */
export async function connectToStoicWallet(): Promise<StoicConnectionResult> {
  // Check if running in a browser environment
  if (!isBrowser()) {
    throw new Error('Stoic wallet requires a browser environment with crypto support');
  }

  try {
    // Create AuthClient
    const authClient = await AuthClient.create({
      idleOptions: {
        disableIdle: true,
        disableDefaultIdleCallback: true
      }
    });

    // Check if already authenticated
    const isAuthenticated = await authClient.isAuthenticated();
    
    // If not authenticated, login with proper redirect to Stoic
    if (!isAuthenticated) {
      await new Promise<void>((resolve, reject) => {
        authClient.login({
          identityProvider: STOIC_HOST,
          windowOpenerFeatures: 
            `left=${window.screen.width / 2 - 525 / 2}, ` +
            `top=${window.screen.height / 2 - 705 / 2}, ` +
            `toolbar=0,location=0,menubar=0,width=525,height=705`,
          onSuccess: () => resolve(),
          onError: (error) => reject(new Error(`Failed to login to Stoic: ${error}`))
        });
      });
    }

    // Get identity
    const identity = authClient.getIdentity();
    
    // Verify we have a valid identity
    if (!identity) {
      throw new Error('Failed to obtain identity from Stoic wallet');
    }
    
    // Create agent with identity
    const agent = new HttpAgent({
      host: import.meta.env.VITE_IC_HOST || 'https://icp0.io',
      identity
    });

    // Get principal
    const principal = identity.getPrincipal();

    // Log success
    console.log('Successfully connected to Stoic wallet');
    console.log('Principal:', principal.toString());

    return {
      identity,
      principal,
      agent
    };
  } catch (error) {
    console.error('Error connecting to Stoic wallet:', error);
    if (error instanceof Error && error.message.includes('crypto')) {
      throw new Error('Your browser is missing required security features. Please use a modern browser with Web Crypto API support.');
    }
    throw error;
  }
}

/**
 * Disconnect from Stoic Wallet
 */
export async function disconnectFromStoicWallet(): Promise<void> {
  try {
    const authClient = await AuthClient.create();
    authClient.logout();
    console.log('Successfully disconnected from Stoic wallet');
  } catch (error) {
    console.error('Error disconnecting from Stoic wallet:', error);
    throw error;
  }
}

/**
 * Get ICP balances for the connected identity
 * @param agent HttpAgent with identity
 * @returns Promise with token data
 */
export async function getStoicBalances(
  agent: HttpAgent,
  principal: Principal
): Promise<ICPToken[]> {
  try {
    console.log('Fetching balances for Stoic wallet...');
    const principalText = principal.toString();
    
    // Get actual ICP token data from the ledger
    const icpToken = await getICPTokenData(principalText);
    console.log('ICP balance fetched:', icpToken);
    
    // Put this in an array to match the expected return type
    // In the future, this could be extended to query other token canisters as well
    const tokens: ICPToken[] = [icpToken];

    return tokens;
  } catch (error) {
    console.error('Error fetching Stoic balances:', error);
    
    // If in development mode, return mock data
    if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      console.warn('Using mock data for Stoic wallet in development mode');
      return [{
        id: `icp-${Math.random().toString(36).substring(2, 9)}`,
        symbol: 'ICP',
        name: 'Internet Computer',
        balance: '100000000', // 1 ICP in e8s
        amount: '1',
        decimals: 8
      }];
    }
    
    throw error;
  }
}

/**
 * Create an actor with the Stoic identity
 * @param canisterId Canister ID
 * @param idlFactory Interface factory
 * @param agent HttpAgent with identity
 * @returns Actor instance
 */
export function createStoicActor<T>(
  canisterId: string,
  idlFactory: any,
  agent: HttpAgent
): T {
  return Actor.createActor<T>(idlFactory, {
    agent,
    canisterId
  });
} 