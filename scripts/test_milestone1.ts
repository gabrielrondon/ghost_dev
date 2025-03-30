import { Principal } from '@dfinity/principal'
import { ZK_CANISTER_ID, TOKEN_CANISTER_ID } from '../src/config/canister'
import { connectToPlug, createPlugActor } from '../src/services/icp'
import type { ProofInput, ZKCanister } from '../src/declarations/interfaces'
import type { VerificationResult } from '../src/types/index'
import { idlFactory } from '../src/declarations/backend'

export async function testMilestone1(): Promise<VerificationResult> {
  try {
    // Connect to Plug wallet and get principal
    const principal = await connectToPlug()
    console.log('Connected with principal:', principal.toString())

    // Create ZK canister actor
    const zkActor = await createPlugActor<ZKCanister>(ZK_CANISTER_ID, idlFactory)

    // Generate proof input
    const proofInput: ProofInput = {
      token_merkle_path: [],
      minimum_balance: BigInt(1),
      token_id: BigInt(1),
      collection_id: BigInt(TOKEN_CANISTER_ID),
      wallet_principal: BigInt(principal.toString()),
      token_canister_id: BigInt(TOKEN_CANISTER_ID),
      merkle_root: BigInt(0),
      nft_merkle_indices: [],
      actual_balance: BigInt(0), // Will be updated with actual balance
      token_merkle_indices: []
    }

    // Generate proof
    const proofResult = await zkActor.generateProof(proofInput)
    if ('err' in proofResult) {
      throw new Error(`Failed to generate proof: ${proofResult.err}`)
    }

    // Verify proof
    const verificationResult = await zkActor.verifyProof(
      proofResult.ok.proof,
      proofResult.ok.publicInputs
    )

    if ('err' in verificationResult) {
      throw new Error(`Failed to verify proof: ${verificationResult.err}`)
    }

    if (!verificationResult.ok) {
      throw new Error('Proof verification failed')
    }

    return {
      success: true,
      tokenAddress: TOKEN_CANISTER_ID,
      message: 'Token ownership verified successfully'
    }

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Run the test
testMilestone1().catch(console.error) 