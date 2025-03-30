import { useState, useEffect } from 'react'
import { Principal } from '@dfinity/principal'
import { HttpAgent } from '@dfinity/agent'
import { TokenBalanceService } from '@/services/token-balance'
import { buildMerkleTree, type TokenBalance } from '@/utils/merkle-tree'
import type { ICPToken } from '@/types/wallet'
import { bytesToHex } from '@noble/hashes/utils'
import { tokenService } from '@/services/token-service'

interface UseTokenBalancesProps {
  principal?: string | null
}

interface UseTokenBalancesResult {
  tokens: ICPToken[]
  isLoading: boolean
  error: Error | null
  merkleRoot: string | null
  merkleTree: ReturnType<typeof buildMerkleTree> | null
  refreshBalances: () => Promise<void>
}

const SUPPORTED_TOKENS = [
  {
    canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai', // ICP Ledger
    standard: 'ICP' as const,
    name: 'Internet Computer Protocol',
    symbol: 'ICP',
    decimals: 8,
    logoUrl: 'https://cryptologos.cc/logos/internet-computer-icp-logo.png'
  },
  // Add more tokens here
]

export function useTokenBalances({ principal }: UseTokenBalancesProps): UseTokenBalancesResult {
  const [tokens, setTokens] = useState<ICPToken[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null)
  const [merkleTree, setMerkleTree] = useState<ReturnType<typeof buildMerkleTree> | null>(null)
  const [agent, setAgent] = useState<HttpAgent | null>(null)

  // Initialize agent
  useEffect(() => {
    const newAgent = new HttpAgent({ host: 'https://ic0.app' })
    setAgent(newAgent)
  }, [])

  async function fetchBalances() {
    if (!principal) {
      setTokens([])
      setMerkleRoot(null)
      setMerkleTree(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const balances = await tokenService.getAllBalances(Principal.fromText(principal))
      
      // Build Merkle tree from balances
      const tree = buildMerkleTree(balances)
      setMerkleRoot(bytesToHex(tree.hash))
      setMerkleTree(tree)

      // Transform TokenBalance[] to ICPToken[]
      const icpTokens: ICPToken[] = balances.map(balance => {
        const metadata = balance.metadata 
          ? JSON.parse(new TextDecoder().decode(balance.metadata))
          : { symbol: 'UNKNOWN', decimals: 8 }
        
        return {
          id: balance.tokenId.toString(),
          name: metadata.symbol, // Using symbol as name since that's what we stored
          symbol: metadata.symbol,
          balance: balance.balance.toString(),
          amount: balance.balance.toString(),
          decimals: metadata.decimals,
          price: 0, // Price would need to be fetched from a price feed
          logoUrl: '' // Logo URL would need to be fetched from a token registry
        }
      })
      
      setTokens(icpTokens)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch token balances'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [principal])

  return {
    tokens,
    isLoading,
    error,
    merkleRoot,
    merkleTree,
    refreshBalances: fetchBalances
  }
} 