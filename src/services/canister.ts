import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { idlFactory } from '../../.dfx/local/canisters/zk_canister/service.did.js'
import type { 
  ICPAttestationInput, 
  VerificationResult, 
  ZkCanisterService,
  ProofGenerationResult,
  ProofVerificationResult,
  ProofGenerationError,
  ProofVerificationError
} from '@/types/canister'

const ZK_CANISTER_ID = process.env.NEXT_PUBLIC_ZK_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai'
const IC_HOST = process.env.NEXT_PUBLIC_IC_HOST || 'http://localhost:4943'

class CanisterService {
  private agent: HttpAgent
  private actor: ZkCanisterService

  constructor() {
    this.agent = new HttpAgent({ host: IC_HOST })
    
    // Only fetch root key in development
    if (process.env.NODE_ENV !== 'production') {
      this.agent.fetchRootKey().catch(console.error)
    }

    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: ZK_CANISTER_ID,
    })
  }

  async generateProof(input: ICPAttestationInput): Promise<ProofGenerationResult> {
    try {
      const result = await this.actor.generate_proof(input)
      return {
        success: true,
        result
      }
    } catch (error) {
      console.error('Failed to generate proof:', error)
      return {
        success: false,
        error: this.handleProofGenerationError(error)
      }
    }
  }

  async verifyProof(proof: Uint8Array, publicInputs: bigint[]): Promise<ProofVerificationResult> {
    try {
      const isValid = await this.actor.verify_proof(proof, publicInputs)
      return {
        success: true,
        isValid
      }
    } catch (error) {
      console.error('Failed to verify proof:', error)
      return {
        success: false,
        error: this.handleProofVerificationError(error)
      }
    }
  }

  async getCircuitParams(): Promise<Uint8Array> {
    return this.actor.get_circuit_params()
  }

  private handleProofGenerationError(error: unknown): ProofGenerationError {
    if (error instanceof Error) {
      if (error.message.includes('Invalid input')) {
        return {
          code: 'INVALID_INPUT',
          message: 'Invalid input parameters for proof generation',
          details: error
        }
      }
      if (error.message.includes('Canister')) {
        return {
          code: 'CANISTER_ERROR',
          message: 'Error in canister execution',
          details: error
        }
      }
    }
    return {
      code: 'NETWORK_ERROR',
      message: 'Failed to communicate with the canister',
      details: error
    }
  }

  private handleProofVerificationError(error: unknown): ProofVerificationError {
    if (error instanceof Error) {
      if (error.message.includes('Invalid proof')) {
        return {
          code: 'INVALID_PROOF',
          message: 'The provided proof is invalid',
          details: error
        }
      }
      if (error.message.includes('not found')) {
        return {
          code: 'PROOF_NOT_FOUND',
          message: 'The requested proof was not found',
          details: error
        }
      }
    }
    return {
      code: 'NETWORK_ERROR',
      message: 'Failed to communicate with the canister',
      details: error
    }
  }
}

export const canisterService = new CanisterService() 