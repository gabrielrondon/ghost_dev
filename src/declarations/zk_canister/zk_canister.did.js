export const idlFactory = ({ IDL }) => {
  const ICPAttestationInput = IDL.Record({
    'nft_merkle_path' : IDL.Vec(IDL.Nat64),
    'minimum_balance' : IDL.Nat64,
    'token_id' : IDL.Nat64,
    'collection_id' : IDL.Nat64,
    'wallet_principal' : IDL.Nat64,
    'token_canister_id' : IDL.Nat64,
    'merkle_root' : IDL.Nat64,
    'nft_merkle_indices' : IDL.Vec(IDL.Nat8),
    'token_merkle_path' : IDL.Vec(IDL.Nat64),
    'actual_balance' : IDL.Nat64,
    'token_merkle_indices' : IDL.Vec(IDL.Nat8),
  });
  const VerificationResult = IDL.Record({
    'is_valid' : IDL.Bool,
    'public_inputs' : IDL.Vec(IDL.Nat64),
    'proof' : IDL.Vec(IDL.Nat8),
  });
  return IDL.Service({
    'generate_proof' : IDL.Func(
        [ICPAttestationInput],
        [VerificationResult],
        [],
      ),
    'get_circuit_params' : IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
    'verify_proof' : IDL.Func(
        [IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat64)],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
