import { Principal } from '@dfinity/principal'
import { type TokenMetadata, type TokenBalance, type TokenError, type TokenOwnershipInput, type TokenOwnershipProof } from '@/types/token'
import { walletService } from './wallet-service'
import { canisterService } from './canister-service'

interface MerkleProof {
  index: bigint
  value: number[]
}

interface AttestationResult {
  Ok: {
    proof_id: string
    attestation: {
      token_canister_id: Principal
      wallet_principal: Principal
      minimum_balance: bigint
      token_id: bigint
      collection_id: bigint
      timestamp: bigint
      merkle_proof: MerkleProof[]
    }
  }
  Err?: string
}

class TokenService {
  private tokens: Map<string, TokenMetadata> = new Map()
  private balances: Map<string, TokenBalance> = new Map()

  async fetchTokens(principal: Principal): Promise<TokenMetadata[]> {
    try {
      const mainActor = await canisterService.getActor('ryjl3-tyaaa-aaaaa-aaaba-cai')
      if (!mainActor) throw new Error('Main actor not initialized')

      // TODO: Implement token fetching from ICRC ledger
      // For now, return mock data
      const mockToken: TokenMetadata = {
        canister_id: principal,
        name: "Mock Token",
        symbol: "MOCK",
        decimals: 8,
        total_supply: BigInt(1000000),
        token_standard: "ICRC1"
      }
      
      this.tokens.set(mockToken.canister_id.toString(), mockToken)
      return [mockToken]
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
      throw new Error(`Failed to fetch tokens: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getBalance(canisterId: Principal): Promise<TokenBalance> {
    try {
      const mainActor = await canisterService.getActor('ryjl3-tyaaa-aaaaa-aaaba-cai')
      if (!mainActor) throw new Error('Main actor not initialized')

      const principal = walletService.getPrincipal()
      if (!principal) throw new Error('Wallet not connected')

      const token = this.getTokenById(canisterId)
      if (!token) throw new Error('Token not found')

      // TODO: Implement balance fetching from ICRC ledger
      // For now, return mock data
      const mockBalance: TokenBalance = {
        token,
        balance: BigInt(100),
        owner: Principal.fromText(principal)
      }
      
      this.balances.set(canisterId.toString(), mockBalance)
      return mockBalance
    } catch (error) {
      console.error('Failed to fetch balance:', error)
      throw new Error(`Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async refreshBalances(): Promise<void> {
    const principal = walletService.getPrincipal()
    if (!principal) throw new Error('Wallet not connected')

    const tokens = await this.fetchTokens(Principal.fromText(principal))
    await Promise.all(
      tokens.map(token => this.getBalance(token.canister_id))
    )
  }

  async generateProof(input: TokenOwnershipInput): Promise<TokenOwnershipProof> {
    try {
      const mainActor = await canisterService.getActor('ryjl3-tyaaa-aaaaa-aaaba-cai')
      if (!mainActor) throw new Error('Main actor not initialized')

      const result = await mainActor.create_attestation({
        token_canister_id: input.token_canister_id,
        wallet_principal: input.owner,
        minimum_balance: input.amount,
        token_id: BigInt(0), // TODO: Get actual token ID
        collection_id: BigInt(0) // TODO: Get actual collection ID
      }) as AttestationResult

      if ('Err' in result && result.Err) {
        throw new Error(result.Err)
      }

      const { attestation } = result.Ok
      
      // Convert the attestation data into a proof format
      const proof: TokenOwnershipProof = {
        ...input,
        proof: Buffer.from(attestation.merkle_proof.flatMap((p: MerkleProof) => p.value)).toString('base64'),
        root: Buffer.from(attestation.merkle_proof[0].value).toString('base64'),
        timestamp: attestation.timestamp.toString(),
        public_inputs: {
          token_canister_id: input.token_canister_id.toString(),
          owner: input.owner.toString(),
          amount: input.amount.toString(),
          token_standard: input.token_standard
        }
      }

      return proof
    } catch (error) {
      console.error('Failed to generate proof:', error)
      throw new Error(`Failed to generate proof: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  getTokens(): TokenMetadata[] {
    return Array.from(this.tokens.values())
  }

  getTokenById(tokenId: Principal): TokenMetadata | undefined {
    return this.tokens.get(tokenId.toString())
  }

  getBalanceById(tokenId: Principal): TokenBalance | undefined {
    return this.balances.get(tokenId.toString())
  }
}

export const tokenService = new TokenService() 