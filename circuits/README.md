# Ghost Agent Zero-Knowledge Proof Circuits

This directory contains the Noir circuits used by the Ghost Agent system to generate and verify zero-knowledge proofs.

## Overview

The Ghost Agent system uses zero-knowledge proofs to allow users to prove ownership or activity without revealing their wallet address or other sensitive information. These circuits implement the cryptographic logic for different types of verifications:

1. **NFT Ownership Verification**: Prove ownership of an NFT without revealing the wallet address
2. **Token Balance Verification**: Prove a minimum token balance without revealing the actual balance or wallet address
3. **Transaction Verification**: Prove participation in a transaction without revealing the wallet address
4. **Governance Verification**: Prove participation in governance without revealing the wallet address or voting power

## Circuit Architecture

Each circuit follows a similar pattern:

1. **Input Structure**: Defines the public and private inputs to the circuit
2. **Leaf Computation**: Computes a hash of the private data (wallet address, etc.)
3. **Merkle Proof Verification**: Verifies that the leaf is included in a Merkle tree
4. **Verification Logic**: Implements the specific verification logic for each use case

## Usage

### Prerequisites

- [Noir](https://noir-lang.org/) v0.17.0 or later
- [nargo](https://noir-lang.org/getting_started/nargo_installation/) (Noir's package manager)

### Building the Circuits

```bash
cd circuits
nargo build
```

### Testing the Circuits

```bash
cd circuits
nargo test
```

### Generating Proofs

In a production environment, you would:

1. Generate a Merkle tree of the relevant data (NFT ownership, token balances, etc.)
2. For each user, generate a Merkle proof of their data
3. Use the Noir circuits to create a zero-knowledge proof
4. Verify the proof on-chain

## Integration with Internet Computer

These circuits are designed to be used with the Internet Computer blockchain:

1. **Canister Integration**: The verification keys are stored in the canister
2. **Client-Side Proof Generation**: Proofs are generated client-side to keep private inputs secure
3. **On-Chain Verification**: The canister verifies the proofs and stores the verification results

## Circuit Details

### NFT Ownership Verification

- **Public Inputs**: NFT collection ID, token ID, Merkle root
- **Private Inputs**: Wallet address, Merkle proof
- **Output**: Boolean indicating whether the user owns the NFT

### Token Balance Verification

- **Public Inputs**: Token ID, minimum balance, Merkle root
- **Private Inputs**: Wallet address, actual balance, Merkle proof
- **Output**: Field (1 or 0) indicating whether the user has at least the minimum balance

### Transaction Verification

- **Public Inputs**: Transaction hash, Merkle root
- **Private Inputs**: Wallet address, transaction data, Merkle proof
- **Output**: Field (1 or 0) indicating whether the user participated in the transaction

### Governance Verification

- **Public Inputs**: Proposal ID, vote option, Merkle root
- **Private Inputs**: Wallet address, voting power, Merkle proof
- **Output**: Field (1 or 0) indicating whether the user participated in governance

## Security Considerations

- **Private Inputs**: Never share private inputs (wallet address, etc.) with anyone
- **Merkle Trees**: Ensure that Merkle trees are properly constructed and updated
- **Verification Keys**: Protect the verification keys used by the canister 