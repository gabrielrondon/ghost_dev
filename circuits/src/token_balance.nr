use dep::std;

// Token Balance Verification Circuit
// This circuit verifies that a user has at least a minimum balance of a token
// without revealing their actual balance or wallet address

struct TokenBalanceInput {
    // Public inputs
    token_id: Field,           // The token ID (e.g., ICP, ckBTC)
    minimum_balance: Field,    // The minimum balance required
    merkle_root: Field,        // The Merkle root of the token balance tree
    
    // Private inputs
    wallet_address: Field,     // The wallet address (kept private)
    actual_balance: Field,     // The actual token balance (kept private)
    merkle_path: [Field; 10],  // The Merkle proof path
    merkle_indices: [u8; 10]   // The indices for the Merkle proof
}

// Compute the hash of wallet address, token ID, and balance
fn compute_leaf(wallet: Field, token: Field, balance: Field) -> Field {
    let hash_input = [wallet, token, balance];
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

// Main function that verifies token balance
fn verify_token_balance(input: TokenBalanceInput) -> Field {
    // Compute the leaf hash from the wallet address, token ID, and balance
    let leaf = compute_leaf(input.wallet_address, input.token_id, input.actual_balance);
    
    // Verify the Merkle proof
    let merkle_valid = verify_merkle_proof(
        leaf,
        input.merkle_path,
        input.merkle_indices,
        input.merkle_root
    );
    
    // Check if the actual balance is greater than or equal to the minimum required
    let balance_valid = input.actual_balance >= input.minimum_balance;
    
    // Return 1 if both conditions are met, 0 otherwise
    if merkle_valid && balance_valid {
        1
    } else {
        0
    }
}

// Test function
#[test]
fn test_token_balance() {
    // Mock data
    let wallet = Field::from(123456789);
    let token = Field::from(987654321);
    let balance = Field::from(1000);
    let min_balance = Field::from(500);
    
    // Compute the leaf
    let leaf = compute_leaf(wallet, token, balance);
    
    // Mock Merkle proof (in a real scenario, this would be generated from the actual tree)
    let merkle_path = [Field::from(1); 10];
    let merkle_indices = [0; 10];
    
    // For testing, we'll set the root to the leaf (simulating a tree with just one node)
    let merkle_root = leaf;
    
    // Create the input
    let input = TokenBalanceInput {
        token_id: token,
        minimum_balance: min_balance,
        merkle_root: merkle_root,
        wallet_address: wallet,
        actual_balance: balance,
        merkle_path: merkle_path,
        merkle_indices: merkle_indices
    };
    
    // Verify the proof
    let result = verify_token_balance(input);
    
    // Assert that the verification succeeds (result should be 1)
    assert(result == 1);
    
    // Test with insufficient balance
    let input_insufficient = TokenBalanceInput {
        token_id: token,
        minimum_balance: Field::from(2000), // Higher than the actual balance
        merkle_root: merkle_root,
        wallet_address: wallet,
        actual_balance: balance,
        merkle_path: merkle_path,
        merkle_indices: merkle_indices
    };
    
    // Verify the proof
    let result_insufficient = verify_token_balance(input_insufficient);
    
    // Assert that the verification fails (result should be 0)
    assert(result_insufficient == 0);
} 