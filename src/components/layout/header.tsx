import { WalletInfo } from "@/types/wallet"
import { Ghost, Loader2 } from "lucide-react"
import { WalletConnect } from "@/components/WalletConnect"
import { WalletProfile } from "@/components/WalletProfile"
import { useWallet } from "@/components/WalletContext"

export function Header() {
  const { isConnected } = useWallet()

  return (
    <header className="bg-gray-800 shadow-md border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Ghost className="h-8 w-8 text-purple-400" />
            <h1 className="ml-2 text-2xl font-bold">Ghost Agent</h1>
          </div>
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <WalletProfile />
            ) : (
              <WalletConnect />
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 