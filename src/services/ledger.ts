import { Principal } from '@dfinity/principal';
import { AccountIdentifier } from '@dfinity/ledger-icp';

// Ledger canister ID for ICP token on mainnet
export const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

// Define the IDL factory for the ledger canister
// This is a simplified version of the actual ICP ledger interface
const ledgerIdlFactory = ({ IDL }: { IDL: any }) => {
  return IDL.Service({
    'account_balance_dfx' : IDL.Func(
      [IDL.Record({ 'account' : IDL.Vec(IDL.Nat8) })],
      [IDL.Record({ 'e8s' : IDL.Nat64 })],
      ['query'],
    ),
    'transfer' : IDL.Func(
      [
        IDL.Record({
          'to' : IDL.Vec(IDL.Nat8),
          'fee' : IDL.Record({ 'e8s' : IDL.Nat64 }),
          'memo' : IDL.Nat64,
          'from_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
          'created_at_time' : IDL.Opt(
            IDL.Record({ 'timestamp_nanos' : IDL.Nat64 })
          ),
          'amount' : IDL.Record({ 'e8s' : IDL.Nat64 }),
        }),
      ],
      [IDL.Record({ 'height' : IDL.Nat64 })],
      [],
    )
  });
};

// Extend the Window interface to include ic
declare global {
  interface Window {
    ic?: {
      plug?: {
        agent?: any;
        isConnected: () => Promise<boolean>;
        requestConnect: (options?: { whitelist?: string[]; host?: string }) => Promise<boolean>;
        createAgent: (options?: { whitelist?: string[]; host?: string }) => Promise<any>;
        createActor: (options: { canisterId: string; interfaceFactory: any }) => Promise<any>;
        requestBalance: () => Promise<Array<{ currency: string; amount: string }>>;
        disconnect: () => Promise<void>;
        getAccountId?: () => Promise<string>;
        getPrincipal?: () => Promise<Principal>;
      }
    }
  }
}

/**
 * Converts a principal to an account identifier
 * @param principal The principal to convert
 * @returns Account identifier as Uint8Array
 */
export function principalToAccountIdentifier(principal: string): Uint8Array {
  try {
    const principalObj = Principal.fromText(principal);
    const accountIdentifier = AccountIdentifier.fromPrincipal({ principal: principalObj });
    return accountIdentifier.toUint8Array();
  } catch (error) {
    console.error("Error converting principal to account identifier:", error);
    throw error;
  }
}

interface LedgerActor {
  account_balance_dfx: (args: { account: Array<number> }) => Promise<{ e8s: any }>;
}

/**
 * Gets ICP balance from the ledger canister
 * @param principal Principal string
 * @returns Balance in e8s (10^-8 ICP)
 */
export async function getICPBalance(principal: string): Promise<{ e8s: bigint }> {
  try {
    if (!window.ic?.plug?.agent) {
      throw new Error("No agent available to query the ledger");
    }
    
    // Create an actor to interact with the ledger canister
    const actor = await window.ic.plug.createActor({
      canisterId: ICP_LEDGER_CANISTER_ID,
      interfaceFactory: ledgerIdlFactory,
    }) as LedgerActor;
    
    // Convert principal to account identifier
    const accountIdentifier = principalToAccountIdentifier(principal);
    
    // Query the ledger canister for balance
    try {
      const balance = await actor.account_balance_dfx({
        account: Array.from(accountIdentifier)
      });
      
      // Convert the Nat64 to a bigint
      return { e8s: BigInt(balance.e8s.toString()) };
    } catch (queryError) {
      // If the first method fails, try another approach
      console.warn("Primary balance method failed, trying alternative:", queryError);
      
      // Try a different path for getting the balance through the Plug wallet
      if (typeof window.ic.plug.requestBalance === 'function') {
        const balanceResponse = await window.ic.plug.requestBalance();
        if (balanceResponse && balanceResponse.length > 0) {
          const icpBalance = balanceResponse.find((b: { currency: string; amount: string }) => b.currency === 'ICP');
          if (icpBalance) {
            const e8s = BigInt(Math.floor(Number(icpBalance.amount) * 100000000));
            return { e8s };
          }
        }
      }
      
      throw new Error("Failed to get balance through all available methods");
    }
  } catch (error) {
    console.error("Error getting ICP balance:", error);
    throw error;
  }
}

/**
 * Formats an e8s balance to human-readable ICP format with 8 decimal places
 * @param e8s Balance in e8s (10^-8 ICP)
 * @returns Formatted balance string
 */
export function formatICPBalance(e8s: bigint): string {
  try {
    const balance = Number(e8s) / 100000000; // Convert from e8s to ICP
    return balance.toFixed(8);
  } catch (error) {
    console.error("Error formatting ICP balance:", error);
    return "0.00000000";
  }
}

/**
 * Helper function to get token data from the ledger
 * @param principal Principal string
 * @returns Token data object
 */
export async function getICPTokenData(principal: string) {
  try {
    const balance = await getICPBalance(principal);
    const amount = formatICPBalance(balance.e8s);
    
    return {
      id: 'icp-1',
      symbol: 'ICP',
      name: 'Internet Computer',
      balance: balance.e8s.toString(), // Raw e8s balance
      amount, // Formatted balance with 8 decimal places
      decimals: 8
    };
  } catch (error) {
    console.error("Failed to get ICP token data:", error);
    throw error;
  }
} 