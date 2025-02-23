export const SUPPORTED_WALLETS = ['solana', 'phantom', 'keplr', 'yoroi'] as const

export type SupportedWallet = typeof SUPPORTED_WALLETS[number]

export const WALLET_CONFIG = {
  allowInjection: true,
  secureMode: true,
  retryAttempts: 3,
  retryDelay: 1000,
} as const 