#!/bin/bash

# Exit on error
set -e

echo "Building main canister..."
dfx build main_canister

echo "Generating Candid interface..."
dfx generate main_canister

echo "Build completed successfully!" 