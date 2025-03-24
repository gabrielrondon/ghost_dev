#!/bin/bash

# Exit on error
set -e

echo "Building ZK canister..."
dfx build zk_canister

echo "Generating Candid interface..."
dfx generate zk_canister

echo "Running tests..."
echo "Testing valid proof verification..."
dfx canister call zk_canister test_verify_proof

echo "Testing invalid merkle path..."
dfx canister call zk_canister test_invalid_merkle_path

echo "Testing invalid merkle indices..."
dfx canister call zk_canister test_invalid_merkle_indices

echo "Testing insufficient balance..."
dfx canister call zk_canister test_insufficient_balance

echo "All tests completed successfully!" 