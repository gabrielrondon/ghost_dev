import { Principal } from '@dfinity/principal'
import { Actor, HttpAgent } from '@dfinity/agent'
import { IDL } from '@dfinity/candid'
import { IC_HOST } from '../config/canister-config'
import { principalToAccountIdentifier, accountIdentifierToHex } from '../utils/account-identifier'

// Define token interfaces
export interface Token {
  id: string
  name: string
  symbol: string
  amount: string
  decimals: number
  standard: string
}

// ICRC-1 Token interface
const ICRC1_TOKEN_INTERFACE = ({ }) => {
  return IDL.Service({
    'icrc1_name': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_symbol': IDL.Func([], [IDL.Text], ['query']),
    'icrc1_decimals': IDL.Func([], [IDL.Nat8], ['query']),
    'icrc1_balance_of': IDL.Func([IDL.Record({
      owner: IDL.Principal,
      subaccount: IDL.Opt(IDL.Vec(IDL.Nat8))
    })], [IDL.Nat], ['query']),
    'icrc1_total_supply': IDL.Func([], [IDL.Nat], ['query'])
  })
}

// ICP Ledger interface
const ICP_LEDGER_INTERFACE = ({ }) => {
  return IDL.Service({
    'name': IDL.Func([], [IDL.Text], ['query']),
    'symbol': IDL.Func([], [IDL.Text], ['query']),
    'account_balance': IDL.Func([IDL.Record({
      account: IDL.Vec(IDL.Nat8)
    })], [IDL.Record({ e8s: IDL.Nat64 })], ['query']),
    'decimals': IDL.Func([], [IDL.Nat8], ['query'])
  })
}

// Token canister definitions - real production canisters
const TOKEN_CANISTERS = [
  {
    id: 'ryjl3-tyaaa-aaaaa-aaaba-cai', // ICP Ledger
    name: 'Internet Computer Protocol',
    symbol: 'ICP',
    decimals: 8,
    standard: 'ICP'
  },
  {
    id: 'ogy7f-maaaa-aaaak-qaaca-cai', // ORIGYN NFT Token
    name: 'ORIGYN NFT',
    symbol: 'OGY',
    decimals: 8,
    standard: 'ICRC-1'
  },
  {
    id: 'qbizb-wiaaa-aaaak-aafbq-cai', // SONIC Token
    name: 'SONIC',
    symbol: 'SONIC',
    decimals: 8,
    standard: 'ICRC-1'
  }
]

/**
 * Get an ICRC-1 token actor
 */
async function getICRC1Actor(canisterId: string): Promise<any> {
  const agent = new HttpAgent({ host: IC_HOST })
  
  // When in local development, we need to fetch the root key
  if (IC_HOST.includes('127.0.0.1') || IC_HOST.includes('localhost')) {
    await agent.fetchRootKey()
  }
  
  return Actor.createActor(ICRC1_TOKEN_INTERFACE, {
    agent,
    canisterId
  })
}

/**
 * Get an ICP Ledger actor
 */
async function getICPActor(canisterId: string): Promise<any> {
  const agent = new HttpAgent({ host: IC_HOST })
  
  // When in local development, we need to fetch the root key
  if (IC_HOST.includes('127.0.0.1') || IC_HOST.includes('localhost')) {
    await agent.fetchRootKey()
  }
  
  return Actor.createActor(ICP_LEDGER_INTERFACE, {
    agent,
    canisterId
  })
}

/**
 * Format token balance based on decimals
 */
function formatTokenBalance(balance: bigint, decimals: number): string {
  const balanceStr = balance.toString().padStart(decimals + 1, '0')
  const integerPart = balanceStr.slice(0, -decimals) || '0'
  const fractionalPart = balanceStr.slice(-decimals)
  return `${integerPart}.${fractionalPart}`
}

/**
 * Fetch ICP balance for a principal
 */
async function fetchICPBalance(canisterId: string, principal: string): Promise<string> {
  try {
    const actor = await getICPActor(canisterId)
    
    // Convert principal to account identifier using our utility
    const accountId = principalToAccountIdentifier(principal)
    
    // Call the ICP ledger to get the balance
    const balance = await actor.account_balance({ account: Array.from(accountId) })
    const decimals = await actor.decimals()
    
    return formatTokenBalance(BigInt(balance.e8s), Number(decimals))
  } catch (error) {
    console.error(`Error fetching ICP balance for ${canisterId}:`, error)
    return '0.00000000'
  }
}

/**
 * Fetch ICRC-1 balance for a principal
 */
async function fetchICRC1Balance(canisterId: string, principal: string): Promise<string> {
  try {
    const actor = await getICRC1Actor(canisterId)
    const principalObj = Principal.fromText(principal)
    
    const balance = await actor.icrc1_balance_of({
      owner: principalObj,
      subaccount: [] // Default subaccount
    })
    const decimals = await actor.icrc1_decimals()
    
    return formatTokenBalance(BigInt(balance), Number(decimals))
  } catch (error) {
    console.error(`Error fetching ICRC-1 balance for ${canisterId}:`, error)
    return '0.00000000'
  }
}

/**
 * Fetch token balances for a principal
 * This implementation fetches real balances from token canisters
 */
export async function fetchTokenBalances(principal: string): Promise<Token[]> {
  if (!principal) return []
  
  try {
    // Process each token in parallel
    const tokenPromises = TOKEN_CANISTERS.map(async (token) => {
      let balance = '0'
      
      // Fetch balance based on token standard
      if (token.standard === 'ICP') {
        balance = await fetchICPBalance(token.id, principal)
      } else if (token.standard === 'ICRC-1') {
        balance = await fetchICRC1Balance(token.id, principal)
      }
      
      return {
        ...token,
        amount: balance
      }
    })
    
    return Promise.all(tokenPromises)
  } catch (error) {
    console.error('Error fetching token balances:', error)
    return TOKEN_CANISTERS.map(token => ({
      ...token,
      amount: '0'
    }))
  }
}
