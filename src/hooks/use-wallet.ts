import { useState, useCallback } from 'react'
import { AuthClient } from '@dfinity/auth-client'

interface UseWalletReturn {
  isConnected: boolean
  isConnecting: boolean
  principal: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

export function useWallet(): UseWalletReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [principal, setPrincipal] = useState<string | null>(null)

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true)
      const authClient = await AuthClient.create()
      const isAuthenticated = await authClient.isAuthenticated()

      if (!isAuthenticated) {
        await new Promise<void>((resolve, reject) => {
          authClient.login({
            identityProvider: process.env.II_URL,
            onSuccess: () => resolve(),
            onError: reject
          })
        })
      }

      const identity = authClient.getIdentity()
      const principal = identity.getPrincipal().toString()
      
      setPrincipal(principal)
      setIsConnected(true)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      const authClient = await AuthClient.create()
      await authClient.logout()
      setPrincipal(null)
      setIsConnected(false)
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
      throw error
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    principal,
    connect,
    disconnect
  }
} 