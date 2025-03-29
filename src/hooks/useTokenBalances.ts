import { useState, useEffect } from 'react'
import { Principal } from '@dfinity/principal'
import { HttpAgent } from '@dfinity/agent'
import { TokenBalanceService } from '@/services/token-balance'
import { buildMerkleTree, type TokenBalance } from '@/utils/merkle-tree'
import type { ICPToken } from '@/types/wallet'
import { bytesToHex } from '@noble/hashes/utils'

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

export function useTokenBalances({
  principal
}: UseTokenBalancesProps): UseTokenBalancesResult {
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

  const fetchBalances = async () => {
    if (!principal || !agent) return

    setIsLoading(true)
    setError(null)

    try {
      const tokenService = new TokenBalanceService(agent)
      const principalObj = Principal.fromText(principal)
      const balances = await tokenService.getAllBalances(principalObj)

      // Build Merkle tree from balances
      const tree = buildMerkleTree(balances)
      setMerkleRoot(bytesToHex(tree.hash))
      setMerkleTree(tree)

      // Format tokens for UI
      const formattedTokens: ICPToken[] = balances.map(balance => {
        const metadata = balance.metadata ? JSON.parse(new TextDecoder().decode(balance.metadata)) : {}
        return {
          id: balance.tokenId.toString(),
          name: metadata.name || 'Unknown Token',
          symbol: metadata.symbol || '???',
          balance: balance.balance.toString(),
          amount: (Number(balance.balance) / Math.pow(10, metadata.decimals || 8)).toString(),
          decimals: metadata.decimals || 8,
          price: 0, // TODO: Fetch price from an oracle or API
          logoUrl: metadata.logo || ''
        }
      })

      setTokens(formattedTokens)
    } catch (err) {
      console.error('Error fetching token balances:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch token balances'))
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch balances when principal or agent changes
  useEffect(() => {
    void fetchBalances()
  }, [principal, agent])

  return {
    tokens,
    isLoading,
    error,
    merkleRoot,
    merkleTree,
    refreshBalances: fetchBalances
  }
} 