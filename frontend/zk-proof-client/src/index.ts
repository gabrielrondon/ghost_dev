import { Actor, ActorSubclass, HttpAgent, Identity } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { IDL } from '@dfinity/candid'
import { _SERVICE, idlFactory } from './declarations/zk_canister_v2'

export interface ZKProofConfig {
  canisterId: string | Principal
  agent?: HttpAgent
  identity?: Identity
}

export interface ProofGenerationParams {
  balance: bigint
  minRange: bigint
  maxRange: bigint
}

export class ZKProofError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = 'ZKProofError'
  }
}

export class ZKProofClient {
  private actor: ActorSubclass<_SERVICE>
  private agent: HttpAgent

  constructor(config: ZKProofConfig) {
    this.agent = config.agent || new HttpAgent({
      identity: config.identity
    })

    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: typeof config.canisterId === 'string' 
        ? Principal.fromText(config.canisterId)
        : config.canisterId
    })
  }

  async generateProof(params: ProofGenerationParams): Promise<bigint> {
    try {
      const result = await this.actor.generate_proof(
        params.balance,
        params.minRange,
        params.maxRange
      )

      if ('Ok' in result) {
        return result.Ok
      }

      throw new ZKProofError(result.Err, 'GENERATION_FAILED')
    } catch (error) {
      if (error instanceof ZKProofError) throw error
      throw new ZKProofError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNEXPECTED_ERROR'
      )
    }
  }

  async verifyProof(proofId: bigint): Promise<boolean> {
    try {
      const result = await this.actor.verify_proof(proofId)

      if ('Ok' in result) {
        return result.Ok
      }

      throw new ZKProofError(result.Err, 'VERIFICATION_FAILED')
    } catch (error) {
      if (error instanceof ZKProofError) throw error
      throw new ZKProofError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNEXPECTED_ERROR'
      )
    }
  }

  async getMetrics(): Promise<{
    totalProofsGenerated: bigint
    totalProofsVerified: bigint
    avgProofGenerationTimeMs: bigint
    avgProofVerificationTimeMs: bigint
  }> {
    const metrics = await this.actor.get_metrics()
    return {
      totalProofsGenerated: metrics.total_proofs_generated,
      totalProofsVerified: metrics.total_proofs_verified,
      avgProofGenerationTimeMs: metrics.avg_proof_generation_time_ms,
      avgProofVerificationTimeMs: metrics.avg_proof_verification_time_ms
    }
  }
}

// Error codes
export const ZKProofErrorCodes = {
  INSUFFICIENT_CYCLES: 'INSUFFICIENT_CYCLES',
  PROOF_LIMIT_EXCEEDED: 'PROOF_LIMIT_EXCEEDED',
  INVALID_INPUT: 'INVALID_INPUT',
  TOKEN_VERIFICATION_FAILED: 'TOKEN_VERIFICATION_FAILED',
  PROOF_NOT_FOUND: 'PROOF_NOT_FOUND',
  PROOF_EXPIRED: 'PROOF_EXPIRED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR'
} as const

export type ZKProofErrorCode = typeof ZKProofErrorCodes[keyof typeof ZKProofErrorCodes] 