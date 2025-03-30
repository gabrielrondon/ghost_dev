import { useState, useEffect } from 'react'
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { getVerificationProof } from '@/services/verification'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface VerificationPageProps {
  proofId: string
}

interface VerificationResult {
  isVerified: boolean
  message: string
  timestamp: string
  proofType: string
  itemId: string
}

export function VerificationPage({ proofId }: VerificationPageProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifyProof() {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getVerificationProof(proofId)
        setResult(result)
        
        if (result.isVerified) {
          toast({
            title: 'Verification Successful',
            description: 'The proof has been verified successfully.',
          })
        } else {
          toast({
            title: 'Verification Failed',
            description: result.message || 'The proof could not be verified.',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Failed to verify proof:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        setError(message)
        toast({
          title: 'Verification Error',
          description: message,
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (proofId) verifyProof()
  }, [proofId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying Proof</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Result Found</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Shield className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No verification result found for this proof.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Result</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-8 space-y-6">
          {result.isVerified ? (
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          ) : (
            <XCircle className="h-12 w-12 text-destructive" />
          )}
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              {result.isVerified ? 'Proof Verified' : 'Verification Failed'}
            </p>
            <p className="text-sm text-muted-foreground">{result.message}</p>
          </div>
          <div className="w-full max-w-sm space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p className="text-muted-foreground">Proof Type:</p>
              <p className="font-medium">{result.proofType}</p>
              <p className="text-muted-foreground">Item ID:</p>
              <p className="font-medium truncate">{result.itemId}</p>
              <p className="text-muted-foreground">Timestamp:</p>
              <p className="font-medium">{new Date(result.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 