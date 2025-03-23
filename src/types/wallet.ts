export interface WalletInfo {
  isConnected: boolean
  principal?: string
  accountId?: string
  address: string
  balance?: string
  network?: string
  walletType: 'internetComputer' | 'ethereum'
  nfts?: NFTInfo[]
}

export interface NFTInfo {
  canisterId: string
  index: number
  name: string
  url?: string
  collection?: string
}

export interface ICPToken {
  id: string
  name: string
  symbol: string
  balance: string
  decimals: number
  amount: string
}

export interface ICPTransaction {
  id: string
  type: 'send' | 'receive' | 'swap' | 'mint' | 'burn'
  amount: string
  token: string
  timestamp: number
  blockHeight: number
  from?: string
  to?: string
  status: 'completed' | 'pending' | 'failed'
} 