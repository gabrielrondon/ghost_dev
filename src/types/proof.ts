export type VerifiableItemType = 'nft' | 'token' | 'transaction' | 'governance'

export interface VerificationResult {
  isVerified: boolean
  proofId: string
  timestamp: number
  anonymousReference: string
  chainId: 'icp' | 'eth'
  itemType: VerifiableItemType
  itemId: string
  principal?: string
  
  // NFT specific fields
  nftContractAddress?: string
  nftIndex?: number
  nftName?: string
  nftImageUrl?: string
  
  // Token specific fields
  tokenName?: string
  tokenSymbol?: string
  tokenAmount?: string
  
  // Transaction specific fields
  transactionHash?: string
  transactionType?: 'send' | 'receive' | 'swap' | 'mint' | 'burn'
  transactionAmount?: string
  transactionToken?: string
  transactionTimestamp?: number
  
  // Governance specific fields
  proposalId?: string
  voteType?: 'yes' | 'no' | 'abstain'
} 