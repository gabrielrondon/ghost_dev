#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 succeeded${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Start testing
print_header "Starting ZKP System Tests"

# Check if dfx is running
print_header "Checking DFX Status"
dfx ping
check_success "DFX status check"

# Build circuits
print_header "Building Noir Circuits"
cd circuits
nargo compile
check_success "Circuit compilation"
nargo prove
check_success "Proving key generation"
nargo verify
check_success "Verification key generation"
cd ..

# Deploy canisters
print_header "Deploying Canisters"
dfx deploy zk_canister
check_success "ZK canister deployment"
dfx deploy main_canister
check_success "Main canister deployment"

# Store canister IDs
ZK_CANISTER=$(dfx canister id zk_canister)
MAIN_CANISTER=$(dfx canister id main_canister)

# Test circuit initialization
print_header "Testing Circuit Initialization"
dfx canister call zk_canister initializeCircuit
check_success "Circuit initialization"

# Test NFT verification flow
print_header "Testing NFT Verification Flow"

# Test valid NFT ownership
echo "Testing valid NFT ownership..."
RESULT=$(dfx canister call main_canister verify_nft_ownership '(record { wallet_address = "0x123"; chain_id = "icp"; nft_contract_address = opt "qaa6y-5yaaa-aaaaa-aaafa-cai" })')
if [[ $RESULT == *"true"* ]]; then
    echo -e "${GREEN}✓ Valid NFT ownership test passed${NC}"
else
    echo -e "${RED}✗ Valid NFT ownership test failed${NC}"
    exit 1
fi

# Test invalid NFT ownership
echo "Testing invalid NFT ownership..."
RESULT=$(dfx canister call main_canister verify_nft_ownership '(record { wallet_address = "invalid"; chain_id = "icp"; nft_contract_address = null })')
if [[ $RESULT == *"false"* ]]; then
    echo -e "${GREEN}✓ Invalid NFT ownership test passed${NC}"
else
    echo -e "${RED}✗ Invalid NFT ownership test failed${NC}"
    exit 1
fi

# Test proof generation
print_header "Testing Proof Generation"
RESULT=$(dfx canister call zk_canister generate_proof '(record {
    collection_id = 1;
    token_id = 1;
    token_canister_id = 1;
    minimum_balance = 100;
    merkle_root = 123456;
    wallet_principal = 789012;
    nft_merkle_path = vec { 1; 2; 3; 4; 5; 6; 7; 8; 9; 10 };
    nft_merkle_indices = vec { 0; 1; 0; 1; 0; 1; 0; 1; 0; 1 };
    token_merkle_path = vec { 10; 9; 8; 7; 6; 5; 4; 3; 2; 1 };
    token_merkle_indices = vec { 1; 0; 1; 0; 1; 0; 1; 0; 1; 0 };
    actual_balance = 200;
})')
check_success "Proof generation"

# Test proof verification
print_header "Testing Proof Verification"
RESULT=$(dfx canister call zk_canister verify_proof '(vec { 0 }, vec { 1 })')
check_success "Proof verification"

# Test error cases
print_header "Testing Error Cases"

# Test invalid Merkle path
echo "Testing invalid Merkle path..."
RESULT=$(dfx canister call zk_canister test_invalid_merkle_path)
if [[ $RESULT == *"true"* ]]; then
    echo -e "${GREEN}✓ Invalid Merkle path test passed${NC}"
else
    echo -e "${RED}✗ Invalid Merkle path test failed${NC}"
    exit 1
fi

# Test invalid Merkle indices
echo "Testing invalid Merkle indices..."
RESULT=$(dfx canister call zk_canister test_invalid_merkle_indices)
if [[ $RESULT == *"true"* ]]; then
    echo -e "${GREEN}✓ Invalid Merkle indices test passed${NC}"
else
    echo -e "${RED}✗ Invalid Merkle indices test failed${NC}"
    exit 1
fi

# Final status
print_header "Test Summary"
echo -e "${GREEN}All tests completed successfully!${NC}"

# Output canister IDs for reference
echo -e "\nCanister IDs for reference:"
echo "ZK Canister: $ZK_CANISTER"
echo "Main Canister: $MAIN_CANISTER" 