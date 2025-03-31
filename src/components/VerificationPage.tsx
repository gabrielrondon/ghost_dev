import { useState, useEffect } from 'react'
import { verifyProof } from '../services/proof-service'

interface VerificationPageProps {
  proofId: string
}

export function VerificationPage({ proofId }: VerificationPageProps) {
  const [verificationState, setVerificationState] = useState<'loading' | 'success' | 'error'>('loading')
  const [verificationResult, setVerificationResult] = useState<{ 
    token: string;
    minimumBalance: string;
    verified: boolean;
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verifyProofData() {
      try {
        setVerificationState('loading')
        
        const result = await verifyProof(proofId)
        
        if (result.isValid) {
          setVerificationResult({
            token: result.token,
            minimumBalance: result.minimumBalance,
            verified: true
          })
          setVerificationState('success')
        } else {
          setError(result.error || 'Proof verification failed')
          setVerificationState('error')
        }
      } catch (err) {
        console.error('Error verifying proof:', err)
        setError('Failed to verify proof. The proof may be invalid or expired.')
        setVerificationState('error')
      }
    }

    verifyProofData()
  }, [proofId])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-4">Token Ownership Verification</h1>
          
          {verificationState === 'loading' && (
            <div className="text-center py-6">
              <div className="w-10 h-10 border-t-2 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Verifying proof...</p>
            </div>
          )}
          
          {verificationState === 'error' && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded mb-4">
              <h3 className="font-medium">Verification Failed</h3>
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {verificationState === 'success' && verificationResult && (
            <div>
              <div className="bg-green-900/30 border border-green-800 text-green-300 px-4 py-3 rounded mb-6">
                <h3 className="font-medium">Verification Successful</h3>
                <p className="text-sm">The provided proof has been verified.</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-gray-400 text-sm font-medium">Token</h3>
                  <p className="text-white">{verificationResult.token}</p>
                </div>
                
                <div>
                  <h3 className="text-gray-400 text-sm font-medium">Minimum Balance Proven</h3>
                  <p className="text-white">{verificationResult.minimumBalance}</p>
                </div>
                
                <div className="pt-2">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-900/50 text-green-300">
                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified on Internet Computer
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 