export type WalletType = 'plug' | 'stoic'

export interface WalletInfo {
  isConnected: boolean
  principal?: string
  accountId?: string
  address: string
  balance?: string
  network?: string
  walletType: 'internetComputer' | 'ethereum' | 'stoic' | 'plug'
  chainId: 'icp' | 'eth'
  chainName: string
  nfts?: NFTInfo[]
  tokens?: ICPToken[]
  transactions?: ICPTransaction[]
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
  amount: string
  decimals: number
  price: number
  logoUrl: string
}

export interface ICPTransaction {
  hash: string
  from: string
  to: string
  amount: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
  type: 'send' | 'receive' | 'swap' | 'mint' | 'burn'
}

export type ICPTransactionType = ICPTransaction['type'] 