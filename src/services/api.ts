import { v4 as uuidv4 } from 'uuid';
import type { Task, WalletVerificationRequest, VerificationResult, InternetComputerNft, VerifiableItemType, WalletInfo } from '@/types';
import type { ICPToken, ICPTransaction } from '@/lib/wallet';
import { canisterService } from './canister'
import { Principal } from '@dfinity/principal'
import type { NFTCanister, ZKCanister } from '@/declarations/interfaces'
import { nftCanisterInterface, zkCanisterInterface } from '@/declarations/interfaces'

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

const MOCK_DELAY = 1000; // Simulated network delay

async function generateReference(): Promise<string> {
  return Math.random().toString(36).substring(2)
}

function generateMerkleProof(items: bigint[]): { path: bigint[], indices: number[] } {
  // This is a simplified Merkle proof generation
  // In production, this would be replaced with actual Merkle tree computation
  return {
    path: items.map(x => x + BigInt(1)), // Dummy path
    indices: Array.from({ length: items.length }, (_, i) => i)
  }
}

async function verifyNftOwnership(request: WalletVerificationRequest): Promise<VerificationResult> {
  if (!request.itemId) {
    throw new Error("NFT ID is required for verification")
  }

  // Parse the NFT contract address and index
  const [canisterId, indexStr] = request.itemId.split('-')
  if (!canisterId || !indexStr) {
    throw new Error("Invalid NFT ID format. Expected format: canisterId-index")
  }

  const nftIndex = parseInt(indexStr, 10)
  if (isNaN(nftIndex)) {
    throw new Error("Invalid NFT index")
  }

  try {
    // Get the NFT data from the canister
    const nftCanister = await window.ic?.plug?.createActor<NFTCanister>({
      canisterId,
      interfaceFactory: nftCanisterInterface
    })

    if (!nftCanister) {
      throw new Error("Failed to connect to NFT canister")
    }

    // Verify NFT ownership
    const ownerResult = await nftCanister.ownerOf(nftIndex)
    if ('err' in ownerResult) {
      throw new Error(ownerResult.err || "Failed to verify NFT ownership")
    }

    const ownerPrincipal = ownerResult.ok
    const requestPrincipal = Principal.fromText(request.walletAddress)

    if (ownerPrincipal.toString() !== requestPrincipal.toString()) {
      return {
        isVerified: false,
        proofId: generateProofId(),
        timestamp: Date.now(),
        anonymousReference: generateAnonymousRef(),
        walletAddress: request.walletAddress,
        chainId: request.chainId as 'icp' | 'eth',
        itemType: 'nft',
        itemId: request.itemId,
        nftContractAddress: canisterId,
        nftIndex,
        principal: request.chainId === 'icp' ? request.walletAddress : undefined
      }
    }

    // Get NFT metadata
    const metadata = await nftCanister.tokenMetadata(nftIndex)
    const nftName = metadata.name || `NFT #${nftIndex}`
    const nftImageUrl = metadata.image || undefined

    // Generate ZK proof
    const principalBytes = requestPrincipal.toUint8Array()
    const principalHex = Array.from(principalBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const principalBigInt = BigInt('0x' + principalHex)

    // Prepare input for the ZK circuit
    const input = {
      nft_merkle_path: generateMerklePath(principalBigInt, BigInt(nftIndex)),
      minimum_balance: BigInt(0),
      token_id: BigInt(nftIndex),
      collection_id: BigInt('0x' + canisterId),
      wallet_principal: principalBigInt,
      token_canister_id: BigInt(0),
      merkle_root: BigInt(0),
      nft_merkle_indices: generateMerkleIndices(),
      token_merkle_path: [],
      actual_balance: BigInt(1),
      token_merkle_indices: []
    }

    // Generate and verify the proof using the ZK canister
    const zkCanister = await window.ic?.plug?.createActor<ZKCanister>({
      canisterId: process.env.NEXT_PUBLIC_ZK_CANISTER_ID || '',
      interfaceFactory: zkCanisterInterface
    })

    if (!zkCanister) {
      throw new Error("Failed to connect to ZK canister")
    }

    const proofResult = await zkCanister.generateProof(input)
    if ('err' in proofResult) {
      throw new Error(proofResult.err || "Failed to generate proof")
    }

    const verificationResult = await zkCanister.verifyProof(
      proofResult.ok.proof,
      proofResult.ok.publicInputs
    )

    if ('err' in verificationResult) {
      throw new Error(verificationResult.err || "Failed to verify proof")
    }

    // Create and return the verification result
    const result: VerificationResult = {
      isVerified: verificationResult.ok,
      proofId: generateProofId(),
      timestamp: Date.now(),
      anonymousReference: generateAnonymousRef(),
      walletAddress: request.walletAddress,
      chainId: request.chainId as 'icp' | 'eth',
      itemType: 'nft',
      itemId: request.itemId,
      nftContractAddress: canisterId,
      nftIndex,
      nftName,
      nftImageUrl,
      principal: request.chainId === 'icp' ? request.walletAddress : undefined
    }

    // Store the result for later verification
    mockVerificationResults.set(result.proofId, result)

    return result

  } catch (error) {
    console.error('NFT verification failed:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to verify NFT ownership')
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
  // In production, this would be the actual indices in the Merkle tree
  // For now, we return dummy indices for testing
  return [0, 1, 0, 1]
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
            // Add optional transaction fields if available
            if (transaction.hash) {
                result.transactionHash = transaction.hash;
            }
            
            // Map transaction type to allowed values
            switch (transaction.type) {
                case 'send':
                case 'receive':
                case 'mint':
                case 'burn':
                    result.transactionType = transaction.type;
                    break;
                case 'other':
                default:
                    result.transactionType = 'send';
                    break;
            }
            
            result.transactionAmount = transaction.amount.toString();
            result.transactionToken = transaction.token;
            result.transactionTimestamp = transaction.timestamp;
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

// Wallet Connection Functions
export async function connectWallet(chain: string): Promise<WalletInfo | null> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  return {
    address: 'principal-123',
    chainId: 'icp',
    chainName: 'Internet Computer',
    isConnected: true
  };
}

export async function disconnectWallet(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
}

export async function getCurrentWalletInfo(): Promise<WalletInfo | null> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  return {
    address: 'principal-123',
    chainId: 'icp',
    chainName: 'Internet Computer',
    isConnected: true
  };
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