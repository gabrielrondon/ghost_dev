import { Principal } from '@dfinity/principal'

export type TokenStandard = 'DIP20' | 'ICRC1' | 'ICRC2'

export interface TokenMetadata {
  canister_id: Principal
  name: string
  symbol: string
  decimals: number
  total_supply: bigint
  token_standard: TokenStandard
  metadata?: Record<string, string>
}

export interface TokenBalance {
  value: bigint
  timestamp: bigint
}

export interface TokenOwnershipInput {
  token_canister_id: Principal
  owner: Principal
  amount: bigint
  token_standard: TokenStandard
}

export interface TokenOwnershipProof {
  proof: Uint8Array
  public_inputs: bigint[]
  token_standard: TokenStandard
}

export type TokenError = {
  type: 'NotFound' | 'InvalidInput' | 'InsufficientBalance' | 'Unauthorized' | 'UnsupportedStandard'
  message: string
} 