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
  address: string
  chainId: string
  chainName: string
  isConnected: boolean
  principal: string
  walletType: 'internetComputer' | 'ethereum'
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
}