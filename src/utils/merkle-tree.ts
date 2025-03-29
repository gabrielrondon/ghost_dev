import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'

export interface MerkleNode {
  hash: Uint8Array
  left?: MerkleNode
  right?: MerkleNode
}

export interface MerkleProof {
  path: Uint8Array[]
  indices: number[]
}

export interface TokenBalance {
  tokenId: bigint
  balance: bigint
  ownerHash: Uint8Array
  metadata?: Uint8Array
}

export function hashTokenBalance({ tokenId, balance, ownerHash, metadata = new Uint8Array() }: TokenBalance): Uint8Array {
  // Concatenate all fields into a single byte array
  const tokenIdBytes = new Uint8Array(8)
  const balanceBytes = new Uint8Array(8)
  
  // Convert bigint to bytes
  for (let i = 0; i < 8; i++) {
    tokenIdBytes[7 - i] = Number((tokenId >> BigInt(i * 8)) & BigInt(255))
    balanceBytes[7 - i] = Number((balance >> BigInt(i * 8)) & BigInt(255))
  }

  const combined = new Uint8Array(tokenIdBytes.length + balanceBytes.length + ownerHash.length + metadata.length)
  combined.set(tokenIdBytes, 0)
  combined.set(balanceBytes, tokenIdBytes.length)
  combined.set(ownerHash, tokenIdBytes.length + balanceBytes.length)
  combined.set(metadata, tokenIdBytes.length + balanceBytes.length + ownerHash.length)

  return sha256(combined)
}

export function buildMerkleTree(balances: TokenBalance[]): MerkleNode {
  // Hash all token balances
  const leaves = balances.map(balance => ({
    hash: hashTokenBalance(balance)
  }))

  // If no leaves, return empty hash
  if (leaves.length === 0) {
    return { hash: sha256(new Uint8Array()) }
  }

  // Build tree bottom-up
  let currentLevel = leaves
  while (currentLevel.length > 1) {
    const nextLevel: MerkleNode[] = []
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left

      // Concatenate and hash the child hashes
      const combined = new Uint8Array(left.hash.length + right.hash.length)
      combined.set(left.hash, 0)
      combined.set(right.hash, left.hash.length)
      
      nextLevel.push({
        hash: sha256(combined),
        left,
        right
      })
    }
    currentLevel = nextLevel
  }

  return currentLevel[0]
}

export function generateMerkleProof(tree: MerkleNode, targetHash: Uint8Array): MerkleProof | null {
  const path: Uint8Array[] = []
  const indices: number[] = []

  function traverse(node: MerkleNode, targetHash: Uint8Array): boolean {
    // If leaf node, check if it's our target
    if (!node.left && !node.right) {
      return bytesToHex(node.hash) === bytesToHex(targetHash)
    }

    // Check left subtree
    if (node.left && traverse(node.left, targetHash)) {
      if (node.right) {
        path.push(node.right.hash)
        indices.push(1)
      }
      return true
    }

    // Check right subtree
    if (node.right && traverse(node.right, targetHash)) {
      path.push(node.left!.hash)
      indices.push(0)
      return true
    }

    return false
  }

  if (traverse(tree, targetHash)) {
    return { path, indices }
  }

  return null
}

export function verifyMerkleProof(
  proof: MerkleProof,
  targetHash: Uint8Array,
  rootHash: Uint8Array
): boolean {
  let currentHash = targetHash

  for (let i = 0; i < proof.path.length; i++) {
    const proofElement = proof.path[i]
    const index = proof.indices[i]

    // Concatenate hashes in the correct order
    const combined = new Uint8Array(currentHash.length + proofElement.length)
    if (index === 0) {
      combined.set(proofElement, 0)
      combined.set(currentHash, proofElement.length)
    } else {
      combined.set(currentHash, 0)
      combined.set(proofElement, currentHash.length)
    }

    currentHash = sha256(combined)
  }

  return bytesToHex(currentHash) === bytesToHex(rootHash)
} 