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

// Modify your wallet initialization to check for existing providers
function initializeWallets() {
  if (!window.solana) {
    Object.defineProperty(window, 'solana', {
      value: {},
      configurable: true,
      writable: true
    })
  }

  if (!window.phantom) {
    Object.defineProperty(window, 'phantom', {
      value: {},
      configurable: true,
      writable: true
    })
  }
}

// Call this before other wallet-related code
initializeWallets()

// Prevent wallet conflicts
if (typeof window !== 'undefined') {
  // Create a secure environment
  try {
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      writable: false,
      configurable: false
    });
  } catch (e) {
    console.warn('Could not secure context');
  }

  // Remove wallet properties
  const walletProps = ['solana', 'phantom', 'keplr', 'yoroi'];
  walletProps.forEach(prop => {
    try {
      if (prop in window) {
        delete (window as any)[prop];
        Object.defineProperty(window, prop, {
          configurable: false,
          get: () => undefined,
          set: () => {}
        });
      }
    } catch (e) {
      console.warn(`Could not secure ${prop} property`);
    }
  });

  // Create a protected namespace for our app
  const ghostAgent = {
    initialized: true,
    timestamp: Date.now()
  };

  try {
    Object.defineProperty(window, '__ghostAgent', {
      value: ghostAgent,
      writable: false,
      configurable: false
    });
  } catch (e) {
    console.warn('Could not create protected namespace');
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find root element');

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);