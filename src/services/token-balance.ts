import { Principal } from '@dfinity/principal'
import { sha256 } from '@noble/hashes/sha256'
import { TokenBalance } from '@/utils/merkle-tree'
import { Actor, HttpAgent } from '@dfinity/agent'
import { IDL } from '@dfinity/candid'
import type { InterfaceFactory } from '@dfinity/candid/lib/cjs/idl'

// Token standard interfaces
interface ICRC1 {
  icrc1_balance_of: (args: { owner: Principal }) => Promise<bigint>
}

interface ICRC2 extends ICRC1 {
  icrc2_approve: (args: { spender: Principal; amount: bigint }) => Promise<{ Ok: bigint } | { Err: any }>
}

interface DIP20 {
  balanceOf: (owner: Principal) => Promise<bigint>
}

interface EXT {
  balance: (args: { user: Principal; token: string }) => Promise<{ ok: bigint } | { err: any }>
}

// Token metadata interface
export interface TokenMetadata {
  canisterId: Principal
  standard: 'ICP' | 'ICRC1' | 'ICRC2' | 'DIP20' | 'EXT'
  name: string
  symbol: string
  decimals: number
  totalSupply?: bigint
  fee?: bigint
}

// Cache interface
interface BalanceCache {
  balance: bigint
  timestamp: number
}

// Cache balances for 30 seconds
const CACHE_DURATION = 30 * 1000
const balanceCache = new Map<string, BalanceCache>()

export class TokenBalanceService {
  private agent: HttpAgent
  private cacheEnabled: boolean

  constructor(agent: HttpAgent, enableCache = true) {
    this.agent = agent
    this.cacheEnabled = enableCache
  }

  private getCacheKey(canisterId: string, owner: string, tokenId?: string): string {
    return `${canisterId}:${owner}:${tokenId || ''}`
  }

  private getFromCache(key: string): bigint | null {
    if (!this.cacheEnabled) return null

    const cached = balanceCache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > CACHE_DURATION) {
      balanceCache.delete(key)
      return null
    }

    return cached.balance
  }

  private setCache(key: string, balance: bigint): void {
    if (!this.cacheEnabled) return

    balanceCache.set(key, {
      balance,
      timestamp: Date.now()
    })
  }

  async getICPBalance(owner: Principal): Promise<bigint> {
    const cacheKey = this.getCacheKey('ICP', owner.toText())
    const cached = this.getFromCache(cacheKey)
    if (cached !== null) return cached

    // ICP ledger canister ID
    const ledgerCanisterId = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai')
    
    const createLedgerActor: InterfaceFactory = ({ IDL }) => {
      return IDL.Service({
        account_balance: IDL.Func([IDL.Record({ account: IDL.Vec(IDL.Nat8) })], [IDL.Record({ e8s: IDL.Nat })], ['query'])
      })
    }

    const actor = Actor.createActor<{ account_balance: (args: { account: Uint8Array }) => Promise<{ e8s: bigint }> }>(
      createLedgerActor,
      { agent: this.agent, canisterId: ledgerCanisterId }
    )

    const subaccount = new Uint8Array(32)
    const balance = await actor.account_balance({ account: subaccount })
    this.setCache(cacheKey, balance.e8s)
    return balance.e8s
  }

  async getICRC1Balance(canisterId: Principal, owner: Principal): Promise<bigint> {
    const cacheKey = this.getCacheKey(canisterId.toText(), owner.toText())
    const cached = this.getFromCache(cacheKey)
    if (cached !== null) return cached

    const createICRC1Actor: InterfaceFactory = ({ IDL }) => {
      return IDL.Service({
        icrc1_balance_of: IDL.Func([IDL.Record({ owner: IDL.Principal })], [IDL.Nat], ['query'])
      })
    }

    const actor = Actor.createActor<ICRC1>(
      createICRC1Actor,
      { agent: this.agent, canisterId }
    )

    const balance = await actor.icrc1_balance_of({ owner })
    this.setCache(cacheKey, balance)
    return balance
  }

  async getICRC2Balance(canisterId: Principal, owner: Principal): Promise<bigint> {
    // ICRC2 extends ICRC1, so we can use the same balance method
    return this.getICRC1Balance(canisterId, owner)
  }

  async getDIP20Balance(canisterId: Principal, owner: Principal): Promise<bigint> {
    const cacheKey = this.getCacheKey(canisterId.toText(), owner.toText())
    const cached = this.getFromCache(cacheKey)
    if (cached !== null) return cached

    const createDIP20Actor: InterfaceFactory = ({ IDL }) => {
      return IDL.Service({
        balanceOf: IDL.Func([IDL.Principal], [IDL.Nat], ['query'])
      })
    }

    const actor = Actor.createActor<DIP20>(
      createDIP20Actor,
      { agent: this.agent, canisterId }
    )

    const balance = await actor.balanceOf(owner)
    this.setCache(cacheKey, balance)
    return balance
  }

  async getEXTBalance(canisterId: Principal, owner: Principal, tokenId: string): Promise<bigint> {
    const cacheKey = this.getCacheKey(canisterId.toText(), owner.toText(), tokenId)
    const cached = this.getFromCache(cacheKey)
    if (cached !== null) return cached

    const createEXTActor: InterfaceFactory = ({ IDL }) => {
      return IDL.Service({
        balance: IDL.Func(
          [IDL.Record({ user: IDL.Principal, token: IDL.Text })],
          [IDL.Variant({ ok: IDL.Nat, err: IDL.Variant({}) })],
          ['query']
        )
      })
    }

    const actor = Actor.createActor<EXT>(
      createEXTActor,
      { agent: this.agent, canisterId }
    )

    const result = await actor.balance({ user: owner, token: tokenId })
    if ('err' in result) throw new Error('Failed to fetch EXT balance')
    
    this.setCache(cacheKey, result.ok)
    return result.ok
  }

  async getBalance(metadata: TokenMetadata, owner: Principal, tokenId?: string): Promise<bigint> {
    try {
      switch (metadata.standard) {
        case 'ICP':
          return await this.getICPBalance(owner)
        case 'ICRC1':
          return await this.getICRC1Balance(metadata.canisterId, owner)
        case 'ICRC2':
          return await this.getICRC2Balance(metadata.canisterId, owner)
        case 'DIP20':
          return await this.getDIP20Balance(metadata.canisterId, owner)
        case 'EXT':
          if (!tokenId) throw new Error('Token ID required for EXT tokens')
          return await this.getEXTBalance(metadata.canisterId, owner, tokenId)
        default:
          throw new Error(`Unsupported token standard: ${metadata.standard}`)
      }
    } catch (error) {
      console.error(`Failed to fetch balance for ${metadata.symbol}:`, error)
      throw error
    }
  }

  async getAllBalances(owner: Principal): Promise<TokenBalance[]> {
    // This would be populated from a token registry or configuration
    const supportedTokens: TokenMetadata[] = [
      {
        canisterId: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
        standard: 'ICP',
        name: 'Internet Computer Protocol',
        symbol: 'ICP',
        decimals: 8
      }
      // Add other supported tokens here
    ]

    const balances: TokenBalance[] = []
    
    for (const token of supportedTokens) {
      try {
        const balance = await this.getBalance(token, owner)
        const ownerHash = sha256(owner.toUint8Array())
        
        balances.push({
          tokenId: BigInt(token.canisterId.toText()),
          balance,
          ownerHash,
          metadata: new TextEncoder().encode(JSON.stringify({
            standard: token.standard,
            symbol: token.symbol,
            decimals: token.decimals
          }))
        })
      } catch (error) {
        console.error(`Failed to fetch balance for ${token.symbol}:`, error)
        // Continue with other tokens even if one fails
      }
    }

    return balances
  }
} 