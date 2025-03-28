import { Principal } from '@dfinity/principal'

declare global {
  interface Window {
    ic?: {
      plug?: {
        requestConnect: (options: {
          whitelist: string[]
          host?: string
        }) => Promise<boolean>
        getPrincipal: () => Promise<Principal>
        getNFTs: () => Promise<Array<{
          canister: string
          index: number
          name?: string
          url?: string
        }>>
        createActor: <T>(options: {
          canisterId: string
          interfaceFactory: () => T
        }) => Promise<T>
      }
    }
  }
}

export {} 