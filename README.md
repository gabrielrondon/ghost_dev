# Ghost - ZK Notary Agent Backend

A Zero-Knowledge Proof system for private attestations on the Internet Computer.

## Repository Organization

This repository contains the **backend canister components** of the Ghost ZK proof system. 

**The frontend application is available in a separate repository:**
[https://github.com/gabrielrondon/ghost-frontend](https://github.com/gabrielrondon/ghost-frontend)

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

### Building the Canisters

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
    ERC20;
    ERC721;
    ERC1155;
    ICRC1;
    ICRC2;
    ICP;
};

type TokenMetadata = record {
    canister_id: text;
    token_standard: TokenStandard;
    decimals: opt nat8;
};

type TokenOwnershipInput = record {
    token_metadata: TokenMetadata;
    token_id: vec nat8;
    balance: vec nat8;
    owner_hash: vec nat8;
    merkle_path: vec vec nat8;
    path_indices: vec nat8;
    token_specific_data: opt vec nat8;
};

type Result = variant {
    Ok: bool;
    Err: text;
};

service : {
    prove_ownership: (text, TokenOwnershipInput) -> (variant { Ok: vec nat8; Err: text }) update;
    verify_proof: (vec nat8) -> (Result) query;
}
```

## Developer Documentation

For detailed development information, please refer to the following documents:

- [Backend Documentation](./docs/backend.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Milestone 1 Documentation](./docs/milestone1.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- Internet Computer Foundation
- Dfinity Foundation
- Zero-Knowledge Proof community 