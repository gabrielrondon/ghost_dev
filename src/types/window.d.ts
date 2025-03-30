import type { PlugProvider, StoicIdentity } from '../declarations/interfaces'

declare global {
  interface Window {
    StoicIdentity?: StoicIdentity
    ic?: {
      plug?: PlugProvider
    }
  }
} 