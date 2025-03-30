import { Identity, HttpAgent, Actor } from '@dfinity/agent'

export class CanisterService {
  private agent: HttpAgent | null = null
  private actors: Map<string, any> = new Map()

  async initializeActors(identity: Identity | null) {
    try {
      if (!identity) throw new Error('Identity not found')

      const host = process.env.NEXT_PUBLIC_IC_HOST || 'https://icp0.io'
      this.agent = new HttpAgent({ identity, host })

    } catch (error) {
      console.error('Failed to initialize actors:', error)
      this.resetActors()
      throw error
    }
  }

  async getActor(canisterId: string): Promise<any | null> {
    try {
      if (!this.agent) throw new Error('Agent not initialized')
      
      let actor = this.actors.get(canisterId)
      if (!actor) {
        // Create a mock actor for now
        actor = {
          name: () => 'Mock Token',
          symbol: () => 'MOCK',
          decimals: () => 8,
          totalSupply: () => BigInt(1000000),
          balanceOf: () => BigInt(100),
        }
        this.actors.set(canisterId, actor)
      }
      return actor
    } catch (error) {
      console.error(`Failed to get actor for canister ${canisterId}:`, error)
      return null
    }
  }

  resetActors() {
    this.actors.clear()
    this.agent = null
  }
}

export const canisterService = new CanisterService() 