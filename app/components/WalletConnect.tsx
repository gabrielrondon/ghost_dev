'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { walletService } from '@/services/wallet-service'
import { canisterService } from '@/services/canister-service'

export function WalletConnect() {
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [isConnected, setIsConnected] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    const state = walletService.getState()
    setIsConnected(state.isConnected)
  }, [])

  const handleConnect = async (provider: 'stoic' | 'plug') => {
    try {
      await walletService.connect(provider)
      await canisterService.initializeActors(walletService.getIdentity()!)
      toast({
        title: 'Connected',
        description: `Connected to ${provider} wallet`,
      })
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Connection Failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  async function handleDisconnect() {
    try {
      await walletService.disconnect()
      canisterService.resetActors()
      setIsConnected(false)
      toast({
        title: 'Disconnected',
        description: 'Wallet disconnected successfully',
        variant: 'default'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to disconnect wallet',
        variant: 'destructive'
      })
    }
  }

  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wallet Connected</CardTitle>
          <CardDescription>
            Your wallet is connected and ready to use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleDisconnect}
            variant="destructive"
            className="w-full"
          >
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Wallet</CardTitle>
        <CardDescription>
          Connect your wallet to view and prove token ownership
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => handleConnect('stoic')}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Connect Stoic Wallet
        </Button>
        <Button
          onClick={() => handleConnect('plug')}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Connect Plug Wallet
        </Button>
      </CardContent>
    </Card>
  )
} 