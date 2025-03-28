import { useState, useEffect } from 'react'
import { verifyNftOwnership, verifyOwnership } from '@/services/verification'
import { Shield, CheckCircle2, XCircle, Loader2, Copy, ExternalLink, Image, Wallet, ArrowUpRight, ArrowDownLeft, Vote, AlertTriangle, RefreshCw } from 'lucide-react'
import type { WalletInfo, ICPToken, ICPTransaction } from '@/types/wallet'
import type { VerificationResult, VerifiableItemType } from '@/types/proof'
import toast from 'react-hot-toast'

// Helper functions to generate IDs
function generateProofId(): string {
  return `proof-${Date.now()}-${Math.random().toString(36).substring(2)}`
}

function generateAnonymousRef(): string {
  return `anon-${Date.now()}-${Math.random().toString(36).substring(2)}`
}

interface ProofGeneratorProps {
  walletInfo: WalletInfo | null
  isConnecting: boolean
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
  onRefreshData: (principal: string) => Promise<void>
}

interface DebugInfo {
  walletType?: string
  principal?: string
  address?: string
  nftsCount?: number
  timestamp?: string
  directNftCheck?: {
    count: number
    data: any[]
    timestamp: string
  }
  [key: string]: any
}

function ProofGenerator({ walletInfo, isConnecting, onConnect, onDisconnect, onRefreshData }: ProofGeneratorProps) {
  const [selectedItemType, setSelectedItemType] = useState<VerifiableItemType>('token')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [tokens, setTokens] = useState<ICPToken[]>([])
  const [transactions, setTransactions] = useState<ICPTransaction[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})

  useEffect(() => {
    if (walletInfo?.principal) {
      fetchUserData(walletInfo.principal)
    }
  }, [walletInfo?.principal])

  async function fetchUserData(principal: string) {
    setIsLoadingData(true)
    setConnectionError(null)
    try {
      await onRefreshData(principal)
      
      // Store debug information
      setDebugInfo(prev => ({
        ...prev,
        walletType: walletInfo?.walletType,
        principal: walletInfo?.principal,
        address: walletInfo?.address,
        nftsCount: walletInfo?.nfts?.length || 0,
        timestamp: new Date().toISOString()
      }))
      
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      setConnectionError('Failed to load wallet data. Please try again.')
    } finally {
      setIsLoadingData(false)
    }
  }

  async function handleConnectWallet() {
    setConnectionError(null)
    try {
      await onConnect()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      setConnectionError(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`)
      toast.error('Failed to connect wallet')
    }
  }

  async function handleDisconnectWallet() {
    try {
      await onDisconnect()
      setVerificationResult(null)
      setSelectedItemId(null)
      setSelectedItemType('nft')
      setTokens([])
      setTransactions([])
      setConnectionError(null)
    } catch (error) {
      console.error('Failed to disconnect:', error)
      toast.error('Failed to disconnect wallet')
    }
  }

  async function handleRefreshData() {
    if (!walletInfo?.principal) return
    
    setIsRefreshing(true)
    try {
      await fetchUserData(walletInfo.principal)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleCheckWalletDirectly() {
    setIsRefreshing(true)
    try {
      if (!window.ic?.plug) {
        toast.error('Plug wallet not detected')
        return
      }
      
      // Try to refresh the connection
      const isConnected = await window.ic.plug.isConnected()
      if (!isConnected) {
        const connected = await window.ic.plug.requestConnect()
        if (!connected) {
          toast.error('Failed to connect to Plug wallet')
          return
        }
      }
      
      // Try to get NFTs directly
      toast.loading('Checking for NFTs in wallet...')
      console.log('Requesting NFTs directly from Plug wallet')
      const nfts = await window.ic.plug.getNFTs()
      console.log('Direct NFT check result:', nfts)
      
      toast.dismiss()
      toast.success(`Found ${nfts.length} NFT(s) in wallet`)
      
      setDebugInfo(prev => ({
        ...prev,
        directNftCheck: {
          count: nfts.length,
          data: nfts,
          timestamp: new Date().toISOString()
        }
      }))
      
      // If we have a principal, try to refresh the data through the normal path
      if (walletInfo?.principal) {
        await fetchUserData(walletInfo.principal)
      }
      
    } catch (error) {
      console.error('Failed to check wallet directly:', error)
      toast.error(`Error checking wallet: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRefreshing(false)
      toast.dismiss()
    }
  }

  async function handleVerify() {
    if (!selectedItemId || !walletInfo) return
    
    setIsVerifying(true)
    setVerificationResult(null)
    
    try {
      const request = {
        walletAddress: walletInfo.address,
        principal: walletInfo.principal,
        chainId: walletInfo.chainId as 'icp' | 'eth',
        itemType: selectedItemType,
        itemId: selectedItemId
      }
      
      console.log('Verifying with request:', request)
      const result = await verifyOwnership(request)
      
      setVerificationResult(result)
      console.log('Verification result:', result)
      
      if (result.isVerified) {
        toast.success('Zero-knowledge proof successfully generated and verified!')
      } else {
        toast.error('Failed to verify proof. Please try again.')
      }
    } catch (error) {
      console.error('Verification failed:', error)
      toast.error(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsVerifying(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function renderVerifiableItems() {
    if (connectionError) {
      return (
        <div className="bg-red-900/20 border border-red-800 rounded-md p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-300 mb-2">{connectionError}</p>
          <button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md mt-2"
          >
            Try Again
          </button>
        </div>
      )
    }

    if (isLoadingData) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="animate-spin h-8 w-8 text-purple-400 mb-4" />
          <p className="text-gray-400">Loading your wallet data...</p>
        </div>
      )
    }

    switch (selectedItemType) {
      case 'nft':
        return renderNfts()
      case 'token':
        return renderTokens()
      case 'transaction':
        return renderTransactions()
      case 'governance':
        return renderGovernance()
      default:
        return null
    }
  }

  function renderNfts() {
    if (!walletInfo?.nfts || walletInfo.nfts.length === 0) {
      return (
        <div className="bg-gray-700/50 rounded-md p-4 text-center">
          <p className="text-gray-400">No NFTs found in your wallet</p>
          <p className="text-sm text-gray-500 mt-1">
            You need to have at least one NFT to create a verification proof
          </p>
          <div className="flex flex-col space-y-2 mt-4">
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="flex items-center justify-center mx-auto px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </button>
            
            <button
              onClick={handleCheckWalletDirectly}
              disabled={isRefreshing}
              className="flex items-center justify-center mx-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Checking...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Check Wallet Directly
                </>
              )}
            </button>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 text-left p-2 bg-gray-800 rounded-md">
            <p className="font-semibold text-gray-400 mb-2">Debugging info:</p>
            <p>Principal: {walletInfo?.principal || 'Not available'}</p>
            <p>Address: {walletInfo?.address || 'Not available'}</p>
            <p>Wallet Type: {walletInfo?.walletType || 'Not available'}</p>
            <p>Chain ID: {walletInfo?.chainId || 'Not available'}</p>
            <p>Is Connected: {walletInfo?.isConnected ? 'Yes' : 'No'}</p>
            <p className="mt-2 font-semibold text-gray-400">NFTs Debug:</p>
            <p>NFT Count: {walletInfo?.nfts?.length || 0}</p>
            <p>NFT Array Type: {walletInfo?.nfts ? typeof walletInfo.nfts : 'undefined'}</p>
            
            {debugInfo.directNftCheck && (
              <div className="mt-2">
                <p className="font-semibold text-gray-400">Direct NFT Check:</p>
                <p>Count: {debugInfo.directNftCheck.count}</p>
                <p>Timestamp: {debugInfo.directNftCheck.timestamp}</p>
              </div>
            )}
            
            <div className="mt-2">
              <p className="font-semibold text-gray-400">Full Wallet Info:</p>
              <pre className="mt-1 overflow-auto bg-gray-900 p-2 rounded text-gray-300 text-xs">
                {JSON.stringify(walletInfo, null, 2)}
              </pre>
            </div>
            
            <div className="mt-2">
              <p className="font-semibold text-gray-400">Debug Info:</p>
              <pre className="mt-1 overflow-auto bg-gray-900 p-2 rounded text-gray-300 text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )
    }

    console.log('Rendering NFTs:', walletInfo.nfts);

    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 mb-2 p-2 bg-gray-800/50 rounded-md">
          <p className="text-xs text-gray-400">Found {walletInfo.nfts.length} NFT(s) in your wallet</p>
        </div>
        
        {walletInfo.nfts.map((nft) => {
          const nftId = `${nft.canisterId}:${nft.index}`;
          console.log('NFT ID for selection:', nftId, 'NFT data:', nft);
          
          return (
            <div 
              key={nftId}
              className={`border rounded-md p-2 cursor-pointer transition-colors ${
                selectedItemId === nftId 
                  ? 'border-purple-500 bg-purple-900/20' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedItemId(nftId)}
            >
              <div className="aspect-square bg-gray-900 rounded-md flex items-center justify-center mb-2 overflow-hidden">
                {nft.url ? (
                  <img 
                    src={nft.url} 
                    alt={nft.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(`Failed to load image for NFT: ${nft.name}`, nft.url);
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzJhMmEyYSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                    }}
                  />
                ) : (
                  <Image className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <p className="text-sm font-medium truncate">{nft.name}</p>
              <p className="text-xs text-gray-500 truncate">Collection: {nft.collection || 'Unknown'}</p>
              <p className="text-xs text-gray-500 truncate">ID: {nft.index}</p>
              <p className="text-xs text-gray-500 truncate">Canister: {nft.canisterId.substring(0, 10)}...</p>
            </div>
          );
        })}
      </div>
    )
  }

  function renderTokens() {
    if (!walletInfo?.tokens || walletInfo.tokens.length === 0) {
      return (
        <div className="bg-gray-700/50 rounded-md p-4 text-center">
          <p className="text-gray-400">No tokens found in your wallet</p>
          <p className="text-sm text-gray-500 mt-1">
            You need to have at least one token to create a verification proof
          </p>
          <div className="flex flex-col space-y-2 mt-4">
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="flex items-center justify-center mx-auto px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </button>
            
            <button
              onClick={handleCheckWalletDirectly}
              disabled={isRefreshing}
              className="flex items-center justify-center mx-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Checking...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Check Wallet Directly
                </>
              )}
            </button>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 text-left p-2 bg-gray-800 rounded-md">
            <p className="font-semibold text-gray-400 mb-2">Debugging info:</p>
            <p>Principal: {walletInfo?.principal || 'Not available'}</p>
            <p>Address: {walletInfo?.address || 'Not available'}</p>
            <p>Wallet Type: {walletInfo?.walletType || 'Not available'}</p>
            <p>Chain ID: {walletInfo?.chainId || 'Not available'}</p>
            <p>Is Connected: {walletInfo?.isConnected ? 'Yes' : 'No'}</p>
            <p className="mt-2 font-semibold text-gray-400">Tokens Debug:</p>
            <p>Token Count: {walletInfo?.tokens?.length || 0}</p>
            <p>Token Array Type: {walletInfo?.tokens ? typeof walletInfo.tokens : 'undefined'}</p>
            
            <div className="mt-2">
              <p className="font-semibold text-gray-400">Full Wallet Info:</p>
              <pre className="mt-1 overflow-auto bg-gray-900 p-2 rounded text-gray-300 text-xs">
                {JSON.stringify(walletInfo, null, 2)}
              </pre>
            </div>
            
            <div className="mt-2">
              <p className="font-semibold text-gray-400">Debug Info:</p>
              <pre className="mt-1 overflow-auto bg-gray-900 p-2 rounded text-gray-300 text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )
    }

    console.log('Rendering tokens:', walletInfo.tokens);
    
    return (
      <div className="grid grid-cols-1 gap-3">
        <div className="col-span-1 mb-2 p-2 bg-gray-800/50 rounded-md">
          <p className="text-xs text-gray-400">Found {walletInfo.tokens.length} token(s) in your wallet</p>
        </div>
        
        {walletInfo.tokens.map((token) => {
          const tokenId = `${token.symbol}:${token.amount}`;
          console.log('Token ID for selection:', tokenId, 'Token data:', token);
          
          // Format the token amount with proper decimal places
          const formattedAmount = parseFloat(token.amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
          });
          
          return (
            <div 
              key={tokenId}
              className={`border rounded-md p-3 cursor-pointer transition-colors ${
                selectedItemId === tokenId 
                  ? 'border-purple-500 bg-purple-900/20' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedItemId(tokenId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mr-3">
                    {token.symbol === 'ICP' ? (
                      <span className="text-purple-400 text-sm font-semibold">ICP</span>
                    ) : (
                      <span className="text-gray-400 text-sm font-semibold">{token.symbol}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{token.name || token.symbol}</p>
                    <p className="text-xs text-gray-400">{token.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formattedAmount}</p>
                  <p className="text-xs text-gray-400">≈ ${(parseFloat(token.amount) * (token.usdValue || 0)).toFixed(2)} USD</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )
  }

  function renderTransactions() {
    if (transactions.length === 0) {
      return (
        <div className="bg-gray-700/50 rounded-md p-4 text-center">
          <p className="text-gray-400">No transactions found in your wallet</p>
          <p className="text-sm text-gray-500 mt-1">
            You need to have at least one transaction to create a verification proof
          </p>
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="flex items-center justify-center mx-auto mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div 
            key={tx.id}
            className={`border rounded-md p-3 cursor-pointer transition-colors ${
              selectedItemId === tx.id 
                ? 'border-purple-500 bg-purple-900/20' 
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => setSelectedItemId(tx.id)}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mr-3">
                {tx.type === 'receive' ? (
                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-medium">
                    {tx.type === 'receive' ? 'Received' : 'Sent'} {tx.token}
                  </p>
                  <p className={`font-bold ${tx.type === 'receive' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'receive' ? '+' : '-'}{tx.amount}
                  </p>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <p>{new Date(tx.timestamp).toLocaleDateString()}</p>
                  <p>#{tx.blockHeight}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderGovernance() {
    return (
      <div className="bg-gray-700/50 rounded-md p-4 text-center">
        <p className="text-gray-400">Governance verification coming soon</p>
        <p className="text-sm text-gray-500 mt-1">
          This feature will allow you to prove your participation in governance without revealing your identity
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6 my-8 text-gray-100">
      <div className="flex items-center mb-6">
        <Shield className="h-8 w-8 text-purple-400 mr-3" />
        <h2 className="text-2xl font-bold">Zero-Knowledge Proof Generator</h2>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-400 mb-4">
          Generate anonymous proofs of your on-chain activity without revealing your wallet address.
        </p>
        
        {!walletInfo ? (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Welcome to Ghost Agent</h3>
              <p className="text-gray-400 mb-4">
                Generate zero-knowledge proofs of your on-chain activity while maintaining your privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center mb-3">
                  <Shield className="h-5 w-5 text-purple-400 mr-2" />
                  <h4 className="font-medium">Privacy-First</h4>
                </div>
                <p className="text-sm text-gray-400">
                  Prove your on-chain activity without revealing your wallet address or personal information.
                </p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
                  <h4 className="font-medium">Verifiable</h4>
                </div>
                <p className="text-sm text-gray-400">
                  All proofs are cryptographically verified and can be independently validated.
                </p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center mb-3">
                  <Wallet className="h-5 w-5 text-blue-400 mr-2" />
                  <h4 className="font-medium">Multi-Chain</h4>
                </div>
                <p className="text-sm text-gray-400">
                  Support for NFTs, tokens, and transactions across multiple blockchain networks.
                </p>
              </div>
            </div>

            <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600">
              <h4 className="font-medium mb-3">How It Works</h4>
              <ol className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mr-2">1</span>
                  Connect your Internet Computer wallet
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mr-2">2</span>
                  Select the type of proof you want to generate (NFT, token, transaction)
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mr-2">3</span>
                  Choose the specific item you want to verify
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mr-2">4</span>
                  Generate your zero-knowledge proof
                </li>
              </ol>
            </div>

            <div className="text-center">
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full max-w-md bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md flex items-center justify-center mx-auto"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Connecting to Internet Computer...
                  </>
                ) : (
                  'Connect Internet Computer Wallet'
                )}
              </button>
              
              {connectionError && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md max-w-md mx-auto">
                  <p className="text-red-300 text-sm">{connectionError}</p>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-gray-700/20 rounded-md border border-gray-600">
              <p className="text-sm text-gray-400 text-center">
                <strong>Note:</strong> For testing purposes, the system will load sample data if you don't have any NFTs, tokens, or transactions.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-700 p-4 rounded-md mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400">Connected Wallet</p>
                <p className="font-mono text-sm truncate text-purple-400">
                  {walletInfo.walletType === 'internetComputer' 
                    ? `${walletInfo.principal?.slice(0, 6)}...${walletInfo.principal?.slice(-4)}`
                    : `${walletInfo.address.slice(0, 6)}...${walletInfo.address.slice(-4)}`}
                </p>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  className="text-sm text-gray-400 hover:text-gray-300 mr-4 flex items-center"
                >
                  {isRefreshing ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={handleDisconnectWallet}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {walletInfo && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">What would you like to verify?</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <button
                className={`p-2 rounded-md flex flex-col items-center justify-center text-sm ${
                  selectedItemType === 'nft' 
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-500' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                onClick={() => {
                  setSelectedItemType('nft')
                  setSelectedItemId(null)
                }}
              >
                <Image className="h-5 w-5 mb-1" />
                NFTs
              </button>
              <button
                className={`p-2 rounded-md flex flex-col items-center justify-center text-sm ${
                  selectedItemType === 'token' 
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-500' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                onClick={() => {
                  setSelectedItemType('token')
                  setSelectedItemId(null)
                }}
              >
                <Wallet className="h-5 w-5 mb-1" />
                Tokens
              </button>
              <button
                className={`p-2 rounded-md flex flex-col items-center justify-center text-sm ${
                  selectedItemType === 'transaction' 
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-500' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                onClick={() => {
                  setSelectedItemType('transaction')
                  setSelectedItemId(null)
                }}
              >
                <ArrowUpRight className="h-5 w-5 mb-1" />
                Txns
              </button>
              <button
                className={`p-2 rounded-md flex flex-col items-center justify-center text-sm ${
                  selectedItemType === 'governance' 
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-500' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                onClick={() => {
                  setSelectedItemType('governance')
                  setSelectedItemId(null)
                }}
              >
                <Vote className="h-5 w-5 mb-1" />
                Gov
              </button>
            </div>
            
            <div className="mb-4">
              {renderVerifiableItems()}
            </div>
            
            <button
              onClick={handleVerify}
              disabled={isVerifying || !selectedItemId}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Generating Proof...
                </>
              ) : (
                'Generate Zero-Knowledge Proof'
              )}
            </button>
          </div>
        </>
      )}
      
      {verificationResult && (
        <div className="border border-gray-700 rounded-md p-4 bg-gray-800/50">
          <div className="flex items-center mb-4">
            {verificationResult.isVerified ? (
              <CheckCircle2 className="h-6 w-6 text-green-400 mr-2" />
            ) : (
              <XCircle className="h-6 w-6 text-red-400 mr-2" />
            )}
            <h3 className="text-lg font-semibold">
              {verificationResult.isVerified ? 'Proof Generated Successfully' : 'Proof Generation Failed'}
            </h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Anonymous Reference ID</p>
              <div className="flex items-center">
                <p className="font-mono text-sm truncate mr-2 text-purple-400">{verificationResult.anonymousReference}</p>
                <button 
                  onClick={() => copyToClipboard(verificationResult.anonymousReference)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Proof ID</p>
              <p className="font-mono text-sm truncate text-purple-400">{verificationResult.proofId}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Timestamp</p>
              <p className="text-sm">{new Date(verificationResult.timestamp).toLocaleString()}</p>
            </div>
            
            <div className="pt-2">
              <a 
                href={`#/verify/${verificationResult.proofId}`}
                onClick={(e) => {
                  e.preventDefault();
                  // In a real app, this would navigate to the verification page
                  // For development, we'll create a formatted verification page
                  
                  // Create a formatted HTML page
                  const html = `
                  <!DOCTYPE html>
                  <html lang="en">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Zero-Knowledge Proof Verification</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                      body { background-color: #111827; color: #e5e7eb; font-family: system-ui, -apple-system, sans-serif; }
                      .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
                      .proof-card { background-color: #1f2937; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #374151; }
                      .proof-header { display: flex; align-items: center; margin-bottom: 1.5rem; }
                      .proof-icon { background-color: #374151; border-radius: 9999px; width: 3rem; height: 3rem; display: flex; align-items: center; justify-content: center; margin-right: 1rem; }
                      .proof-title { font-size: 1.5rem; font-weight: 600; color: #f3f4f6; }
                      .proof-subtitle { font-size: 1rem; color: #9ca3af; margin-top: 0.25rem; }
                      .proof-status { display: flex; align-items: center; background-color: #065f46; color: #d1fae5; padding: 0.5rem 1rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; margin-left: auto; }
                      .proof-status-icon { width: 1rem; height: 1rem; margin-right: 0.5rem; }
                      .proof-section { margin-top: 1.5rem; }
                      .proof-section-title { font-size: 1rem; font-weight: 500; color: #9ca3af; margin-bottom: 0.5rem; }
                      .proof-detail { background-color: #374151; border-radius: 0.375rem; padding: 1rem; margin-bottom: 1rem; }
                      .proof-detail-label { font-size: 0.75rem; color: #9ca3af; margin-bottom: 0.25rem; }
                      .proof-detail-value { font-size: 0.875rem; color: #e5e7eb; font-family: monospace; word-break: break-all; }
                      .proof-detail-value.highlight { color: #a78bfa; }
                      .proof-explanation { background-color: #374151; border-radius: 0.375rem; padding: 1rem; margin-top: 1.5rem; border-left: 4px solid #8b5cf6; }
                      .footer { text-align: center; margin-top: 2rem; font-size: 0.875rem; color: #6b7280; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="proof-card">
                        <div class="proof-header">
                          <div class="proof-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                            </svg>
                          </div>
                          <div>
                            <h1 class="proof-title">Validated Zero-Knowledge Proof</h1>
                            <p class="proof-subtitle">Cryptographically verified without revealing identity</p>
                          </div>
                          <div class="proof-status">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="proof-status-icon">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                              <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            Verified
                          </div>
                        </div>
                        
                        <div class="proof-section">
                          <h2 class="proof-section-title">PROOF DETAILS</h2>
                          <div class="proof-detail">
                            <p class="proof-detail-label">Proof Type</p>
                            <p class="proof-detail-value">${verificationResult.itemType === 'nft' ? 'NFT Ownership' : 
                                                           verificationResult.itemType === 'token' ? 'Token Balance' : 
                                                           verificationResult.itemType === 'transaction' ? 'Transaction History' : 
                                                           'Governance Participation'}</p>
                          </div>
                          
                          ${verificationResult.itemType === 'nft' && verificationResult.nftName ? `
                          <div class="proof-detail">
                            <p class="proof-detail-label">NFT Name</p>
                            <p class="proof-detail-value highlight">${verificationResult.nftName}</p>
                          </div>
                          ` : ''}
                          
                          ${verificationResult.itemType === 'nft' && verificationResult.nftContractAddress ? `
                          <div class="proof-detail">
                            <p class="proof-detail-label">NFT Collection</p>
                            <p class="proof-detail-value">${verificationResult.nftContractAddress}</p>
                          </div>
                          ` : ''}
                          
                          ${verificationResult.itemType === 'token' && verificationResult.tokenName ? `
                          <div class="proof-detail">
                            <p class="proof-detail-label">Token</p>
                            <p class="proof-detail-value highlight">${verificationResult.tokenName} (${verificationResult.tokenSymbol})</p>
                          </div>
                          ` : ''}
                          
                          ${verificationResult.itemType === 'transaction' && verificationResult.transactionHash ? `
                          <div class="proof-detail">
                            <p class="proof-detail-label">Transaction Type</p>
                            <p class="proof-detail-value highlight">${verificationResult.transactionType}</p>
                          </div>
                          <div class="proof-detail">
                            <p class="proof-detail-label">Transaction Amount</p>
                            <p class="proof-detail-value">${verificationResult.transactionAmount} ${verificationResult.transactionToken}</p>
                          </div>
                          ` : ''}
                          
                          <div class="proof-detail">
                            <p class="proof-detail-label">Blockchain</p>
                            <p class="proof-detail-value">${verificationResult.chainId === 'icp' ? 'Internet Computer' : 'Ethereum'}</p>
                          </div>
                          
                          <div class="proof-detail">
                            <p class="proof-detail-label">Verification Time</p>
                            <p class="proof-detail-value">${new Date(verificationResult.timestamp).toLocaleString()}</p>
                          </div>
                          
                          <div class="proof-detail">
                            <p class="proof-detail-label">Proof ID</p>
                            <p class="proof-detail-value">${verificationResult.proofId}</p>
                          </div>
                          
                          <div class="proof-detail">
                            <p class="proof-detail-label">Anonymous Reference</p>
                            <p class="proof-detail-value">${verificationResult.anonymousReference}</p>
                          </div>
                        </div>
                        
                        <div class="proof-explanation">
                          <h2 class="proof-section-title">PROOF EXPLANATION</h2>
                          <p class="text-sm text-gray-300 mt-2">
                            This zero-knowledge proof verifies that the holder possesses ${
                              verificationResult.itemType === 'nft' ? `the NFT "${verificationResult.nftName || 'specified'}" from collection "${verificationResult.nftContractAddress || 'specified'}"` : 
                              verificationResult.itemType === 'token' ? `the specified amount of ${verificationResult.tokenName || verificationResult.tokenSymbol || 'tokens'}` :
                              verificationResult.itemType === 'transaction' ? `a valid ${verificationResult.transactionType || ''} transaction of ${verificationResult.transactionAmount || ''} ${verificationResult.transactionToken || ''}` :
                              'participation in governance activities'
                            } on the ${verificationResult.chainId === 'icp' ? 'Internet Computer' : 'Ethereum'} blockchain.
                          </p>
                          <p class="text-sm text-gray-300 mt-2">
                            The proof was cryptographically generated and verified without revealing the identity of the wallet owner.
                            This allows the holder to prove ownership or activity without exposing their wallet address or other personal information.
                          </p>
                        </div>
                      </div>
                      
                      <div class="footer">
                        <p>Powered by Ghost Agent Zero-Knowledge Proof System</p>
                        <p class="mt-1">This verification is cryptographically secure and tamper-proof.</p>
                      </div>
                    </div>
                  </body>
                  </html>
                  `;
                  
                  // Create a blob and open it in a new window
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                }}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center"
              >
                View Verification Page <ExternalLink className="h-3 w-3 ml-1" />
              </a>
              <p className="text-xs text-gray-500 mt-1">
                (Opens a formatted verification page)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { ProofGenerator }