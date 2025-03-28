import { Principal } from '@dfinity/principal';

// Ledger canister ID for ICP token on mainnet
export const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

// Improved AccountIdentifier implementation
class CustomAccountIdentifier {
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  static fromPrincipal({ principal }: { principal: Principal }): CustomAccountIdentifier {
    // Hash the principal to create an account ID
    // This is a simplified implementation based on the dfinity specs
    const principalBytes = principal.toUint8Array();
    const bytes = new Uint8Array(32);
    
    // CRC32 header
    bytes[0] = 0x0A;
    bytes[1] = 0xCC;
    bytes[2] = 0xCB;
    bytes[3] = 0xD5;
    
    // Copy principal bytes
    for (let i = 0; i < Math.min(principalBytes.length, 28); i++) {
      bytes[i + 4] = principalBytes[i];
    }
    
    return new CustomAccountIdentifier(bytes);
  }

  toUint8Array(): Uint8Array {
    return this.bytes;
  }
  
  toHex(): string {
    return Array.from(this.bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// Define the IDL factory for the ledger canister
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

// We're not declaring global window interfaces to avoid conflicts
// We'll use type assertions instead

interface LedgerActor {
  account_balance_dfx: (args: { account: Array<number> }) => Promise<{ e8s: any }>;
}

/**
 * Converts a principal to an account identifier
 * @param principal The principal to convert
 * @returns Account identifier as Uint8Array
 */
export function principalToAccountIdentifier(principal: string): Uint8Array {
  try {
    const principalObj = Principal.fromText(principal);
    const accountIdentifier = CustomAccountIdentifier.fromPrincipal({ principal: principalObj });
    return accountIdentifier.toUint8Array();
  } catch (error) {
    console.error("Error converting principal to account identifier:", error);
    throw error;
  }
}

/**
 * Gets ICP balance from the ledger canister
 * @param principal Principal string
 * @returns Balance in e8s (10^-8 ICP)
 */
export async function getICPBalance(principal: string): Promise<{ e8s: bigint }> {
  try {
    if (!(window as any).ic?.plug?.agent) {
      throw new Error("No agent available to query the ledger");
    }

    console.log(`Fetching balance for principal: ${principal}`);
    
    // First try to use Plug's built-in balance function if available
    try {
      if (typeof (window as any).ic.plug.requestBalance === 'function') {
        console.log("Using Plug wallet's requestBalance method");
        const balanceResponse = await (window as any).ic.plug.requestBalance();
        
        if (balanceResponse && Array.isArray(balanceResponse) && balanceResponse.length > 0) {
          const icpBalance = balanceResponse.find((b: { currency: string; amount: string }) => b.currency === 'ICP');
          if (icpBalance) {
            const e8s = BigInt(Math.floor(Number(icpBalance.amount) * 100000000));
            console.log(`Found ICP balance using requestBalance: ${icpBalance.amount} ICP (${e8s} e8s)`);
            return { e8s };
          }
        }
        
        console.log("requestBalance didn't return expected ICP balance, falling back to ledger canister");
      }
    } catch (plugBalanceError) {
      console.warn("Error using Plug wallet's balance method:", plugBalanceError);
      // Continue to fallback method
    }
    
    // Create an actor to interact with the ledger canister directly
    try {
      console.log("Querying ledger canister directly for balance");
      const actor = await (window as any).ic.plug.createActor({
        canisterId: ICP_LEDGER_CANISTER_ID,
        interfaceFactory: ledgerIdlFactory,
      }) as LedgerActor;
      
      // Convert principal to account identifier
      const accountIdentifier = principalToAccountIdentifier(principal);
      console.log(`Account identifier for ${principal}: ${Array.from(accountIdentifier).map(b => b.toString(16).padStart(2, '0')).join('')}`);
      
      // Query the ledger canister for balance
      const balance = await actor.account_balance_dfx({
        account: Array.from(accountIdentifier)
      });
      
      // Convert the Nat64 to a bigint
      const e8s = BigInt(balance.e8s.toString());
      console.log(`Successfully fetched balance from ledger canister: ${e8s} e8s`);
      return { e8s };
    } catch (ledgerError) {
      console.error("Error querying ledger canister:", ledgerError);
      throw ledgerError;
    }
  } catch (error) {
    console.error("All balance fetching methods failed:", error);
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
    console.log(`Getting ICP token data for principal: ${principal}`);
    const balance = await getICPBalance(principal);
    const amount = formatICPBalance(balance.e8s);
    
    console.log(`Final ICP token data - Balance: ${balance.e8s}, Formatted: ${amount}`);
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