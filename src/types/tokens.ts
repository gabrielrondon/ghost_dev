export type TokenStandard = { ERC20: null } | { ERC721: null } | { ERC1155: null }

export interface TokenMetadata {
  standard: TokenStandard
  chain_id: bigint
  token_address: string
  token_id: string | null
}

export interface TokenOwnershipInput {
  token: TokenMetadata
  owner_address: string
  balance: string
  block_number: bigint
  proof_data: string[]
}

export type ProofResult = { Success: number[] } | { Error: string }
export type VerificationResult = { Success: boolean } | { Error: string } 