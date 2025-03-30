'use client'

import { Toaster } from '@/components/ui/toaster'
import { WalletProvider } from '@/components/WalletProvider'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WalletProvider>
      {children}
      <Toaster />
    </WalletProvider>
  )
} 