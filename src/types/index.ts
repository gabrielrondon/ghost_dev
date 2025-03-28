import { Principal } from '@dfinity/principal'
import { AttestationData } from '@/services/icp'

// Verification types
export type VerifiableItemType = 'nft' | 'token' | 'transaction' | 'governance'

export interface WalletVerificationRequest {
  tokenId: string
  tokenCanisterId: Principal | string
  walletPrincipal: Principal | string
}

export interface VerificationResult {
  id: string
  timestamp: string
  status: 'verified' | 'failed' | 'pending'
  request: WalletVerificationRequest
  attestation?: {
    id: string
    data: AttestationData
  }
  error?: string
}

// Task types
export interface Task {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  timestamp: string
  config: Record<string, unknown>
  result?: {
    success: boolean
    data?: unknown
    error?: string
  }
}

export interface WalletInfo {
  isConnected: boolean
  principal: string
  accountId?: string
  address: string
  balance?: string
  network?: string
  walletType: 'internetComputer' | 'ethereum'
  chainId: string
  chainName: string
  nfts?: Array<{
    canisterId: string
    index: number
    name: string
    url?: string
    metadata?: {
      attributes?: Array<{
        trait_type: string
        value: string
      }>
    }
    collection?: string
  }>
  tokens?: Array<{
    id: string
    name: string
    symbol: string
    balance: string
    decimals: number
    amount: string
  }>
  transactions?: Array<{
    id: string
    type: 'send' | 'receive' | 'swap' | 'mint' | 'burn'
    amount: string
    token: string
    timestamp: string
    blockHeight: string
    from?: string
    to?: string
    status: 'completed' | 'pending' | 'failed'
  }>
}