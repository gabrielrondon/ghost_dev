#!/bin/bash

# Check if DFX is running
if ! dfx ping > /dev/null 2>&1; then
  echo "Starting DFX..."
  dfx start --clean --background
fi

# Build and deploy canisters
echo "Building and deploying canisters..."
dfx build --network ic
dfx deploy --network ic

# Run the test
echo "Running Milestone 1 test..."
ts-node scripts/test_milestone1.ts

# Print results
echo "Test execution completed. Check the output above for results." 