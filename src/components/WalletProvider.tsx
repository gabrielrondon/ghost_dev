import React, { createContext, useState, useContext, useEffect } from 'react'
import { ZK_CANISTER_ID, IC_HOST } from '../config/canister-config'

// Extending the window object with IC plug methods
declare global {
  interface Window {
    ic?: {
      plug?: {
        agent?: {
          getPrincipal: () => Promise<any>
          getIdentity: () => Promise<any>
        }
        isConnected: () => Promise<boolean>
        requestConnect: (options?: {
          whitelist?: string[]
          host?: string
        }) => Promise<boolean>
        createActor: (options: {
          canisterId: string
          interfaceFactory: any
        }) => Promise<any>
        getPrincipal: () => Promise<any>
        createAgent: (options: {
          whitelist: string[]
          host?: string
        }) => Promise<any>
      }
    }
  }
}

// Plug wallet interface - for internal use to avoid TypeScript errors
interface PlugWallet {
  isConnected: () => Promise<boolean>
  requestConnect: (options: {
    whitelist: string[]
    host?: string
  }) => Promise<boolean>
  getPrincipal: () => Promise<string>
  createAgent: (options: {
    whitelist: string[]
    host?: string
  }) => Promise<any>
}

// Context type definition
interface WalletContextType {
  principal: string | null
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  error: Error | null
}

// Create wallet context
const WalletContext = createContext<WalletContextType>({
  principal: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  error: null
})

export function useWallet() {
  return useContext(WalletContext)
}

interface WalletProviderProps {
  children: React.ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [principal, setPrincipal] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Check if wallet is already connected
  useEffect(() => {
    async function checkConnection() {
      try {
        // Check if plug is available
        if (!window.ic?.plug) {
          return
        }

        // Use plug as PlugWallet to satisfy TypeScript
        const plug = window.ic.plug as unknown as PlugWallet
        
        // Check if already connected
        const connected = await plug.isConnected()
        
        if (connected) {
          // Get principal
          const principal = await plug.getPrincipal()
          setPrincipal(principal.toString())
          setIsConnected(true)
        }
      } catch (err) {
        console.error('Error checking connection:', err)
      }
    }

    checkConnection()
  }, [])

  // Connect to wallet
  async function connect() {
    try {
      setIsConnecting(true)
      setError(null)

      // Check if plug is available
      if (!window.ic?.plug) {
        throw new Error('Plug wallet not found. Please install the Plug wallet extension.')
      }

      // Use plug as PlugWallet to satisfy TypeScript
      const plug = window.ic.plug as unknown as PlugWallet
      
      // Request connection to Plug
      const whitelist = [ZK_CANISTER_ID]
      const connected = await plug.requestConnect({
        whitelist,
        host: IC_HOST
      })

      // Create agent if connected
      if (connected) {
        await plug.createAgent({
          whitelist,
          host: IC_HOST
        })

        // Get principal
        const principal = await plug.getPrincipal()
        setPrincipal(principal.toString())
        setIsConnected(true)
      } else {
        throw new Error('Connection to Plug wallet was rejected')
      }
    } catch (err) {
      console.error('Error connecting to wallet:', err)
      setError(err instanceof Error ? err : new Error('Failed to connect to wallet'))
      throw err
    } finally {
      setIsConnecting(false)
    }
  }

  // Provide context
  const contextValue: WalletContextType = {
    principal,
    isConnected,
    isConnecting,
    connect,
    error
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
} 