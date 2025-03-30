import { Toaster } from '@/components/ui/toaster'
import { WalletProvider } from '@/components/WalletProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      {children}
      <Toaster />
    </WalletProvider>
  )
} 