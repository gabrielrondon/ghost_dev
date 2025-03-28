interface WalletHandler {
  initialized: boolean
  timestamp: number
  secureWalletHandler: {
    getWallet: (name: string) => any
    setWallet: (name: string, wallet: any) => boolean
    _wallets: Map<string, any>
  }
}

// No global declarations to avoid conflicts

export interface ICPToken {
  id: string
  name: string
  symbol: string
  balance: string
  decimals: number
  amount: string
}

export interface ICPTransaction {
  id: string
  type: 'send' | 'receive' | 'swap' | 'mint' | 'burn'
  amount: string
  token: string
  timestamp: string
  blockHeight: string
  from?: string
  to?: string
  status: 'completed' | 'pending' | 'failed'
}

export interface WalletInfo {
  isConnected: boolean
  principal?: string
  accountId?: string
  address: string
  balance?: string
  network?: string
  walletType: 'internetComputer' | 'ethereum'
  chainId: 'icp' | 'eth'
  chainName: string
  nfts?: NFTInfo[]
  tokens?: ICPToken[]
  transactions?: ICPTransaction[]
}

export interface NFTInfo {
  canisterId: string
  index: number
  name: string
  url?: string
  collection?: string
}

export async function connectWallet(walletType: 'ethereum' | 'internetComputer' = 'internetComputer'): Promise<WalletInfo | null> {
  try {
    if (walletType === 'internetComputer') {
      // Check if Plug wallet is installed
      if (!(window as any).ic?.plug) {
        throw new Error("Plug wallet not found. Please install the Plug wallet extension.");
      }

      // Request connection to Plug wallet
      const whitelist = [
        process.env.NEXT_PUBLIC_ZK_CANISTER_ID,
        process.env.NEXT_PUBLIC_NFT_CANISTER_ID,
        process.env.NEXT_PUBLIC_TOKEN_CANISTER_ID
      ].filter(Boolean) as string[];
      
      const host = process.env.NEXT_PUBLIC_IC_HOST || 'https://mainnet.dfinity.network';
      
      const connected = await (window as any).ic.plug.requestConnect({
        whitelist,
        host,
      });
      
      if (!connected) {
        throw new Error("Failed to connect to Plug wallet.");
      }
      
      // Create an agent
      await (window as any).ic.plug.createAgent({ whitelist, host });
      
      // Use type assertions for all Plug wallet interactions
      const principal = typeof (window as any).ic.plug.getPrincipal === 'function' 
        ? await (window as any).ic.plug.getPrincipal()
        : null;
        
      const accountId = typeof (window as any).ic.plug.getAccountId === 'function'
        ? await (window as any).ic.plug.getAccountId()
        : null;
      
      if (!principal) {
        throw new Error("Failed to get principal from Plug wallet.");
      }
      
      // Get NFTs with type assertions
      let nfts = [];
      try {
        if (typeof (window as any).ic.plug.getNFTs === 'function') {
          nfts = await (window as any).ic.plug.getNFTs();
          console.log('Raw NFTs from Plug:', nfts);
        }
      } catch (error) {
        console.warn('Failed to get NFTs:', error);
        nfts = [];
      }
      
      // Get token balances with type assertions
      let tokens: ICPToken[] = [];
      try {
        if (typeof (window as any).ic.plug.getBalance === 'function') {
          const balances = await (window as any).ic.plug.getBalance();
          tokens = balances.map((balance: {currency: string; amount: string | number}) => ({
            id: `${balance.currency.toLowerCase()}-token`,
            name: balance.currency === 'ICP' ? 'Internet Computer' : balance.currency,
            symbol: balance.currency,
            balance: balance.amount.toString(),
            decimals: 8, // Default for ICP
            amount: balance.amount.toString()
          }));
        } else {
          // Default ICP token
          tokens = [{
            id: 'icp-token',
            name: 'Internet Computer',
            symbol: 'ICP',
            balance: '0',
            decimals: 8,
            amount: '0'
          }];
        }
      } catch (error) {
        console.warn('Failed to get token balances:', error);
        // Default ICP token
        tokens = [{
          id: 'icp-token',
          name: 'Internet Computer',
          symbol: 'ICP',
          balance: '0',
          decimals: 8,
          amount: '0'
        }];
      }
      
      // Get transactions with type assertions
      let transactions: ICPTransaction[] = [];
      try {
        if (typeof (window as any).ic.plug.getTransactions === 'function') {
          const txs = await (window as any).ic.plug.getTransactions();
          transactions = txs.map((tx: any, index: number) => ({
            id: tx.id || `tx-${index}`,
            timestamp: tx.timestamp || Date.now().toString(),
            type: tx.type || (accountId && tx.from === accountId ? 'send' : 'receive'),
            from: tx.from,
            to: tx.to,
            amount: tx.amount?.toString() || '0',
            token: tx.token || 'ICP',
            status: tx.status || 'completed',
            blockHeight: tx.blockHeight?.toString() || '0'
          }));
        }
      } catch (error) {
        console.warn('Failed to get transactions:', error);
        transactions = [];
      }
      
      const walletInfo: WalletInfo = {
        address: accountId || principal.toString(),
        principal: principal.toString(),
        accountId: accountId || undefined,
        isConnected: true,
        walletType: 'internetComputer',
        chainId: 'icp',
        chainName: 'Internet Computer',
        network: 'mainnet',
        balance: tokens[0]?.balance || '0',
        tokens,
        nfts: nfts.map((nft: any) => {
          console.log('Processing NFT:', nft);
          return {
            canisterId: nft.canister || nft.canisterId,
            index: nft.index || nft.tokenIndex || 0,
            name: nft.name || `NFT #${nft.index || nft.tokenIndex}`,
            url: nft.url || '',
            collection: nft.collection || 'Unknown'
          };
        }),
        transactions
      };

      // Store the wallet info in the secure wallet handler
      if ((window as any).__ghostAgent?.secureWalletHandler) {
        (window as any).__ghostAgent.secureWalletHandler.setWallet('plug', walletInfo);
      }

      return walletInfo;
    } else {
      // Ethereum wallet connection (MetaMask)
      if (!(window as any).ethereum) {
        throw new Error("No Ethereum wallet found. Please install MetaMask.");
      }

      // Request account access
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please unlock your wallet.");
      }

      // Get the connected chain ID
      const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
      const chainName = getChainName(chainId);
      
      const walletInfo: WalletInfo = {
        address: accounts[0],
        isConnected: true,
        walletType: 'ethereum',
        chainId: 'eth',
        chainName,
        network: chainName.toLowerCase(),
        balance: '0', // Will be updated with actual balance
        tokens: [], // Will be populated with ERC20 tokens
        nfts: [], // Will be populated with NFTs
        transactions: [] // Will be populated with transactions
      };

      // Store the wallet info in the secure wallet handler
      if ((window as any).__ghostAgent?.secureWalletHandler) {
        (window as any).__ghostAgent.secureWalletHandler.setWallet('metamask', walletInfo);
      }

      return walletInfo;
    }
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
}

function getChainName(chainId: string): string {
  const chains: Record<string, string> = {
    '0x1': 'Ethereum Mainnet',
    '0x5': 'Goerli Testnet',
    '0xaa36a7': 'Sepolia Testnet'
  };
  return chains[chainId] || 'Unknown Network';
}

export function getSecureWallet(name: string): any {
  return (window as any).__ghostAgent?.secureWalletHandler.getWallet(name)
}

export function isWalletAvailable(name: string): boolean {
  return !!getSecureWallet(name)
}

export function getCurrentWalletInfo(): WalletInfo | null {
  // First try to get from secure wallet handler
  if ((window as any).__ghostAgent?.secureWalletHandler) {
    const plugWallet = (window as any).__ghostAgent.secureWalletHandler.getWallet('plug');
    if (plugWallet) return plugWallet;
    
    const metamaskWallet = (window as any).__ghostAgent.secureWalletHandler.getWallet('metamask');
    if (metamaskWallet) return metamaskWallet;
  }
  
  // Then try localStorage
  const storedWallet = localStorage.getItem('walletInfo');
  if (storedWallet) {
    try {
      return JSON.parse(storedWallet);
    } catch (error) {
      console.error('Error parsing stored wallet info:', error);
    }
  }
  
  return null;
}

export async function disconnectWallet(): Promise<boolean> {
  try {
    if ((window as any).ic?.plug) {
      // Disconnect from Plug wallet
      await (window as any).ic.plug.disconnect();
    }
    
    // Remove from secure wallet handler
    if ((window as any).__ghostAgent?.secureWalletHandler) {
      (window as any).__ghostAgent.secureWalletHandler.setWallet('plug', null);
      (window as any).__ghostAgent.secureWalletHandler.setWallet('metamask', null);
    }
    
    // Clear localStorage
    localStorage.removeItem('walletInfo');
    
    return true;
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
    return false;
  }
} 