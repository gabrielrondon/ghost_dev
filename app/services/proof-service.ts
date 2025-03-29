import { type Principal } from '@dfinity/principal'
import { type TokenStandard, type TokenOwnershipInput } from '@/types/token'

export interface ProofError {
  type: 
    | 'NotAuthorized'
    | 'InvalidInput'
    | 'ProofGenerationFailed'
    | 'VerificationFailed'
    | 'RateLimitExceeded'
    | 'UnsupportedTokenStandard'
  message: string
}

export interface ProofResult {
  success: boolean
  proof?: Uint8Array
  error?: ProofError
}

const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 seconds

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function generateProof({
  tokenOwnershipInput,
  actor,
  retryCount = 0
}: {
  tokenOwnershipInput: TokenOwnershipInput
  actor: any
  retryCount?: number
}): Promise<ProofResult> {
  try {
    const result = await actor.generate_proof(tokenOwnershipInput)

    if ('ok' in result) {
      return {
        success: true,
        proof: result.ok
      }
    }

    const error = result.err
    
    // Handle rate limiting with retries
    if (error.RateLimitExceeded && retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY * (retryCount + 1))
      return generateProof({
        tokenOwnershipInput,
        actor,
        retryCount: retryCount + 1
      })
    }

    return {
      success: false,
      error: {
        type: Object.keys(error)[0] as ProofError['type'],
        message: Object.values(error)[0] as string
      }
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'ProofGenerationFailed',
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      }
    }
  }
}

export async function verifyProof({
  proof,
  publicInputs,
  tokenStandard,
  actor,
  retryCount = 0
}: {
  proof: Uint8Array
  publicInputs: bigint[]
  tokenStandard: TokenStandard
  actor: any
  retryCount?: number
}): Promise<ProofResult> {
  try {
    const result = await actor.verify_proof(
      Array.from(proof),
      publicInputs.map(n => n.toString()),
      tokenStandard
    )

    if ('ok' in result) {
      return {
        success: result.ok
      }
    }

    const error = result.err

    // Handle rate limiting with retries
    if (error.RateLimitExceeded && retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY * (retryCount + 1))
      return verifyProof({
        proof,
        publicInputs,
        tokenStandard,
        actor,
        retryCount: retryCount + 1
      })
    }

    return {
      success: false,
      error: {
        type: Object.keys(error)[0] as ProofError['type'],
        message: Object.values(error)[0] as string
      }
    }
  } catch (err) {
    return {
      success: false,
      error: {
        type: 'VerificationFailed',
        message: err instanceof Error ? err.message : 'Unknown error occurred'
      }
    }
  }
}

// Utility function to check if we should retry based on error type
export function shouldRetry(error: ProofError): boolean {
  const retryableErrors = ['RateLimitExceeded', 'ProofGenerationFailed']
  return retryableErrors.includes(error.type)
}

// Utility function to format error messages for display
export function formatErrorMessage(error: ProofError): string {
  const errorMessages = {
    NotAuthorized: 'You are not authorized to perform this action.',
    InvalidInput: 'The provided input is invalid.',
    ProofGenerationFailed: 'Failed to generate the proof. Please try again.',
    VerificationFailed: 'The proof verification failed.',
    RateLimitExceeded: 'Too many requests. Please wait a moment and try again.',
    UnsupportedTokenStandard: 'This token standard is not supported.'
  }

  return errorMessages[error.type] || error.message
} 