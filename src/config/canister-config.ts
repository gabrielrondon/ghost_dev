/**
 * Canister configuration for different environments
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development'

// Canister IDs and config for the application
export const ZK_CANISTER_ID = 'hi7bu-myaaa-aaaad-aaloa-cai'
export const IC_HOST = 'https://ic0.app'

// DFX network name
export const DFX_NETWORK = isDevelopment ? 'local' : 'ic'

// Token standards
export const TOKEN_STANDARDS = {
  ICP: 'ICP',
  ICRC1: 'ICRC-1',
  ICRC2: 'ICRC-2',
  EXT: 'EXT'
}

// Configuration for specific canisters
export const CANISTER_CONFIG = {
  zk_canister: {
    canisterId: ZK_CANISTER_ID,
    network: DFX_NETWORK
  }
} 