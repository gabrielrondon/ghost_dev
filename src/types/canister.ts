export interface ICPAttestationInput {
  nft_merkle_path: bigint[]
  minimum_balance: bigint
  token_id: bigint
  collection_id: bigint
  wallet_principal: bigint
  token_canister_id: bigint
  merkle_root: bigint
  nft_merkle_indices: number[]
  token_merkle_path: bigint[]
  actual_balance: bigint
  token_merkle_indices: number[]
}

export interface VerificationResult {
  is_valid: boolean
  public_inputs: bigint[]
  proof: Uint8Array
}

export interface ZkCanisterService {
  generate_proof: (input: ICPAttestationInput) => Promise<VerificationResult>
  get_circuit_params: () => Promise<Uint8Array>
  verify_proof: (proof: Uint8Array, public_inputs: bigint[]) => Promise<boolean>
}

export interface ProofGenerationError {
  code: 'CANISTER_ERROR' | 'INVALID_INPUT' | 'NETWORK_ERROR'
  message: string
  details?: unknown
}

export interface ProofVerificationError {
  code: 'INVALID_PROOF' | 'NETWORK_ERROR' | 'PROOF_NOT_FOUND'
  message: string
  details?: unknown
}

export type ProofGenerationResult = {
  success: true
  result: VerificationResult
} | {
  success: false
  error: ProofGenerationError
}

export type ProofVerificationResult = {
  success: true
  isValid: boolean
} | {
  success: false
  error: ProofVerificationError
} 