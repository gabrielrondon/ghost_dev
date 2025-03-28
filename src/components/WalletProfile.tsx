import { useWallet } from '@/components/WalletContext'
import { formatICPBalance } from '@/services/stoic-wallet'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown, 
  Copy, 
  Check, 
  LogOut,
  RefreshCw
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export function WalletProfile() {
  const { walletInfo, disconnect, activeWallet } = useWallet()
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [copied])

  if (!walletInfo?.isConnected || !activeWallet) {
    return null
  }

  // Get wallet display info
  const principalId = walletInfo.principal || ''
  const shortPrincipal = principalId 
    ? `${principalId.slice(0, 6)}...${principalId.slice(-4)}`
    : ''

  // Calculate total ICP balance from tokens
  const icpToken = walletInfo.tokens?.find(token => token.symbol === 'ICP')
  const icpBalance = icpToken ? formatICPBalance(BigInt(icpToken.balance)) : '0'

  // Format wallet type display
  const getWalletName = () => {
    switch (activeWallet) {
      case 'stoic':
        return 'Stoic Wallet'
      case 'plug':
        return 'Plug Wallet'
      default:
        return 'Wallet'
    }
  }

  const copyToClipboard = () => {
    if (principalId) {
      navigator.clipboard.writeText(principalId)
      setCopied(true)
      toast.success('Principal ID copied to clipboard')
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // In the future, add code to refresh wallet data here
    setTimeout(() => {
      setIsRefreshing(false)
      toast.success('Wallet data refreshed')
    }, 1000)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <span className="flex flex-col items-start text-xs">
            <span className="text-sm font-medium">{getWalletName()}</span>
            <span className="text-muted-foreground">{shortPrincipal}</span>
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-normal">Account</span>
            <span className="font-mono text-xs text-muted-foreground truncate">
              {principalId}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-normal">Balance</span>
            <span className="text-sm font-bold">
              {icpBalance} <span className="text-xs font-normal">ICP</span>
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyToClipboard}>
          {copied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          <span>Copy principal ID</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh data'}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 