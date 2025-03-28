interface WalletHandler {
  initialized: boolean
  timestamp: number
  secureWalletHandler: {
    getWallet: (name: string) => any
    setWallet: (name: string, wallet: any) => boolean
    _wallets: Map<string, any>
  }
}

declare global {
  interface Window {
    __ghostAgent?: WalletHandler
    ethereum?: any
    ic?: {
      plug?: {
        isConnected: () => Promise<boolean>
        requestConnect: (options?: { whitelist?: string[], host?: string }) => Promise<boolean>
        createAgent: (options?: { whitelist?: string[], host?: string }) => Promise<any>
        createActor: <T>(options: { canisterId: string, interfaceFactory: any }) => Promise<T>
        agent: any
        getPrincipal: () => Promise<any>
        getAccountId: () => Promise<string>
        getNFTs: () => Promise<any[]>
        getBalance: () => Promise<{amount: number, currency: string}[]>
        requestTransfer: (args: {to: string, amount: number, opts?: any}) => Promise<{height: number}>
        getTransactions: () => Promise<any[]>
        disconnect: () => Promise<void>
      }
    }
  }
}

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
      if (!window.ic?.plug) {
        throw new Error("Plug wallet not found. Please install the Plug wallet extension.");
      }

      // Request connection to Plug wallet
      const whitelist = [
        process.env.NEXT_PUBLIC_ZK_CANISTER_ID,
        process.env.NEXT_PUBLIC_NFT_CANISTER_ID,
        process.env.NEXT_PUBLIC_TOKEN_CANISTER_ID
      ].filter(Boolean) as string[];
      
      const host = process.env.NEXT_PUBLIC_IC_HOST || 'https://mainnet.dfinity.network';
      
      const connected = await window.ic.plug.requestConnect({
        whitelist,
        host,
      });
      
      if (!connected) {
        throw new Error("Failed to connect to Plug wallet.");
      }
      
      // Create an agent
      await window.ic.plug.createAgent({ whitelist, host });
      
      // Get the principal and account ID
      const principal = await window.ic.plug.getPrincipal();
      const accountId = await window.ic.plug.getAccountId();
      
      // Get NFTs
      const nfts = await window.ic.plug.getNFTs();
      console.log('Raw NFTs from Plug:', nfts);
      
      // Get token balances
      const balances = await window.ic.plug.getBalance();
      const tokens = balances.map(balance => ({
        id: `${balance.currency.toLowerCase()}-token`,
        name: balance.currency === 'ICP' ? 'Internet Computer' : balance.currency,
        symbol: balance.currency,
        balance: balance.amount.toString(),
        decimals: 8, // Default for ICP
        amount: balance.amount.toString()
      }));
      
      // Get transactions
      const txs = await window.ic.plug.getTransactions();
      const transactions = txs.map((tx: any, index: number) => ({
        id: tx.id || `tx-${index}`,
        timestamp: tx.timestamp || Date.now(),
        type: tx.type || (tx.from === accountId ? 'send' : 'receive'),
        from: tx.from,
        to: tx.to,
        amount: tx.amount?.toString() || '0',
        token: tx.token || 'ICP',
        status: tx.status || 'completed',
        blockHeight: tx.blockHeight || 0
      }));
      
      const walletInfo: WalletInfo = {
        address: accountId,
        principal: principal.toString(),
        accountId,
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
      if (window.__ghostAgent?.secureWalletHandler) {
        window.__ghostAgent.secureWalletHandler.setWallet('plug', walletInfo);
      }

      return walletInfo;
    } else {
      // Ethereum wallet connection (MetaMask)
      if (!window.ethereum) {
        throw new Error("No Ethereum wallet found. Please install MetaMask.");
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please unlock your wallet.");
      }

      // Get the connected chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
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
      if (window.__ghostAgent?.secureWalletHandler) {
        window.__ghostAgent.secureWalletHandler.setWallet('metamask', walletInfo);
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
  return window.__ghostAgent?.secureWalletHandler.getWallet(name)
}

export function isWalletAvailable(name: string): boolean {
  return !!getSecureWallet(name)
}

export function getCurrentWalletInfo(): WalletInfo | null {
  // First try to get from secure wallet handler
  if (window.__ghostAgent?.secureWalletHandler) {
    const plugWallet = window.__ghostAgent.secureWalletHandler.getWallet('plug');
    if (plugWallet) return plugWallet;
    
    const metamaskWallet = window.__ghostAgent.secureWalletHandler.getWallet('metamask');
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
  
  // Finally try sessionStorage
  const sessionWallet = sessionStorage.getItem('walletInfo');
  if (sessionWallet) {
    try {
      return JSON.parse(sessionWallet);
    } catch (error) {
      console.error('Error parsing session wallet info:', error);
    }
  }
  
  return null;
}

export async function disconnectWallet(): Promise<boolean> {
  try {
    if (window.ic?.plug) {
      await window.ic.plug.disconnect();
    }
    
    // Clear the wallet info from the secure wallet handler
    if (window.__ghostAgent?.secureWalletHandler) {
      window.__ghostAgent.secureWalletHandler.setWallet('plug', null);
      window.__ghostAgent.secureWalletHandler.setWallet('metamask', null);
    }
    
    // Clear any stored wallet info
    localStorage.removeItem('walletInfo');
    sessionStorage.removeItem('walletInfo');
    
    return true;
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    return false;
  }
} 