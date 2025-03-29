import { useState, useMemo } from 'react'
import { SearchIcon, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils'
import { Token } from '@/types'
import { formatICPBalance } from '@/services/stoic-wallet'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface TokenListProps {
  tokens: Token[]
  isLoading?: boolean
  onSelectToken?: (tokenId: string) => void
  selectedTokenId?: string
}

export function TokenList({
  tokens = [],
  isLoading = false,
  onSelectToken,
  selectedTokenId
}: TokenListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens
    
    const query = searchQuery.toLowerCase()
    return tokens.filter(token => 
      token.name.toLowerCase().includes(query) || 
      token.symbol.toLowerCase().includes(query)
    )
  }, [tokens, searchQuery])
  
  function handleSelectToken(tokenId: string) {
    if (onSelectToken) {
      onSelectToken(tokenId)
    }
  }
  
  if (isLoading) {
    return <TokenListSkeleton />
  }
  
  if (tokens.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-muted-foreground">No tokens found</p>
      </div>
    )
  }
  
  return (
    <div className="w-full space-y-3">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search tokens..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {filteredTokens.map((token) => (
          <TokenCard
            key={token.id}
            token={token}
            isSelected={token.id === selectedTokenId}
            onSelect={() => handleSelectToken(token.id)}
          />
        ))}
        
        {filteredTokens.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No tokens match your search</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface TokenCardProps {
  token: Token
  isSelected?: boolean
  onSelect: () => void
}

function TokenCard({ token, isSelected = false, onSelect }: TokenCardProps) {
  // Format the balance to human-readable format
  const formattedBalance = useMemo(() => {
    if (token.symbol === 'ICP') {
      return formatICPBalance(token.amount)
    }
    
    // Format other tokens appropriately
    const amount = Number(token.amount) / Math.pow(10, token.decimals || 8)
    return amount.toLocaleString('en-US', {
      maximumFractionDigits: 4,
      minimumFractionDigits: 0
    })
  }, [token])
  
  // Calculate estimated USD value if available
  const estimatedUSD = useMemo(() => {
    if (!token.price) return null
    
    const tokenAmount = Number(token.amount) / Math.pow(10, token.decimals || 8)
    const usdValue = tokenAmount * token.price
    
    // Only show if the value is meaningful
    if (usdValue < 0.01) return null
    
    return `$${usdValue.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    })}`
  }, [token])
  
  return (
    <Card 
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md flex justify-between items-center",
        isSelected && "border-primary ring-1 ring-primary"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center space-x-3">
        {token.logoUrl ? (
          <img 
            src={token.logoUrl} 
            alt={token.symbol} 
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-medium">{token.symbol.substring(0, 2)}</span>
          </div>
        )}
        
        <div>
          <p className="font-medium">{token.name}</p>
          <p className="text-xs text-muted-foreground">{token.symbol}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="text-right">
          <p className="font-medium">{formattedBalance}</p>
          {estimatedUSD && <p className="text-xs text-muted-foreground">{estimatedUSD}</p>}
        </div>
        
        {isSelected && (
          <CheckCircle2 className="h-5 w-5 text-primary ml-2" />
        )}
      </div>
    </Card>
  )
}

function TokenListSkeleton() {
  return (
    <div className="w-full space-y-3">
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full" />
        ))}
      </div>
    </div>
  )
} 