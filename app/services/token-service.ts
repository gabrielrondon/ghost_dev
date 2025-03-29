import { Principal } from '@dfinity/principal'
import { type TokenMetadata, type TokenBalance, type TokenError } from '@/types/token'
import { walletService } from './wallet-service'
import { canisterService } from './canister-service'

class TokenService {
  private tokens: Map<string, TokenMetadata> = new Map()
  private balances: Map<string, TokenBalance> = new Map()

  async fetchTokens(principal: Principal): Promise<TokenMetadata[]> {
    try {
      const mainActor = canisterService.getMainActor()
      if (!mainActor) throw new Error('Main actor not initialized')

      const result = await mainActor.get_tokens(principal)
      
      if ('err' in result) {
        const error = result.err as TokenError
        throw new Error(error.message)
      }

      const tokens = result.ok
      tokens.forEach((token: TokenMetadata) => this.tokens.set(token.canister_id.toString(), token))
      
      return tokens
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
      throw new Error(`Failed to fetch tokens: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getBalance(tokenId: string): Promise<TokenBalance> {
    try {
      const mainActor = canisterService.getMainActor()
      if (!mainActor) throw new Error('Main actor not initialized')

      const principal = walletService.getPrincipal()
      if (!principal) throw new Error('Wallet not connected')

      const result = await mainActor.get_balance({
        token_canister_id: Principal.fromText(tokenId),
        owner: principal
      })

      if ('err' in result) {
        const error = result.err as TokenError
        throw new Error(error.message)
      }

      const balance = result.ok
      this.balances.set(tokenId, balance)
      
      return balance
    } catch (error) {
      console.error('Failed to fetch balance:', error)
      throw new Error(`Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async refreshBalances(): Promise<void> {
    const principal = walletService.getPrincipal()
    if (!principal) throw new Error('Wallet not connected')

    const tokens = await this.fetchTokens(principal)
    await Promise.all(
      tokens.map(token => this.getBalance(token.canister_id.toString()))
    )
  }

  getTokens(): TokenMetadata[] {
    return Array.from(this.tokens.values())
  }

  getTokenById(tokenId: string): TokenMetadata | undefined {
    return this.tokens.get(tokenId)
  }

  getBalanceById(tokenId: string): TokenBalance | undefined {
    return this.balances.get(tokenId)
  }
}

export const tokenService = new TokenService() 