import { Principal } from '@dfinity/principal'
import { ICP_LEDGER_CANISTER_ID } from '@/constants'

declare global {
  interface Window {
    ic?: {
      plug?: {
        requestConnect: (options: { whitelist: string[]; host?: string }) => Promise<boolean>
        getPrincipal: () => Promise<Principal>
        createActor: <T>(options: { canisterId: string; interfaceFactory: any }) => Promise<T>
        disconnect: () => Promise<void>
        isConnected: () => Promise<boolean>
      }
    }
  }
}

/**
 * Connect to Plug wallet
 * @returns Principal ID as string
 */
export async function connectPlugWallet(): Promise<string> {
  if (!window.ic?.plug) {
    throw new Error('Plug wallet not installed')
  }

  try {
    const whitelist = [ICP_LEDGER_CANISTER_ID]
    const connected = await window.ic.plug.requestConnect({ whitelist })
    
    if (!connected) {
      throw new Error('Failed to connect to Plug wallet')
    }

    const principal = await window.ic.plug.getPrincipal()
    return principal.toText()
  } catch (error) {
    console.error('Error connecting to Plug wallet:', error)
    throw error
  }
}

/**
 * Disconnect from Plug wallet
 */
export async function disconnectPlugWallet(): Promise<void> {
  if (!window.ic?.plug) {
    throw new Error('Plug wallet not installed')
  }

  try {
    await window.ic.plug.disconnect()
  } catch (error) {
    console.error('Error disconnecting from Plug wallet:', error)
    throw error
  }
} 