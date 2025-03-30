'use client'

import React from 'react'
import { useWallet } from '@/hooks/useWallet'
import { tokenService } from '@/services/token-balance'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { TokenMetadata } from '@/types/token'
import { Principal } from '@dfinity/principal'

function TokenItem({ token, principal }: { token: TokenMetadata; principal: string }) {
  const [balance, setBalance] = React.useState<bigint | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchBalance() {
      try {
        const principalObj = Principal.fromText(principal)
        const balance = await tokenService.getBalance(token, principalObj)
        setBalance(balance)
      } catch (error) {
        console.error('Failed to fetch balance:', error)
        toast.error('Failed to fetch balance')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalance()
  }, [token, principal])

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        {token.logo_url && (
          <img src={token.logo_url} alt={token.name} className="w-8 h-8 rounded-full" />
        )}
        <div>
          <h3 className="font-medium">{token.name}</h3>
          <p className="text-sm text-gray-500">{token.symbol}</p>
        </div>
      </div>
      <div className="text-right">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <p className="font-medium">
            {balance ? balance.toString() : '0'} {token.symbol}
          </p>
        )}
      </div>
    </div>
  )
}

export function TokenList() {
  const { principal } = useWallet()
  const [tokens, setTokens] = React.useState<TokenMetadata[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchTokens() {
      if (!principal) {
        setTokens([])
        setIsLoading(false)
        return
      }

      try {
        const principalObj = Principal.fromText(principal)
        const tokens = await tokenService.fetchTokens(principalObj)
        setTokens(tokens)
      } catch (error) {
        console.error('Failed to fetch tokens:', error)
        toast.error('Failed to fetch tokens')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokens()
  }, [principal])

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!principal) {
    return (
      <div className="text-center p-8 text-gray-500">
        Please connect your wallet to view tokens
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No tokens found
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {tokens.map((token) => (
        <TokenItem key={token.canister_id.toString()} token={token} principal={principal} />
      ))}
    </div>
  )
} 