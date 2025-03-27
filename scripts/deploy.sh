#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
YELLOW='\033[1;33m'
BLUE='\033[0;34m'

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

# Function to backup current state
backup_state() {
    print_header "Backing up current state"
    BACKUP_DIR="deployments/backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup canister states if they exist
    if [ -f .dfx/local/canister_ids.json ]; then
        cp .dfx/local/canister_ids.json "$BACKUP_DIR/"
    fi
    
    # Backup environment files
    if [ -f .env.production ]; then
        cp .env.production "$BACKUP_DIR/"
    fi
    
    # Backup frontend build if it exists
    if [ -d dist ]; then
        cp -r dist "$BACKUP_DIR/"
    fi
    
    # Save current canister states
    if dfx canister --network ic id zk_canister &> /dev/null; then
        dfx canister --network ic status zk_canister > "$BACKUP_DIR/zk_canister_status.txt"
    fi
    if dfx canister --network ic id main_canister &> /dev/null; then
        dfx canister --network ic status main_canister > "$BACKUP_DIR/main_canister_status.txt"
    fi
    
    echo "Backup saved to: $BACKUP_DIR"
    check_success "State backup"
}

# Function to verify dependencies
check_dependencies() {
    print_header "Checking Dependencies"
    
    # Check required commands
    local REQUIRED_COMMANDS=("dfx" "node" "npm" "nargo" "netlify")
    for cmd in "${REQUIRED_COMMANDS[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            echo -e "${RED}Error: $cmd is required but not installed.${NC}"
            exit 1
        fi
    done
    check_success "Required commands check"
    
    # Check dfx version
    DFX_VERSION=$(dfx --version | cut -d' ' -f2)
    if [[ "$DFX_VERSION" < "0.15.0" ]]; then
        echo -e "${RED}Error: dfx version must be >= 0.15.0${NC}"
        exit 1
    fi
    check_success "DFX version check"
    
    # Check node version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [[ "$NODE_VERSION" < "16.0.0" ]]; then
        echo -e "${RED}Error: Node.js version must be >= 16.0.0${NC}"
        exit 1
    fi
    check_success "Node.js version check"
    
    # Check if required files exist
    local REQUIRED_FILES=("dfx.production.json" "package.json" "circuits/Nargo.toml")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}Error: Required file $file not found${NC}"
            exit 1
        fi
    done
    check_success "Required files check"
}

# Function to verify canister health
verify_canister_health() {
    local CANISTER_ID=$1
    local CANISTER_NAME=$2
    
    print_header "Verifying $CANISTER_NAME health"
    
    # Check if canister is running
    STATUS=$(dfx canister --network ic status "$CANISTER_ID" 2>&1)
    if [[ $STATUS != *"Running"* ]]; then
        echo -e "${RED}Error: $CANISTER_NAME is not running${NC}"
        return 1
    fi
    
    # Check memory usage
    MEMORY=$(dfx canister --network ic status "$CANISTER_ID" | grep "Memory Size:" || echo "0")
    MEMORY_SIZE=$(echo "$MEMORY" | awk '{print $3}')
    if [ "$MEMORY_SIZE" -gt 2000000000 ]; then  # 2GB limit
        echo -e "${YELLOW}Warning: $CANISTER_NAME memory usage is high ($MEMORY_SIZE bytes)${NC}"
    fi
    
    check_success "$CANISTER_NAME health check"
}

# Function to verify frontend build
verify_frontend_build() {
    print_header "Verifying Frontend Build"
    
    # Check if dist directory exists and is not empty
    if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
        echo -e "${RED}Error: Frontend build is missing or empty${NC}"
        return 1
    fi
    
    # Check for required frontend files
    local REQUIRED_FILES=("dist/index.html" "dist/assets")
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -e "$file" ]; then
            echo -e "${RED}Error: Required frontend file/directory $file is missing${NC}"
            return 1
        fi
    done
    
    # Check for environment variables in built files
    if ! grep -r "VITE_ZK_CANISTER_ID" dist &> /dev/null; then
        echo -e "${YELLOW}Warning: Environment variable VITE_ZK_CANISTER_ID not found in build${NC}"
    fi
    
    check_success "Frontend build verification"
}

# Start deployment
print_header "Starting Production Deployment"

# Create deployments directory
mkdir -p deployments

# Run pre-deployment checks
check_dependencies
backup_state

# Set up identity
print_header "Setting up Identity"
dfx identity use ghost
check_success "Switch to ghost identity"

# Get principal
PRINCIPAL=$(dfx identity get-principal)
echo "Using principal: $PRINCIPAL"

# Check cycles and wallet
print_header "Checking Cycles and Wallet"
if ! dfx wallet --network ic balance &> /dev/null; then
    echo "No wallet found. Creating new wallet..."
    # You need to provide your wallet canister ID here
    read -p "Please enter your wallet canister ID: " WALLET_ID
    dfx identity --network ic deploy-wallet "$WALLET_ID"
    check_success "Wallet deployment"
fi

# Display cycle balance
BALANCE=$(dfx wallet --network ic balance)
echo "Current cycle balance: $BALANCE"

# Check if we have enough cycles (minimum 10T cycles)
if [[ $BALANCE =~ ([0-9]+)[^0-9]*$ ]]; then
    CYCLES=${BASH_REMATCH[1]}
    if [ "$CYCLES" -lt "10000000000000" ]; then
        echo -e "${RED}Not enough cycles. Minimum required: 10T cycles${NC}"
        exit 1
    fi
fi

# Check if dfx is running
print_header "Checking DFX Status"
dfx ping
check_success "DFX status check"

# Build Noir circuits for production
print_header "Building Noir Circuits"
cd circuits
nargo compile --optimize
check_success "Circuit compilation"
nargo prove
check_success "Proving key generation"
nargo verify
check_success "Verification key generation"

# Verify circuit artifacts
if [ ! -f "build/circuit.r1cs" ] || [ ! -f "build/proving_key.json" ] || [ ! -f "build/verification_key.json" ]; then
    echo -e "${RED}Error: Circuit artifacts are missing${NC}"
    exit 1
fi
check_success "Circuit artifacts verification"
cd ..

# Deploy to IC mainnet
print_header "Deploying to IC Mainnet"
dfx deploy --network ic --config dfx.production.json
check_success "Mainnet deployment"

# Store canister IDs
ZK_CANISTER=$(dfx canister --network ic id zk_canister)
MAIN_CANISTER=$(dfx canister --network ic id main_canister)
FRONTEND_CANISTER=$(dfx canister --network ic id frontend)

# Verify canister health
verify_canister_health "$ZK_CANISTER" "ZK Canister"
verify_canister_health "$MAIN_CANISTER" "Main Canister"

# Save canister IDs to a file
print_header "Saving Canister IDs"
cat > canister_ids.json << EOL
{
    "zk_canister": "$ZK_CANISTER",
    "main_canister": "$MAIN_CANISTER",
    "frontend_canister": "$FRONTEND_CANISTER"
}
EOL
check_success "Canister IDs saved"

# Generate environment file for frontend
print_header "Generating Frontend Environment"
cat > .env.production << EOL
VITE_ZK_CANISTER_ID=$ZK_CANISTER
VITE_MAIN_CANISTER_ID=$MAIN_CANISTER
VITE_DFX_NETWORK=ic
EOL
check_success "Environment file generation"

# Build frontend
print_header "Building Frontend"
npm run build
check_success "Frontend build"

# Verify frontend build
verify_frontend_build

# Deploy to Netlify
print_header "Deploying to Netlify"
# Ensure netlify-cli is installed
npm install -g netlify-cli

# Verify Netlify authentication
if ! netlify status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with Netlify${NC}"
    echo "Please run 'netlify login' first"
    exit 1
fi

# Create netlify.toml if it doesn't exist
if [ ! -f netlify.toml ]; then
    cat > netlify.toml << EOL
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
    [headers.values]
    Access-Control-Allow-Origin = "*"
EOL
fi

# Deploy to Netlify
netlify deploy --prod --dir=dist --site=ghost-zkaas
check_success "Netlify deployment"

# Set up custom domain
print_header "Setting up Custom Domain"
netlify dns:add ghost.zkaas.xyz @ A
netlify dns:add ghost.zkaas.xyz www CNAME
check_success "DNS setup"

# Verify DNS propagation
print_header "Verifying DNS Propagation"
echo "Waiting for DNS propagation (this may take a few minutes)..."
for i in {1..12}; do
    if host ghost.zkaas.xyz &> /dev/null; then
        echo -e "${GREEN}DNS propagation complete${NC}"
        break
    fi
    if [ $i -eq 12 ]; then
        echo -e "${YELLOW}Warning: DNS propagation is taking longer than expected${NC}"
    fi
    sleep 10
done

# Final status
print_header "Deployment Summary"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "\nCanister IDs:"
echo "ZK Canister: $ZK_CANISTER"
echo "Main Canister: $MAIN_CANISTER"
echo "Frontend Canister: $FRONTEND_CANISTER"
echo -e "\nWebsite URLs:"
echo "Frontend URL: https://ghost.zkaas.xyz"
echo "IC URL: https://$FRONTEND_CANISTER.ic0.app"

# Verify deployment
print_header "Running Verification Tests"
./scripts/test_zkp.sh --network ic
check_success "Production verification tests"

# Save deployment info
print_header "Saving Deployment Information"
DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')
cat > deployment_info.json << EOL
{
    "last_deployment": "$DEPLOY_TIME",
    "identity": "ghost",
    "principal": "$PRINCIPAL",
    "canister_ids": {
        "zk_canister": "$ZK_CANISTER",
        "main_canister": "$MAIN_CANISTER",
        "frontend_canister": "$FRONTEND_CANISTER"
    },
    "urls": {
        "frontend": "https://ghost.zkaas.xyz",
        "ic_frontend": "https://$FRONTEND_CANISTER.ic0.app"
    }
}
EOL
check_success "Deployment information saved"

# Create deployment marker
echo "$DEPLOY_TIME" > deployments/LAST_SUCCESSFUL_DEPLOY 