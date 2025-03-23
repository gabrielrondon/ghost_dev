import { useCallback, useEffect, useState } from 'react'
import { connectWallet, disconnectWallet, getCurrentWalletInfo } from '@/lib/wallet'
import type { WalletInfo, ICPToken, ICPTransaction } from '@/types/wallet'
import { getTokensForPrincipal, getTransactionsForPrincipal } from '@/services/api'
import { toast } from 'react-hot-toast'

export function useWallet() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [tokens, setTokens] = useState<ICPToken[]>([])
  const [transactions, setTransactions] = useState<ICPTransaction[]>([])

  useEffect(() => {
    const checkWallet = async () => {
      const currentWallet = await getCurrentWalletInfo()
      if (currentWallet) {
        setWalletInfo(currentWallet)
      }
    }
    checkWallet()
  }, [])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    try {
      const wallet = await connectWallet('internetComputer')
      if (wallet) {
        setWalletInfo(wallet)
      }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await disconnectWallet()
      setWalletInfo(null)
      setTokens([])
      setTransactions([])
      toast.success('Wallet disconnected successfully')
    } catch (error) {
      console.error('Failed to disconnect:', error)
      toast.error('Failed to disconnect wallet')
    }
  }, [])

  const refreshData = async (principal: string) => {
    try {
      const [tokensData, transactionsData] = await Promise.all([
        getTokensForPrincipal(principal),
        getTransactionsForPrincipal(principal)
      ])
      setTokens(tokensData)
      setTransactions(transactionsData)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      toast.error('Failed to load wallet data')
    }
  }

  return {
    walletInfo,
    isConnecting,
    tokens,
    transactions,
    connect,
    disconnect,
    refreshData
  }
} 