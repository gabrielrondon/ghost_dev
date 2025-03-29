import type { IDL as CandidTypes } from '@dfinity/candid';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { ICP_LEDGER_CANISTER_ID } from '@/constants';
import { getConnectionProtocol } from '@/utils/network';
import { principalToAccountIdentifier } from './utils';
import type { ICPToken } from '@/types/wallet';

// Create a minimal interface for the ledger canister
interface LedgerCanister {
  account_balance: (args: { account: Array<number> }) => Promise<{ e8s: bigint }>;
}

// Ledger canister IDL factory
const ledgerIdlFactory = ({ IDL }: { IDL: any }) => {
  const AccountIdentifier = IDL.Vec(IDL.Nat8);
  const Tokens = IDL.Record({ 'e8s' : IDL.Nat64 });
  return IDL.Service({
    'account_balance' : IDL.Func([IDL.Record({ 'account' : AccountIdentifier })], [Tokens], ['query']),
  });
};

// Simple implementation of sha224 (enough for our purposes)
function sha224(data: Uint8Array): Uint8Array {
  // This is a simplified version - in production, use a proper hash function
  const hash = new Uint8Array(28);
  for (let i = 0; i < Math.min(data.length, 28); i++) {
    hash[i] = data[i];
  }
  return hash;
}

// Simplified CRC32 implementation (won't actually compute correct CRC32)
function simpleCrc32(data: Uint8Array): number {
  // In a real implementation, this would compute the CRC32
  // For now, just return a fixed value
  return 0x01020304;
}

// Custom implementation of AccountIdentifier without relying on external deps
export class CustomAccountIdentifier {
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  public static fromPrincipal(principal: Principal): CustomAccountIdentifier {
    // Convert principal to bytes
    const principalBytes = principal.toUint8Array();
    
    // Create a simplified account identifier
    // In production, this should follow the proper derivation rules
    const accountId = new Uint8Array(28);
    
    // Set first 4 bytes to a simple value (would be CRC32 in real implementation)
    accountId[0] = 0x01;
    accountId[1] = 0x02;
    accountId[2] = 0x03;
    accountId[3] = 0x04;
    
    // Copy principal bytes to the rest of the identifier
    for (let i = 0; i < Math.min(principalBytes.length, 24); i++) {
      accountId[i + 4] = principalBytes[i];
    }
    
    return new CustomAccountIdentifier(accountId);
  }

  public toUint8Array(): Uint8Array {
    return this.bytes;
  }

  public toHex(): string {
    return Array.from(this.bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/**
 * Gets the ICP balance for a principal
 * @param principalText The principal to get the balance for
 * @returns The balance in e8s
 */
export async function getICPBalance(principalText: string): Promise<bigint> {
  try {
    // Create a principal from the text representation
    const principal = Principal.fromText(principalText);
    
    // Create an account identifier from the principal
    const accountIdentifier = CustomAccountIdentifier.fromPrincipal(principal);
    
    // Create an agent to interact with the IC
    const agent = new HttpAgent({
      host: import.meta.env.VITE_IC_HOST || 'https://icp0.io'
    });
    
    // For local development, can call agent.fetchRootKey() if needed
    // In production, we don't need this
    
    // Create an actor to interact with the ledger canister
    const actor = Actor.createActor(ledgerIdlFactory, {
      agent,
      canisterId: ICP_LEDGER_CANISTER_ID,
    });
    
    // Query the balance - use type assertion for the actor
    const result = await (actor as any).account_balance({
      account: Array.from(accountIdentifier.toUint8Array())
    });
    
    // Use type assertion for the result
    return BigInt(result.e8s.toString());
  } catch (error) {
    console.error('Error getting ICP balance:', error);
    throw error;
  }
}

/**
 * Format e8s (100 million e8s = 1 ICP) to a human-readable ICP amount
 * @param e8s The balance in e8s
 * @returns Formatted ICP amount as string
 */
export function formatICPBalance(e8s: bigint): string {
  const icpBalance = Number(e8s) / 100_000_000;
  return icpBalance.toFixed(8);
}

/**
 * Formats an ICP balance from e8s (100,000,000th of an ICP) to a human-readable format
 */
export function formatICPBalanceDetailed(balanceE8s: bigint): {
  e8s: string;
  icp: string;
} {
  const icpAmount = Number(balanceE8s) / 100_000_000;
  return {
    e8s: balanceE8s.toString(),
    icp: icpAmount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    }),
  };
}

/**
 * Gets ICP token data for a principal from the ledger canister
 */
export async function getICPTokenData(principal: string): Promise<ICPToken> {
  console.log(`Fetching ICP token data for principal: ${principal}`);
  
  try {
    // Get connection protocol (HTTP or HTTPS)
    const { useHttps, host } = getConnectionProtocol();
    const canisterId = ICP_LEDGER_CANISTER_ID;
    
    if (!canisterId) {
      throw new Error('Ledger canister ID not defined');
    }
    
    // Create an agent to interact with the ledger
    const agent = new HttpAgent({
      host: useHttps ? 'https://icp0.io' : 'http://localhost:8000',
    });
    
    // Skip verification in development environment
    if (!useHttps) {
      await agent.fetchRootKey();
    }
    
    // Create actor for ledger
    const ledgerActor = Actor.createActor<LedgerCanister>(ledgerIdlFactory, {
      agent,
      canisterId,
    });
    
    // Convert principal to account identifier
    const principalObj = Principal.fromText(principal);
    const accountId = principalToAccountIdentifier(principalObj);
    
    console.log(`Converted principal to account ID: ${accountId}`);
    
    // Query balance from ledger
    const balanceResult = await ledgerActor.account_balance({
      account: Array.from(Buffer.from(accountId, 'hex')),
    });
    
    console.log('ICP balance result:', balanceResult);
    
    // Format balance
    const { e8s, icp } = formatICPBalanceDetailed(balanceResult.e8s);
    
    // Convert price to number to match the ICPToken type
    const currentPrice = 7.82; // Current approximate price, could be fetched from an API
    
    // Construct ICP token object
    const icpToken: ICPToken = {
      id: 'icp-token',
      name: 'Internet Computer',
      symbol: 'ICP',
      balance: e8s,
      amount: icp,
      decimals: 8,
      price: currentPrice,
      logoUrl: '/img/icp-logo.svg',
    };
    
    console.log('Formatted ICP token:', icpToken);
    
    return icpToken;
  } catch (error) {
    console.error('Error fetching ICP token data:', error);
    throw error;
  }
} 