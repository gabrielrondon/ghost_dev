import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/WalletContext'

interface WalletConnectProps {
  className?: string
}

export function WalletConnect({ className }: WalletConnectProps) {
  const { connect, isConnecting, error } = useWallet()

  if (error) {
    return <div className="text-red-500">Connection failed: {error.message}</div>
  }

  return (
    <Button
      className={className}
      onClick={connect}
      disabled={isConnecting}
    >
      {isConnecting ? 'Connecting...' : 'Connect'}
    </Button>
  )
} 