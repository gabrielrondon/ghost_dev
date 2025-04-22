// Production canister IDs and host
export const ZK_CANISTER_ID = 'hi7bu-myaaa-aaaad-aaloa-cai'
export const IC_HOST = 'https://ic0.app'

// Token standards supported
export const TOKEN_STANDARDS = {
  ICRC1: 'ICRC1',
  ICRC2: 'ICRC2',
  DIP20: 'DIP20',
  EXT: 'EXT'
} as const

// Interface for token metadata
export interface TokenMetadata {
  standard: keyof typeof TOKEN_STANDARDS
  decimals: number
  symbol: string
  canisterId: string
}

// Default token metadata for testing
export const DEFAULT_TOKEN_METADATA: TokenMetadata = {
  standard: 'ICRC1',
  decimals: 8,
  symbol: 'TEST',
  canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai' // ICP Ledger canister
}