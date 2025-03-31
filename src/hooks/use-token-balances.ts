import { useState, useEffect, useCallback } from 'react'
import { fetchTokenBalances, Token } from '../services/token-service'

interface UseTokenBalancesParams {
  principal: string | null
}

interface UseTokenBalancesResult {
  tokens: Token[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useTokenBalances({ principal }: UseTokenBalancesParams): UseTokenBalancesResult {
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTokens = useCallback(async () => {
    if (!principal) {
      setTokens([])
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const fetchedTokens = await fetchTokenBalances(principal)
      setTokens(fetchedTokens)
    } catch (err) {
      console.error('Error fetching token balances:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch token balances'))
    } finally {
      setIsLoading(false)
    }
  }, [principal])

  // Initial fetch
  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  // Provide a refetch function
  const refetch = useCallback(async () => {
    await fetchTokens()
  }, [fetchTokens])

  return { tokens, isLoading, error, refetch }
} 