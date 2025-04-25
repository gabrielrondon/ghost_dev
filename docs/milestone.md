# Ghost Protocol - Zero Knowledge Token Ownership Verification

## Overview
The Ghost Protocol system provides zero-knowledge proof generation and verification for token ownership on the Internet Computer. The system has evolved through two versions, each bringing significant improvements in functionality and security.

## Deployed Canisters

### ZK Canister V1
- **Status**: Deployed and Active
- **Canister ID**: `hi7bu-myaaa-aaaad-aaloa-cai`
- **Network**: IC Mainnet
- **Interface**: [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=hi7bu-myaaa-aaaad-aaloa-cai)
- **Features**:
  - Basic token ownership proof generation
  - Simple proof verification
  - ICRC1 token standard support
  - Memory-efficient proof storage
- **Current Stats**:
  - Balance: 2,595,541,914,824 cycles
  - Memory Size: 1,923,346 Bytes

### ZK Canister V2
- **Status**: Ready for Deployment
- **Location**: `backend/zk_canister_v2/`
- **Features**:
  - Enhanced proof generation using Halo2
  - Advanced verification process
  - Multi-token standard support (ICRC1, ICRC2, DIP20, EXT)
  - Range proofs for token balances
  - Improved memory management
  - Better error handling

## Technical Implementation

### V1 Interface
```candid
type TokenStandard = variant {
    ICRC1;
    ICRC2;
    DIP20;
    EXT;
};

type TokenMetadata = record {
    standard: TokenStandard;
    decimals: nat8;
    fee: opt nat8;
    symbol: text;
    total_supply: nat;
    transfer_fee: opt nat;
};

type TokenOwnershipInput = record {
    owner: principal;
    token_metadata: TokenMetadata;
    balance_ranges: vec record { nat64; nat64 };
    timestamp: nat64;
    nonce: vec nat8;
};

service : {
    prove_ownership: (text, TokenOwnershipInput) -> (ProofResult);
    verify_proof: (vec nat8) -> (VerificationResult);
}
```

### V2 Interface
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

service : {
    prove_ownership: (text, TokenOwnershipInput) -> (Result);
    verify_proof: (text) -> (Result_1) query;
}
```

## Key Improvements in V2

### 1. Enhanced Proof Generation
- Halo2-based ZK-SNARK implementation
- Improved range checks for token balances
- Secure parameter generation
- Support for multiple token standards
- Better proof compression

### 2. Advanced Verification
- Optimized cryptographic verification
- Proof expiration management
- Double-spend prevention
- Enhanced security checks

### 3. System Improvements
- Efficient memory usage and storage
- Automatic proof pruning
- Improved error handling
- Better cycle management

## Performance Metrics

### V1 Current Performance
- Memory Usage: 1,923,346 Bytes
- Cycle Balance: 2,595,541,914,824 cycles
- Basic proof generation and verification

### V2 Expected Performance
- Proof Generation Time: ~2-3 seconds
- Verification Time: ~1 second
- Memory Usage per Proof: ~2KB
- Daily Cycle Consumption: ~18M cycles
- Maximum Concurrent Proofs: Based on memory limit

## Testing Commands

### V1 Testing
```bash
# Generate Proof
dfx canister call --network ic zk_canister prove_ownership '(
  "owner_id",
  record {
    owner = principal "your-principal";
    token_metadata = record {
      standard = variant { ICRC1 };
      decimals = 8;
      fee = null;
      symbol = "TEST";
      total_supply = 1000000000;
      transfer_fee = null;
    };
    balance_ranges = vec { record { 100; 1000 } };
    timestamp = 1234567890;
    nonce = vec { 1; 2; 3; 4 }
  }
)'

# Verify Proof
dfx canister call --network ic zk_canister verify_proof '(vec { 1; 2; 3; 4; 5 })'
```

### V2 Testing
```bash
# Generate Proof
dfx canister call --network ic zk_canister_v2 prove_ownership '(
  "caller_principal",
  record {
    token = record {
      chain_id = 1;
      token_address = "ryjl3-tyaaa-aaaaa-aaaba-cai";
      token_standard = variant { ICRC1 };
      token_id = null;
    };
    owner_address = "owner_principal";
    balance = "1000000";
    block_number = 1;
  }
)'

# Verify Proof
dfx canister call --network ic zk_canister_v2 verify_proof '("proof_id")'
```

## Next Steps

1. Deploy V2 Canister
   - Complete final testing
   - Deploy to IC mainnet
   - Migrate existing proofs

2. Performance Monitoring
   - Track cycle consumption
   - Monitor memory usage
   - Measure proof generation times

3. Future Enhancements
   - Batch proof processing
   - Additional token standards
   - Enhanced privacy features
   - Improved user experience

## Resources
- V1 Canister: [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=hi7bu-myaaa-aaaad-aaloa-cai)
- V2 Source: `backend/zk_canister_v2/`

## Security Features

### V2 Improvements
1. **Enhanced Proof Generation**:
   - Halo2-based ZK proofs
   - Range checks for token balances
   - Secure parameter generation

2. **Proof Verification**:
   - Cryptographic verification using Halo2
   - Proof expiration checks
   - Double-spend prevention

3. **Memory Management**:
   - Efficient proof storage
   - Automatic pruning of expired proofs
   - Memory usage optimization

## Performance Characteristics

### V2 Metrics
- Proof Generation Time: ~2-3 seconds
- Verification Time: ~1 second
- Memory Usage per Proof: ~2KB
- Daily Cycle Consumption: ~18M cycles
- Maximum Concurrent Proofs: Based on memory limit

## Error Handling

### Common Error Types
1. **ProofGenerationError**:
   - `InvalidInput`: Input parameters are invalid
   - `InternalError`: Internal canister error

2. **ProofVerificationError**:
   - `InvalidProof`: Proof does not exist or is invalid
   - `InternalError`: Verification process error

## Best Practices

1. **Proof Generation**:
   - Always validate input parameters
   - Handle errors appropriately
   - Store proof IDs securely

2. **Proof Verification**:
   - Verify proofs immediately after generation
   - Implement retry logic for failed verifications
   - Check proof expiration

## Testing Evidence

### V2 Test Results
```bash
# Proof Generation Test
dfx canister call --network ic zk_canister_v2 prove_ownership '("test", record { token = record { chain_id = 1; token_address = "ryjl3-tyaaa-aaaaa-aaaba-cai"; token_standard = variant { ICRC1 }; token_id = null }; owner_address = "test"; balance = "1000000"; block_number = 1 })'

# Result: (variant { Ok = "16291bc0b395155c4ddb4a53384af0c5958743b52ef6096402abfb7ffe98ccc2" })

# Proof Verification Test
dfx canister call --network ic zk_canister_v2 verify_proof '("16291bc0b395155c4ddb4a53384af0c5958743b52ef6096402abfb7ffe98ccc2")'

# Result: (variant { Ok = true })
```

## Future Improvements

1. **Technical Enhancements**:
   - Batch proof generation
   - Additional token standard support
   - Enhanced privacy features

2. **Performance Optimization**:
   - Reduced proof size
   - Faster verification
   - Lower cycle consumption

3. **User Experience**:
   - Improved error messages
   - Better proof management
   - Enhanced monitoring

## Support and Resources

- [GitHub Repository](https://github.com/your-repo)
- [Documentation](https://docs.your-project.com)
- [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=hi7bu-myaaa-aaaad-aaloa-cai)

## Contact

For support or inquiries:
- GitHub Issues
- Development Team Contact 