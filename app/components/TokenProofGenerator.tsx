'use client'

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { tokenService } from "@/services/token-service"
import { TokenMetadata, TokenOwnershipInput, TokenOwnershipProof } from "@/types/token"

interface TokenProofGeneratorProps {
  tokenMetadata: TokenMetadata
  ownershipInput: TokenOwnershipInput
}

export function TokenProofGenerator({ tokenMetadata, ownershipInput }: TokenProofGeneratorProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [proof, setProof] = useState<TokenOwnershipProof | null>(null)

  async function handleGenerateProof() {
    try {
      setIsGenerating(true)
      const generatedProof = await tokenService.generateProof(ownershipInput)
      setProof(generatedProof)
      toast({
        title: "Success",
        description: "Proof generated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate proof",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{tokenMetadata.name}</h3>
          <p className="text-sm text-muted-foreground">
            Amount: {ownershipInput.amount.toString()} {tokenMetadata.symbol}
          </p>
        </div>
        <Button onClick={handleGenerateProof} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Proof"
          )}
        </Button>
      </div>

      {proof && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Proof</CardTitle>
            <CardDescription>Your zero-knowledge proof of token ownership</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="font-medium">Public Inputs:</p>
                <pre className="mt-1 rounded bg-muted p-2 text-sm">
                  {JSON.stringify(proof.public_inputs, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-medium">Proof:</p>
                <pre className="mt-1 rounded bg-muted p-2 text-sm">
                  {JSON.stringify(proof.proof, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 