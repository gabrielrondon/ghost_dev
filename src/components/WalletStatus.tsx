import { useEffect, useState } from 'react';
import { checkForPlugWallet } from '@/utils/wallet-utils';

export function WalletStatus() {
  const [plugAvailable, setPlugAvailable] = useState<boolean | null>(null);
  const [protocol, setProtocol] = useState<string>('');
  
  useEffect(() => {
    async function checkPlugWallet() {
      const isAvailable = await checkForPlugWallet();
      setPlugAvailable(isAvailable);
      setProtocol(window.location.protocol);
    }
    
    checkPlugWallet();
  }, []);
  
  return (
    <div className="p-4 bg-gray-800 rounded-lg text-white mb-4">
      <h3 className="text-lg font-medium mb-2">Wallet Detection Status</h3>
      
      <div className="space-y-2">
        <div className="flex items-center">
          <span className="mr-2">Protocol:</span>
          <span className={`font-mono ${protocol === 'https:' ? 'text-green-400' : 'text-yellow-400'}`}>
            {protocol}
          </span>
        </div>
        
        <div className="flex items-center">
          <span className="mr-2">Plug Wallet:</span>
          {plugAvailable === null ? (
            <span className="text-gray-400">Checking...</span>
          ) : plugAvailable ? (
            <span className="text-green-400">Available</span>
          ) : (
            <span className="text-red-400">Not Detected</span>
          )}
        </div>
      </div>
    </div>
  );
} 