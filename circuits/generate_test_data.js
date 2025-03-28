const { buildPoseidon } = require('circomlibjs')

async function generateTestData() {
    // Initialize Poseidon
    const poseidon = await buildPoseidon()
    
    // Test inputs
    const collectionId = 1n
    const tokenId = 2n
    const walletPrincipal = 123456789n
    const actualBalance = 200n
    const minBalance = 100n
    
    // Calculate NFT leaf
    const nftLeaf = poseidon([collectionId, tokenId])
    
    // Calculate token leaf
    const tokenLeaf = poseidon([walletPrincipal, actualBalance])
    
    // Generate a simple Merkle tree (depth 2 for demonstration)
    const level1Left = poseidon([nftLeaf, tokenLeaf])
    const level1Right = poseidon([1n, 2n]) // Some random values
    const merkleRoot = poseidon([level1Left, level1Right])
    
    // Convert Field elements to BigInt strings
    function toNoirField(fieldElement) {
        // Convert the field element to a BigInt string
        const fieldStr = BigInt('0x' + Buffer.from(fieldElement).toString('hex')).toString()
        return fieldStr
    }
    
    // Generate NFT Merkle path
    const nftMerklePath = [
        toNoirField(tokenLeaf),    // Sibling at level 0
        toNoirField(level1Right),  // Sibling at level 1
        // Fill remaining with zeros
        ...Array(30).fill("0")
    ]
    
    // Generate token Merkle path
    const tokenMerklePath = [
        toNoirField(nftLeaf),      // Sibling at level 0
        toNoirField(level1Right),  // Sibling at level 1
        // Fill remaining with zeros
        ...Array(30).fill("0")
    ]
    
    // Path indices (0 = left, 1 = right)
    const nftPathIndices = [
        0, // NFT leaf is on the left
        0, // level1Left is on the left
        // Fill remaining with zeros
        ...Array(30).fill(0)
    ]
    
    const tokenPathIndices = [
        1, // Token leaf is on the right
        0, // level1Left is on the left
        // Fill remaining with zeros
        ...Array(30).fill(0)
    ]
    
    // Generate Prover.toml content
    const proverToml = `# Public inputs
collection_id = "${collectionId}"
token_id = "${tokenId}"
min_balance = "${minBalance}"
merkle_root = "${toNoirField(merkleRoot)}"

# Private inputs
wallet_principal = "${walletPrincipal}"
actual_balance = "${actualBalance}"
nft_merkle_path = [
    ${nftMerklePath.map(x => `"${x}"`).join(",\n    ")}
]
nft_path_indices = [
    ${nftPathIndices.join(",\n    ")}
]
token_merkle_path = [
    ${tokenMerklePath.map(x => `"${x}"`).join(",\n    ")}
]
token_path_indices = [
    ${tokenPathIndices.join(",\n    ")}
]`
    
    console.log(proverToml)
}

generateTestData().catch(console.error) 