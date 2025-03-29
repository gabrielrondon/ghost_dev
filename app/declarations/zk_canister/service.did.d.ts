import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ICPAttestationInput {
  'nft_merkle_path' : BigUint64Array | bigint[],
  'minimum_balance' : bigint,
  'token_id' : bigint,
  'collection_id' : bigint,
  'wallet_principal' : bigint,
  'token_canister_id' : bigint,
  'merkle_root' : bigint,
  'nft_merkle_indices' : Uint8Array | number[],
  'token_merkle_path' : BigUint64Array | bigint[],
  'actual_balance' : bigint,
  'token_merkle_indices' : Uint8Array | number[],
}
export interface VerificationResult {
  'is_valid' : boolean,
  'public_inputs' : BigUint64Array | bigint[],
  'proof' : Uint8Array | number[],
}
export interface _SERVICE {
  'generate_proof' : ActorMethod<[ICPAttestationInput], VerificationResult>,
  'get_circuit_params' : ActorMethod<[], Uint8Array | number[]>,
  'verify_proof' : ActorMethod<
    [Uint8Array | number[], BigUint64Array | bigint[]],
    boolean
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
