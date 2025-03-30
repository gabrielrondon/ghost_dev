export const idlFactory = ({ IDL }) => {
  const ProofRequest = IDL.Record({
    'token_id' : IDL.Text,
    'owner' : IDL.Text,
  });
  const ProofResponse = IDL.Record({
    'reference' : IDL.Text,
    'proof' : IDL.Vec(IDL.Nat8),
  });
  return IDL.Service({
    'get_proof_status' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'request_proof' : IDL.Func([ProofRequest], [ProofResponse], []),
  });
};
export const init = ({ IDL }) => { return []; };
