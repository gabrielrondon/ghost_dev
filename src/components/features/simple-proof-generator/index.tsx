import { useState } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WalletInfo {
  principal: string
  address: string
  chainId: string
}

export function SimpleProofGenerator() {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleGenerateProof = async () => {
    setIsGenerating(true)
    try {
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
    setIsVerifying(true)
    try {
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
        <CardTitle>Simple Proof Generator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleGenerateProof}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Proof'
              )}
            </Button>
            <Button
              onClick={handleVerifyProof}
              disabled={isVerifying}
              variant="outline"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Proof'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 