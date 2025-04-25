# Ghost - ZK Notary Agent

A Zero-Knowledge Proof system for private attestations on the Internet Computer.

## Repository Organization

This repository contains both the backend and frontend components of the Ghost ZK proof system.

## Canister Structure

This repository contains the following canisters:

1. **ZK Canister** (`hi7bu-myaaa-aaaad-aaloa-cai`)
   - Handles zero-knowledge proof generation and verification
   - Provides cryptographic attestations without revealing sensitive data
   - Deployed on the Internet Computer mainnet

2. **Main Canister** (Planned for Milestone 2)
   - Will handle user management and additional functionality
   - Currently in development

## Getting Started

### Prerequisites

- [DFX SDK](https://internetcomputer.org/docs/current/developer-docs/build/install-dfx) (v0.15.0 or later)
- Rust (latest stable version)
- [ic-wasm](https://github.com/dfinity/ic-wasm) for WebAssembly optimization
- Node.js (v18 or later)
- npm (v8 or later)

### Building and Running

```bash
# Clone this repository
git clone <repository-url>
cd ghost-backend

# Install dependencies
npm install

# Build the canisters
dfx build

# Deploy locally for testing
dfx start --background
dfx deploy
```

## Canister Interface

The ZK canister provides the following methods:

```candid
type TokenStandard = variant {
    ICRC1;
    ICRC2;
    ICRC3;
    ICRC4;
    ICP;
    DIP20;
    EXT;
};

type TokenMetadata = record {
    chain_id: nat64;
    token_address: text;
    token_standard: TokenStandard;
    token_id: opt text;
};

type TokenOwnershipInput = record {
    token: TokenMetadata;
    owner_address: text;
    balance: text;
    block_number: nat64;
};

type ProofGenerationError = variant {
    InvalidInput;
    InternalError;
};

type ProofVerificationError = variant {
    InvalidProof;
    InternalError;
};

type Result = variant {
    Ok: text;
    Err: ProofGenerationError;
};

type Result_1 = variant {
    Ok: bool;
    Err: ProofVerificationError;
};

service : {
    prove_ownership: (text, TokenOwnershipInput) -> (Result);
    verify_proof: (text) -> (Result_1) query;
};
```

## Integration Example

Here's a basic example of how to integrate with the ZK canister:

```typescript
import { HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { IDL } from '@dfinity/candid'

// Generate a proof
async function generateProof(caller: string, input: TokenOwnershipInput): Promise<string> {
  const agent = new HttpAgent({ host: 'https://ic0.app' })
  await agent.fetchRootKey()

  const canisterId = Principal.fromText('hi7bu-myaaa-aaaad-aaloa-cai')
  const arg = IDL.encode([IDL.Text, TokenOwnershipInputType], [caller, input])

  const requestId = await agent.call(canisterId, {
    methodName: 'prove_ownership',
    arg,
    effectiveCanisterId: canisterId
  })

  // Poll for response
  let attempts = 0
  const maxAttempts = 30
  while (attempts < maxAttempts) {
    try {
      const status = await agent.query(canisterId, {
        methodName: 'verify_proof',
        arg: IDL.encode([IDL.Text], [requestId.requestId])
      })

      if ((status as QueryResponseRejected).reject_message) {
        throw new Error((status as QueryResponseRejected).reject_message)
      }

      const [result] = IDL.decode(
        [ProofGenerationResultType], 
        (status as QueryResponseReplied).reply.arg
      ) as [ProofGenerationResult]
      
      if ('Err' in result) {
        throw new Error(`Failed to generate proof: ${Object.keys(result.Err)[0]}`)
      }

      return result.Ok
    } catch (error) {
      if (attempts === maxAttempts - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }
  }

  throw new Error('Request timed out')
}

// Verify a proof
async function verifyProof(proofId: string): Promise<boolean> {
  const agent = new HttpAgent({ host: 'https://ic0.app' })
  await agent.fetchRootKey()

  const response = await agent.query(
    Principal.fromText('hi7bu-myaaa-aaaad-aaloa-cai'),
    {
      methodName: 'verify_proof',
      arg: IDL.encode([IDL.Text], [proofId])
    }
  )

  if ((response as QueryResponseRejected).reject_message) {
    console.error('Proof verification rejected:', (response as QueryResponseRejected).reject_message)
    return false
  }

  const replied = response as QueryResponseReplied
  const [result] = IDL.decode([ProofVerificationResultType], replied.reply.arg) as [ProofVerificationResult]
  
  if ('Err' in result) {
    console.error('Proof verification error:', Object.keys(result.Err)[0])
    return false
  }

  return result.Ok
}
```

## Developer Documentation

For detailed development information, please refer to the following documents:

- [Milestone 1 Documentation](./docs/milestone1.md)
- [Deployment Guide](./DEPLOYMENT.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- Internet Computer Foundation
- Dfinity Foundation
- Zero-Knowledge Proof community 