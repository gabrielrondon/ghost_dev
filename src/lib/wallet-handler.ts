interface WalletHandler {
  initialized: boolean
  timestamp: number
  secureWalletHandler: {
    getWallet: (name: string) => any
    setWallet: (name: string, wallet: any) => boolean
    _wallets: Map<string, any>
  }
}

declare global {
  interface Window {
    __ghostAgent?: WalletHandler
  }
}

export function getSecureWallet(name: string): any {
  return window.__ghostAgent?.secureWalletHandler.getWallet(name)
}

export function isWalletAvailable(name: string): boolean {
  return !!getSecureWallet(name)
} 