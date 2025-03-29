import type { Principal } from '@dfinity/principal'

export interface TokenProofRequest {
  token_id: string
  min_balance: bigint
  wallet_address: string
}

export interface TokenProofResult {
  proof_id: string
  merkle_root: string
  proof_data: Array<[number, Array<number>]>
  anonymous_reference: string
  timestamp: bigint
  is_valid: boolean
}

export type Result<T, E> = { Ok: T } | { Err: E }

export interface _SERVICE {
  generate_token_proof: (request: TokenProofRequest) => Promise<Result<TokenProofResult, string>>
  verify_token_proof: (request: { proof_id: string, anonymous_reference: string }) => Promise<Result<TokenProofResult, string>>
  get_merkle_root: () => Promise<Result<string, string>>
  update_merkle_root: (root: string) => Promise<Result<null, string>>
} 