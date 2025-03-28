import { useState, useEffect } from 'react'
// @ts-ignore - These functions are exported but may not be used directly
import { verifyNftOwnership, verifyOwnership } from '@/services/verification'
import { Shield, CheckCircle2, XCircle, Loader2, Copy, ExternalLink, Image, Wallet, ArrowUpRight, ArrowDownLeft, Vote, AlertTriangle, RefreshCw } from 'lucide-react'
import type { WalletInfo, ICPToken, ICPTransaction } from '@/types/wallet'
import type { VerificationResult, VerifiableItemType } from '@/types/proof'
import toast from 'react-hot-toast'

// Helper functions to generate IDs
// @ts-ignore - Function may be used in future development
function generateProofId(): string {
  return `proof-${Date.now()}-${Math.random().toString(36).substring(2)}`
}

// @ts-ignore - Function may be used in future development
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
  // @ts-ignore - These state variables are used in functions not shown in the current view
  const [tokens, setTokens] = useState<ICPToken[]>([])
  // @ts-ignore - These state variables are used in functions not shown in the current view
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
      setSelectedItemType('token')
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
    setIsRefreshing(true);
    try {
      if (!window.ic?.plug) {
        toast.error('Plug wallet not detected');
        return;
      }
      
      // Try to refresh the connection
      const isConnected = await window.ic.plug.isConnected();
      if (!isConnected) {
        const connected = await window.ic.plug.requestConnect();
        if (!connected) {
          toast.error('Failed to connect to Plug wallet');
          return;
        }
      }
      
      // Try to get NFTs directly
      toast.loading('Checking your wallet status...');
      
      // If we have a principal, try to refresh the data through the normal path
      if (walletInfo?.principal) {
        await fetchUserData(walletInfo.principal);
      }
      
    } catch (error) {
      console.error('Failed to check wallet directly:', error);
      toast.error(`Error checking wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRefreshing(false);
      toast.dismiss();
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
      case 'token':
        return renderTokens()
      case 'transaction':
        return renderTransactionsComingSoon()
      case 'governance':
        return renderGovernance()
      default:
        return renderTokens() // Default to tokens
    }
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
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-3">
        <div className="col-span-1 mb-2 p-2 bg-gray-800/50 rounded-md">
          <p className="text-xs text-gray-400">Found {walletInfo.tokens.length} token(s) in your wallet</p>
        </div>
        
        {walletInfo.tokens.map((token) => {
          const tokenId = `${token.symbol}:${token.amount}`;
          
          // Format the token amount with proper decimal places
          const formattedAmount = parseFloat(token.amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
          });
          
          // Estimated USD value (mock for display purposes)
          const estimatedUsdValue = token.symbol === 'ICP' 
            ? parseFloat(token.amount) * 10 // Assume $10 per ICP
            : token.symbol === 'ckBTC' 
              ? parseFloat(token.amount) * 40000 // Assume $40,000 per BTC
              : 0; // Default for unknown tokens
          
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
                  <p className="text-xs text-gray-400">≈ ${estimatedUsdValue.toFixed(2)} USD</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )
  }

  function renderTransactionsComingSoon() {
    return (
      <div className="bg-gray-700/50 rounded-md p-4 text-center">
        <p className="text-gray-400">Transaction verification coming soon</p>
        <p className="text-sm text-gray-500 mt-1">
          This feature will allow you to prove your transaction history without revealing your identity
        </p>
        <div className="mt-4 p-3 bg-purple-900/20 border border-purple-800 rounded-md">
          <p className="text-sm text-purple-300">
            <span className="font-semibold">Coming in Next Update:</span> Transaction verification will support both sending and receiving transactions.
          </p>
        </div>
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
        
        <div className="text-sm text-purple-300 bg-purple-900/20 p-3 rounded-md mb-4 flex items-center">
          <svg 
            className="h-4 w-4 mr-2 flex-shrink-0" 
            viewBox="0 0 40 40" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="white"/>
            <path d="M29.4507 14.5559L29.4507 14.5559L29.4503 14.5564C29.0895 15.0415 28.5861 15.3852 28.0108 15.5487C28.5857 15.7114 29.0889 16.054 29.4498 16.5379C29.8106 17.0218 29.9999 17.6084 30 18.2126L30 26.875C30 27.7008 29.6708 28.493 29.0847 29.0792C28.4986 29.6653 27.7065 29.9945 26.8808 29.9945L13.1202 29.9945C12.2945 29.9945 11.5024 29.6653 10.9163 29.0792C10.3302 28.493 10.001 27.7008 10.001 26.875L10.001 13.125C10.001 12.2992 10.3302 11.507 10.9163 10.9208C11.5024 10.3347 12.2945 10.0055 13.1202 10.0055L26.8808 10.0055C27.7065 10.0055 28.4986 10.3347 29.0847 10.9208C29.6705 11.5066 29.9994 12.2981 30 13.123C29.9976 13.7318 29.8068 14.3214 29.4462 14.8067" fill="#29ABE2"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M17.9447 16.3391C17.4075 16.3391 16.9677 16.7789 16.9677 17.3161V18.3909C16.9677 18.9282 16.5279 19.368 15.9908 19.368C15.4536 19.368 15.0138 18.9282 15.0138 18.3909V17.3161C15.0138 15.7025 16.3313 14.3852 17.9447 14.3852H22.0553C23.6689 14.3852 24.9862 15.7025 24.9862 17.3161V22.6839C24.9862 24.2975 23.6689 25.6148 22.0553 25.6148H17.9447C16.3313 25.6148 15.0138 24.2975 15.0138 22.6839V21.6091C15.0138 21.0719 15.4536 20.632 15.9908 20.632C16.5279 20.632 16.9677 21.0719 16.9677 21.6091V22.6839C16.9677 22.6839 16.9677 23.2212 17.5049 23.661C18.0421 24.1007 17.9447 23.661 17.9447 23.661H22.0553C22.0553 23.661 22.5926 24.1007 23.1298 23.661C23.667 23.2212 23.5698 22.6839 23.5698 22.6839V17.3161C23.5698 17.3161 23.667 16.7789 23.1298 16.3391C22.5926 15.8993 22.0553 16.3391 22.0553 16.3391H17.9447Z" fill="white"/>
          </svg>
          <span>Currently only supports Plug wallet. Other Internet Computer wallets coming soon.</span>
        </div>
        
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
                  Support for tokens and transactions across multiple blockchain networks.
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
                  Select the type of proof you want to generate (token, transaction, or governance)
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
                  <>
                    {/* SVG icon for Plug wallet */}
                    <svg 
                      className="h-5 w-5 mr-2" 
                      viewBox="0 0 40 40" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="white"/>
                      <path d="M29.4507 14.5559L29.4507 14.5559L29.4503 14.5564C29.0895 15.0415 28.5861 15.3852 28.0108 15.5487C28.5857 15.7114 29.0889 16.054 29.4498 16.5379C29.8106 17.0218 29.9999 17.6084 30 18.2126L30 26.875C30 27.7008 29.6708 28.493 29.0847 29.0792C28.4986 29.6653 27.7065 29.9945 26.8808 29.9945L13.1202 29.9945C12.2945 29.9945 11.5024 29.6653 10.9163 29.0792C10.3302 28.493 10.001 27.7008 10.001 26.875L10.001 13.125C10.001 12.2992 10.3302 11.507 10.9163 10.9208C11.5024 10.3347 12.2945 10.0055 13.1202 10.0055L26.8808 10.0055C27.7065 10.0055 28.4986 10.3347 29.0847 10.9208C29.6705 11.5066 29.9994 12.2981 30 13.123C29.9976 13.7318 29.8068 14.3214 29.4462 14.8067" fill="#29ABE2"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M17.9447 16.3391C17.4075 16.3391 16.9677 16.7789 16.9677 17.3161V18.3909C16.9677 18.9282 16.5279 19.368 15.9908 19.368C15.4536 19.368 15.0138 18.9282 15.0138 18.3909V17.3161C15.0138 15.7025 16.3313 14.3852 17.9447 14.3852H22.0553C23.6689 14.3852 24.9862 15.7025 24.9862 17.3161V22.6839C24.9862 24.2975 23.6689 25.6148 22.0553 25.6148H17.9447C16.3313 25.6148 15.0138 24.2975 15.0138 22.6839V21.6091C15.0138 21.0719 15.4536 20.632 15.9908 20.632C16.5279 20.632 16.9677 21.0719 16.9677 21.6091V22.6839C16.9677 22.6839 16.9677 23.2212 17.5049 23.661C18.0421 24.1007 17.9447 23.661 17.9447 23.661H22.0553C22.0553 23.661 22.5926 24.1007 23.1298 23.661C23.667 23.2212 23.5698 22.6839 23.5698 22.6839V17.3161C23.5698 17.3161 23.667 16.7789 23.1298 16.3391C22.5926 15.8993 22.0553 16.3391 22.0553 16.3391H17.9447Z" fill="white"/>
                    </svg>
                    Connect Plug Wallet
                  </>
                )}
              </button>
              
              {connectionError && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md max-w-md mx-auto">
                  <p className="text-red-300 text-sm">{connectionError}</p>
                  {connectionError.includes('not detected') && (
                    <div className="mt-2">
                      <a 
                        href="https://plugwallet.ooo/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline text-sm flex items-center justify-center"
                      >
                        <svg 
                          className="h-4 w-4 mr-1" 
                          viewBox="0 0 40 40" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="white"/>
                          <path d="M29.4507 14.5559L29.4507 14.5559L29.4503 14.5564C29.0895 15.0415 28.5861 15.3852 28.0108 15.5487C28.5857 15.7114 29.0889 16.054 29.4498 16.5379C29.8106 17.0218 29.9999 17.6084 30 18.2126L30 26.875C30 27.7008 29.6708 28.493 29.0847 29.0792C28.4986 29.6653 27.7065 29.9945 26.8808 29.9945L13.1202 29.9945C12.2945 29.9945 11.5024 29.6653 10.9163 29.0792C10.3302 28.493 10.001 27.7008 10.001 26.875L10.001 13.125C10.001 12.2992 10.3302 11.507 10.9163 10.9208C11.5024 10.3347 12.2945 10.0055 13.1202 10.0055L26.8808 10.0055C27.7065 10.0055 28.4986 10.3347 29.0847 10.9208C29.6705 11.5066 29.9994 12.2981 30 13.123C29.9976 13.7318 29.8068 14.3214 29.4462 14.8067" fill="#29ABE2"/>
                          <path fillRule="evenodd" clipRule="evenodd" d="M17.9447 16.3391C17.4075 16.3391 16.9677 16.7789 16.9677 17.3161V18.3909C16.9677 18.9282 16.5279 19.368 15.9908 19.368C15.4536 19.368 15.0138 18.9282 15.0138 18.3909V17.3161C15.0138 15.7025 16.3313 14.3852 17.9447 14.3852H22.0553C23.6689 14.3852 24.9862 15.7025 24.9862 17.3161V22.6839C24.9862 24.2975 23.6689 25.6148 22.0553 25.6148H17.9447C16.3313 25.6148 15.0138 24.2975 15.0138 22.6839V21.6091C15.0138 21.0719 15.4536 20.632 15.9908 20.632C16.5279 20.632 16.9677 21.0719 16.9677 21.6091V22.6839C16.9677 22.6839 16.9677 23.2212 17.5049 23.661C18.0421 24.1007 17.9447 23.661 17.9447 23.661H22.0553C22.0553 23.661 22.5926 24.1007 23.1298 23.661C23.667 23.2212 23.5698 22.6839 23.5698 22.6839V17.3161C23.5698 17.3161 23.667 16.7789 23.1298 16.3391C22.5926 15.8993 22.0553 16.3391 22.0553 16.3391H17.9447Z" fill="white"/>
                        </svg>
                        Install Plug Wallet
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-gray-700/20 rounded-md border border-gray-600">
              <p className="text-sm text-gray-400 text-center">
                <strong>Note:</strong> For testing purposes, the system will load sample data if you don't have any tokens.
              </p>
            </div>
          </div>
        ) : (
          <>
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
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">What would you like to verify?</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => setSelectedItemType('token')}
                  className={`p-2 rounded-md flex flex-col items-center justify-center text-sm ${
                    selectedItemType === 'token' 
                      ? 'bg-purple-900/50 text-purple-300 border border-purple-500' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  Token Holdings
                </button>
                <button
                  onClick={() => setSelectedItemType('transaction')}
                  className={`p-2 rounded-md flex flex-col items-center justify-center text-sm ${
                    selectedItemType === 'transaction'
                      ? 'bg-purple-900/50 text-purple-300 border border-purple-500' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setSelectedItemType('governance')}
                  className={`p-2 rounded-md flex flex-col items-center justify-center text-sm ${
                    selectedItemType === 'governance'
                      ? 'bg-purple-900/50 text-purple-300 border border-purple-500' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  Governance
                </button>
              </div>

              <div className="mt-4 mb-6">
                {renderVerifiableItems()}
              </div>

              {selectedItemId && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying || !selectedItemId}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md flex items-center justify-center"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                        Generating Zero-Knowledge Proof...
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 mr-2" />
                        Generate Zero-Knowledge Proof
                      </>
                    )}
                  </button>
                </div>
              )}

              {verificationResult && (
                <div className="mt-6 p-4 bg-gray-700/50 rounded-md border border-gray-600">
                  <h4 className="text-lg font-semibold mb-3 flex items-center">
                    {verificationResult.isVerified ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
                        <span className="text-green-400">Proof Verified Successfully</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-400 mr-2" />
                        <span className="text-red-400">Verification Failed</span>
                      </>
                    )}
                  </h4>
                  
                  <div className="bg-gray-800 p-3 rounded-md mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">Proof ID</span>
                      <button 
                        onClick={() => copyToClipboard(verificationResult.proofId)}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center"
                      >
                        {copied ? 'Copied!' : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy ID
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-xs text-gray-300 break-all">{verificationResult.proofId}</p>
                  </div>
                  
                  <div className="bg-gray-800 p-3 rounded-md mb-3">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-400">Anonymized Reference</span>
                    </div>
                    <p className="font-mono text-xs text-gray-300 break-all">{verificationResult.anonymousReference}</p>
                  </div>
                  
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-800 rounded-md">
                    <p className="text-sm text-green-300">
                      This proof can be verified by anyone without revealing your identity or wallet address.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ProofGenerator;