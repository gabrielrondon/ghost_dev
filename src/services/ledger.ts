import { IDL } from '@dfinity/candid';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { ICP_LEDGER_CANISTER_ID } from '@/constants';
import { getConnectionProtocol } from '@/utils/network';
import { principalToAccountIdentifier } from './utils';
import type { ICPToken } from '@/types/wallet';

// Create a minimal interface for the ledger canister
interface LedgerCanister {
  account_balance: (args: { account: Array<number> }) => Promise<{ e8s: bigint }>;
  list_tokens: (args: { account: Array<number> }) => Promise<Array<{ token_id: string, balance: bigint }>>;
}

// Create the IDL factory for the ledger canister
const ledgerIdlFactory = ({ IDL }: { IDL: typeof IDL }) => {
  const AccountIdentifier = IDL.Vec(IDL.Nat8);
  const Tokens = IDL.Record({ 'e8s' : IDL.Nat64 });
  return IDL.Service({
    'account_balance' : IDL.Func([IDL.Record({ 'account' : AccountIdentifier })], [Tokens], ['query']),
    'list_tokens' : IDL.Func([IDL.Record({ 'account' : AccountIdentifier })], [IDL.Vec(IDL.Record({ token_id: IDL.Text, balance: IDL.Nat64 }))], ['query']),
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
 * Format ICP balance from e8s to ICP with detailed output
 */
export function formatICPBalanceDetailed(e8s: bigint): { e8s: string; icp: string } {
  const e8sStr = e8s.toString();
  const icp = (Number(e8s) / 100000000).toFixed(8);
  return { e8s: e8sStr, icp };
}

/**
 * Format ICP balance from e8s to ICP
 */
export function formatICPBalance(e8s: bigint): string {
  return (Number(e8s) / 100000000).toFixed(8);
}

/**
 * Gets ICP token data for an account from the ledger canister
 */
export async function getICPTokenData(accountId: string): Promise<ICPToken> {
  console.log(`Fetching ICP token data for account: ${accountId}`);
  
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
    
    // Query balance from ledger using account ID
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

/**
 * Gets all tokens for an account from the ledger canister
 */
export async function getAccountTokens(accountId: string): Promise<ICPToken[]> {
  try {
    // First get ICP token data
    const icpToken = await getICPTokenData(accountId);
    const tokens = [icpToken];
    
    // Get connection protocol (HTTP or HTTPS)
    const { useHttps } = getConnectionProtocol();
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
      canisterId: ICP_LEDGER_CANISTER_ID,
    });
    
    // Get list of all tokens for this account
    const accountTokens = await ledgerActor.list_tokens({
      account: Array.from(Buffer.from(accountId, 'hex')),
    });
    
    // Process each token
    for (const token of accountTokens) {
      if (token.token_id !== 'icp') { // Skip ICP as we already have it
        tokens.push({
          id: `${token.token_id}-token`,
          name: token.token_id.toUpperCase(),
          symbol: token.token_id.toUpperCase(),
          balance: token.balance.toString(),
          amount: formatICPBalance(token.balance),
          decimals: 8,
          price: 0, // Would need to fetch from price feed
          logoUrl: `/img/${token.token_id}-logo.svg`,
        });
      }
    }
    
    return tokens;
  } catch (error) {
    console.error('Error fetching account tokens:', error);
    throw error;
  }
} 