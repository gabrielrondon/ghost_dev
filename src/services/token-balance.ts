import { Principal } from '@dfinity/principal'
import { sha256 } from '@noble/hashes/sha256'
import { TokenBalance } from '@/utils/merkle-tree'
import { Actor, HttpAgent } from '@dfinity/agent'
import { IDL } from '@dfinity/candid'
import type { InterfaceFactory } from '@dfinity/candid/lib/cjs/idl'
import type { TokenMetadata, TokenOwnershipInput, TokenOwnershipProof, TokenStandard } from '@/types/token'

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

// Cache interface
interface BalanceCache {
  balance: bigint
  timestamp: number
}

// Cache balances for 30 seconds
const CACHE_DURATION = 30 * 1000
const balanceCache = new Map<string, BalanceCache>()

// Default supported tokens
const DEFAULT_TOKENS: TokenMetadata[] = [
  {
    canister_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
    name: 'Internet Computer Protocol',
    symbol: 'ICP',
    decimals: 8,
    total_supply: BigInt('0'),
    token_standard: 'ICRC1'
  }
  // Add more default tokens here
]

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

  async getBalance(metadata: TokenMetadata, owner: Principal): Promise<bigint> {
    try {
      switch (metadata.token_standard) {
        case 'ICRC1':
          return await this.getICRC1Balance(metadata.canister_id, owner)
        case 'ICRC2':
          return await this.getICRC2Balance(metadata.canister_id, owner)
        case 'DIP20':
          return await this.getDIP20Balance(metadata.canister_id, owner)
        case 'EXT':
          // For EXT tokens, we need a token ID
          throw new Error('EXT tokens require a token ID')
        default:
          throw new Error(`Unsupported token standard: ${metadata.token_standard}`)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
      throw error
    }
  }

  async fetchTokens(_owner: Principal): Promise<TokenMetadata[]> {
    // For now, just return default tokens
    return DEFAULT_TOKENS
  }

  async getAllBalances(owner: Principal): Promise<TokenBalance[]> {
    const tokens = await this.fetchTokens(owner)
    const balances = await Promise.all(
      tokens.map(async (token) => {
        try {
          const balance = await this.getBalance(token, owner)
          const ownerHash = sha256(owner.toUint8Array())
          
          return {
            tokenId: BigInt(token.canister_id.toText()),
            balance,
            ownerHash,
            metadata: new TextEncoder().encode(JSON.stringify({
              token_standard: token.token_standard,
              symbol: token.symbol,
              decimals: token.decimals
            }))
          }
        } catch (error) {
          console.error(`Failed to fetch balance for ${token.symbol}:`, error)
          return {
            tokenId: BigInt(token.canister_id.toText()),
            balance: BigInt(0),
            ownerHash: sha256(owner.toUint8Array()),
            metadata: new TextEncoder().encode(JSON.stringify({
              token_standard: token.token_standard,
              symbol: token.symbol,
              decimals: token.decimals
            }))
          }
        }
      })
    )
    return balances
  }

  async generateProof(input: TokenOwnershipInput): Promise<TokenOwnershipProof> {
    const { token_canister_id, owner, amount, token_standard } = input
    const balance = await this.getBalance(
      {
        canister_id: token_canister_id,
        name: 'Unknown',
        symbol: 'Unknown',
        decimals: 8,
        total_supply: BigInt(0),
        token_standard
      },
      owner
    )

    if (balance < amount) {
      throw new Error('Insufficient balance')
    }

    // Generate proof using SHA-256
    const message = `${token_canister_id.toText()}-${owner.toText()}-${amount.toString()}-${token_standard}`
    const proof = Buffer.from(sha256(message)).toString('hex')
    const root = Buffer.from(sha256(proof)).toString('hex')
    const timestamp = new Date().toISOString()

    return {
      ...input,
      proof,
      root,
      timestamp,
      public_inputs: {
        token_canister_id: token_canister_id.toText(),
        owner: owner.toText(),
        amount: amount.toString(),
        token_standard
      }
    }
  }
}

// Create and export a singleton instance
export const tokenService = new TokenBalanceService(new HttpAgent()) 