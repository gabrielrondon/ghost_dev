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

# Function to list available backups
list_backups() {
    print_header "Available Backups"
    if [ -d "deployments" ]; then
        ls -lt deployments/backup_* 2>/dev/null | awk '{print $9}' || echo "No backups found"
    else
        echo "No deployments directory found"
        exit 1
    fi
}

# Function to verify backup integrity
verify_backup() {
    local BACKUP_DIR=$1
    print_header "Verifying Backup Integrity"
    
    # Check required files
    local REQUIRED_FILES=(
        "canister_ids.json"
        "zk_canister_status.txt"
        "main_canister_status.txt"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$BACKUP_DIR/$file" ]; then
            echo -e "${RED}Error: Required backup file $file is missing${NC}"
            return 1
        fi
    done
    
    # Verify JSON file integrity
    if ! jq empty "$BACKUP_DIR/canister_ids.json" 2>/dev/null; then
        echo -e "${RED}Error: canister_ids.json is corrupted${NC}"
        return 1
    fi
    
    check_success "Backup integrity verification"
    return 0
}

# Function to restore canister state
restore_canister() {
    local CANISTER_ID=$1
    local CANISTER_NAME=$2
    local BACKUP_STATE=$3
    
    print_header "Restoring $CANISTER_NAME"
    
    # Stop the canister
    dfx canister --network ic stop "$CANISTER_ID"
    check_success "Stop $CANISTER_NAME"
    
    # Install backup code
    if [ -f "$BACKUP_STATE/${CANISTER_NAME}_backup.wasm" ]; then
        dfx canister --network ic install "$CANISTER_ID" --wasm "$BACKUP_STATE/${CANISTER_NAME}_backup.wasm" --mode reinstall
        check_success "Restore $CANISTER_NAME code"
    else
        echo -e "${YELLOW}Warning: No backup WASM found for $CANISTER_NAME${NC}"
    fi
    
    # Start the canister
    dfx canister --network ic start "$CANISTER_ID"
    check_success "Start $CANISTER_NAME"
    
    # Verify canister is running
    if ! dfx canister --network ic status "$CANISTER_ID" | grep -q "Running"; then
        echo -e "${RED}Error: Failed to restart $CANISTER_NAME${NC}"
        exit 1
    fi
}

# Main rollback function
perform_rollback() {
    local BACKUP_DIR=$1
    
    print_header "Starting Rollback Process"
    
    # Verify backup integrity
    verify_backup "$BACKUP_DIR" || exit 1
    
    # Load canister IDs from backup
    local ZK_CANISTER=$(jq -r '.zk_canister' "$BACKUP_DIR/canister_ids.json")
    local MAIN_CANISTER=$(jq -r '.main_canister' "$BACKUP_DIR/canister_ids.json")
    
    # Create new backup before rollback
    CURRENT_BACKUP="deployments/backup_pre_rollback_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$CURRENT_BACKUP"
    
    # Backup current state
    if [ -f .dfx/local/canister_ids.json ]; then
        cp .dfx/local/canister_ids.json "$CURRENT_BACKUP/"
    fi
    if [ -f .env.production ]; then
        cp .env.production "$CURRENT_BACKUP/"
    fi
    
    # Restore canisters
    restore_canister "$ZK_CANISTER" "zk_canister" "$BACKUP_DIR"
    restore_canister "$MAIN_CANISTER" "main_canister" "$BACKUP_DIR"
    
    # Restore environment files
    if [ -f "$BACKUP_DIR/.env.production" ]; then
        cp "$BACKUP_DIR/.env.production" .env.production
        check_success "Restore environment files"
    fi
    
    # Restore frontend if available
    if [ -d "$BACKUP_DIR/dist" ]; then
        rm -rf dist
        cp -r "$BACKUP_DIR/dist" .
        check_success "Restore frontend build"
        
        # Redeploy to Netlify
        print_header "Redeploying Frontend to Netlify"
        netlify deploy --prod --dir=dist --site=ghost-zkaas
        check_success "Netlify redeployment"
    fi
    
    print_header "Rollback Complete"
    echo -e "${GREEN}Successfully rolled back to backup: $BACKUP_DIR${NC}"
    echo "Previous state backed up to: $CURRENT_BACKUP"
}

# Display usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 [list|rollback <backup_dir>]"
    echo "  list     - List available backups"
    echo "  rollback - Rollback to specified backup directory"
    exit 1
fi

# Parse command line arguments
case "$1" in
    list)
        list_backups
        ;;
    rollback)
        if [ -z "$2" ]; then
            echo "Error: Please specify a backup directory"
            list_backups
            exit 1
        fi
        if [ ! -d "$2" ]; then
            echo "Error: Backup directory $2 does not exist"
            list_backups
            exit 1
        fi
        perform_rollback "$2"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Usage: $0 [list|rollback <backup_dir>]"
        exit 1
        ;;
esac 