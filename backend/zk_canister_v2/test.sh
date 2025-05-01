#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting comprehensive test suite for zk_canister_v2...${NC}\n"

# Check if dfx is running
if ! dfx ping; then
    echo -e "${GREEN}Starting local replica...${NC}"
    dfx start --clean --background
    sleep 5
fi

# Function to run tests with proper formatting
run_test() {
    local test_name=$1
    local cmd=$2
    
    echo -e "\n${GREEN}Running $test_name...${NC}"
    if eval $cmd; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        return 1
    fi
}

# Clean and build
run_test "Cargo clean" "cargo clean"
run_test "Cargo build" "cargo build"

# Run format check
run_test "Code formatting" "cargo fmt -- --check"

# Run clippy
run_test "Clippy checks" "cargo clippy -- -D warnings"

# Run unit tests
run_test "Unit tests" "cargo test --lib -- --nocapture"

# Run integration tests
run_test "Integration tests" "cargo test --test integration_tests -- --nocapture"

# Deploy local canister for testing
echo -e "\n${GREEN}Deploying test canister...${NC}"
dfx deploy --network local zk_canister_v2

# Run load tests
run_test "Load tests" "cargo test --test load_tests -- --nocapture"

# Check if any tests failed
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Please check the output above.${NC}"
    exit 1
fi 