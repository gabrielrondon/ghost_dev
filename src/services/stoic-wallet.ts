import { StoicIdentity } from 'ic-stoic-identity';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { ICP_LEDGER_CANISTER_ID } from '@/constants';
import { getICPTokenData, formatICPBalance } from '@/services/ledger';
import type { ICPToken } from '@/types/wallet';
import crypto from 'crypto-browserify';

// Constants for Stoic Wallet
const STOIC_HOST = 'https://www.stoicwallet.com';

// Type definitions for Stoic connection
export interface StoicConnectionResult {
  principal: Principal
  identity: any
  agent: HttpAgent
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
 * Connect to Stoic wallet and return principal and agent
 */
export async function connectToStoicWallet(): Promise<StoicConnectionResult | null> {
  try {
    console.log('Connecting to Stoic wallet...');
    
    // Try to connect to Stoic
    const identity = await StoicIdentity.connect();
    
    if (!identity) {
      console.error('No identity returned from Stoic');
      return null;
    }
    
    console.log('Identity received from Stoic');
    
    // Create an agent with the identity
    const agent = new HttpAgent({ identity });
    
    // Skip verification if not in production
    if (process.env.NODE_ENV !== 'production') {
      await agent.fetchRootKey();
    }
    
    // Get the principal from the identity
    const principal = identity.getPrincipal();
    console.log('Stoic principal:', principal.toString());
    
    return {
      principal,
      identity,
      agent
    };
  } catch (error) {
    console.error('Error connecting to Stoic wallet:', error);
    throw error;
  }
}

/**
 * Disconnect from Stoic wallet
 */
export function disconnectFromStoicWallet(): void {
  try {
    StoicIdentity.disconnect();
    console.log('Disconnected from Stoic wallet');
  } catch (error) {
    console.error('Error disconnecting from Stoic wallet:', error);
  }
}

/**
 * Get token balances for a Stoic wallet connection
 */
export async function getStoicBalances(agent: HttpAgent, principal: Principal): Promise<ICPToken[]> {
  try {
    // Convert principal to string for logging
    const principalText = principal.toString();
    console.log(`Fetching balances for Stoic principal: ${principalText}`);
    
    // Get ICP token data using the ledger service
    const icpToken = await getICPTokenData(principalText);
    console.log('Retrieved ICP token data:', icpToken);
    
    // For now, just return ICP token. Could be extended to get more tokens
    return [icpToken];
  } catch (error) {
    console.error('Error fetching Stoic balances:', error);
    throw error;
  }
}

/**
 * Convert a principal ID to an account identifier 
 */
export function principalToAccountIdentifier(principal: Principal): string {
  // Implementation of principalToAccountIdentifier
  // This is a placeholder - you should use a proper implementation
  const subAccount = Buffer.alloc(32);
  const padding = Buffer.from('\x0Aaccount-id');
  
  const bufPrincipal = principal.toUint8Array();
  const bufLen = Buffer.from([bufPrincipal.byteLength]);
  
  // Create a hash and chain the updates
  const hash = crypto.createHash('sha256')
    .update(padding)
    .update(bufLen)
    .update(Buffer.from(bufPrincipal))
    .update(subAccount)
    .digest('hex');
  
  return hash;
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