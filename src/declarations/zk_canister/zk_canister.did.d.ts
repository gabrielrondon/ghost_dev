import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface VerificationResult { 'is_valid' : boolean, 'message' : string }
export interface _SERVICE {
  'generate_proof' : ActorMethod<
    [Uint8Array | number[]],
    Uint8Array | number[]
  >,
  'verify_proof' : ActorMethod<[Uint8Array | number[]], VerificationResult>,
}
