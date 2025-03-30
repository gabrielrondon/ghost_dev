import { Identity } from '@dfinity/agent'
import type { PlugProvider, TokenBalance } from '../declarations/interfaces'

export type { PlugProvider, TokenBalance }

export interface StoicIdentity {
  load: () => Promise<Identity>
  connect: () => Promise<Identity>
} 