import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useWallet } from '@/hooks/use-wallet'

// Helper functions to generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function generateTransactionId(): string {
  return `tx_${generateId()}`
}

export function ProofGenerator() {
  const { principal } = useWallet()
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleGenerateProof = async () => {
    try {
      setIsGenerating(true)
      // Mock proof generation
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: 'Proof Generated',
        description: 'Your proof has been generated successfully.',
      })
    } catch (error) {
      console.error('Failed to generate proof:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Generation Failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleVerifyProof = async () => {
    try {
      setIsVerifying(true)
      // Mock verification
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: 'Proof Verified',
        description: 'Your proof has been verified successfully.',
      })
    } catch (error) {
      console.error('Failed to verify proof:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Verification Failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Token Proof</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connected as: {principal}
          </p>
          <div className="flex gap-4">
            <Button
              onClick={handleGenerateProof}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Proof'}
            </Button>
            <Button
              onClick={handleVerifyProof}
              disabled={isVerifying}
              variant="outline"
            >
              {isVerifying ? 'Verifying...' : 'Verify Proof'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}