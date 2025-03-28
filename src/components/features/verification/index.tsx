import { useState, useEffect } from 'react'
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { getVerificationProof } from '@/services/verification'
import { toast } from 'react-hot-toast'

interface VerificationPageProps {
  proofId: string
}

export function VerificationPage({ proofId }: VerificationPageProps) {
  const [proof, setProof] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProof() {
      try {
        const proofData = await getVerificationProof(proofId)
        setProof(proofData)
      } catch (error) {
        console.error('Failed to fetch proof:', error)
        setError('Failed to load verification proof')
        toast.error('Failed to load verification proof')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProof()
  }, [proofId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-gray-300">Loading verification proof...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-2">Verification Failed</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 shadow-md rounded-lg p-8 border border-gray-700 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold">Verification Result</h1>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-md p-4 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <p className="text-green-400">Proof verified successfully</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-sm text-gray-400 mb-1">Proof ID</h2>
            <p className="font-mono text-gray-300">{proofId}</p>
          </div>

          <div>
            <h2 className="text-sm text-gray-400 mb-1">Verification Details</h2>
            <pre className="bg-gray-700 p-4 rounded-md overflow-auto">
              <code className="text-gray-300">
                {JSON.stringify(proof, null, 2)}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
} 