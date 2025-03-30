import { Principal } from '@dfinity/principal'
import { HttpAgent } from '@dfinity/agent'

export interface TokenBalance {
  amount: number
  canisterId: string | null
  decimals: number
  image: string
  name: string
  symbol: string
}

export interface PlugProvider {
  requestConnect: (options: {
    whitelist: string[]
    host?: string
  }) => Promise<boolean>
  getPrincipal: () => Promise<Principal>
  requestBalance: () => Promise<TokenBalance[]>
  createActor: <T>(options: {
    canisterId: string
    interfaceFactory: any
  }) => Promise<T>
  isConnected: () => Promise<boolean>
  disconnect: () => Promise<void>
  agent?: HttpAgent
}

export interface ProofInput {
  token_merkle_path: bigint[]
  minimum_balance: bigint
  token_id: bigint
  collection_id: bigint
  wallet_principal: bigint
  token_canister_id: bigint
  merkle_root: bigint
  nft_merkle_indices: number[]
  actual_balance: bigint
  token_merkle_indices: number[]
}

export interface ProofResult {
  proof: Uint8Array
  publicInputs: Uint8Array
}

export interface NFTCanister {
  ownerOf: (tokenId: bigint) => Promise<Principal>
  tokenMetadata: (tokenId: bigint) => Promise<{
    name: string
    url: string
  }>
}

export interface ZKCanister {
  generateProof: (input: ProofInput) => Promise<{ ok: ProofResult } | { err: string }>
  verifyProof: (proof: Uint8Array, publicInputs: Uint8Array) => Promise<{ ok: boolean } | { err: string }>
}

export const nftCanisterInterface = ({ IDL }: { IDL: any }) => {
  return IDL.Service({
    ownerOf: IDL.Func(
      [IDL.Nat],
      [IDL.Variant({ ok: IDL.Principal, err: IDL.Text })],
      ['query']
    ),
    tokenMetadata: IDL.Func(
      [IDL.Nat],
      [
        IDL.Record({
          name: IDL.Text,
          image: IDL.Opt(IDL.Text),
          description: IDL.Opt(IDL.Text),
          attributes: IDL.Opt(
            IDL.Vec(
              IDL.Record({
                trait_type: IDL.Text,
                value: IDL.Text,
              })
            )
          ),
        }),
      ],
      ['query']
    ),
  })
}

export const zkCanisterInterface = ({ IDL }: { IDL: any }) => {
  return IDL.Service({
    generateProof: IDL.Func(
      [
        IDL.Record({
          nft_merkle_path: IDL.Vec(IDL.Nat),
          minimum_balance: IDL.Nat,
          token_id: IDL.Nat,
          collection_id: IDL.Nat,
          wallet_principal: IDL.Nat,
          token_canister_id: IDL.Nat,
          merkle_root: IDL.Nat,
          nft_merkle_indices: IDL.Vec(IDL.Nat8),
          token_merkle_path: IDL.Vec(IDL.Nat),
          actual_balance: IDL.Nat,
          token_merkle_indices: IDL.Vec(IDL.Nat8),
        }),
      ],
      [
        IDL.Variant({
          ok: IDL.Record({
            proof: IDL.Vec(IDL.Nat8),
            publicInputs: IDL.Vec(IDL.Nat8),
          }),
          err: IDL.Text,
        }),
      ],
      []
    ),
    verifyProof: IDL.Func(
      [IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8)],
      [IDL.Variant({ ok: IDL.Bool, err: IDL.Text })],
      ['query']
    ),
  })
} 