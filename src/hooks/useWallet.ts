export interface UseWalletReturn {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  address: string | null
}

export function useWallet(): UseWalletReturn {
  return {
    connect: async () => {},
    disconnect: async () => {},
    isConnected: false,
    isConnecting: false,
    error: null,
    address: null,
  }
} 