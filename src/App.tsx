import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { ProofGenerator } from '@/components/features/proof-generator';
import { VerificationPage } from '@/components/features/verification';
import { Providers } from '@/app/providers';
import { useWallet } from '@/hooks/use-wallet';

function App() {
  const { walletInfo, isConnecting, connect, disconnect, refreshData } = useWallet();
  const [verificationProofId, setVerificationProofId] = useState<string | null>(null);

  // Check if we're on a verification page
  useEffect(() => {
    const path = window.location.pathname;
    const hashPath = window.location.hash;
    
    // Check for path-based routing
    const pathMatch = path.match(/\/verify\/([a-zA-Z0-9-]+)/);
    
    // Check for hash-based routing
    const hashMatch = hashPath.match(/#\/verify\/([a-zA-Z0-9-]+)/);
    
    if (pathMatch && pathMatch[1]) {
      setVerificationProofId(pathMatch[1]);
    } else if (hashMatch && hashMatch[1]) {
      setVerificationProofId(hashMatch[1]);
    }
  }, []);

  // If we're on a verification page, render the VerificationPage component
  if (verificationProofId) {
    return (
      <Providers>
        <div className="min-h-screen bg-gray-900">
          <VerificationPage proofId={verificationProofId} />
        </div>
      </Providers>
    );
  }

  return (
    <Providers>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Header 
          walletInfo={walletInfo}
          isConnecting={isConnecting}
          onConnect={connect}
          onDisconnect={disconnect}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProofGenerator 
            walletInfo={walletInfo}
            isConnecting={isConnecting}
            onConnect={connect}
            onDisconnect={disconnect}
            onRefreshData={refreshData}
          />
        </main>
      </div>
    </Providers>
  );
}

export default App;