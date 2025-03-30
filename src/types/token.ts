import { Principal } from '@dfinity/principal'

export type TokenStandard = 'ICRC1' | 'ICRC2' | 'DIP20' | 'EXT'

export interface TokenMetadata {
  canister_id: Principal
  name: string
  symbol: string
  decimals: number
  total_supply: bigint
  token_standard: TokenStandard
  logo_url?: string
}

export interface TokenBalance {
  token: TokenMetadata
  balance: bigint
  owner: Principal
}

export interface TokenOwnershipInput {
  token_canister_id: Principal
  owner: Principal
  amount: bigint
  token_standard: TokenStandard
}

export interface TokenOwnershipProof extends TokenOwnershipInput {
  proof: string
  root: string
  timestamp: string
  public_inputs: {
    token_canister_id: string
    owner: string
    amount: string
    token_standard: TokenStandard
  }
}

export type TokenError = {
  message: string
  code: string
} 