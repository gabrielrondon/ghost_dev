import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { IDL } from '@dfinity/candid'
import { ZK_CANISTER_ID, IC_HOST } from '../config/canister-config'

// Define token types
const TokenStandard = IDL.Variant({
  'ERC20': IDL.Null,
  'ERC721': IDL.Null,
  'ERC1155': IDL.Null,
  'ICRC1': IDL.Null,
  'ICRC2': IDL.Null,
  'ICP': IDL.Null,
})

const TokenMetadata = IDL.Record({
  'canister_id': IDL.Text,
  'token_standard': TokenStandard,
  'decimals': IDL.Opt(IDL.Nat8),
})

const TokenOwnershipInput = IDL.Record({
  'token_metadata': TokenMetadata,
  'token_id': IDL.Vec(IDL.Nat8),
  'balance': IDL.Vec(IDL.Nat8),
  'owner_hash': IDL.Vec(IDL.Nat8),
  'merkle_path': IDL.Vec(IDL.Vec(IDL.Nat8)),
  'path_indices': IDL.Vec(IDL.Nat8),
  'token_specific_data': IDL.Opt(IDL.Vec(IDL.Nat8)),
})

const Result = IDL.Variant({
  'Ok': IDL.Bool,
  'Err': IDL.Text,
})

// TypeScript interfaces to match Candid types
interface TokenStandardType {
  'ERC20'?: null;
  'ERC721'?: null;
  'ERC1155'?: null;
  'ICRC1'?: null;
  'ICRC2'?: null;
  'ICP'?: null;
}

interface TokenMetadataType {
  canister_id: string;
  token_standard: TokenStandardType;
  decimals: [] | [number];
}

interface TokenOwnershipInputType {
  token_metadata: TokenMetadataType;
  token_id: Uint8Array;
  balance: Uint8Array;
  owner_hash: Uint8Array;
  merkle_path: Uint8Array[];
  path_indices: Uint8Array;
  token_specific_data: [] | [Uint8Array];
}

// Define ZK canister actor interface
interface ZKCanisterActor {
  prove_ownership: (param_id: string, input: TokenOwnershipInputType) => 
    Promise<{ Ok: Uint8Array } | { Err: string }>;
  verify_proof: (proofBytes: Uint8Array) => 
    Promise<{ Ok: boolean } | { Err: string }>;
}

// Interface for zk_canister
const zkCanisterInterface = () => {
  return IDL.Service({
    'prove_ownership': IDL.Func([IDL.Text, TokenOwnershipInput], [IDL.Variant({
      'Ok': IDL.Vec(IDL.Nat8),
      'Err': IDL.Text,
    })], []),
    'verify_proof': IDL.Func([IDL.Vec(IDL.Nat8)], [Result], ['query']),
  })
}

// Helper function to get ZK canister actor
async function getZkCanisterActor(): Promise<ZKCanisterActor> {
  const agent = new HttpAgent({ host: IC_HOST })
  
  // When in local development, we need to fetch the root key
  if (IC_HOST.includes('127.0.0.1') || IC_HOST.includes('localhost')) {
    await agent.fetchRootKey()
  }
  
  return Actor.createActor<ZKCanisterActor>(zkCanisterInterface, {
    agent,
    canisterId: ZK_CANISTER_ID,
  })
}

// Types
export interface GenerateProofParams {
  tokenId: string
  minBalance: string
  principal: string
}

export interface ProofResult {
  id: string
  success: boolean
  message: string
  verificationUrl: string | null
}

// Helper function to convert string to bytes
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

// Helper to create a hash from principal
function createOwnerHash(principal: string): Uint8Array {
  // In a real implementation, this would use a proper cryptographic hash
  // For this example, we'll use a simple encoding
  return stringToBytes(principal)
}

/**
 * Generate a proof of token ownership using the ZK canister
 */
export async function generateProof({
  tokenId,
  minBalance,
  principal
}: GenerateProofParams): Promise<ProofResult> {
  try {
    if (!tokenId || !minBalance || !principal) {
      return {
        id: '',
        success: false,
        message: 'Missing required parameters',
        verificationUrl: null
      }
    }

    // Get the ZK canister actor
    const actor = await getZkCanisterActor()

    // Parse token ID and balance
    const tokenIdBytes = stringToBytes(tokenId)
    const balanceBytes = stringToBytes(minBalance)
    const ownerHash = createOwnerHash(principal)
    
    // Create a sample merkle path for demonstration
    // In a real implementation, this would be generated based on the token's merkle tree
    const merklePathEntry = new Uint8Array(32).fill(1)
    const merklePath = [merklePathEntry]
    const pathIndices = new Uint8Array([0])
    
    // Determine token standard based on the token ID
    let tokenStandard: TokenStandardType = { 'ICRC1': null }
    if (tokenId === 'ryjl3-tyaaa-aaaaa-aaaba-cai') {
      tokenStandard = { 'ICP': null }
    }
    
    // Create token metadata
    const tokenMetadata: TokenMetadataType = {
      canister_id: tokenId,
      token_standard: tokenStandard,
      decimals: [8]  // most IC tokens use 8 decimals
    }
    
    // Prepare input for the ZK canister
    const input: TokenOwnershipInputType = {
      token_metadata: tokenMetadata,
      token_id: tokenIdBytes,
      balance: balanceBytes,
      owner_hash: ownerHash,
      merkle_path: merklePath,
      path_indices: pathIndices,
      token_specific_data: []
    }
    
    // Call the ZK canister to generate a proof
    const result = await actor.prove_ownership(principal, input)
    
    if ('Err' in result) {
      throw new Error(result.Err)
    }
    
    // The proof bytes from the canister
    const proofBytes = result.Ok
    
    // Encode proof bytes to base64 for sharing
    const proofId = btoa(String.fromCharCode(...proofBytes))
    
    // Generate verification URL
    const verificationUrl = `${window.location.origin}/verify/${proofId}`
    
    return {
      id: proofId,
      success: true,
      message: 'Proof generated successfully',
      verificationUrl
    }
  } catch (error) {
    console.error('Error generating proof:', error)
    return {
      id: '',
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate proof',
      verificationUrl: null
    }
  }
}

/**
 * Verify a proof of token ownership using the ZK canister
 */
export async function verifyProof(proofId: string): Promise<{
  isValid: boolean
  token: string
  minimumBalance: string
  error?: string
}> {
  try {
    if (!proofId) {
      return {
        isValid: false,
        token: '',
        minimumBalance: '',
        error: 'Missing proof ID'
      }
    }

    // Get the ZK canister actor
    const actor = await getZkCanisterActor()
    
    // Base64 decode the proof
    const binaryString = atob(proofId)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Call the canister to verify the proof
    const result = await actor.verify_proof(bytes)
    
    if ('Err' in result) {
      return {
        isValid: false,
        token: '',
        minimumBalance: '',
        error: result.Err
      }
    }
    
    const isValid = result.Ok
    
    // In a real implementation, we would extract token info from the proof
    // For this example, we'll return mock data if the proof is valid
    if (isValid) {
      // We'd extract these fields from the proof in a real implementation
      // Here we'll just return placeholder values
      return {
        isValid: true,
        token: 'Internet Computer (ICP)',
        minimumBalance: '10.00000000'
      }
    } else {
      return {
        isValid: false,
        token: '',
        minimumBalance: '',
        error: 'Invalid proof'
      }
    }
  } catch (error) {
    console.error('Error verifying proof:', error)
    return {
      isValid: false,
      token: '',
      minimumBalance: '',
      error: error instanceof Error ? error.message : 'Failed to verify proof'
    }
  }
}