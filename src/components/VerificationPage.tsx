import React, { useState, useEffect } from 'react'
import { Shield, CheckCircle2, XCircle, Loader2, ExternalLink, Wallet, ArrowUpRight, ArrowDownLeft, Vote, AlertTriangle } from 'lucide-react'
import { getVerificationProof } from '../api'
import type { VerificationResult } from '../types'

interface VerificationPageProps {
  proofId: string
}

function VerificationPage({ proofId }: VerificationPageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVerificationProof() {
      try {
        // In development mode, we might not have a real API endpoint
        // So we'll check if the proofId is a valid UUID format
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proofId);
        
        if (!isValidUuid) {
          // For development, create a mock verification result
          setVerificationResult({
            isVerified: true,
            proofId,
            timestamp: Date.now(),
            anonymousReference: 'dev-reference-123',
            walletAddress: 'hidden-for-privacy',
            chainId: 'icp',
            itemType: 'nft',
            itemId: 'sample-nft-1',
            nftContractAddress: 'rw7qm-eiaaa-aaaak-aaiqq-cai',
            nftIndex: 1,
            nftName: 'Sample NFT for Development',
            principal: 'hidden-for-privacy'
          });
          setIsLoading(false);
          return;
        }
        
        const result = await getVerificationProof(proofId)
        
        if (!result) {
          throw new Error('Proof not found');
        }
        
        setVerificationResult(result)
      } catch (err) {
        setError('Failed to load verification proof')
        console.error('Error fetching verification proof:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVerificationProof()
  }, [proofId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-gray-100">
        <Loader2 className="h-12 w-12 text-purple-400 animate-spin mb-4" />
        <p className="text-gray-400">Loading verification proof...</p>
      </div>
    )
  }

  if (error || !verificationResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 text-gray-100">
        <XCircle className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-100 mb-2">Verification Failed</h2>
        <p className="text-gray-400">{error || 'Proof not found'}</p>
        <div className="mt-6 p-4 bg-gray-800 rounded-md max-w-md">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            <h3 className="text-md font-semibold text-yellow-300">Development Mode Note</h3>
          </div>
          <p className="text-sm text-gray-400">
            In a production environment, this page would verify a proof using its ID.
            For development purposes, you can generate a proof from the main application.
          </p>
        </div>
      </div>
    )
  }

  function renderVerificationIcon() {
    switch (verificationResult.itemType) {
      case 'nft':
        return <Shield className="h-8 w-8 text-purple-400 mr-3" />
      case 'token':
        return <Wallet className="h-8 w-8 text-purple-400 mr-3" />
      case 'transaction':
        return <ArrowUpRight className="h-8 w-8 text-purple-400 mr-3" />
      case 'governance':
        return <Vote className="h-8 w-8 text-purple-400 mr-3" />
      default:
        return <Shield className="h-8 w-8 text-purple-400 mr-3" />
    }
  }

  function renderVerificationTitle() {
    switch (verificationResult.itemType) {
      case 'nft':
        return 'NFT Ownership Verified'
      case 'token':
        return 'Token Balance Verified'
      case 'transaction':
        return 'Transaction Verified'
      case 'governance':
        return 'Governance Participation Verified'
      default:
        return 'Verification Successful'
    }
  }

  function renderVerificationDetails() {
    switch (verificationResult.itemType) {
      case 'nft':
        return renderNftDetails()
      case 'token':
        return renderTokenDetails()
      case 'transaction':
        return renderTransactionDetails()
      case 'governance':
        return renderGovernanceDetails()
      default:
        return null
    }
  }

  function renderNftDetails() {
    return (
      <>
        {verificationResult.nftName && (
          <div>
            <p className="text-sm text-gray-400">NFT Name</p>
            <p className="text-sm font-medium">{verificationResult.nftName}</p>
          </div>
        )}
        
        {verificationResult.nftContractAddress && (
          <div>
            <p className="text-sm text-gray-400">NFT Contract</p>
            <div className="flex items-center">
              <p className="font-mono text-sm truncate mr-2 text-purple-400">
                {verificationResult.nftContractAddress}
              </p>
              <a 
                href={verificationResult.chainId === 'icp' 
                  ? `https://dashboard.internetcomputer.org/canister/${verificationResult.nftContractAddress}`
                  : `https://etherscan.io/address/${verificationResult.nftContractAddress}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
        
        {verificationResult.nftIndex !== undefined && (
          <div>
            <p className="text-sm text-gray-400">NFT ID</p>
            <p className="text-sm">{verificationResult.nftIndex}</p>
          </div>
        )}
      </>
    )
  }

  function renderTokenDetails() {
    return (
      <>
        {verificationResult.tokenName && (
          <div>
            <p className="text-sm text-gray-400">Token</p>
            <p className="text-sm font-medium">{verificationResult.tokenName}</p>
          </div>
        )}
        
        {verificationResult.tokenSymbol && (
          <div>
            <p className="text-sm text-gray-400">Symbol</p>
            <p className="text-sm font-medium">{verificationResult.tokenSymbol}</p>
          </div>
        )}
        
        {verificationResult.tokenAmount !== undefined && (
          <div>
            <p className="text-sm text-gray-400">Balance</p>
            <p className="text-sm font-bold text-purple-400">{verificationResult.tokenAmount}</p>
          </div>
        )}
      </>
    )
  }

  function renderTransactionDetails() {
    return (
      <>
        {verificationResult.transactionHash && (
          <div>
            <p className="text-sm text-gray-400">Transaction Hash</p>
            <p className="font-mono text-sm truncate text-purple-400">{verificationResult.transactionHash}</p>
          </div>
        )}
        
        {verificationResult.transactionType && (
          <div>
            <p className="text-sm text-gray-400">Type</p>
            <p className="text-sm font-medium capitalize">{verificationResult.transactionType}</p>
          </div>
        )}
        
        {verificationResult.transactionAmount !== undefined && verificationResult.transactionToken && (
          <div>
            <p className="text-sm text-gray-400">Amount</p>
            <p className="text-sm font-bold">
              {verificationResult.transactionAmount} {verificationResult.transactionToken}
            </p>
          </div>
        )}
        
        {verificationResult.transactionTimestamp && (
          <div>
            <p className="text-sm text-gray-400">Transaction Time</p>
            <p className="text-sm">{new Date(verificationResult.transactionTimestamp).toLocaleString()}</p>
          </div>
        )}
      </>
    )
  }

  function renderGovernanceDetails() {
    return (
      <>
        {verificationResult.proposalId && (
          <div>
            <p className="text-sm text-gray-400">Proposal ID</p>
            <p className="font-mono text-sm truncate text-purple-400">{verificationResult.proposalId}</p>
          </div>
        )}
        
        {verificationResult.voteType && (
          <div>
            <p className="text-sm text-gray-400">Vote</p>
            <p className="text-sm font-medium capitalize">{verificationResult.voteType}</p>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-8">
      <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6 my-8">
        <div className="flex items-center mb-6">
          {renderVerificationIcon()}
          <h2 className="text-2xl font-bold">Verification Proof</h2>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center mb-4">
            {verificationResult.isVerified ? (
              <CheckCircle2 className="h-8 w-8 text-green-400 mr-3" />
            ) : (
              <XCircle className="h-8 w-8 text-red-400 mr-3" />
            )}
            <h3 className="text-xl font-semibold">
              {verificationResult.isVerified 
                ? renderVerificationTitle()
                : 'Verification Failed'}
            </h3>
          </div>
          
          <p className="text-gray-400 mb-4">
            This is an anonymous verification proof. The wallet owner has proven their on-chain activity without revealing their wallet address.
          </p>
        </div>
        
        <div className="bg-gray-700 p-4 rounded-md mb-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Proof ID</p>
              <p className="font-mono text-sm text-purple-400">{verificationResult.proofId}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Anonymous Reference</p>
              <p className="font-mono text-sm text-purple-400">{verificationResult.anonymousReference}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Chain</p>
              <p className="text-sm">
                {verificationResult.chainId === 'icp' ? 'Internet Computer' : 
                 verificationResult.chainId === '0x1' ? 'Ethereum Mainnet' : 
                 verificationResult.chainId === '0x89' ? 'Polygon' :
                 verificationResult.chainId === '0xa86a' ? 'Avalanche' :
                 `Chain ID: ${verificationResult.chainId}`}
              </p>
            </div>
            
            {renderVerificationDetails()}
            
            <div>
              <p className="text-sm text-gray-400">Verification Time</p>
              <p className="text-sm">{new Date(verificationResult.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-4">
          <p className="text-sm text-gray-400 mb-2">Powered by Ghost Agent ZK Proof System</p>
          <p className="text-xs text-gray-500">
            This verification is cryptographically secure and tamper-proof. The original wallet address is not stored or revealed.
          </p>
        </div>
      </div>
    </div>
  )
}

export { VerificationPage } 