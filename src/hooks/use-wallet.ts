import { useContext } from 'react'
import { createContext } from 'react'
import { WalletType } from '@/components/WalletSelector'

interface WalletContextType {
  principal: string | null
  isConnecting: boolean
  isConnected: boolean
  error: Error | null
  connect: (walletType: WalletType) => Promise<void>
  disconnect: () => void
}

export const WalletContext = createContext<WalletContextType | null>(null)

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used within a WalletProvider')
  return context
} 