# Deployment Guide

This guide details the deployment process for the Ghost ZK Notary Agent system.

## Current Deployment Status

### ZK Canister
- **Network**: IC Mainnet
- **Canister ID**: `hi7bu-myaaa-aaaad-aaloa-cai`
- **Status**: Running
- **Controllers**: 
  - `h5yqz-nqaaa-aaaad-aalnq-cai`
  - `icfpp-yq3gn-xcebw-wrmqr-qqh7p-zll6t-lieu2-t2v4l-etphp-lyhv7-5ae`
- **Balance**: ~2.6T cycles
- **Module Hash**: `0xf44075bc086190df7b13ba7d65cce00232fba93eef8e02c0c0a28a86c77efbdc`

### Main Canister
- **Status**: Planned for Milestone 2
- **Network**: Not yet deployed

## Deployment Process

### Prerequisites
1. Install the DFINITY Canister SDK (dfx)
2. Configure your identity with sufficient cycles
3. Have Rust and the wasm32-unknown-unknown target installed

### Building the Canisters

```bash
# Build the Rust canister
cargo build --target wasm32-unknown-unknown --release

# Optimize the Wasm binary
ic-wasm backend/target/wasm32-unknown-unknown/release/zk_canister.wasm -o backend/target/wasm32-unknown-unknown/release/zk_canister.wasm shrink

# Create the canister
dfx canister create zk_canister --network ic --no-wallet

# Deploy the canister
dfx canister install zk_canister --mode=upgrade --wasm backend/target/wasm32-unknown-unknown/release/zk_canister.wasm --network ic
```

### Verifying Deployment

To verify the canister is running correctly:

```bash
# Check canister status
dfx canister status zk_canister --network ic

# Test proof generation
dfx canister call --network ic zk_canister prove_ownership '(
  "test",
  record {
    token = record {
      chain_id = 1;
      token_address = "ryjl3-tyaaa-aaaaa-aaaba-cai";
      token_standard = variant { ICRC1 };
      token_id = null;
    };
    owner_address = "test";
    balance = "1000000";
    block_number = 1;
  }
)'

# Test proof verification
dfx canister call --network ic zk_canister verify_proof '("proof_id")'
```

## Frontend Deployment

The frontend is built using Vite and can be deployed to any static hosting service. For local development:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Monitoring and Maintenance

### Cycle Management
- Monitor cycle balance regularly
- Top up cycles when balance falls below 2T
- Current daily cycle burn rate: ~20M cycles

### Performance Monitoring
- Watch for memory usage spikes
- Monitor compute allocation
- Track number of proof generations and verifications

## Troubleshooting

### Common Issues

1. **Candid Interface Errors**
   - Ensure Candid files are properly stored in metadata
   - Update dfx.json if needed

2. **Cycle Balance Issues**
   - Check cycle balance with `dfx canister status`
   - Top up if below threshold

3. **Proof Generation Failures**
   - Verify input format matches expected schema
   - Check canister logs for detailed error messages

## Security Considerations

1. **Access Control**
   - Controller management
   - Principal validation

2. **Proof Verification**
   - Input validation
   - Cryptographic verification

3. **Cycle Management**
   - Regular monitoring
   - Automated alerts

## Future Improvements

1. **Main Canister Integration**
   - User management
   - Enhanced verification features
   - Additional token standards support

2. **Frontend Enhancements**
   - Improved error handling
   - Better UX for proof generation
   - Enhanced verification UI

## Contact

For deployment issues or questions, please contact:
- GitHub Issues
- Development Team 