# Ghost Agent: Zero-Knowledge Proof System

Ghost Agent is a canister-based ZK proof system for private attestations on the Internet Computer Protocol (ICP). It allows users to create verifiable proofs without revealing sensitive information.

## Milestone 1: Comprehensive Verification System

The first milestone implements a zero-knowledge proof system for various on-chain activities. Users can:

1. Connect their Internet Computer wallet (Plug)
2. View and select from their wallet's contents:
   - NFTs
   - Token balances
   - Transaction history
   - Governance participation (coming soon)
3. Generate anonymous proofs of ownership or activity
4. Create shareable verification links that don't reveal the wallet address
5. Verify proofs without exposing the original identity

## Features

- **Internet Computer Wallet Connection**: Connect to Plug wallet
- **Comprehensive Asset Discovery**: View all your on-chain assets and activities
- **Multiple Verification Types**:
  - NFT ownership verification
  - Token balance verification
  - Transaction history verification
  - Governance participation verification (coming soon)
- **Anonymous References**: Generate unique reference IDs for sharing proofs
- **Verification Pages**: Dedicated pages to verify proofs without exposing the original wallet

## Technical Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Rust-based canisters on Internet Computer Protocol
- **Blockchain Integration**: Internet Computer wallet connection (Plug)

## Getting Started

### Prerequisites

- Node.js 16+
- DFX 0.15.1+
- Rust
- Plug wallet browser extension

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the local development server:

```bash
npm run dev
```

4. Deploy to local ICP network:

```bash
npm run deploy:local
```

## Usage

1. Connect your Internet Computer wallet using the "Connect Internet Computer Wallet" button
2. Select the type of verification you want to create (NFT, Token, Transaction, Governance)
3. Choose a specific item from your wallet to verify
4. Click "Generate Zero-Knowledge Proof"
5. Share the generated anonymous reference link

## Security

The system uses zero-knowledge proofs to verify ownership and activities without revealing the wallet address. All verification is done on-chain with the results stored in the canister.

## License

MIT 