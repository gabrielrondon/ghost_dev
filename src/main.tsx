import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Add this at the top of your main.tsx
declare global {
  interface Window {
    solana?: any
    phantom?: any
  }
}

// Create a secure wallet handler
const secureWalletHandler = {
  // Store original wallet instances
  _wallets: new Map(),

  // Getter for wallet properties
  getWallet(name: string) {
    return this._wallets.get(name)
  },

  // Setter for wallet properties
  setWallet(name: string, wallet: any) {
    if (!this._wallets.has(name)) {
      this._wallets.set(name, wallet)
    }
    return true
  }
}

// Initialize secure environment
function initializeSecureEnvironment() {
  if (typeof window === 'undefined') return

  const walletProps = ['solana', 'phantom', 'keplr', 'yoroi']

  walletProps.forEach(prop => {
    // Store existing wallet if present
    if ((window as any)[prop]) {
      secureWalletHandler._wallets.set(prop, (window as any)[prop])
    }

    try {
      Object.defineProperty(window, prop, {
        configurable: true,
        enumerable: true,
        get: () => secureWalletHandler.getWallet(prop),
        set: (value) => secureWalletHandler.setWallet(prop, value)
      })
    } catch (e) {
      console.warn(`Failed to secure ${prop} wallet property`, e)
    }
  })

  // Create protected namespace
  const ghostAgent = {
    initialized: true,
    timestamp: Date.now(),
    secureWalletHandler
  }

  try {
    Object.defineProperty(window, '__ghostAgent', {
      value: ghostAgent,
      writable: false,
      configurable: false
    })
  } catch (e) {
    console.warn('Failed to create protected namespace', e)
  }
}

// Initialize before rendering
initializeSecureEnvironment()

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find root element');

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);