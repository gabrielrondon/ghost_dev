/**
 * Canister configuration for different environments
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development'

// Canister IDs
export const ZK_CANISTER_ID = isDevelopment 
  ? 'bkyz2-fmaaa-aaaaa-qaaaq-cai'  // Local development canister
  : 'hi7bu-myaaa-aaaad-aaloa-cai'  // Production canister

// IC Hosts
export const IC_HOST = isDevelopment
  ? 'http://127.0.0.1:8000'  // Local development host
  : 'https://ic0.app'        // Production host

// DFX network name
export const DFX_NETWORK = isDevelopment ? 'local' : 'ic'

// Configuration for specific canisters
export const CANISTER_CONFIG = {
  zk_canister: {
    canisterId: ZK_CANISTER_ID,
    network: DFX_NETWORK
  }
} 