export const idlFactory = ({ IDL }) => {
  const AttestationData = IDL.Record({
    'minimum_balance' : IDL.Nat64,
    'token_id' : IDL.Nat64,
    'collection_id' : IDL.Nat64,
    'wallet_principal' : IDL.Principal,
    'token_canister_id' : IDL.Principal,
    'timestamp' : IDL.Int,
    'merkle_proof' : IDL.Vec(
      IDL.Record({ 'value' : IDL.Vec(IDL.Nat8), 'index' : IDL.Nat64 })
    ),
  });
  return IDL.Service({
    'create_attestation' : IDL.Func(
        [
          IDL.Record({
            'minimum_balance' : IDL.Nat64,
            'token_id' : IDL.Nat64,
            'collection_id' : IDL.Nat64,
            'wallet_principal' : IDL.Principal,
            'token_canister_id' : IDL.Principal,
          }),
        ],
        [
          IDL.Variant({
            'Ok' : IDL.Record({
              'proof_id' : IDL.Text,
              'attestation' : AttestationData,
            }),
            'Err' : IDL.Text,
          }),
        ],
        [],
      ),
    'get_canister_principal' : IDL.Func([], [IDL.Principal], []),
    'get_logs' : IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Record({
              'level' : IDL.Variant({
                'Error' : IDL.Null,
                'Info' : IDL.Null,
                'Debug' : IDL.Null,
                'Warning' : IDL.Null,
              }),
              'message' : IDL.Text,
              'timestamp' : IDL.Int,
              'details' : IDL.Opt(IDL.Text),
            })
          ),
        ],
        ['query'],
      ),
    'get_metrics' : IDL.Func(
        [],
        [
          IDL.Record({
            'failed_verifications' : IDL.Nat,
            'total_processing_time' : IDL.Int,
            'last_cleanup' : IDL.Int,
            'successful_verifications' : IDL.Nat,
            'request_count' : IDL.Nat,
            'total_attestations' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'reset_metrics' : IDL.Func([], [], []),
    'verify_attestation' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Bool, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
