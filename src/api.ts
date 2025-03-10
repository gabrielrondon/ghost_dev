import { v4 as uuidv4 } from 'uuid';
import type { Task, WalletVerificationRequest, VerificationResult, InternetComputerNft, VerifiableItemType } from './types';
import { ICPToken, ICPTransaction } from './lib/wallet-handler';

// Mock storage to persist data during development
const mockStorage = new Map<string, Task[]>();
const mockVerificationResults = new Map<string, VerificationResult>();
const mockIcpNfts = new Map<string, InternetComputerNft[]>();
const mockIcpTokens = new Map<string, ICPToken[]>();
const mockIcpTransactions = new Map<string, ICPTransaction[]>();

// Sample ICP NFTs for testing
const sampleNfts: InternetComputerNft[] = [
  {
    canisterId: 'rw7qm-eiaaa-aaaak-aaiqq-cai',
    index: 1,
    name: 'Motoko Ghost #1',
    url: 'https://nft.internetcomputer.org/sample/1.png',
    metadata: {
      attributes: [
        { trait_type: 'Background', value: 'Purple' },
        { trait_type: 'Body', value: 'Ethereal' },
        { trait_type: 'Eyes', value: 'Glowing' }
      ]
    }
  },
  {
    canisterId: 'rw7qm-eiaaa-aaaak-aaiqq-cai',
    index: 2,
    name: 'Motoko Ghost #2',
    url: 'https://nft.internetcomputer.org/sample/2.png',
    metadata: {
      attributes: [
        { trait_type: 'Background', value: 'Blue' },
        { trait_type: 'Body', value: 'Spectral' },
        { trait_type: 'Eyes', value: 'Cosmic' }
      ]
    }
  },
  {
    canisterId: 'jeghr-iaaaa-aaaah-qaeha-cai',
    index: 42,
    name: 'ICP Punk #42',
    url: 'https://nft.internetcomputer.org/sample/punk.png',
    metadata: {
      attributes: [
        { trait_type: 'Background', value: 'Dark' },
        { trait_type: 'Style', value: 'Punk' },
        { trait_type: 'Accessory', value: 'Glasses' }
      ]
    }
  }
];

// Sample ICP tokens for testing
const sampleTokens: ICPToken[] = [
  {
    symbol: 'ICP',
    amount: 15.75,
    decimals: 8,
    name: 'Internet Computer'
  },
  {
    symbol: 'ckBTC',
    amount: 0.025,
    decimals: 8,
    name: 'Chain Key Bitcoin',
    canisterId: 'mxzaz-hqaaa-aaaar-qaada-cai'
  },
  {
    symbol: 'CHAT',
    amount: 1250,
    decimals: 8,
    name: 'DFINITY Chat Token',
    canisterId: 'tyyy3-4aaaa-aaaaq-aabsq-cai'
  }
];

// Sample ICP transactions for testing
const sampleTransactions: ICPTransaction[] = [
  {
    id: 'tx-1',
    timestamp: Date.now() - (1 * 86400000), // 1 day ago
    type: 'receive',
    from: 'principal-sender-123',
    to: 'principal-123',
    amount: 5.25,
    token: 'ICP',
    status: 'completed',
    hash: '0x123456789abcdef',
    blockHeight: 12345678
  },
  {
    id: 'tx-2',
    timestamp: Date.now() - (2 * 86400000), // 2 days ago
    type: 'send',
    from: 'principal-123',
    to: 'principal-receiver-456',
    amount: 1.5,
    token: 'ICP',
    status: 'completed',
    hash: '0x987654321fedcba',
    blockHeight: 12345670
  },
  {
    id: 'tx-3',
    timestamp: Date.now() - (5 * 86400000), // 5 days ago
    type: 'receive',
    from: 'nft-canister-789',
    to: 'principal-123',
    amount: 0,
    token: 'NFT',
    status: 'completed',
    hash: '0xabcdef123456789',
    blockHeight: 12345600
  },
  {
    id: 'tx-4',
    timestamp: Date.now() - (10 * 86400000), // 10 days ago
    type: 'send',
    from: 'principal-123',
    to: 'governance-canister-xyz',
    amount: 10,
    token: 'ICP',
    status: 'completed',
    hash: '0xfedcba987654321',
    blockHeight: 12345500
  }
];

// Add sample data to mock storage
mockIcpNfts.set('principal-123', sampleNfts);
mockIcpTokens.set('principal-123', sampleTokens);
mockIcpTransactions.set('principal-123', sampleTransactions);

const MOCK_DELAY = 500; // Simulate network delay

async function generateReference(): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const referenceId = uuidv4();
    mockStorage.set(referenceId, []);
    return referenceId;
}

async function assignTask(
  referenceId: string,
  description: string,
  config?: Task['config']
): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    const taskId = uuidv4();
    const task: Task = {
        id: taskId,
        description,
        status: 'pending',
        timestamp: Date.now(),
        config
    };
    
    const tasks = mockStorage.get(referenceId) || [];
    tasks.push(task);
    mockStorage.set(referenceId, tasks);
    
    return taskId;
}

async function getTasks(referenceId: string): Promise<Task[]> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    return mockStorage.get(referenceId) || [];
}

async function executeTasks(referenceId: string): Promise<Task[]> {
    const tasks = mockStorage.get(referenceId) || [];
    
    // Execute tasks according to their configuration
    for (const task of tasks) {
        if (task.status === 'pending') {
            const executionDelay = task.config?.executionDelay || 0;
            if (executionDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, executionDelay));
            }
            
            let attempts = 0;
            const maxAttempts = task.config?.retryAttempts || 1;
            
            while (attempts < maxAttempts) {
                try {
                    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
                    break;
                } catch (error) {
                    attempts++;
                    if (attempts === maxAttempts) {
                        throw error;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
                }
            }
        }
    }
    
    const updatedTasks = tasks.map(task => ({
        ...task,
        status: 'completed' as const
    }));
    
    mockStorage.set(referenceId, updatedTasks);
    return updatedTasks;
}

async function deleteReference(referenceId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    return mockStorage.delete(referenceId);
}

// NFT Verification Functions
async function verifyNftOwnership(request: WalletVerificationRequest): Promise<VerificationResult> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY * 2)); // Simulate longer verification time
    
    const proofId = uuidv4();
    const anonymousReference = uuidv4();
    let result: VerificationResult;
    
    switch (request.itemType) {
        case 'nft':
            result = await verifyNft(request, proofId, anonymousReference);
            break;
        case 'token':
            result = await verifyToken(request, proofId, anonymousReference);
            break;
        case 'transaction':
            result = await verifyTransaction(request, proofId, anonymousReference);
            break;
        case 'governance':
            result = await verifyGovernance(request, proofId, anonymousReference);
            break;
        default:
            throw new Error(`Unsupported verification type: ${request.itemType}`);
    }
    
    // Store the result for later retrieval
    mockVerificationResults.set(proofId, result);
    
    return result;
}

async function verifyNft(
    request: WalletVerificationRequest, 
    proofId: string, 
    anonymousReference: string
): Promise<VerificationResult> {
    // Parse the NFT contract address and index if provided
    let nftIndex: number | undefined;
    let nftCanisterId: string | undefined;
    let nftName: string | undefined;
    let nftImageUrl: string | undefined;
    
    if (request.itemId && request.itemId.includes('-')) {
        const parts = request.itemId.split('-');
        nftCanisterId = parts[0];
        nftIndex = parseInt(parts[1], 10);
        
        // Find the NFT details if available
        if (request.chainId === 'icp' && mockIcpNfts.has('principal-123')) {
            const nfts = mockIcpNfts.get('principal-123') || [];
            const nft = nfts.find(n => n.canisterId === nftCanisterId && n.index === nftIndex);
            if (nft) {
                nftName = nft.name;
                nftImageUrl = nft.url;
            }
        }
    }
    
    // For testing purposes, always verify if an itemId is provided
    // In a real implementation, this would check if the wallet actually owns the NFT
    const isVerified = !!request.itemId;
    
    return {
        isVerified,
        proofId,
        timestamp: Date.now(),
        anonymousReference,
        walletAddress: request.walletAddress,
        chainId: request.chainId,
        itemType: 'nft',
        itemId: request.itemId,
        nftContractAddress: nftCanisterId,
        nftIndex,
        nftName,
        nftImageUrl,
        principal: request.chainId === 'icp' ? request.walletAddress : undefined
    };
}

async function verifyToken(
    request: WalletVerificationRequest, 
    proofId: string, 
    anonymousReference: string
): Promise<VerificationResult> {
    // Get token details if available
    let tokenSymbol: string | undefined;
    let tokenName: string | undefined;
    let tokenAmount: number | undefined;
    
    if (request.itemId && request.chainId === 'icp' && mockIcpTokens.has('principal-123')) {
        const tokens = mockIcpTokens.get('principal-123') || [];
        const token = tokens.find(t => t.symbol === request.itemId);
        if (token) {
            tokenSymbol = token.symbol;
            tokenName = token.name;
            tokenAmount = token.amount;
        }
    }
    
    // For testing purposes, always verify if an itemId is provided
    // In a real implementation, this would check if the wallet actually owns the token
    const isVerified = !!request.itemId;
    
    return {
        isVerified,
        proofId,
        timestamp: Date.now(),
        anonymousReference,
        walletAddress: request.walletAddress,
        chainId: request.chainId,
        itemType: 'token',
        itemId: request.itemId,
        tokenSymbol,
        tokenName,
        tokenAmount,
        principal: request.chainId === 'icp' ? request.walletAddress : undefined
    };
}

async function verifyTransaction(
    request: WalletVerificationRequest, 
    proofId: string, 
    anonymousReference: string
): Promise<VerificationResult> {
    // Get transaction details if available
    let transactionHash: string | undefined;
    let transactionType: string | undefined;
    let transactionAmount: number | undefined;
    let transactionToken: string | undefined;
    let transactionTimestamp: number | undefined;
    
    if (request.itemId && request.chainId === 'icp' && mockIcpTransactions.has('principal-123')) {
        const transactions = mockIcpTransactions.get('principal-123') || [];
        const transaction = transactions.find(t => t.id === request.itemId);
        if (transaction) {
            transactionHash = transaction.hash;
            transactionType = transaction.type;
            transactionAmount = transaction.amount;
            transactionToken = transaction.token;
            transactionTimestamp = transaction.timestamp;
        }
    }
    
    // For testing purposes, always verify if an itemId is provided
    // In a real implementation, this would check if the transaction belongs to the wallet
    const isVerified = !!request.itemId;
    
    return {
        isVerified,
        proofId,
        timestamp: Date.now(),
        anonymousReference,
        walletAddress: request.walletAddress,
        chainId: request.chainId,
        itemType: 'transaction',
        itemId: request.itemId,
        transactionHash,
        transactionType,
        transactionAmount,
        transactionToken,
        transactionTimestamp,
        principal: request.chainId === 'icp' ? request.walletAddress : undefined
    };
}

async function verifyGovernance(
    request: WalletVerificationRequest, 
    proofId: string, 
    anonymousReference: string
): Promise<VerificationResult> {
    // Mock governance verification
    // In a real implementation, this would verify governance participation
    
    // For testing purposes, always verify if an itemId is provided
    const isVerified = !!request.itemId;
    
    return {
        isVerified,
        proofId,
        timestamp: Date.now(),
        anonymousReference,
        walletAddress: request.walletAddress,
        chainId: request.chainId,
        itemType: 'governance',
        itemId: request.itemId,
        proposalId: request.itemId,
        voteType: request.additionalData?.voteType as 'yes' | 'no' | 'abstain' || 'yes',
        principal: request.chainId === 'icp' ? request.walletAddress : undefined
    };
}

async function getVerificationProof(proofId: string): Promise<VerificationResult | null> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    return mockVerificationResults.get(proofId) || null;
}

// Function to get NFTs for a principal (mock implementation)
async function getNftsForPrincipal(principal: string): Promise<InternetComputerNft[]> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    return mockIcpNfts.get(principal) || sampleNfts; // Return sample NFTs for testing
}

// Function to get tokens for a principal (mock implementation)
async function getTokensForPrincipal(principal: string): Promise<ICPToken[]> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    return mockIcpTokens.get(principal) || sampleTokens; // Return sample tokens for testing
}

// Function to get transactions for a principal (mock implementation)
async function getTransactionsForPrincipal(principal: string): Promise<ICPTransaction[]> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
    return mockIcpTransactions.get(principal) || sampleTransactions; // Return sample transactions for testing
}

export { 
    generateReference, 
    assignTask, 
    getTasks, 
    executeTasks, 
    deleteReference,
    verifyNftOwnership,
    getVerificationProof,
    getNftsForPrincipal,
    getTokensForPrincipal,
    getTransactionsForPrincipal
};