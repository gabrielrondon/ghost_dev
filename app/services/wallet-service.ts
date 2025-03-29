import { Identity } from "@dfinity/agent"
import { Principal } from "@dfinity/principal"
import { canisterService } from "./canister-service"

interface WalletState {
  principal: Principal | null
  identity: Identity | null
  provider: "stoic" | "plug" | null
}

declare global {
  interface Window {
    ic?: {
      plug?: {
        agent?: {
          getPrincipal: () => Promise<Principal>
          getIdentity: () => Promise<Identity>
        }
        requestConnect: (options: {
          whitelist: string[]
          host?: string
        }) => Promise<boolean>
      }
    }
  }
}

interface StoicIdentity {
  connect(): Promise<Identity>
  load(): Promise<Identity | undefined>
}

class WalletService {
  private state: WalletState = {
    principal: null,
    identity: null,
    provider: null,
  }

  async connectStoic(): Promise<void> {
    if (!process.env.NEXT_PUBLIC_ENABLE_STOIC) {
      throw new Error("Stoic wallet is not enabled")
    }

    try {
      const StoicIdentity = (await import("ic-stoic-identity")).default as unknown as StoicIdentity
      const identity = await StoicIdentity.load()
      if (!identity) {
        const identity = await StoicIdentity.connect()
        this.setState({
          principal: identity.getPrincipal(),
          identity,
          provider: "stoic",
        })
      }
    } catch (error) {
      console.error("Failed to connect to Stoic wallet:", error)
      throw new Error("Failed to connect to Stoic wallet")
    }
  }

  async connectPlug(): Promise<void> {
    if (!process.env.NEXT_PUBLIC_ENABLE_PLUG) {
      throw new Error("Plug wallet is not enabled")
    }

    if (!window.ic?.plug) {
      throw new Error("Plug wallet not installed")
    }

    try {
      const result = await window.ic.plug.requestConnect({
        whitelist: [
          process.env.NEXT_PUBLIC_MAIN_CANISTER_ID!,
          process.env.NEXT_PUBLIC_ZK_CANISTER_ID!,
        ],
        host: process.env.NEXT_PUBLIC_IC_HOST,
      })

      if (!result) {
        throw new Error("User rejected the connection request")
      }

      if (!window.ic.plug.agent) {
        throw new Error("Plug agent not initialized")
      }

      const principal = await window.ic.plug.agent.getPrincipal()
      const identity = await window.ic.plug.agent.getIdentity()

      this.setState({
        principal,
        identity,
        provider: "plug",
      })
    } catch (error) {
      console.error("Failed to connect to Plug wallet:", error)
      throw new Error("Failed to connect to Plug wallet")
    }
  }

  async disconnect(): Promise<void> {
    this.setState({
      principal: null,
      identity: null,
      provider: null,
    })
    canisterService.resetActors()
  }

  private setState(state: Partial<WalletState>): void {
    this.state = { ...this.state, ...state }
  }

  getState(): WalletState {
    return this.state
  }

  getPrincipal(): Principal | null {
    return this.state.principal
  }

  getIdentity(): Identity | null {
    return this.state.identity
  }
}

export const walletService = new WalletService() 