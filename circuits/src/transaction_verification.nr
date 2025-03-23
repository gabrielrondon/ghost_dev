use dep::std;

// Transaction Verification Circuit
// This circuit verifies that a user has made a specific transaction
// without revealing their wallet address

struct TransactionInput {
    // Public inputs
    transaction_hash: Field,    // The transaction hash
    merkle_root: Field,         // The Merkle root of the transaction tree
    
    // Private inputs
    wallet_address: Field,      // The wallet address (kept private)
    transaction_data: Field,    // Additional transaction data (kept private)
    merkle_path: [Field; 10],   // The Merkle proof path
    merkle_indices: [u8; 10]    // The indices for the Merkle proof
}

// Compute the hash of wallet address and transaction data
fn compute_leaf(wallet: Field, tx_hash: Field, tx_data: Field) -> Field {
    let hash_input = [wallet, tx_hash, tx_data];
    std::hash::poseidon::bn254::hash_3(hash_input)
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
            let hash_input = [computed_hash, path_element];
            computed_hash = std::hash::poseidon::bn254::hash_2(hash_input);
        } else {
            let hash_input = [path_element, computed_hash];
            computed_hash = std::hash::poseidon::bn254::hash_2(hash_input);
        }
    }
    
    computed_hash == merkle_root
}

// Main function that verifies a transaction
fn verify_transaction(input: TransactionInput) -> pub Field {
    // Compute the leaf hash from the wallet address, transaction hash, and data
    let leaf = compute_leaf(
        input.wallet_address, 
        input.transaction_hash, 
        input.transaction_data
    );
    
    // Verify the Merkle proof
    let is_valid = verify_merkle_proof(
        leaf,
        input.merkle_path,
        input.merkle_indices,
        input.merkle_root
    );
    
    // Return 1 if valid, 0 otherwise
    if is_valid {
        1
    } else {
        0
    }
}

// Test function
#[test]
fn test_transaction_verification() {
    // Mock data
    let wallet = Field::from(123456789);
    let tx_hash = Field::from(987654321);
    let tx_data = Field::from(42);
    
    // Compute the leaf
    let leaf = compute_leaf(wallet, tx_hash, tx_data);
    
    // Mock Merkle proof (in a real scenario, this would be generated from the actual tree)
    let merkle_path = [Field::from(1); 10];
    let merkle_indices = [0; 10];
    
    // For testing, we'll set the root to the leaf (simulating a tree with just one node)
    let merkle_root = leaf;
    
    // Create the input
    let input = TransactionInput {
        transaction_hash: tx_hash,
        merkle_root: merkle_root,
        wallet_address: wallet,
        transaction_data: tx_data,
        merkle_path: merkle_path,
        merkle_indices: merkle_indices
    };
    
    // Verify the proof
    let result = verify_transaction(input);
    
    // Assert that the verification succeeds (result should be 1)
    assert(result == 1);
} 