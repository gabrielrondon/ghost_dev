/**
 * Get the connection protocol for the Internet Computer network
 * 
 * @returns An object with connection details
 */
export function getConnectionProtocol() {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  // Determine if we should use HTTPS
  const useHttps = !isDev;
  
  // Set the host based on environment
  const host = useHttps ? 'https://icp0.io' : 'http://localhost:8000';
  
  return {
    useHttps,
    host,
    isDev
  };
} 