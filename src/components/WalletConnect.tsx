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
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface WalletConnectProps {
  className?: string
}

export function WalletConnect({ className }: WalletConnectProps) {
  const { isConnecting, error } = useWallet()
  const [open, setOpen] = useState(false)

  // Get a user-friendly error message
  const getErrorMessage = (error: Error): string => {
    // Check for crypto-related errors
    if (error.message.includes('crypto') || error.message.includes('SubtleCrypto')) {
      return "Browser crypto API not available. Please use a modern browser."
    }
    
    // Check for common connection errors
    if (error.message.includes('timeout') || error.message.includes('network')) {
      return "Connection timed out. Please check your internet connection and try again."
    }
    
    // Return the original message for other errors
    return error.message
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection failed</AlertTitle>
        <AlertDescription>
          {getErrorMessage(error)}
        </AlertDescription>
      </Alert>
    )
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