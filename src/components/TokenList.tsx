import { useState, useMemo } from 'react'
import { SearchIcon, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/utils'
import { ICPToken } from '@/types/wallet'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { useWallet } from '@/hooks/use-wallet'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TokenListProps {
  onSelectToken?: (tokenId: string) => void
  selectedTokenId?: string
}

export function TokenList({
  onSelectToken,
  selectedTokenId
}: TokenListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { principal } = useWallet()
  const { tokens, isLoading, error, refreshBalances } = useTokenBalances({
    principal
  })
  
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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load tokens: {error.message}
          <Button
            variant="link"
            className="p-0 h-auto font-normal text-destructive-foreground underline ml-2"
            onClick={refreshBalances}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
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
  token: ICPToken
  isSelected?: boolean
  onSelect: () => void
}

function TokenCard({ token, isSelected, onSelect }: TokenCardProps) {
  const formattedBalance = useMemo(() => {
    const amount = Number(token.balance) / Math.pow(10, token.decimals || 8)
    return amount.toLocaleString('en-US', {
      maximumFractionDigits: token.decimals || 8,
      minimumFractionDigits: 0
    })
  }, [token])

  return (
    <Card
      role="button"
      tabIndex={0}
      className={cn(
        'p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors',
        isSelected && 'bg-muted'
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {token.logoUrl ? (
        <img
          src={token.logoUrl}
          alt={token.symbol}
          className="w-8 h-8 rounded-full"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <span className="text-sm font-medium">{token.symbol[0]}</span>
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{token.name}</p>
          <span className="text-sm text-muted-foreground">{token.symbol}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {formattedBalance} {token.symbol}
        </p>
      </div>
      
      {isSelected && (
        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
      )}
    </Card>
  )
}

function TokenListSkeleton() {
  return (
    <div className="w-full space-y-3">
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full" />
        ))}
      </div>
    </div>
  )
} 