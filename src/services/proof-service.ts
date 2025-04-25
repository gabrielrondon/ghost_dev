import { HttpAgent, Actor } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { IDL } from '@dfinity/candid'
import { ZK_CANISTER_ID, IC_HOST } from '../config/canister.config'
import { TokenStandard, TokenMetadata, TokenOwnershipInput, ProofResult, VerificationResult } from '../types/tokens'

// Declare window.ic type
declare global {
  interface Window {
    ic?: {
      plug?: {
        agent?: {
          getPrincipal: () => Promise<Principal>
        }
      }
    }
  }
}

// Service interface
export interface ZkCanisterService {
  prove_ownership: (caller: Principal, input: TokenOwnershipInput) => Promise<ProofResult>
  verify_proof: (proof: number[]) => Promise<VerificationResult>
}

// Create actor instance
async function createActor(): Promise<ZkCanisterService> {
  const agent = new HttpAgent({ host: IC_HOST })
  if (IC_HOST.includes('localhost')) await agent.fetchRootKey()

  const idlFactory = ({ IDL }) => {
    const TokenStandard = IDL.Variant({
      ERC20: IDL.Null,
      ERC721: IDL.Null,
      ERC1155: IDL.Null
    })

    const TokenMetadata = IDL.Record({
      standard: TokenStandard,
      chain_id: IDL.Nat64,
      token_address: IDL.Text,
      token_id: IDL.Opt(IDL.Text)
    })

    const TokenOwnershipInput = IDL.Record({
      token: TokenMetadata,
      owner_address: IDL.Text,
      balance: IDL.Text,
      block_number: IDL.Nat64,
      proof_data: IDL.Vec(IDL.Text)
    })

    const ProofResult = IDL.Variant({
      Success: IDL.Vec(IDL.Nat8),
      Error: IDL.Text
    })

    const VerificationResult = IDL.Variant({
      Success: IDL.Bool,
      Error: IDL.Text
    })

    return IDL.Service({
      prove_ownership: IDL.Func([IDL.Principal, TokenOwnershipInput], [ProofResult], []),
      verify_proof: IDL.Func([IDL.Vec(IDL.Nat8)], [VerificationResult], ['query'])
    })
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: ZK_CANISTER_ID
  })
}

// Service functions
export async function generateProof({
  tokenMetadata,
  ownerAddress,
  balance,
  blockNumber,
  proofData
}: {
  tokenMetadata: TokenMetadata
  ownerAddress: string
  balance: string
  blockNumber: bigint
  proofData: string[]
}): Promise<ProofResult> {
  try {
    const actor = await createActor()
    const caller = await window.ic?.plug?.agent?.getPrincipal()
    if (!caller) throw new Error('No principal found')

    const input: TokenOwnershipInput = {
      token: tokenMetadata,
      owner_address: ownerAddress,
      balance,
      block_number: blockNumber,
      proof_data: proofData
    }

    return await actor.prove_ownership(caller, input)
  } catch (error) {
    return { Error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

export async function verifyProof(proof: number[]): Promise<VerificationResult> {
  try {
    const actor = await createActor()
    return await actor.verify_proof(proof)
  } catch (error) {
    return { Error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}