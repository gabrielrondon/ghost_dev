import React from 'react'
import { Loader2 } from 'lucide-react'
import type { ICPToken } from '@/types/wallet'

interface TokenListProps {
  tokens: ICPToken[]
  isLoading: boolean
  onSelectToken: (id: string) => void
  selectedTokenId: string | null
}

export function TokenList({ tokens, isLoading, onSelectToken, selectedTokenId }: TokenListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="animate-spin h-8 w-8 text-purple-400 mb-4" />
        <p className="text-gray-400">Loading your tokens...</p>
      </div>
    )
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="bg-gray-800 rounded-md p-6 text-center">
        <p className="text-gray-400 mb-2">No tokens found in your wallet.</p>
        <p className="text-sm text-gray-500">
          Connect your wallet or try refreshing if you believe this is an error.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tokens.map((token) => (
        <div
          key={token.id}
          onClick={() => onSelectToken(token.id)}
          className={`
            border rounded-lg p-5 cursor-pointer transition-all
            ${selectedTokenId === token.id 
              ? 'bg-purple-900/30 border-purple-500' 
              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}
          `}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                {token.symbol.slice(0, 2)}
              </div>
              <div>
                <h3 className="font-medium">{token.name}</h3>
                <p className="text-xs text-gray-400">{token.symbol}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-gray-500">Balance</p>
              <p className="text-xl font-semibold">
                {token.amount} <span className="text-sm font-normal">{token.symbol}</span>
              </p>
            </div>
            <div className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
              {token.decimals} decimals
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 