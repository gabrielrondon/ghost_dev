import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Metrics {
  'total_proofs_verified' : bigint,
  'avg_proof_generation_time_ms' : bigint,
  'total_proofs_generated' : bigint,
  'avg_proof_verification_time_ms' : bigint,
}
export interface Proof {
  'proof_bytes' : Uint8Array | number[],
  'public_inputs' : BigUint64Array | bigint[],
}
export type ProofId = bigint;
export type Result = { 'Ok' : ProofId } |
  { 'Err' : string };
export type VerifyResult = { 'Ok' : boolean } |
  { 'Err' : string };
export interface _SERVICE {
  'generate_proof' : ActorMethod<[bigint, bigint, bigint], Result>,
  'get_metrics' : ActorMethod<[], Metrics>,
  'verify_proof' : ActorMethod<[ProofId], VerifyResult>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
