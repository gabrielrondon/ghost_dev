import { Identity } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { canisterService } from './canister-service'
import type { PlugProvider, StoicIdentity } from '../../src/types/plug'

interface WalletState {
  principal: string | null
  identity: Identity | null
  provider: 'stoic' | 'plug' | null
  isConnected: boolean
}

class WalletService {
  private state: WalletState = {
    principal: null,
    identity: null,
    provider: null,
    isConnected: false
  }

  async connectStoic() {
    try {
      if (!window.StoicIdentity) throw new Error('Stoic wallet is not installed')

      const identity = await window.StoicIdentity.connect()
      if (!identity) throw new Error('Failed to connect to Stoic wallet')

      const principal = identity.getPrincipal().toString()

      this.setState({
        principal,
        identity,
        provider: 'stoic',
        isConnected: true
      })

      await canisterService.initializeActors(identity)
    } catch (error) {
      throw new Error('Failed to connect to Stoic wallet')
    }
  }

  async connectPlug() {
    try {
      const plug = window?.ic?.plug as PlugProvider | undefined
      if (!plug) throw new Error('Plug wallet is not installed')

      const whitelist = [process.env.NEXT_PUBLIC_CANISTER_ID_MAIN || '']
      const host = process.env.NEXT_PUBLIC_IC_HOST
      const connected = await plug.requestConnect({ whitelist, host })

      if (!connected) throw new Error('Failed to connect to Plug wallet')

      const isConnected = await plug.isConnected()
      if (!isConnected) throw new Error('Failed to verify Plug wallet connection')

      const principal = await plug.getPrincipal()
      
      this.setState({
        principal: principal.toString(),
        identity: null, // Plug wallet doesn't provide direct access to the identity
        provider: 'plug',
        isConnected: true
      })
    } catch (error) {
      throw new Error('Failed to connect to Plug wallet')
    }
  }

  async disconnect() {
    const plug = window?.ic?.plug as PlugProvider | undefined
    if (this.state.provider === 'plug' && plug) {
      await plug.disconnect()
    }

    this.setState({
      principal: null,
      identity: null,
      provider: null,
      isConnected: false
    })
    await canisterService.resetActors()
  }

  setState(state: Partial<WalletState>) {
    this.state = { ...this.state, ...state }
  }

  getState(): WalletState {
    return this.state
  }

  getPrincipal(): string | null {
    return this.state.principal
  }

  getIdentity(): Identity | null {
    return this.state.identity
  }
}

export const walletService = new WalletService() 

