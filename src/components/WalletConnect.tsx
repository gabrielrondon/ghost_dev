import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/components/WalletContext'
import { WalletSelector } from '@/components/WalletSelector'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface WalletConnectProps {
  className?: string
}

export function WalletConnect({ className }: WalletConnectProps) {
  const { isConnecting, error } = useWallet()
  const [open, setOpen] = useState(false)

  if (error) {
    return <div className="text-red-500">Connection failed: {error.message}</div>
  }

  return (
    <>
      <Button
        className={className}
        onClick={() => setOpen(true)}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect a wallet</DialogTitle>
          </DialogHeader>
          <WalletSelector onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
} 