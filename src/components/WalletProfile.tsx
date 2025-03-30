'use client'

import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/use-wallet'
import { useToast } from '@/components/ui/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  Copy,
  LogOut,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'

export function WalletProfile() {
  const { principal, disconnect } = useWallet()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopyPrincipal = () => {
    if (!principal) return
    navigator.clipboard.writeText(principal)
    setCopied(true)
    toast({
      title: 'Copied',
      description: 'Principal copied to clipboard',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDisconnect = () => {
    disconnect()
  }

  if (!principal) return null

  const shortPrincipal = `${principal.slice(0, 6)}...${principal.slice(-4)}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wallet className="h-4 w-4" />
          {shortPrincipal}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyPrincipal}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Principal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDisconnect}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 