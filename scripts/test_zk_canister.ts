import pkg from '@dfinity/agent';
const { Actor, HttpAgent } = pkg;
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import fetch from 'node-fetch';

// Set global fetch for agent to use
// @ts-ignore
global.fetch = fetch;

// Canister IDs from our deployment
const ZK_CANISTER_ID = 'bkyz2-fmaaa-aaaaa-qaaaq-cai'; // Local canister ID
const MAIN_CANISTER_ID = 'hp6ha-baaaa-aaaad-aaloq-cai';

// Define token types
type TokenStandard = { ERC20: null } | { ERC721: null } | { ERC1155: null } | { ICRC1: null } | { ICRC2: null } | { ICP: null };

interface TokenMetadata {
  canister_id: string
  token_standard: TokenStandard
  decimals: [] | [number]
}

interface TokenOwnershipInput {
  token_metadata: TokenMetadata
  token_id: Uint8Array
  balance: Uint8Array
  owner_hash: Uint8Array
  merkle_path: Uint8Array[]
  path_indices: Uint8Array
  token_specific_data: [] | [Uint8Array]
}

// Test configuration
const TEST_TOKEN_METADATA: TokenMetadata = {
  canister_id: "rrkah-fqaaa-aaaaa-aaaaq-cai", // Example canister ID
  token_standard: { ICRC1: null },
  decimals: [8] // Explicitly as a single-element tuple
};

const TEST_BALANCE = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 100]); // Example balance (100)
const TEST_OWNER = Principal.fromText('2vxsx-fae'); // Example principal

// Define the interface for the ZK canister
interface ZKCanister {
  prove_ownership: (param_id: string, input: TokenOwnershipInput) => Promise<{ Ok: Uint8Array } | { Err: string }>
  verify_proof: (proofBytes: Uint8Array) => Promise<{ Ok: boolean } | { Err: string }>
}

// Define a basic IDL interface factory
const IDLFactory = {
  idlFactory: ({ IDL }: { IDL: any }) => {
    const TokenStandard = IDL.Variant({
      'ERC20': IDL.Null,
      'ERC721': IDL.Null,
      'ERC1155': IDL.Null,
      'ICRC1': IDL.Null,
      'ICRC2': IDL.Null,
      'ICP': IDL.Null,
    });
    
    const TokenMetadata = IDL.Record({
      'canister_id': IDL.Text,
      'token_standard': TokenStandard,
      'decimals': IDL.Opt(IDL.Nat8),
    });
    
    const TokenOwnershipInput = IDL.Record({
      'token_metadata': TokenMetadata,
      'token_id': IDL.Vec(IDL.Nat8),
      'balance': IDL.Vec(IDL.Nat8),
      'owner_hash': IDL.Vec(IDL.Nat8),
      'merkle_path': IDL.Vec(IDL.Vec(IDL.Nat8)),
      'path_indices': IDL.Vec(IDL.Nat8),
      'token_specific_data': IDL.Opt(IDL.Vec(IDL.Nat8)),
    });
    
    const Result = IDL.Variant({
      'Ok': IDL.Bool,
      'Err': IDL.Text,
    });
    
    return IDL.Service({
      'prove_ownership': IDL.Func([IDL.Text, TokenOwnershipInput], [IDL.Variant({
        'Ok': IDL.Vec(IDL.Nat8),
        'Err': IDL.Text,
      })], []),
      'verify_proof': IDL.Func([IDL.Vec(IDL.Nat8)], [Result], ['query']),
    });
  },
};

async function main() {
  try {
    console.log('🧪 Starting ZK Canister Tests');

    // Create an agent
    const agent = new HttpAgent({
      host: 'http://127.0.0.1:8000' // Local replica
    });

    // Fetch the root key for the local replica
    await agent.fetchRootKey();

    // Create actor
    const zkCanister = Actor.createActor<ZKCanister>(IDLFactory.idlFactory, {
      agent,
      canisterId: ZK_CANISTER_ID
    });

    console.log('Generating proof of ownership...');
    
    // Generate example input for ownership proof
    const ownershipInput: TokenOwnershipInput = {
      token_metadata: TEST_TOKEN_METADATA,
      token_id: new Uint8Array([1, 2, 3, 4]), // Example token ID
      balance: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 100]), // Example balance (100)
      owner_hash: new Uint8Array(Array(32).fill(1)), // Example owner hash
      merkle_path: [
        new Uint8Array(Array(32).fill(2)), // Example Merkle path node
        new Uint8Array(Array(32).fill(3)),
      ],
      path_indices: new Uint8Array([0, 1]), // Example path indices
      token_specific_data: []  // No token-specific data
    };
    
    // Generate the proof
    const proofResult = await zkCanister.prove_ownership('default', ownershipInput);
    
    if ('Ok' in proofResult) {
      console.log('✅ Proof generated successfully!');
      console.log(`Proof size: ${proofResult.Ok.length} bytes`);
      
      // Verify the proof
      console.log('Verifying proof...');
      const verificationResult = await zkCanister.verify_proof(proofResult.Ok);
      
      if ('Ok' in verificationResult) {
        if (verificationResult.Ok) {
          console.log('✅ Proof verified successfully!');
        } else {
          console.log('❌ Proof verification failed!');
        }
      } else {
        console.log(`❌ Verification error: ${verificationResult.Err}`);
      }
    } else {
      console.log(`❌ Proof generation error: ${proofResult.Err}`);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main(); 