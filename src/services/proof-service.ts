import { HttpAgent, SubmitResponse } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { IDL } from '@dfinity/candid'
import { TokenMetadata } from '../types/token'
import { ZK_CANISTER_ID, IC_HOST } from '../config/canister-config'

// Initialize agent
const agent = new HttpAgent({ host: IC_HOST })

interface ProofGenerationInput {
  tokenMetadata: TokenMetadata
  ownerPrincipal: string
  amount: bigint
  timestamp: bigint
}

interface ProofGenerationResult {
  proofId: string
  proofBlob: Uint8Array
}

interface ProofVerificationInput {
  proofBlob: Uint8Array
}

interface ProofVerificationResult {
  isValid: boolean
  error?: string
}

interface TokenOwnershipInput {
  balance: bigint
  index: number
  proof: number[]
}

interface ProofGenerationInput {
  principal: Principal
  tokenMetadata: TokenMetadata
  ownershipInput: TokenOwnershipInput
}

const zkCanisterIdl = ({ IDL }: { IDL: any }) => {
  return IDL.Service({
    prove_ownership: IDL.Func(
      [IDL.Text, {
        principal: IDL.Text,
        metadata: {
          standard: IDL.Text,
          canister: IDL.Text,
          symbol: IDL.Text,
          name: IDL.Text,
          decimals: IDL.Nat8
        },
        ownership: {
          balance: IDL.Nat,
          index: IDL.Nat32,
          proof: IDL.Vec(IDL.Nat8)
        }
      }],
      [IDL.Vec(IDL.Nat8)],
      []
    ),
    verify_proof: IDL.Func(
      [IDL.Vec(IDL.Nat8)],
      [IDL.Bool],
      []
    )
  })
}

export async function generateProof({
  tokenMetadata,
  ownerPrincipal,
  amount,
  timestamp
}: ProofGenerationInput): Promise<ProofGenerationResult> {
  try {
    const ownershipInput = {
      principal: Principal.fromText(ownerPrincipal),
      token: {
        standard: tokenMetadata.standard,
        decimals: tokenMetadata.decimals,
        symbol: tokenMetadata.symbol,
        canister: Principal.fromText(tokenMetadata.canisterId)
      },
      amount,
      timestamp
    }

    // Call the ZK canister to generate proof
    const response = await agent.call(
      Principal.fromText(ZK_CANISTER_ID),
      {
        methodName: 'prove_ownership',
        arg: IDL.encode([
          IDL.Text,
          IDL.Record({
            principal: IDL.Principal,
            token: IDL.Record({
              standard: IDL.Text,
              decimals: IDL.Nat8,
              symbol: IDL.Text,
              canister: IDL.Principal
            }),
            amount: IDL.Nat,
            timestamp: IDL.Nat64
          })
        ], ['test', ownershipInput])
      }
    ) as unknown as ArrayBuffer

    // Process result and return proof data
    const [proofId, proofBlob] = IDL.decode(
      [IDL.Text, IDL.Vec(IDL.Nat8)], 
      response
    ) as [string, Uint8Array]
    
    return {
      proofId,
      proofBlob
    }

  } catch (error) {
    console.error('Error generating proof:', error)
    throw new Error('Failed to generate proof')
  }
}

export async function verifyProof({
  proofBlob
}: ProofVerificationInput): Promise<ProofVerificationResult> {
  try {
    // Call the ZK canister to verify proof
    const response = await agent.call(
      Principal.fromText(ZK_CANISTER_ID),
      {
        methodName: 'verify_proof',
        arg: IDL.encode([IDL.Vec(IDL.Nat8)], [proofBlob])
      }
    ) as unknown as ArrayBuffer

    const [isValid] = IDL.decode([IDL.Bool], response) as [boolean]

    return {
      isValid
    }
  } catch (error) {
    console.error('Error verifying proof:', error)
    return {
      isValid: false,
      error: 'Failed to verify proof'
    }
  }
}