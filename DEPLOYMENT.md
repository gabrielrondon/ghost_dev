# Deployment Guide

This document provides instructions for deploying the ZK Canister and the web application to the Internet Computer.

## Prerequisites

- dfx CLI installed
- Proper authentication credentials (identity with cycles)
- Rust toolchain with wasm32-unknown-unknown target

## ZK Canister Deployment

The ZK Canister is deployed to the Internet Computer mainnet with the ID `hi7bu-myaaa-aaaad-aaloa-cai`.

### Building the Canister

To build the ZK Canister for production:

```bash
cd backend/zk_canister
cargo build --target wasm32-unknown-unknown --release
```

### Deploying the Canister

To create a new canister (only needed once):

```bash
dfx canister create zk_canister --network ic --no-wallet
```

To deploy an updated version:

```bash
dfx canister install zk_canister --wasm backend/target/wasm32-unknown-unknown/release/zk_canister.wasm --network ic --mode upgrade
```

### Verifying Deployment

Check the canister status:

```bash
dfx canister status zk_canister --network ic
```

## Web Application Configuration

The frontend application automatically detects the environment (development or production) and uses the appropriate canister IDs and hosts.

### Environment Configuration

All canister configuration is centralized in `src/config/canister-config.ts`:

```typescript
// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';

// Canister IDs
export const ZK_CANISTER_ID = isDevelopment 
  ? 'bkyz2-fmaaa-aaaaa-qaaaq-cai'  // Local development canister
  : 'hi7bu-myaaa-aaaad-aaloa-cai'  // Production canister

// IC Hosts
export const IC_HOST = isDevelopment
  ? 'http://127.0.0.1:8000'  // Local development host
  : 'https://ic0.app'        // Production host
```

## Local Development Setup

For local development:

1. Start a local replica:
   ```bash
   dfx start --clean --background
   ```

2. Deploy local canisters:
   ```bash
   dfx deploy
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Production Deployment Process

1. Build the ZK Canister:
   ```bash
   cd backend/zk_canister
   cargo build --target wasm32-unknown-unknown --release
   ```

2. Deploy the updated canister:
   ```bash
   dfx canister install zk_canister --wasm ../target/wasm32-unknown-unknown/release/zk_canister.wasm --network ic --mode upgrade
   ```

3. Build the frontend for production:
   ```bash
   npm run build
   ```

4. Deploy the frontend assets to a hosting provider of your choice or to an asset canister on the IC.

## Troubleshooting

If you encounter issues during deployment, check:

1. Ensure your identity has enough cycles
2. Verify the canister WASM file exists at the expected location
3. Check for any errors in the build process
4. Confirm that you have the correct permissions to manage the canister 