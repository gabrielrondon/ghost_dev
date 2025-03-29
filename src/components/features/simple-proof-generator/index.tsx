import { useState } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

interface WalletInfo {
  principal: string
  accountId: string
  balance: string
}

export function SimpleProofGenerator() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [isGeneratingProof, setIsGeneratingProof] = useState(false)
  const [proofReference, setProofReference] = useState<string | null>(null)

  async function connectWallet() {
    setIsConnecting(true)
    try {
      // Check if Plug wallet is installed
      if (!(window as any).ic?.plug) {
        throw new Error("Plug wallet not found. Please install the Plug wallet extension.")
      }

      // Request connection to Plug wallet
      const whitelist = [
        import.meta.env.VITE_ZK_CANISTER_ID,
        import.meta.env.VITE_MAIN_CANISTER_ID,
        'ryjl3-tyaaa-aaaaa-aaaba-cai' // ICP Ledger Canister
      ].filter(Boolean) as string[]

      const host = import.meta.env.VITE_IC_HOST || 'http://127.0.0.1:8000'
      console.log('Connecting with whitelist:', whitelist, 'host:', host)

      const connected = await (window as any).ic.plug.requestConnect({
        whitelist,
        host,
      })

      if (!connected) {
        throw new Error("Failed to connect to Plug wallet.")
      }

      // Create an agent
      await (window as any).ic.plug.createAgent({ whitelist, host })

      // Get principal and account ID
      const principal = await (window as any).ic.plug.getPrincipal()
      const accountId = await (window as any).ic.plug.getAccountId()

      // Get balance
      let balance = '0'
      try {
        const balances = await (window as any).ic.plug.getBalance()
        const icpBalance = balances.find((b: any) => b.currency === 'ICP')
        if (icpBalance) {
          balance = icpBalance.amount.toString()
        }
      } catch (error) {
        console.warn('Failed to get balance:', error)
      }

      setWalletInfo({
        principal: principal.toString(),
        accountId,
        balance
      })

      toast.success('Successfully connected to Plug wallet')
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  async function generateProof() {
    if (!walletInfo) return

    setIsGeneratingProof(true)
    try {
      // TODO: Implement actual proof generation by calling the zk canister
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 2000))
      const mockReference = `proof-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setProofReference(mockReference)
      toast.success('Proof generated successfully')
    } catch (error) {
      console.error('Failed to generate proof:', error)
      toast.error('Failed to generate proof')
    } finally {
      setIsGeneratingProof(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-gray-800 rounded-xl shadow-lg p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Simple Proof Generator</h1>

      {!walletInfo ? (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md flex items-center justify-center"
        >
          {isConnecting ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="h-5 w-5 mr-2" />
              Connect Plug Wallet
            </>
          )}
        </button>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-700 rounded-md p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Principal ID</p>
                <p className="font-mono text-sm text-purple-400 truncate">
                  {walletInfo.principal}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Balance</p>
                <p className="font-mono text-sm text-green-400">
                  {Number(walletInfo.balance) / 100000000} ICP
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={generateProof}
            disabled={isGeneratingProof}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md flex items-center justify-center"
          >
            {isGeneratingProof ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Generating Proof...
              </>
            ) : (
              'Generate Proof'
            )}
          </button>

          {proofReference && (
            <div className="bg-gray-700 rounded-md p-4">
              <p className="text-sm text-gray-400 mb-2">Proof Reference</p>
              <p className="font-mono text-sm text-purple-400 break-all">
                {proofReference}
              </p>
              <p className="text-sm text-gray-400 mt-4 mb-2">Shareable Link</p>
              <p className="font-mono text-sm text-purple-400 break-all">
                {`${window.location.origin}/verify/${proofReference}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 