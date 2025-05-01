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
  return IDL.Service({
    'generate_proof' : IDL.Func(
        [IDL.Nat64, IDL.Nat64, IDL.Nat64],
        [Result],
        [],
      ),
    'get_metrics' : IDL.Func([], [Metrics], ['query']),
    'verify_proof' : IDL.Func([ProofId], [VerifyResult], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
