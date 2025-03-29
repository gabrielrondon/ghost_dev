import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import ProofGenerator from '@/components/features/proof-generator';
import { VerificationPage } from '@/components/features/verification';
import { Providers } from '@/app/providers';
import { WalletStatus } from './components/WalletStatus';

function App() {
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
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {process.env.NODE_ENV === 'development' && <WalletStatus />}
          <ProofGenerator />
        </main>
      </div>
    </Providers>
  );
}

export default App;