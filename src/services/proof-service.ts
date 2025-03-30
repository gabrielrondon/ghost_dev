import { Actor } from '@dfinity/agent'
import { backend } from '@/declarations/backend'
import type { TokenProofRequest, TokenProofResult } from '@/declarations/backend/backend.did'

interface GenerateProofParams {
  tokenId: string
  minBalance: bigint
  walletAddress: string
  merkleRoot: string
}

interface VerifyProofParams {
  proofId: string
  anonymousReference: string
}

export async function generateProof({
  tokenId,
  minBalance,
  walletAddress,
  merkleRoot
}: GenerateProofParams): Promise<{
  proofId: string
  anonymousReference: string
}> {
  try {
    const request: TokenProofRequest = {
      token_id: tokenId,
      min_balance: minBalance,
      wallet_address: walletAddress
    }

    const result = await backend.generate_token_proof(request)

    if ('Err' in result) {
      throw new Error(result.Err)
    }

    const proofResult = result.Ok
    return {
      proofId: proofResult.proof_id,
      anonymousReference: proofResult.anonymous_reference
    }
  } catch (error) {
    console.error('Error generating proof:', error)
    throw new Error('Failed to generate proof. Please try again.')
  }
}

export async function verifyProof({
  proofId,
  anonymousReference
}: VerifyProofParams): Promise<{
  isValid: boolean
  timestamp: bigint
  merkleRoot: string
}> {
  try {
    const result = await backend.verify_token_proof({
      proof_id: proofId,
      anonymous_reference: anonymousReference
    })

    if ('Err' in result) {
      throw new Error(result.Err)
    }

    const verificationResult = result.Ok
    return {
      isValid: verificationResult.is_valid,
      timestamp: verificationResult.timestamp,
      merkleRoot: verificationResult.merkle_root
    }
  } catch (error) {
    console.error('Error verifying proof:', error)
    throw new Error('Failed to verify proof. Please try again.')
  }
} 