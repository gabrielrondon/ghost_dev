import { Actor, HttpAgent } from '@dfinity/agent'
import { idlFactory } from './backend.did.js'
import type { _SERVICE } from './backend.did'

// Create an agent for local development
const agent = new HttpAgent({
  host: process.env.NEXT_PUBLIC_IC_HOST || 'http://localhost:4943'
})

// Only fetch root key in development
if (process.env.NODE_ENV !== 'production') {
  agent.fetchRootKey().catch(err => {
    console.warn('Unable to fetch root key. Check to ensure that your local replica is running')
    console.error(err)
  })
}

// Create the actor with the interface
export const backendCanister = Actor.createActor<_SERVICE>(idlFactory, {
  agent,
  canisterId: process.env.NEXT_PUBLIC_BACKEND_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai'
}) 