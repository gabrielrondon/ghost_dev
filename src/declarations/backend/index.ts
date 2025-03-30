import { Actor, HttpAgent, type ActorMethod } from '@dfinity/agent'
import { type IDL } from '@dfinity/candid'
import type { TokenProofRequest, TokenProofResult, Result } from './backend.did'

// Define the service interface
export interface Service {
  generate_token_proof: ActorMethod<[TokenProofRequest], Result<TokenProofResult, string>>
  verify_token_proof: ActorMethod<[{ proof_id: string, anonymous_reference: string }], Result<TokenProofResult, string>>
  get_merkle_root: ActorMethod<[], Result<string, string>>
  update_merkle_root: ActorMethod<[string], Result<null, string>>
}

// Create and export the IDL factory
export const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const TokenProofRequest = IDL.Record({
    token_id: IDL.Text,
    min_balance: IDL.Nat64,
    wallet_address: IDL.Text,
  })

  const TokenProofResult = IDL.Record({
    proof_id: IDL.Text,
    merkle_root: IDL.Text,
    proof_data: IDL.Vec(IDL.Tuple([IDL.Nat8, IDL.Vec(IDL.Nat8)])),
    anonymous_reference: IDL.Text,
    timestamp: IDL.Nat64,
    is_valid: IDL.Bool,
  })

  const ResultType = <T extends IDL.Type, E extends IDL.Type>(ok: T, err: E) => IDL.Variant({
    Ok: ok,
    Err: err,
  })

  return IDL.Service({
    generate_token_proof: IDL.Func([TokenProofRequest], [ResultType(TokenProofResult, IDL.Text)], []),
    verify_token_proof: IDL.Func([IDL.Record({ proof_id: IDL.Text, anonymous_reference: IDL.Text })], [ResultType(TokenProofResult, IDL.Text)], []),
    get_merkle_root: IDL.Func([], [ResultType(IDL.Text, IDL.Text)], ['query']),
    update_merkle_root: IDL.Func([IDL.Text], [ResultType(IDL.Null, IDL.Text)], []),
  })
}

// Create an agent for local development
const agent = new HttpAgent({
  host: process.env.NEXT_PUBLIC_IC_HOST || 'http://localhost:4943',
})

// Create a canister actor
export const createActor = (canisterId: string) => {
  return Actor.createActor<Service>(idlFactory, {
    agent,
    canisterId,
  })
}

// Export the backend canister ID
export const canisterId = process.env.NEXT_PUBLIC_BACKEND_CANISTER_ID || 'bkyz2-fmaaa-aaaaa-qaaaq-cai'

// Create and export the backend actor
export const backend = createActor(canisterId) 