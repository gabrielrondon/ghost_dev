import { ConnectWallet } from '@/components/ConnectWallet'
import { TokenProofGenerator } from '@/components/TokenProofGenerator'
import { useWallet } from '@/hooks/use-wallet'

export default function Home() {
  const { isConnected } = useWallet()

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Token Proof Generator</h1>
      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-lg mb-4">Connect your wallet to generate token proofs</p>
          <div className="flex gap-4 justify-center">
            <ConnectWallet walletType="stoic" />
            <ConnectWallet walletType="plug" />
          </div>
        </div>
      ) : (
        <TokenProofGenerator />
      )}
    </main>
  )
} 