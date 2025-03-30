import { Identity } from '@dfinity/agent'
import { WalletType } from '@/components/WalletSelector'

export interface WalletState {
  isConnected: boolean
  principal: string | null
}

export class WalletService {
  private principal: string | null = null
  private identity: Identity | null = null

  async connect(walletType: WalletType): Promise<void> {
    // Mock implementation - replace with actual wallet connection logic
    this.principal = 'mock-principal'
    // Mock identity - replace with actual identity from wallet
    this.identity = {} as Identity
  }

  disconnect(): void {
    this.principal = null
    this.identity = null
  }

  getPrincipal(): string | null {
    return this.principal
  }

  getIdentity(): Identity | null {
    return this.identity
  }

  getState(): WalletState {
    return {
      isConnected: !!this.principal,
      principal: this.principal
    }
  }
}

export const walletService = new WalletService() 