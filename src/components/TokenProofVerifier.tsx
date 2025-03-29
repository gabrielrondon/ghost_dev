import { useEffect, useState } from 'react'
import { Card } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { verifyProof } from '@/services/proof-service'

interface TokenProofVerifierProps {
  proofId: string
  anonymousRef: string
}

export function TokenProofVerifier({ proofId, anonymousRef }: TokenProofVerifierProps) {
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean
    timestamp: bigint
    merkleRoot: string
  } | null>(null)

  useEffect(() => {
    async function verifyTokenProof() {
      try {
        const result = await verifyProof({
          proofId,
          anonymousReference: anonymousRef
        })
        setVerificationResult(result)
      } catch (err) {
        console.error('Error verifying proof:', err)
        setError(err instanceof Error ? err : new Error('Failed to verify proof'))
      } finally {
        setIsVerifying(false)
      }
    }

    verifyTokenProof()
  }, [proofId, anonymousRef])

  if (isVerifying) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
        <p className="text-center mt-4">Verifying proof...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!verificationResult) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No verification result available</AlertDescription>
      </Alert>
    )
  }

  const { isValid, timestamp, merkleRoot } = verificationResult
  const verificationDate = new Date(Number(timestamp))

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        {isValid ? (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        ) : (
          <AlertCircle className="h-6 w-6 text-red-500" />
        )}
        <h2 className="text-lg font-semibold">
          {isValid ? 'Proof Verified Successfully' : 'Invalid Proof'}
        </h2>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">Verification Time</p>
          <p className="text-sm text-muted-foreground">
            {verificationDate.toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium">Merkle Root</p>
          <p className="text-sm font-mono break-all text-muted-foreground">
            {merkleRoot}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium">Proof ID</p>
          <p className="text-sm font-mono break-all text-muted-foreground">
            {proofId}
          </p>
        </div>
      </div>
    </Card>
  )
} 