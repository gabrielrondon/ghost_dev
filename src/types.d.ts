import { Principal } from '@dfinity/principal'
import { Identity } from '@dfinity/agent'

declare global {
  interface Window {
    ic?: {
      plug?: {
        agent?: {
          getPrincipal: () => Promise<Principal>
          getIdentity: () => Promise<Identity>
        }
        isConnected: () => Promise<boolean>
        requestConnect: (options: {
          whitelist: string[]
          host?: string
        }) => Promise<boolean>
        getPrincipal: () => Promise<string>
        createAgent: (options: {
          whitelist: string[]
          host?: string
        }) => Promise<any>
      }
    }
  }
} 