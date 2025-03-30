import { HttpAgent } from '@dfinity/agent'
import { TokenBalanceService } from './token-balance'

// Create an HTTP agent for the IC mainnet
const agent = new HttpAgent({
  host: 'https://ic0.app'
})

// Export a singleton instance of the token service
export const tokenService = new TokenBalanceService(agent) 