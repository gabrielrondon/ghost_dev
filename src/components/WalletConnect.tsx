'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/use-wallet'
import { WalletSelector } from '@/components/WalletSelector'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface WalletConnectProps {
  className?: string
}

export function WalletConnect({ className }: WalletConnectProps) {
  const { isConnecting, error } = useWallet()
  const [open, setOpen] = useState(false)

  // Get a user-friendly error message
  const getErrorMessage = (error: Error): { message: string, isExternal?: boolean, link?: string } => {
    const errorMsg = error.message.toLowerCase();
    
    // Check for crypto-related errors
    if (errorMsg.includes('crypto') || errorMsg.includes('subtlecrypto') || errorMsg.includes('webcrypto')) {
      return {
        message: "Your browser is missing required security features. Please use a modern browser like Chrome, Firefox, or Edge.",
        isExternal: true,
        link: "https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto"
      };
    }
    
    // Check for Stoic wallet specific errors
    if (errorMsg.includes('stoic')) {
      if (errorMsg.includes('failed to login')) {
        return {
          message: "Failed to connect to Stoic wallet. Please ensure pop-ups are allowed and try again.",
          isExternal: true,
          link: "https://www.stoicwallet.com/"
        };
      }
    }
    
    // Check for common connection errors
    if (errorMsg.includes('timeout') || errorMsg.includes('network') || errorMsg.includes('failed to fetch')) {
      return {
        message: "Connection timed out. Please check your internet connection and try again."
      };
    }

    // Check for browser environment errors
    if (errorMsg.includes('browser') || errorMsg.includes('window') || errorMsg.includes('document')) {
      return {
        message: "This application requires a browser environment. Some features may not work properly."
      };
    }
    
    // Return the original message for other errors
    return { message: error.message };
  }

  if (error) {
    const errorInfo = getErrorMessage(error);
    
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4 mr-2" />
        <div className="w-full">
          <AlertTitle>Connection failed</AlertTitle>
          <AlertDescription className="flex items-start justify-between">
            <span>{errorInfo.message}</span>
            {errorInfo.isExternal && errorInfo.link && (
              <a 
                href={errorInfo.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-xs ml-2 hover:underline text-blue-400"
              >
                Learn more
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            )}
          </AlertDescription>
        </div>
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