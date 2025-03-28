# Ghost Protocol

A Zero-Knowledge Proof (ZKP) system for private attestations on the Internet Computer.

## Overview
Ghost Protocol enables users to prove ownership of assets (NFTs, tokens) without revealing their identity. The system uses zero-knowledge proofs to create verifiable, anonymous attestations.

## Features
- Connect Internet Computer wallets (Plug)
- Verify NFT ownership
- Generate zero-knowledge proofs
- Create anonymous attestation references
- Verify proofs through anonymous links

## Getting Started

### Prerequisites
- Node.js 18+
- DFX 0.14.1+
- Internet Computer Plug Wallet

### Installation
1. Clone the repository:
```bash
git clone https://github.com/your-username/ghost-protocol.git
cd ghost-protocol
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env.local
```

4. Start local development:
```bash
dfx start --clean --background
dfx deploy
npm run dev
```

## Documentation
- [Milestone 1: Core Proof System](docs/milestone1.md)

## Testing
Run the automated test suite:
```bash
./scripts/run_milestone1_test.sh
```

## Deployment
Deploy to the Internet Computer mainnet:
```bash
dfx build --network ic
dfx deploy --network ic
```

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Internet Computer Foundation
- Dfinity Foundation
- Zero-Knowledge Proof community 