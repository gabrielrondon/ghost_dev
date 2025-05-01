# Ghost Protocol ZK Token Proof Client

A TypeScript client for interacting with the Ghost Protocol ZK Token Proof Canister.

## Installation

```bash
npm install @ghost/zk-proof-client
```

## Usage

```typescript
import { ZKProofClient } from '@ghost/zk-proof-client'

// Initialize the client
const client = new ZKProofClient({
  canisterId: 'your-canister-id',
  // Optional: provide custom agent or identity
  // agent: new HttpAgent(),
  // identity: yourIdentity
})

// Generate a proof
try {
  const proofId = await client.generateProof({
    balance: 1000n,
    minRange: 0n,
    maxRange: 2000n
  })
  console.log('Proof generated:', proofId)
} catch (error) {
  if (error instanceof ZKProofError) {
    // Handle specific error types
    switch (error.code) {
      case 'INSUFFICIENT_CYCLES':
        console.error('Not enough cycles to generate proof')
        break
      case 'PROOF_LIMIT_EXCEEDED':
        console.error('Too many proofs generated')
        break
      // ... handle other error types
    }
  }
}

// Verify a proof
try {
  const isValid = await client.verifyProof(proofId)
  console.log('Proof is valid:', isValid)
} catch (error) {
  // Handle verification errors
}

// Get metrics
const metrics = await client.getMetrics()
console.log('Current metrics:', metrics)
```

## Error Handling

The client provides typed error handling through the `ZKProofError` class. All errors will be instances of this class and include a `code` property that matches one of the following:

- `INSUFFICIENT_CYCLES`: Not enough cycles to perform the operation
- `PROOF_LIMIT_EXCEEDED`: Maximum number of proofs exceeded for this principal
- `INVALID_INPUT`: Invalid input parameters provided
- `TOKEN_VERIFICATION_FAILED`: Failed to verify token balance
- `PROOF_NOT_FOUND`: The requested proof does not exist
- `PROOF_EXPIRED`: The proof has expired
- `VERIFICATION_FAILED`: Proof verification failed
- `UNEXPECTED_ERROR`: An unexpected error occurred

## API Reference

### `ZKProofClient`

#### Constructor
```typescript
constructor(config: ZKProofConfig)
```

#### Methods

##### `generateProof`
```typescript
async generateProof(params: ProofGenerationParams): Promise<bigint>
```

##### `verifyProof`
```typescript
async verifyProof(proofId: bigint): Promise<boolean>
```

##### `getMetrics`
```typescript
async getMetrics(): Promise<{
  totalProofsGenerated: bigint
  totalProofsVerified: bigint
  avgProofGenerationTimeMs: bigint
  avgProofVerificationTimeMs: bigint
}>
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Security Considerations

1. **Identity Management**: Always use appropriate identity management when interacting with the canister.
2. **Error Handling**: Properly handle all error cases to prevent unexpected behavior.
3. **Input Validation**: Validate all inputs before sending them to the canister.
4. **Proof Expiration**: Be aware that proofs expire after a certain time period.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 