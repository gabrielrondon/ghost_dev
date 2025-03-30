import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/use-wallet'
import { WalletType } from '@/components/WalletSelector'

interface ConnectWalletProps {
  walletType: WalletType
}

export function ConnectWallet({ walletType }: ConnectWalletProps) {
  const { connect, isConnecting } = useWallet()

  const handleClick = () => {
    connect(walletType)
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isConnecting}
      size="lg"
      className="gap-2"
    >
      Connect {walletType}
    </Button>
  )
} 