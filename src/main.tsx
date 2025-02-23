import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

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