import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface ProofRequest { 'token_id' : string, 'owner' : string }
export interface ProofResponse {
  'reference' : string,
  'proof' : Uint8Array | number[],
}
export interface _SERVICE {
  'get_proof_status' : ActorMethod<[string], string>,
  'request_proof' : ActorMethod<[ProofRequest], ProofResponse>,
}
