#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Print section header
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is required but not installed.${NC}"
        exit 1
    fi
}

# Check prerequisites
print_header "Checking Prerequisites"
check_command dfx
check_command cargo
check_command rustc

# Environment setup
print_header "Setting Up Environment"
export RUST_BACKTRACE=1
export RUST_LOG=debug

# Format code
print_header "Formatting Code"
cargo fmt --all -- --check
if [ $? -ne 0 ]; then
    echo -e "${RED}Code formatting check failed${NC}"
    exit 1
fi

# Run clippy
print_header "Running Clippy"
cargo clippy -- -D warnings
if [ $? -ne 0 ]; then
    echo -e "${RED}Clippy check failed${NC}"
    exit 1
fi

# Run unit tests
print_header "Running Unit Tests"
cargo test -- --nocapture
if [ $? -ne 0 ]; then
    echo -e "${RED}Unit tests failed${NC}"
    exit 1
fi

# Build canister
print_header "Building Canister"
dfx build --network staging zk_canister_v2
if [ $? -ne 0 ]; then
    echo -e "${RED}Canister build failed${NC}"
    exit 1
fi

# Run integration tests
print_header "Running Integration Tests"
cargo test --test integration_tests -- --nocapture
if [ $? -ne 0 ]; then
    echo -e "${RED}Integration tests failed${NC}"
    exit 1
fi

# Run load tests
print_header "Running Load Tests"
cargo test test_concurrent_proofs -- --nocapture
if [ $? -ne 0 ]; then
    echo -e "${RED}Load tests failed${NC}"
    exit 1
fi

# Check canister health
print_header "Checking Canister Health"
dfx canister --network staging call zk_canister_v2 health_check
if [ $? -ne 0 ]; then
    echo -e "${RED}Health check failed${NC}"
    exit 1
fi

# Get metrics
print_header "Checking Metrics"
dfx canister --network staging call zk_canister_v2 get_canister_metrics
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to get metrics${NC}"
    exit 1
fi

# Success message
echo -e "\n${GREEN}All tests passed successfully!${NC}\n"

# Print summary
print_header "Test Summary"
echo "✓ Code formatting"
echo "✓ Clippy checks"
echo "✓ Unit tests"
echo "✓ Integration tests"
echo "✓ Load tests"
echo "✓ Health check"
echo "✓ Metrics check" 