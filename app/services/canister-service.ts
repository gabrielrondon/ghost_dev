import { Identity } from '@dfinity/agent'
import { HttpAgent, Actor } from '@dfinity/agent'
import { idlFactory as mainIdl } from '@/declarations/main'
import { idlFactory as zkIdl } from '@/declarations/zk'
import type { _SERVICE as MainService } from '@/declarations/main/service.did.d'
import type { _SERVICE as ZkService } from '@/declarations/zk/service.did.d'
import { walletService } from './wallet-service'

export class CanisterService {
  private mainActor: MainService | null = null
  private zkActor: ZkService | null = null
  private agent: HttpAgent | null = null

  async initializeActors(identity: Identity) {
    try {
      if (!identity) throw new Error('Identity not found')

      const host = process.env.NEXT_PUBLIC_IC_HOST || 'https://icp0.io'
      this.agent = new HttpAgent({ identity, host })

      const mainCanisterId = process.env.NEXT_PUBLIC_MAIN_CANISTER_ID
      const zkCanisterId = process.env.NEXT_PUBLIC_ZK_CANISTER_ID

      if (!mainCanisterId || !zkCanisterId) 
        throw new Error('Canister IDs not found in environment variables')

      this.mainActor = await this.createActor<MainService>(mainCanisterId, mainIdl)
      this.zkActor = await this.createActor<ZkService>(zkCanisterId, zkIdl)

      if (!this.mainActor || !this.zkActor) 
        throw new Error('Failed to initialize actors')

    } catch (error) {
      console.error('Failed to initialize actors:', error)
      this.resetActors()
      throw error
    }
  }

  private async createActor<T>(canisterId: string, idl: any): Promise<T | null> {
    try {
      if (!this.agent) throw new Error('Agent not initialized')

      return await Actor.createActor<T>(idl, {
        agent: this.agent,
        canisterId,
      })
    } catch (error) {
      console.error(`Failed to create actor for canister ${canisterId}:`, error)
      return null
    }
  }

  getMainActor(): MainService | null {
    return this.mainActor
  }

  getZkActor(): ZkService | null {
    return this.zkActor
  }

  resetActors() {
    this.mainActor = null
    this.zkActor = null
    this.agent = null
  }
}

export const canisterService = new CanisterService() 