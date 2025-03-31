'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthClient } from '@dfinity/auth-client'
import { HttpAgent } from '@dfinity/agent'
import { ZK_CANISTER_ID, IC_HOST } from '../config/canister-config'

interface WalletContextType {
  isAuthenticated: boolean
  principal: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

// Create context with default values
const WalletContext = createContext<WalletContextType>({
  isAuthenticated: false,
  principal: null,
  login: async () => {},
  logout: async () => {},
  isLoading: true
})

// Hook to use the wallet context
export function useWallet() {
  return useContext(WalletContext)
}

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [principal, setPrincipal] = useState<string | null>(null)
  const [authClient, setAuthClient] = useState<AuthClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth client
  useEffect(() => {
    const init = async () => {
      try {
        const client = await AuthClient.create()
        setAuthClient(client)
        
        // Check if already authenticated
        const isLoggedIn = await client.isAuthenticated()
        setIsAuthenticated(isLoggedIn)
        
        if (isLoggedIn) {
          const identity = client.getIdentity()
          const principal = identity.getPrincipal().toString()
          setPrincipal(principal)
        }
      } catch (error) {
        console.error('Error initializing auth client:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    init()
  }, [])

  // Login function
  const login = async () => {
    if (!authClient) return
    
    try {
      await authClient.login({
        identityProvider: process.env.NODE_ENV === 'development' 
          ? 'http://localhost:8000?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai' 
          : 'https://identity.ic0.app',
        onSuccess: async () => {
          setIsAuthenticated(true)
          const identity = authClient.getIdentity()
          const principal = identity.getPrincipal().toString()
          setPrincipal(principal)
        }
      })
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  // Logout function
  const logout = async () => {
    if (!authClient) return
    
    await authClient.logout()
    setIsAuthenticated(false)
    setPrincipal(null)
  }

  // Create a value object with current state and functions
  const value = {
    isAuthenticated,
    principal,
    login,
    logout,
    isLoading
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
} 