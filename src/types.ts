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

export interface GhostAgentState {
  referenceId: string | null;
  tasks: Task[];
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
  }
] as const;