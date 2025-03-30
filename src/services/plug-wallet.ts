'use client'

import type { PlugProvider } from './icp'
import { Principal } from '@dfinity/principal'
import { ICP_LEDGER_CANISTER_ID } from '@/constants'

declare global {
  interface Window {
    ic?: {
      plug?: PlugProvider
    }
  }
}

/**
 * Connect to the Plug wallet
 */
export async function connectPlugWallet(): Promise<boolean> {
  try {
    // Check if Plug is installed
    if (!window.ic?.plug) {
      throw new Error('Plug wallet is not installed')
    }

    // Request connection to Plug
    const connected = await window.ic.plug.requestConnect({
      whitelist: [],
      host: 'https://icp0.io'
    })

    return connected
  } catch (error) {
    console.error('Error connecting to Plug wallet:', error)
    throw error
  }
}

/**
 * Disconnect from the Plug wallet
 */
export async function disconnectPlugWallet(): Promise<void> {
  try {
    // Check if Plug is installed
    if (!window.ic?.plug) {
      throw new Error('Plug wallet is not installed')
    }

    // Disconnect from Plug
    await window.ic.plug.disconnect()
  } catch (error) {
    console.error('Error disconnecting from Plug wallet:', error)
    throw error
  }
}

/**
 * Connect to Plug wallet
 * @returns Principal ID as string
 */
export async function connectPlugWalletOld(): Promise<string> {
  if (!window.ic?.plug) {
    throw new Error('Plug wallet not installed')
  }

  try {
    const whitelist = [ICP_LEDGER_CANISTER_ID]
    const connected = await window.ic.plug.requestConnect({ whitelist })
    
    if (!connected) {
      throw new Error('Failed to connect to Plug wallet')
    }

    const principal = await window.ic.plug.getPrincipal()
    return principal.toText()
  } catch (error) {
    console.error('Error connecting to Plug wallet:', error)
    throw error
  }
}

/**
 * Disconnect from Plug wallet
 */
export async function disconnectPlugWalletOld(): Promise<void> {
  if (!window.ic?.plug) {
    throw new Error('Plug wallet not installed')
  }

  try {
    await window.ic.plug.disconnect()
  } catch (error) {
    console.error('Error disconnecting from Plug wallet:', error)
    throw error
  }
} 