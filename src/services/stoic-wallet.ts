import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { ICP_LEDGER_CANISTER_ID } from './ledger';
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
 * Connect to Stoic Wallet
 * @returns Promise with the connection result
 */
export async function connectToStoicWallet(): Promise<StoicConnectionResult> {
  // Create AuthClient
  const authClient = await AuthClient.create({
    idleOptions: {
      disableIdle: true,
      disableDefaultIdleCallback: true
    }
  });

  // Check if already authenticated
  const isAuthenticated = await authClient.isAuthenticated();
  
  // If not authenticated, login
  if (!isAuthenticated) {
    await new Promise<void>((resolve, reject) => {
      authClient.login({
        identityProvider: STOIC_HOST,
        onSuccess: () => resolve(),
        onError: (error) => reject(new Error(`Failed to login to Stoic: ${error}`))
      });
    });
  }

  // Get identity
  const identity = authClient.getIdentity();
  
  // Create agent with identity
  const agent = new HttpAgent({
    host: import.meta.env.VITE_IC_HOST || 'https://icp0.io',
    identity
  });

  // Get principal
  const principal = identity.getPrincipal();

  return {
    identity,
    principal,
    agent
  };
}

/**
 * Disconnect from Stoic Wallet
 */
export async function disconnectFromStoicWallet(): Promise<void> {
  const authClient = await AuthClient.create();
  authClient.logout();
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
    // For now, we'll return a basic ICP token with placeholder data
    // In a real implementation, you would query the ledger canister for real balances
    const tokens: ICPToken[] = [
      {
        id: `icp-${Math.random().toString(36).substring(2, 9)}`,
        symbol: 'ICP',
        name: 'Internet Computer',
        balance: '100000000', // 1 ICP in e8s as a placeholder
        amount: '1',
        decimals: 8
      }
    ];

    return tokens;
  } catch (error) {
    console.error('Error fetching Stoic balances:', error);
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