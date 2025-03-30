export const idlFactory = ({ IDL }) => {
  const VerificationResult = IDL.Record({
    'is_valid' : IDL.Bool,
    'message' : IDL.Text,
  });
  return IDL.Service({
    'generate_proof' : IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Vec(IDL.Nat8)], []),
    'verify_proof' : IDL.Func(
        [IDL.Vec(IDL.Nat8)],
        [VerificationResult],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
