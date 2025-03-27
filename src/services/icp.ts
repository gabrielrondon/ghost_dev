import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { idlFactory as mainCanisterIdl } from '@/declarations/main_canister/main_canister.did.js'
import { idlFactory as zkCanisterIdl } from '@/declarations/zk_canister/zk_canister.did.js'
import type { _SERVICE as MainCanisterService } from '@/declarations/main_canister/main_canister.did'
import type { _SERVICE as ZKCanisterService } from '@/declarations/zk_canister/zk_canister.did'

// Canister IDs
const CANISTER_IDS = {
  main: import.meta.env.VITE_MAIN_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai',
  zk: import.meta.env.VITE_ZK_CANISTER_ID || 'ryjl3-tyaaa-aaaaa-aaaba-cai'
}

// Create an HTTP agent for local development
const agent = new HttpAgent({
  host: import.meta.env.VITE_IC_HOST || 'http://127.0.0.1:8000'
})

// Create actors for the canisters
const mainActor = Actor.createActor<MainCanisterService>(mainCanisterIdl, {
  agent,
  canisterId: CANISTER_IDS.main
})

const zkActor = Actor.createActor<ZKCanisterService>(zkCanisterIdl, {
  agent,
  canisterId: CANISTER_IDS.zk
})

// Define the AttestationData interface to match the canister interface
export interface AttestationData {
  collection_id: bigint
  token_id: bigint
  token_canister_id: Principal
  wallet_principal: Principal
  merkle_proof: Array<{ index: bigint; value: Uint8Array | number[] }>
  minimum_balance: bigint
  timestamp: bigint
}

// Helper function to handle canister errors
function handleCanisterError(error: unknown): never {
  console.error('Canister error:', error)
  if (error instanceof Error) {
    throw new Error(`Canister operation failed: ${error.message}`)
  }
  throw new Error('Canister operation failed with unknown error')
}

export async function createAttestation(
  collectionId: bigint,
  tokenId: bigint,
  tokenCanisterId: Principal,
  walletPrincipal: Principal
): Promise<{ proofId: string; attestation: AttestationData }> {
  try {
    const result = await mainActor.create_attestation({
      collection_id: collectionId,
      token_id: tokenId,
      token_canister_id: tokenCanisterId,
      wallet_principal: walletPrincipal,
      minimum_balance: BigInt(1)
    })

    if ('Err' in result) {
      throw new Error(result.Err)
    }

    return {
      proofId: result.Ok.proof_id,
      attestation: result.Ok.attestation
    }
  } catch (error) {
    handleCanisterError(error)
  }
}

export async function verifyAttestation(proofId: string): Promise<boolean> {
  try {
    const result = await mainActor.verify_attestation(proofId)

    if ('Err' in result) {
      throw new Error(result.Err)
    }

    return result.Ok
  } catch (error) {
    handleCanisterError(error)
  }
}

export async function getAttestation(proofId: string): Promise<AttestationData | null> {
  try {
    const result = await mainActor.verify_attestation(proofId)
    
    if ('Ok' in result && result.Ok) {
      // If verification is successful, we would need to fetch the attestation
      // In a real implementation, we would need to store attestations after creation
      // For now, return null as we don't have a way to retrieve the attestation data
      console.warn('Attestation verified but no data available to return')
      return null
    } else {
      console.error('Attestation verification failed:', 'Err' in result ? result.Err : 'Unknown error')
    }
    
    return null
  } catch (error) {
    console.error('Failed to get attestation:', error)
    return null
  }
}

export async function getAttestationsByWallet(): Promise<AttestationData[]> {
  try {
    // The interface doesn't have get_attestations_by_wallet method
    // We'll need to implement a different approach
    
    console.warn('Getting attestations by wallet is not supported by the canister interface')
    // In a real implementation, we would need to maintain a client-side index
    // or add this functionality to the canister
    
    return []
  } catch (error) {
    console.error('Failed to get attestations by wallet:', error)
    return []
  }
}