import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AttestationData {
  'minimum_balance' : bigint,
  'token_id' : bigint,
  'collection_id' : bigint,
  'wallet_principal' : Principal,
  'token_canister_id' : Principal,
  'timestamp' : bigint,
  'merkle_proof' : Array<{ 'value' : Uint8Array | number[], 'index' : bigint }>,
}
export interface _SERVICE {
  'create_attestation' : ActorMethod<
    [
      {
        'minimum_balance' : bigint,
        'token_id' : bigint,
        'collection_id' : bigint,
        'wallet_principal' : Principal,
        'token_canister_id' : Principal,
      },
    ],
    { 'Ok' : { 'proof_id' : string, 'attestation' : AttestationData } } |
      { 'Err' : string }
  >,
  'get_canister_principal' : ActorMethod<[], Principal>,
  'get_logs' : ActorMethod<
    [],
    Array<
      {
        'level' : { 'Error' : null } |
          { 'Info' : null } |
          { 'Debug' : null } |
          { 'Warning' : null },
        'message' : string,
        'timestamp' : bigint,
        'details' : [] | [string],
      }
    >
  >,
  'get_metrics' : ActorMethod<
    [],
    {
      'failed_verifications' : bigint,
      'total_processing_time' : bigint,
      'last_cleanup' : bigint,
      'successful_verifications' : bigint,
      'request_count' : bigint,
      'total_attestations' : bigint,
    }
  >,
  'reset_metrics' : ActorMethod<[], undefined>,
  'verify_attestation' : ActorMethod<
    [string],
    { 'Ok' : boolean } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
