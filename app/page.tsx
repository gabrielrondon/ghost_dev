import { WalletConnect } from '@/components/WalletConnect'
import { TokenList } from '@/components/TokenList'
import { Toaster } from '@/components/ui/toaster'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-4">Token Proof Generator</h1>
        <p className="text-lg text-gray-600 mb-8">
          Generate zero-knowledge proofs of your token ownership on the Internet Computer.
        </p>

        <div className="grid gap-8">
          <section>
            <WalletConnect />
          </section>

          <section>
            <TokenList />
          </section>
        </div>

        <Toaster />
      </div>
    </main>
  )
} 