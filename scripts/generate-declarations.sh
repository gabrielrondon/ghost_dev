#!/bin/bash

# Create declarations directory if it doesn't exist
mkdir -p app/declarations/main
mkdir -p app/declarations/zk

# Generate declarations for main canister
dfx generate "main_canister"
cp -r .dfx/local/canisters/main_canister/* app/declarations/main/

# Generate declarations for zk canister
dfx generate "zk_canister"
cp -r .dfx/local/canisters/zk_canister/* app/declarations/zk/

# Make the script executable
chmod +x scripts/generate-declarations.sh 