import { TokenProofGenerator } from '@/components/TokenProofGenerator'
import { ConnectWallet } from '@/components/ConnectWallet'
import { useWallet } from '@/hooks/use-wallet'

export default function HomePage() {
  const { isConnected } = useWallet()

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-6">Token Balance Proof Generator</h1>
      
      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-lg mb-4">Connect your wallet to generate token proofs</p>
          <ConnectWallet />
        </div>
      ) : (
        <TokenProofGenerator />
      )}
    </div>
  )
} 