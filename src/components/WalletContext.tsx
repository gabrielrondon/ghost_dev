'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { WalletType } from '@/components/WalletSelector'
import { useToast } from '@/components/ui/use-toast'

interface WalletContextType {
  isConnected: boolean
  principal: string | null
  connect: (type: WalletType) => Promise<void>
  disconnect: () => void
  isConnecting: boolean
  error: Error | null
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  principal: null,
  connect: async () => {},
  disconnect: () => {},
  isConnecting: false,
  error: null
})

interface WalletProviderProps {
  children: React.ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [principal, setPrincipal] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

  const connect = useCallback(async (type: WalletType) => {
    try {
      setIsConnecting(true)
      setError(null)

      // Mock connection for now
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsConnected(true)
      setPrincipal('mock-principal-123')

      toast({
        title: 'Connected',
        description: `Connected to ${type} wallet`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(new Error(`Failed to connect wallet: ${message}`))
      toast({
        title: 'Connection Failed',
        description: message,
        variant: 'destructive',
      })
      throw err
    } finally {
      setIsConnecting(false)
    }
  }, [toast])

  const disconnect = useCallback(() => {
    try {
      setIsConnected(false)
      setPrincipal(null)
      setError(null)
      toast({
        title: 'Disconnected',
        description: 'Wallet disconnected successfully',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
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
        isConnected,
        principal,
        connect,
        disconnect,
        isConnecting,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used within a WalletProvider')
  return context
} 