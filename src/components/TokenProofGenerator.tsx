import { useState } from 'react'
import { useWallet } from '@/hooks/use-wallet'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { TokenList } from './TokenList'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { AlertCircle, Copy, ExternalLink } from 'lucide-react'
import { generateProof } from '@/services/proof-service'

interface TokenProofGeneratorProps {
  onProofGenerated?: (proofId: string, anonymousRef: string) => void
}

export function TokenProofGenerator({ onProofGenerated }: TokenProofGeneratorProps) {
  const [selectedTokenId, setSelectedTokenId] = useState<string>()
  const [minBalance, setMinBalance] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [proofResult, setProofResult] = useState<{
    proofId: string
    anonymousRef: string
    verificationUrl: string
  } | null>(null)

  const { principal } = useWallet()
  const { tokens, merkleRoot } = useTokenBalances({ principal })

  const selectedToken = tokens.find(t => t.id === selectedTokenId)

  async function handleGenerateProof() {
    if (!selectedToken || !principal || !merkleRoot || !minBalance) return

    setIsGenerating(true)
    setError(null)

    try {
      const result = await generateProof({
        tokenId: selectedToken.id,
        minBalance: BigInt(minBalance),
        walletAddress: principal,
        merkleRoot
      })

      setProofResult({
        proofId: result.proofId,
        anonymousRef: result.anonymousReference,
        verificationUrl: `${window.location.origin}/verify/${result.proofId}/${result.anonymousReference}`
      })

      if (onProofGenerated) {
        onProofGenerated(result.proofId, result.anonymousReference)
      }
    } catch (err) {
      console.error('Error generating proof:', err)
      setError(err instanceof Error ? err : new Error('Failed to generate proof'))
    } finally {
      setIsGenerating(false)
    }
  }

  function handleCopyLink() {
    if (!proofResult) return
    navigator.clipboard.writeText(proofResult.verificationUrl)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Select Token</h2>
        <TokenList
          selectedTokenId={selectedTokenId}
          onSelectToken={setSelectedTokenId}
        />
      </div>

      {selectedToken && (
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="minBalance" className="text-sm font-medium">
              Minimum Balance to Prove
            </label>
            <Input
              id="minBalance"
              type="number"
              placeholder={`Enter minimum ${selectedToken.symbol} balance`}
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
              min="0"
              step="any"
            />
            <p className="text-sm text-muted-foreground">
              Current balance: {selectedToken.amount} {selectedToken.symbol}
            </p>
          </div>

          <Button
            onClick={handleGenerateProof}
            disabled={isGenerating || !minBalance || Number(minBalance) > Number(selectedToken.amount)}
            className="w-full"
          >
            {isGenerating ? 'Generating...' : 'Generate Proof'}
          </Button>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {proofResult && (
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Proof Generated Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              Share this link with anyone to verify your token balance:
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={proofResult.verificationUrl}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                title="Copy verification link"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                asChild
                title="Open verification page"
              >
                <a
                  href={proofResult.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
} 