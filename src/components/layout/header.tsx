import { Ghost, Loader2 } from 'lucide-react'
import type { WalletInfo } from '@/types/wallet'

interface HeaderProps {
  walletInfo: WalletInfo | null
  isConnecting: boolean
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
}

export function Header({ walletInfo, isConnecting, onConnect, onDisconnect }: HeaderProps) {
  return (
    <header className="bg-gray-800 shadow-md border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Ghost className="h-8 w-8 text-purple-400" />
            <h1 className="ml-2 text-2xl font-bold">Ghost Agent</h1>
          </div>
          <div className="flex items-center space-x-4">
            {walletInfo?.isConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {walletInfo.principal?.slice(0, 6)}...{walletInfo.principal?.slice(-4)}
                </span>
                <button
                  onClick={onDisconnect}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Connecting...
                  </div>
                ) : (
                  'Connect Wallet'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 