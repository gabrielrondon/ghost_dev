/**
 * Utility functions for wallet integration
 */

/**
 * Check if the Plug wallet extension is available
 * @returns Promise<boolean> resolves to true if Plug is available
 */
export async function checkForPlugWallet(): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if Plug is already injected
    if ((window as any).ic?.plug) {
      resolve(true);
      return;
    }
    
    // Set a timeout to check if Plug is injected after a delay
    const checkPlugTimeout = setTimeout(() => {
      resolve(false);
    }, 1500);
    
    // Listen for Plug injection
    window.addEventListener('load', () => {
      clearTimeout(checkPlugTimeout);
      resolve(!!(window as any).ic?.plug);
    });
    
    // Also check after a short delay in case the page is already loaded
    setTimeout(() => {
      clearTimeout(checkPlugTimeout);
      resolve(!!(window as any).ic?.plug);
    }, 500);
  });
}

/**
 * Determine if HTTPS should be used based on current environment
 * @returns Object with hostname and protocol decision
 */
export function getConnectionProtocol(): { useHttps: boolean; host: string } {
  const host = window.location.hostname;
  const useHttps = window.location.protocol === 'https:';
  
  return {
    useHttps,
    host
  };
} 