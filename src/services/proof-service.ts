import { HttpAgent, QueryResponseRejected, QueryResponseReplied, SubmitResponse } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { IDL } from '@dfinity/candid'
import { ZK_CANISTER_ID, IC_HOST } from '../config/canister'

// Types from the Candid interface
export type TokenStandard = { EXT: null } | { DIP20: null } | { ICRC1: null } | { ICRC2: null }

export interface TokenMetadata {
  name: string
  symbol: string
  decimals: number
  fee: [] | [bigint]
  standard: TokenStandard
  total_supply: bigint
}

export interface TokenOwnershipInput {
  token_canister: Principal
  metadata: TokenMetadata
  owner: Principal
  spender: [] | [Principal]
  amount: bigint
  block_height: [] | [bigint]
  tx_id: [] | [bigint]
}

type ProofGenerationError = { InvalidInput: null } | { BalanceVerificationFailed: null } | { InternalError: null }
type ProofVerificationError = { InvalidProof: null } | { InternalError: null }

type ProofGenerationResult = { Ok: Uint8Array } | { Err: ProofGenerationError }
type ProofVerificationResult = { Ok: boolean } | { Err: ProofVerificationError }

// Define IDL types for the canister interface
const TokenMetadataType = IDL.Record({
  standard: IDL.Text,
  decimals: IDL.Nat8,
  symbol: IDL.Text,
  fee: IDL.Nat,
  name: IDL.Text,
  totalSupply: IDL.Nat
})

const TokenOwnershipInputType = IDL.Record({
  metadata: TokenMetadataType,
  owner: IDL.Principal,
  subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  spender: IDL.Opt(IDL.Principal),
  value: IDL.Nat,
  nonce: IDL.Nat
})

// Service functions
export async function generateProof({ 
  metadata,
  owner,
  subaccount,
  spender,
  value,
  nonce 
}: TokenOwnershipInput): Promise<string> {
  try {
    const agent = new HttpAgent({ host: IC_HOST })
    await agent.fetchRootKey()

    const proofInput = {
      metadata,
      owner,
      subaccount,
      spender,
      value,
      nonce
    }

    const response = await agent.call(
      Principal.fromText(ZK_CANISTER_ID),
      {
        methodName: 'prove_ownership',
        arg: IDL.encode([TokenOwnershipInputType], [proofInput])
      }
    ) as SubmitResponse

    if (!response.ok) {
      throw new Error(`Failed to generate proof: ${response.statusText}`)
    }

    const [proofId] = IDL.decode([IDL.Text], response.body) as [string]
    return proofId

  } catch (error) {
    console.error('Error generating proof:', error)
    throw new Error('Failed to generate proof')
  }
}

export async function verifyProof(proofId: string): Promise<boolean> {
  try {
    const agent = new HttpAgent({ host: IC_HOST })
    await agent.fetchRootKey()

    const response = await agent.query(
      Principal.fromText(ZK_CANISTER_ID),
      {
        methodName: 'verify_proof',
        arg: IDL.encode([IDL.Text], [proofId])
      }
    )

    if ((response as QueryResponseRejected).reject_message) {
      console.error('Proof verification rejected:', (response as QueryResponseRejected).reject_message)
      return false
    }

    const replied = response as QueryResponseReplied
    const [isValid] = IDL.decode([IDL.Bool], replied.reply.arg) as [boolean]
    return isValid

  } catch (error) {
    console.error('Error verifying proof:', error)
    return false
  }
} 