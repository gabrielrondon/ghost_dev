import { TokenProofVerifier } from '@/components/TokenProofVerifier'

interface VerifyPageProps {
  params: {
    proofId: string
    anonymousRef: string
  }
}

export default function VerifyPage({ params }: VerifyPageProps) {
  const { proofId, anonymousRef } = params

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-6">Verify Token Proof</h1>
      <TokenProofVerifier proofId={proofId} anonymousRef={anonymousRef} />
    </div>
  )
} 