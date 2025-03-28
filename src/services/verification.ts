import type { VerificationResult } from '@/types/proof'
import type { WalletVerificationRequest } from '@/types/verification'

// Mock storage to hold verification results for demo
const verificationResults = new Map<string, VerificationResult>()

/**
 * Generate a unique proof ID
 */
function generateProofId(): string {
  return `proof-${Date.now()}-${Math.random().toString(36).substring(2)}`
}

/**
 * Generate an anonymous reference for privacy-preserving verification
 */
function generateAnonymousRef(): string {
  return `anon-${Date.now()}-${Math.random().toString(36).substring(2)}`
}

/**
 * Get a verification proof by ID
 */
async function getVerificationProof(proofId: string): Promise<VerificationResult | null> {
  console.log('Fetching verification proof:', proofId)
  
  // In a real app, this would fetch from a database or blockchain
  // For demo, we'll just return from our in-memory mock storage
  const result = verificationResults.get(proofId)
  
  if (!result) {
    console.warn('Verification proof not found:', proofId)
    return null
  }
  
  return result
}

/**
 * Verify NFT ownership for a wallet
 */
async function verifyNftOwnership(
  request: WalletVerificationRequest,
  proofId: string,
  anonymousReference: string
): Promise<VerificationResult> {
  console.log('Verification request:', request)
  
  // Check required fields
  if (!request.walletAddress) throw new Error('Wallet address is required')
  if (!request.itemId) throw new Error('Item ID is required')
  if (request.chainId !== 'icp') throw new Error('Invalid chain ID')

  // Parse itemId to get canisterId and nftIndex
  // Plug wallet uses both formats: "canisterId:index" and "canisterId-index"
  let canisterId, nftIndexStr
  
  if (request.itemId.includes(':')) {
    [canisterId, nftIndexStr] = request.itemId.split(':')
  } else if (request.itemId.includes('-')) {
    [canisterId, nftIndexStr] = request.itemId.split('-')
  } else {
    throw new Error('Invalid item ID format. Expected format: "canisterId:index" or "canisterId-index"')
  }
  
  if (!canisterId || !nftIndexStr) throw new Error('Invalid item ID format')
  
  const nftIndex = parseInt(nftIndexStr, 10)
  if (isNaN(nftIndex)) throw new Error('Invalid NFT index')

  console.log('Verifying NFT ownership:', { 
    canisterId, 
    nftIndex, 
    walletAddress: request.walletAddress,
    format: request.itemId.includes(':') ? 'colon-separated' : 'hyphen-separated'
  })

  // For development/demo purposes, allow the verification to succeed
  try {
    // In a production app, we would actually verify with the canister
    console.log('Verification succeeded (demo mode)')
    
    // For demo purposes, we're assuming ownership is valid
    const metadata = {
      name: `NFT #${nftIndex}`,
      image: `https://nft.internetcomputer.org/sample/${nftIndex}.png`
    }
    
    const result: VerificationResult = {
      isVerified: true,
      proofId,
      timestamp: Date.now(),
      anonymousReference,
      chainId: request.chainId,
      itemType: 'nft',
      itemId: request.itemId,
      nftContractAddress: canisterId,
      nftIndex,
      nftName: metadata.name,
      nftImageUrl: metadata.image || undefined,
      principal: request.principal
    }
    
    // Store the result in our mock storage
    verificationResults.set(proofId, result)
    
    console.log('Returning verification result:', result)
    return result
  } catch (error) {
    console.error('NFT verification error:', error)
    throw new Error(`Failed to verify NFT ownership: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Verify token balance ownership for a wallet
 */
async function verifyTokenBalance(
  request: WalletVerificationRequest,
  proofId: string,
  anonymousReference: string
): Promise<VerificationResult> {
  console.log('Token verification request:', request)
  
  // Check required fields
  if (!request.walletAddress) throw new Error('Wallet address is required')
  if (!request.itemId) throw new Error('Item ID is required')
  if (request.chainId !== 'icp') throw new Error('Invalid chain ID')

  // Parse itemId to get token symbol and amount
  // Format: "ICP:2.5"
  let tokenSymbol, tokenAmount
  
  if (request.itemId.includes(':')) {
    [tokenSymbol, tokenAmount] = request.itemId.split(':')
  } else {
    throw new Error('Invalid item ID format. Expected format: "symbol:amount"')
  }
  
  if (!tokenSymbol || !tokenAmount) throw new Error('Invalid item ID format')
  
  const amount = parseFloat(tokenAmount)
  if (isNaN(amount)) throw new Error('Invalid token amount')

  console.log('Verifying token balance:', { 
    tokenSymbol, 
    tokenAmount, 
    walletAddress: request.walletAddress
  })

  // For development/demo purposes, allow the verification to succeed
  try {
    // In a production app, we would actually verify the token balance
    // This would typically involve querying the ledger canister or an indexer
    
    console.log('Token verification succeeded (demo mode)')
    
    // For demo purposes, we're assuming ownership is valid
    const result: VerificationResult = {
      isVerified: true,
      proofId,
      timestamp: Date.now(),
      anonymousReference,
      chainId: request.chainId,
      itemType: 'token',
      itemId: request.itemId,
      tokenSymbol,
      tokenAmount: amount.toString(),
      principal: request.principal
    }
    
    // Store the result in our mock storage
    verificationResults.set(proofId, result)
    
    console.log('Returning token verification result:', result)
    return result
  } catch (error) {
    console.error('Token verification error:', error)
    throw new Error(`Failed to verify token balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Verify ownership of a verifiable item (NFT, token balance, transaction)
 */
async function verifyOwnership(request: WalletVerificationRequest): Promise<VerificationResult> {
  console.log('Verifying ownership for request:', request)
  
  // Generate unique identifiers for this verification
  const proofId = generateProofId()
  const anonymousReference = generateAnonymousRef()
  
  if (request.itemType === 'nft') {
    return verifyNftOwnership(request, proofId, anonymousReference)
  } else if (request.itemType === 'token') {
    return verifyTokenBalance(request, proofId, anonymousReference)
  } else if (request.itemType === 'transaction') {
    // TODO: implement transaction verification
    throw new Error('Transaction verification not yet implemented')
  } else {
    throw new Error(`Unsupported item type: ${request.itemType}`)
  }
}

export {
  verifyOwnership,
  verifyNftOwnership,
  verifyTokenBalance,
  generateProofId,
  generateAnonymousRef,
  getVerificationProof
} 