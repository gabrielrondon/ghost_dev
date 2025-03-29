import { useWallet } from '@/hooks/use-wallet'
import { Button } from './ui/button'
import { Wallet } from 'lucide-react'

export function ConnectWallet() {
  const { connect, isConnecting } = useWallet()

  return (
    <Button
      onClick={connect}
      disabled={isConnecting}
      size="lg"
      className="gap-2"
    >
      <Wallet className="h-5 w-5" />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
} 