interface VerifyPageProps {
  params: {
    reference: string
  }
}

export default function VerifyPage({ params }: VerifyPageProps) {
  return (
    <div className="max-w-lg mx-auto bg-gray-800 rounded-xl shadow-lg p-6 mt-8">
      <h1 className="text-2xl font-bold text-white mb-6">Verify Proof</h1>
      
      <div className="bg-gray-700 rounded-md p-4">
        <p className="text-sm text-gray-400 mb-2">Proof Reference</p>
        <p className="font-mono text-sm text-purple-400 break-all">
          {params.reference}
        </p>
        
        <div className="mt-6">
          <p className="text-sm text-gray-400 mb-2">Status</p>
          <p className="text-sm text-yellow-400">
            Verification in development...
          </p>
        </div>
      </div>
    </div>
  )
} 