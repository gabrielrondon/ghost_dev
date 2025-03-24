#!/bin/bash

# Exit on error
set -e

# Create output directory
mkdir -p circuits/build

# Compile the circuit
nargo compile

# Generate proving key
nargo prove

# Generate verification key
nargo verify

# Convert the circuit and keys to a format suitable for the canister
# This will be implemented once we have the exact format needed
# For now, we'll just copy the files
cp circuits/build/icp_attestation.proof circuits/build/proof.bin
cp circuits/build/icp_attestation.verification_key circuits/build/verification_key.bin

echo "Circuit built successfully!" 