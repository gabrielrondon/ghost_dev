export const idlFactory = ({ IDL }) => {
  const TokenProofRequest = IDL.Record({
    'token_id': IDL.Text,
    'min_balance': IDL.Nat,
    'wallet_address': IDL.Text,
  })
  
  const TokenProofResult = IDL.Record({
    'proof_id': IDL.Text,
    'merkle_root': IDL.Text,
    'proof_data': IDL.Vec(IDL.Tuple(IDL.Nat8, IDL.Vec(IDL.Nat8))),
    'anonymous_reference': IDL.Text,
    'timestamp': IDL.Nat64,
    'is_valid': IDL.Bool,
  })

  const Result = IDL.Variant({
    'Ok': TokenProofResult,
    'Err': IDL.Text,
  })

  const VerifyRequest = IDL.Record({
    'proof_id': IDL.Text,
    'anonymous_reference': IDL.Text,
  })

  return IDL.Service({
    'generate_token_proof': IDL.Func([TokenProofRequest], [Result], []),
    'verify_token_proof': IDL.Func([VerifyRequest], [Result], ['query']),
    'get_merkle_root': IDL.Func([], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], ['query']),
    'update_merkle_root': IDL.Func([IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
  })
} 