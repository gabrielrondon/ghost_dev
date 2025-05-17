export const idlFactory = ({ IDL }) => {
  const ProofId = IDL.Nat64;
  const Result = IDL.Variant({ 'Ok' : ProofId, 'Err' : IDL.Text });
  const Metrics = IDL.Record({
    'total_proofs_verified' : IDL.Nat64,
    'avg_proof_generation_time_ms' : IDL.Nat64,
    'total_proofs_generated' : IDL.Nat64,
    'avg_proof_verification_time_ms' : IDL.Nat64,
  });
  const VerifyResult = IDL.Variant({ 'Ok' : IDL.Bool, 'Err' : IDL.Text });
  const TokenStandard = IDL.Variant({
    'ICRC1' : IDL.Null,
    'ICRC2' : IDL.Null,
    'DIP20' : IDL.Null,
    'EXT' : IDL.Null,
  });
  const TokenOwnershipInput = IDL.Record({
    'balance' : IDL.Nat64,
    'min_range' : IDL.Nat64,
    'max_range' : IDL.Nat64,
    'token_canister' : IDL.Principal,
    'token_standard' : TokenStandard,
  });
  return IDL.Service({
    'generate_proof' : IDL.Func(
        [TokenOwnershipInput],
        [Result],
        [],
      ),
    'get_metrics' : IDL.Func([], [Metrics], ['query']),
    'verify_proof' : IDL.Func([ProofId], [VerifyResult], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
