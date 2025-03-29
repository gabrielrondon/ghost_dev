'use client'

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { tokenService } from "@/services/token-service"
import { walletService } from "@/services/wallet-service"
import { TokenMetadata, TokenOwnershipInput } from "@/types/token"
import { TokenProofGenerator } from './TokenProofGenerator'

function TokenItem({ token, onSelect }: { token: TokenMetadata; onSelect: () => void }) {
  return (
    <Card className="cursor-pointer hover:bg-accent/50" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{token.name}</h3>
            <p className="text-sm text-muted-foreground">{token.symbol}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">Balance: {token.total_supply.toString()}</p>
            <p className="text-xs text-muted-foreground">{token.token_standard}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TokenList() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [tokens, setTokens] = useState<TokenMetadata[]>([])
  const [selectedToken, setSelectedToken] = useState<TokenMetadata | null>(null)

  useEffect(() => {
    async function fetchTokens() {
      try {
        const principal = walletService.getPrincipal()
        if (!principal) {
          toast({
            title: "Error",
            description: "Please connect your wallet first",
            variant: "destructive",
          })
          return
        }

        const fetchedTokens = await tokenService.getTokens(principal)
        setTokens(fetchedTokens)
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch tokens",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokens()
  }, [toast])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No tokens found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your Tokens</CardTitle>
          <CardDescription>Select a token to generate a proof of ownership</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {tokens.map((token) => (
            <TokenItem
              key={token.canister_id.toString()}
              token={token}
              onSelect={() => setSelectedToken(token)}
            />
          ))}
        </CardContent>
      </Card>

      {selectedToken && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Proof</CardTitle>
            <CardDescription>Generate a proof of ownership for {selectedToken.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <TokenProofGenerator
              tokenMetadata={selectedToken}
              ownershipInput={{
                token_canister_id: selectedToken.canister_id,
                owner: walletService.getPrincipal()!,
                amount: selectedToken.total_supply,
                token_standard: selectedToken.token_standard,
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
} 