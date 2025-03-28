import { VerifiableItemType } from './proof'

export interface WalletVerificationRequest {
  walletAddress: string
  principal?: string
  chainId: 'icp' | 'eth'
  itemType: VerifiableItemType
  itemId: string
} 