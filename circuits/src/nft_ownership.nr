use dep::std;

// NFT Ownership Verification Circuit
// This circuit verifies that a user owns a specific NFT without revealing their wallet address

struct NFTOwnershipInput {
    // Public inputs
    collection_id: pub Field, // The NFT collection ID (canister ID for ICP)
    token_id: pub Field,      // The NFT token ID
    merkle_root: pub Field,   // The Merkle root of the NFT ownership tree
    
    // Private inputs
    wallet_address: Field,    // The wallet address of the owner (kept private)
    merkle_path: [Field; 10], // The Merkle proof path
    merkle_indices: [u8; 10]  // The indices for the Merkle proof
}

// Compute the hash of wallet address, collection ID, and token ID
fn compute_leaf(wallet: Field, collection: Field, token: Field) -> Field {
    let mut hash_input = [wallet, collection, token];
    std::hash::poseidon::bn254::hash_2(hash_input)
}

// Verify a Merkle proof
fn verify_merkle_proof(
    leaf: Field,
    merkle_path: [Field; 10],
    merkle_indices: [u8; 10],
    merkle_root: Field
) -> bool {
    let mut computed_hash = leaf;
    
    for i in 0..10 {
        let path_element = merkle_path[i];
        
        // If index is 0, the path element is on the right
        // If index is 1, the path element is on the left
        if merkle_indices[i] == 0 {
            let mut hash_input = [computed_hash, path_element];
            computed_hash = std::hash::poseidon::bn254::hash_2(hash_input);
        } else {
            let mut hash_input = [path_element, computed_hash];
            computed_hash = std::hash::poseidon::bn254::hash_2(hash_input);
        }
    }
    
    computed_hash == merkle_root
}

// Main function that verifies NFT ownership
fn verify_nft_ownership(input: NFTOwnershipInput) -> pub bool {
    // Compute the leaf hash from the wallet address and NFT details
    let leaf = compute_leaf(input.wallet_address, input.collection_id, input.token_id);
    
    // Verify the Merkle proof
    let is_valid = verify_merkle_proof(
        leaf,
        input.merkle_path,
        input.merkle_indices,
        input.merkle_root
    );
    
    // Return true if the proof is valid
    is_valid
}

// Test function
#[test]
fn test_nft_ownership() {
    // This is a simplified test - in a real implementation, you would
    // generate actual Merkle proofs based on real NFT ownership data
    
    // Mock data
    let wallet = Field::from(123456789);
    let collection = Field::from(987654321);
    let token = Field::from(42);
    
    // Compute the leaf
    let leaf = compute_leaf(wallet, collection, token);
    
    // Mock Merkle proof (in a real scenario, this would be generated from the actual tree)
    let merkle_path = [Field::from(1); 10];
    let merkle_indices = [0; 10];
    
    // For testing, we'll set the root to the leaf (simulating a tree with just one node)
    let merkle_root = leaf;
    
    // Create the input
    let input = NFTOwnershipInput {
        collection_id: collection,
        token_id: token,
        merkle_root: merkle_root,
        wallet_address: wallet,
        merkle_path: merkle_path,
        merkle_indices: merkle_indices
    };
    
    // Verify the proof
    let result = verify_nft_ownership(input);
    
    // Assert that the verification succeeds
    assert(result);
} 