import { Identity } from '@dfinity/agent'
import { Actor } from '@dfinity/agent'

class CanisterService {
  private actors: Map<string, Actor> = new Map()

  async initializeActors(identity: Identity) {
    // For now, just initialize a mock actor
    const mockActor = {
      name: () => Promise.resolve('Mock Token'),
      symbol: () => Promise.resolve('MOCK'),
      decimals: () => Promise.resolve(8n),
      totalSupply: () => Promise.resolve(1000000000n),
      balanceOf: () => Promise.resolve(100000n),
    }

    this.actors.set('mock', mockActor as unknown as Actor)
  }

  getActor(canisterId: string): Actor | undefined {
    return this.actors.get(canisterId)
  }

  resetActors() {
    this.actors.clear()
  }
}

export const canisterService = new CanisterService() 