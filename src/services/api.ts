import { v4 as uuidv4 } from 'uuid';
import type { Task, WalletVerificationRequest, VerificationResult, InternetComputerNft } from '@/types';
import type { ICPToken, ICPTransaction } from '@/lib/wallet';
import type { NFTCanister } from '@/declarations/interfaces'
import { nftCanisterInterface } from '@/declarations/interfaces'
import { Actor, HttpAgent } from '@dfinity/agent'

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
    id: 'icp-1',
    symbol: 'ICP',
    amount: '15.75',
    decimals: 8,
    name: 'Internet Computer',
    balance: '15750000000'
  },
  {
    id: 'ckbtc-1',
    symbol: 'ckBTC',
    amount: '0.025',
    decimals: 8,
    name: 'Chain Key Bitcoin',
    balance: '2500000'
  },
  {
    id: 'chat-1',
    symbol: 'CHAT',
    amount: '1250',
    decimals: 8,
    name: 'DFINITY Chat Token',
    balance: '125000000000'
  }
];

// Sample ICP transactions for testing
const sampleTransactions: ICPTransaction[] = [
  {
    id: 'tx-1',
    type: 'send',
    amount: '100',
    token: 'ICP',
    timestamp: Date.now().toString(),
    blockHeight: '12345',
    from: 'principal-123',
    to: 'principal-456',
    status: 'completed'
  },
  {
    id: 'tx-2',
    type: 'receive',
    amount: '50',
    token: 'ICP',
    timestamp: Date.now().toString(),
    blockHeight: '12346',
    from: 'principal-789',
    to: 'principal-123',
    status: 'completed'
  }
];

// Add sample data to mock storage
mockIcpNfts.set('principal-123', sampleNfts);
mockIcpTokens.set('principal-123', sampleTokens);
mockIcpTransactions.set('principal-123', sampleTransactions);

const MOCK_DELAY = 1000; // Simulated network delay

async function generateReference(): Promise<string> {
  return Math.random().toString(36).substring(2)
}

async function getNFTCanister(canisterId: string): Promise<NFTCanister> {
    const agent = new HttpAgent()
    if (process.env.NODE_ENV !== 'production') {
        await agent.fetchRootKey()
    }
    return Actor.createActor(nftCanisterInterface, { agent, canisterId })
}

async function verifyNftOwnership(
    request: WalletVerificationRequest,
    proofId: string,
    anonymousReference: string
): Promise<VerificationResult> {
    // Check required fields
    if (!request.walletAddress) throw new Error('Wallet address is required')
    if (!request.itemId) throw new Error('Item ID is required')
    if (request.chainId !== 'icp') throw new Error('Invalid chain ID')

    // Parse itemId to get canisterId and nftIndex
    const [canisterId, nftIndexStr] = request.itemId.split(':')
    if (!canisterId || !nftIndexStr) throw new Error('Invalid item ID format')
    
    const nftIndex = parseInt(nftIndexStr, 10)
    if (isNaN(nftIndex)) throw new Error('Invalid NFT index')

    try {
        const nftCanister = await getNFTCanister(canisterId)
        const ownerResult = await nftCanister.ownerOf(nftIndex)
        if ('err' in ownerResult) throw new Error(ownerResult.err)
        if (ownerResult.ok.toString() !== request.walletAddress) throw new Error('NFT not owned by wallet')

        const metadata = await nftCanister.tokenMetadata(nftIndex)
        
        return {
            isVerified: true,
            proofId,
            timestamp: Date.now(),
            anonymousReference,
            walletAddress: request.walletAddress,
            chainId: request.chainId,
            itemType: 'nft',
            itemId: request.itemId,
            nftContractAddress: canisterId,
            nftIndex,
            nftName: metadata.name,
            nftImageUrl: metadata.image || undefined,
            principal: request.walletAddress
        }
    } catch (error) {
        console.error('NFT verification error:', error)
        throw new Error('Failed to verify NFT ownership')
    }
}

function generateProofId(): string {
  return `proof-${Date.now()}-${Math.random().toString(36).substring(2)}`
}

function generateAnonymousRef(): string {
  return `anon-${Date.now()}-${Math.random().toString(36).substring(2)}`
}

function generateMerklePath(principal: bigint, tokenId: bigint): bigint[] {
  // In production, this would fetch the actual Merkle path from the canister
  // For now, we generate a simple path for testing
  return [principal, tokenId, BigInt(0), BigInt(0)]
}

function generateMerkleIndices(): number[] {
  // In production, this would be based on the actual Merkle tree structure
  // For now, we return a simple array for testing
  return [0, 1, 2, 3]
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

async function verifyToken(
    request: WalletVerificationRequest, 
    proofId: string, 
    anonymousReference: string
): Promise<VerificationResult> {
    // Get token details if available
    let tokenSymbol: string | undefined;
    let tokenName: string | undefined;
    let tokenAmount: string | undefined;
    
    if (request.itemId && request.chainId === 'icp' && mockIcpTokens.has('principal-123')) {
        const tokens = mockIcpTokens.get('principal-123') || [];
        const token = tokens.find(t => t.symbol === request.itemId);
        if (token) {
            tokenSymbol = token.symbol;
            tokenName = token.name;
            tokenAmount = token.amount.toString();
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
        itemId: request.itemId || '',
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
    // Validate required fields
    if (!request.walletAddress) {
        throw new Error('Wallet address is required');
    }

    const itemId = request.itemId || `tx-${Date.now()}`; // Generate a fallback ID if none provided
    const timestamp = Date.now();

    // Initialize result with required fields
    const result: VerificationResult = {
        isVerified: true, // For testing purposes
        proofId,
        timestamp,
        anonymousReference,
        walletAddress: request.walletAddress,
        chainId: request.chainId,
        itemType: 'transaction',
        itemId
    };
    
    if (request.chainId === 'icp' && mockIcpTransactions.has('principal-123')) {
        const transactions = mockIcpTransactions.get('principal-123') || [];
        const transaction = transactions.find(t => t.id === itemId);
        if (transaction) {
            result.transactionType = transaction.type;
            result.transactionAmount = transaction.amount;
            result.transactionToken = transaction.token;
            result.transactionTimestamp = parseInt(transaction.timestamp);
        }
    }
    
    // Add principal for ICP chain
    if (request.chainId === 'icp') {
        result.principal = request.walletAddress;
    }
    
    return result;
}

async function verifyGovernance(
    request: WalletVerificationRequest, 
    proofId: string, 
    anonymousReference: string
): Promise<VerificationResult> {
    // Validate required fields
    if (!request.walletAddress) {
        throw new Error('Wallet address is required');
    }

    const itemId = request.itemId || `gov-${Date.now()}`; // Generate a fallback ID if none provided
    const timestamp = Date.now();

    // Initialize result with required fields
    const result: VerificationResult = {
        isVerified: true, // For testing purposes
        proofId,
        timestamp,
        anonymousReference,
        walletAddress: request.walletAddress,
        chainId: request.chainId,
        itemType: 'governance',
        itemId,
        proposalId: itemId,
        voteType: request.additionalData?.voteType as 'yes' | 'no' | 'abstain' || 'yes'
    };
    
    // Add principal for ICP chain
    if (request.chainId === 'icp') {
        result.principal = request.walletAddress;
    }
    
    return result;
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

// Mock implementations for testing
export function connectWallet() {
    return Promise.resolve({
        principal: 'test-principal',
        accountId: 'test-account'
    })
}

export function disconnectWallet() {
    return Promise.resolve()
}

export function getCurrentWalletInfo() {
    return {
        principal: 'test-principal',
        accountId: 'test-account'
    }
}

export { 
    assignTask, 
    getTasks, 
    executeTasks, 
    deleteReference,
    getVerificationProof,
    getNftsForPrincipal,
    getTokensForPrincipal,
    getTransactionsForPrincipal,
    verifyNftOwnership,
    verifyToken,
    verifyTransaction,
    verifyGovernance,
    generateProofId,
    generateAnonymousRef,
    generateMerklePath,
    generateMerkleIndices,
    generateReference
};