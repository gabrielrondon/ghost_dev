# ZK Token Proof Canister v2

A zero-knowledge proof canister for verifying token ownership ranges on the Internet Computer.

## Architecture Overview

The canister implements a zero-knowledge proof system using Halo2 to verify token ownership within specified ranges. The system consists of the following components:

- **Proof Generation**: Creates ZK proofs for token ownership within ranges
- **Proof Verification**: Verifies previously generated proofs
- **Storage Management**: Handles proof storage with expiration
- **Rate Limiting**: Prevents abuse through request rate limiting
- **Metrics & Monitoring**: Tracks system health and performance

### Key Components

1. **Circuit Implementation**
   - Uses Halo2's constraint system
   - Implements range checks for token balances
   - Supports public inputs for balance and range bounds

2. **Proof Management**
   - Unique proof IDs based on timestamp
   - 24-hour proof expiration
   - Principal-based proof ownership
   - Maximum 10 active proofs per principal

3. **Security Features**
   - Rate limiting per principal
   - Proof expiration
   - Cycle consumption checks
   - Input validation

## Usage

### Generating a Proof

```typescript
import { Actor } from "@dfinity/agent";
import { idlFactory } from "./declarations/zk_canister_v2";

const actor = Actor.createActor(idlFactory, { canisterId });

const input = {
  balance: 100n,
  min_range: 0n,
  max_range: 1000n,
  token_canister: Principal.fromText("aaaaa-aa"),
  token_standard: { ICRC1: null },
};

const proofId = await actor.generate_proof(input);
```

### Verifying a Proof

```typescript
const isValid = await actor.verify_proof(proofId);
```

### Checking Canister Health

```typescript
const health = await actor.health_check();
```

## API Reference

### generate_proof
```candid
type TokenOwnershipInput = record {
    balance: nat64;
    min_range: nat64;
    max_range: nat64;
    token_canister: principal;
    token_standard: variant { ICRC1; ICRC2; DIP20; EXT };
};

generate_proof: (TokenOwnershipInput) -> (Result<nat64, CanisterError>);
```

### verify_proof
```candid
verify_proof: (nat64) -> (Result<bool, CanisterError>);
```

### health_check
```candid
type HealthStatus = record {
    status: text;
    cycles: nat64;
    memory_bytes: nat64;
    timestamp: nat64;
    total_proofs: nat64;
    active_proofs: nat64;
    error_rate: float64;
    avg_proof_time_ms: float64;
};

health_check: () -> (Result<HealthStatus, CanisterError>);
```

## Error Handling

The canister uses a comprehensive error type system:

```rust
pub enum CanisterError {
    NotInitialized,
    ProofNotFound,
    ProofExpired,
    InvalidProof,
    InsufficientCycles(u64),
    InvalidInput(String),
    InternalError(String),
    ProofLimitExceeded,
    RateLimitExceeded(u64),
    UnauthorizedAccess,
    CircuitError(String),
}
```

### Common Error Scenarios

1. **InvalidInput**: Input values don't meet requirements
2. **ProofExpired**: Proof is older than 24 hours
3. **ProofLimitExceeded**: Principal has reached max proof limit
4. **RateLimitExceeded**: Too many requests in time window

## Performance Considerations

- Proof generation takes ~2-5 seconds
- Verification takes ~100-500ms
- Each proof consumes 100B cycles
- Memory usage is ~1MB per proof
- Maximum concurrent operations: 100

## Security Considerations

1. **Proof Expiration**
   - Proofs expire after 24 hours
   - Expired proofs are automatically removed

2. **Rate Limiting**
   - Maximum 10 requests per minute per principal
   - Sliding window implementation

3. **Resource Protection**
   - Cycle checks before operations
   - Memory usage monitoring
   - Maximum proof limit per principal

4. **Input Validation**
   - Range checks on all inputs
   - Balance verification
   - Public input validation

## Deployment

### Prerequisites

- dfx 0.15.0 or later
- Rust 1.75.0 or later
- At least 1T cycles for deployment

### Deployment Steps

1. Build the canister:
   ```bash
   dfx build --network ic zk_canister_v2
   ```

2. Deploy to IC:
   ```bash
   dfx deploy --network ic zk_canister_v2 --with-cycles 1000000000000
   ```

### Upgrade Process

1. Test in staging:
   ```bash
   dfx deploy --network staging zk_canister_v2
   ```

2. Run integration tests:
   ```bash
   ./test.sh
   ```

3. Deploy to production:
   ```bash
   dfx deploy --network ic zk_canister_v2
   ```

## Development

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cargo build
   ```

3. Run tests:
   ```bash
   ./test.sh
   ```

### Testing

The project includes:

- Unit tests
- Integration tests
- Load tests
- Concurrent operation tests

Run all tests with:
```bash
./test.sh
```

## Monitoring

The canister provides metrics through:

1. **Health Check Endpoint**
   - Overall status
   - Cycles balance
   - Memory usage
   - Error rates
   - Proof statistics

2. **Metrics Endpoint**
   - Total proofs generated
   - Verification success rate
   - Average proof time
   - Resource usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

Apache 2.0 