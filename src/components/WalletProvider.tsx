'use client'

import { useState, useCallback } from 'react'
import { WalletContext } from '@/hooks/use-wallet'
import { WalletType } from '@/components/WalletSelector'
import { walletService } from '@/services/wallet-service'
import { canisterService } from '@/services/canister-service'
import { useToast } from '@/components/ui/use-toast'

interface WalletProviderProps {
  children: React.ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [principal, setPrincipal] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

  const connect = useCallback(async (walletType: WalletType) => {
    try {
      setIsConnecting(true)
      setError(null)

      await walletService.connect(walletType)
      const principal = walletService.getPrincipal()
      if (!principal) throw new Error('Failed to get principal')

      const identity = walletService.getIdentity()
      if (!identity) throw new Error('Failed to get identity')

      await canisterService.initializeActors(identity)
      setPrincipal(principal)

      toast({
        title: 'Connected',
        description: `Connected to ${walletType} wallet`,
      })
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setError(new Error(`Failed to connect wallet: ${message}`))
      toast({
        title: 'Connection Failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsConnecting(false)
    }
  }, [toast])

  const disconnect = useCallback(() => {
    try {
      walletService.disconnect()
      canisterService.resetActors()
      setPrincipal(null)
      setError(null)
      toast({
        title: 'Disconnected',
        description: 'Wallet disconnected successfully',
      })
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      setError(new Error(`Failed to disconnect wallet: ${message}`))
      toast({
        title: 'Disconnect Failed',
        description: message,
        variant: 'destructive',
      })
    }
  }, [toast])

  return (
    <WalletContext.Provider
      value={{
        principal,
        isConnecting,
        isConnected: !!principal,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
} 