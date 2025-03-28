export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'completed';
  timestamp: number;
  config?: {
    priority: 'low' | 'medium' | 'high';
    executionDelay?: number; // delay in milliseconds
    retryAttempts?: number;
    disclosureLevel?: 'full' | 'anonymous' | 'redacted';
    storageType?: 'chain' | 'ipfs' | 'encrypted';
  };
}

export interface WalletInfo {
  address: string;
  chainId: 'icp' | 'eth';
  chainName: string;
  isConnected: boolean;
}

export interface GhostAgentState {
  referenceId: string | null;
  tasks: Task[];
}

export type VerifiableItemType = 'nft' | 'token' | 'transaction' | 'governance';

export interface WalletVerificationRequest {
  walletAddress: string;
  itemType: VerifiableItemType;
  itemId?: string; // NFT canisterId-index, token symbol, transaction id, etc.
  chainId: 'icp' | 'eth';
  additionalData?: Record<string, any>;
}

export interface VerificationResult {
  isVerified: boolean;
  proofId: string;
  timestamp: number;
  anonymousReference: string;
  walletAddress: string;
  chainId: 'icp' | 'eth';
  itemType: VerifiableItemType;
  itemId: string;
  
  // NFT specific fields
  nftContractAddress?: string;
  nftIndex?: number;
  nftName?: string;
  nftImageUrl?: string;
  
  // Token specific fields
  tokenSymbol?: string;
  tokenName?: string;
  tokenAmount?: string;
  
  // Transaction specific fields
  transactionHash?: string;
  transactionType?: 'send' | 'receive' | 'swap' | 'mint' | 'burn';
  transactionAmount?: string;
  transactionToken?: string;
  transactionTimestamp?: number;
  
  // Governance specific fields
  proposalId?: string;
  voteType?: 'yes' | 'no' | 'abstain';
  
  // Internet Computer specific
  principal?: string;
}

export interface InternetComputerNft {
  canisterId: string;
  index: number;
  name: string;
  url?: string;
  metadata?: any;
}

export const TASK_SUGGESTIONS = [
  {
    description: "Generate anonymous proof of DAO vote participation",
    defaultConfig: {
      priority: 'high',
      executionDelay: 0,
      retryAttempts: 3,
      disclosureLevel: 'anonymous',
      storageType: 'chain'
    }
  },
  {
    description: "Create proof of token staking without revealing wallet",
    defaultConfig: {
      priority: 'high',
      executionDelay: 1000,
      retryAttempts: 2,
      disclosureLevel: 'anonymous',
      storageType: 'chain'
    }
  },
  {
    description: "Generate anonymous event attendance verification",
    defaultConfig: {
      priority: 'medium',
      executionDelay: 500,
      retryAttempts: 2,
      disclosureLevel: 'anonymous',
      storageType: 'ipfs'
    }
  },
  {
    description: "Create redacted proof of donation amount",
    defaultConfig: {
      priority: 'medium',
      executionDelay: 0,
      retryAttempts: 2,
      disclosureLevel: 'redacted',
      storageType: 'encrypted'
    }
  },
  {
    description: "Generate verifiable proof summary in human-readable format",
    defaultConfig: {
      priority: 'low',
      executionDelay: 1000,
      retryAttempts: 1,
      disclosureLevel: 'full',
      storageType: 'ipfs'
    }
  },
  {
    description: "Store and encrypt proof for later verification",
    defaultConfig: {
      priority: 'medium',
      executionDelay: 0,
      retryAttempts: 2,
      disclosureLevel: 'full',
      storageType: 'encrypted'
    }
  },
  {
    description: "Verify third-party proof without exposing identity",
    defaultConfig: {
      priority: 'high',
      executionDelay: 500,
      retryAttempts: 3,
      disclosureLevel: 'anonymous',
      storageType: 'chain'
    }
  },
  {
    description: "Verify NFT ownership without revealing wallet address",
    defaultConfig: {
      priority: 'high',
      executionDelay: 0,
      retryAttempts: 3,
      disclosureLevel: 'anonymous',
      storageType: 'chain'
    }
  },
  {
    description: "Verify Internet Computer NFT ownership anonymously",
    defaultConfig: {
      priority: 'high',
      executionDelay: 0,
      retryAttempts: 3,
      disclosureLevel: 'anonymous',
      storageType: 'chain'
    }
  },
  {
    description: "Verify token balance without revealing wallet address",
    defaultConfig: {
      priority: 'high',
      executionDelay: 0,
      retryAttempts: 2,
      disclosureLevel: 'redacted',
      storageType: 'chain'
    }
  },
  {
    description: "Prove transaction history without exposing wallet",
    defaultConfig: {
      priority: 'medium',
      executionDelay: 0,
      retryAttempts: 2,
      disclosureLevel: 'anonymous',
      storageType: 'chain'
    }
  }
] as const;