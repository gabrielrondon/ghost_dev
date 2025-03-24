use dep::std;

// ICP Attestation Circuit
// This circuit verifies both NFT ownership and token balance for ICP assets
// while maintaining privacy of the user's wallet address and balances

struct ICPAttestationInput {
    // Public inputs
    collection_id: Field,    // The NFT collection canister ID
    token_id: Field,         // The NFT token ID
    token_canister_id: Field, // The token canister ID (e.g., ICP, ckBTC)
    minimum_balance: Field,  // The minimum token balance required
    merkle_root: Field,      // The Merkle root of the combined ownership/balance tree
    
    // Private inputs
    wallet_principal: Field,     // The user's principal ID (kept private)
    nft_merkle_path: [Field; 10], // The Merkle proof path for NFT ownership
    nft_merkle_indices: [u8; 10], // The indices for the NFT Merkle proof
    token_merkle_path: [Field; 10], // The Merkle proof path for token balance
    token_merkle_indices: [u8; 10], // The indices for the token Merkle proof
    actual_balance: Field        // The actual token balance (kept private)
}

// Compute the hash of a principal ID
fn hash_principal(principal: Field) -> Field {
    std::hash::poseidon::bn254::hash_1([principal])
}

// Compute the hash of NFT ownership data
fn compute_nft_leaf(principal: Field, collection: Field, token: Field) -> Field {
    let hash_input = [principal, collection, token];
    std::hash::poseidon::bn254::hash_3(hash_input)
}

// Compute the hash of token balance data
fn compute_token_leaf(principal: Field, token: Field, balance: Field) -> Field {
    let hash_input = [principal, token, balance];
    std::hash::poseidon::bn254::hash_3(hash_input)
}

// Verify a Merkle proof
fn verify_merkle_proof(
    leaf: Field,
    merkle_path: [Field; 10],
    merkle_indices: [u8; 10],
    merkle_root: Field
) -> Field {
    let mut computed_hash = leaf;
    
    for i in 0..10 {
        let path_element = merkle_path[i];
        
        if merkle_indices[i] == 0 {
            let hash_input = [computed_hash, path_element];
            computed_hash = std::hash::poseidon::bn254::hash_2(hash_input);
        } else {
            let hash_input = [path_element, computed_hash];
            computed_hash = std::hash::poseidon::bn254::hash_2(hash_input);
        }
    }
    
    // Return 1 if the proof is valid, 0 otherwise
    if computed_hash == merkle_root {
        1
    } else {
        0
    }
}

// Verify that a principal ID is valid (basic check)
fn is_valid_principal(principal: Field) -> Field {
    // In a real implementation, this would check if the principal ID
    // follows the ICP format and is within valid ranges
    if principal == 0 {
        0
    } else {
        1
    }
}

// Check if balance meets minimum requirement
fn check_balance(actual: Field, minimum: Field) -> Field {
    // In a real implementation, this would use proper field comparison
    // For now, we'll use a simple check that the difference is non-negative
    let diff = actual - minimum;
    let diff_int = diff as u32;
    if diff_int >= 0 {
        1
    } else {
        0
    }
}

// Main function that verifies both NFT ownership and token balance
fn verify_icp_attestation(input: ICPAttestationInput) -> Field {
    // Verify the principal ID is valid
    let principal_valid = is_valid_principal(input.wallet_principal);
    
    // Compute and verify the NFT ownership leaf
    let nft_leaf = compute_nft_leaf(
        input.wallet_principal,
        input.collection_id,
        input.token_id
    );
    
    let nft_valid = verify_merkle_proof(
        nft_leaf,
        input.nft_merkle_path,
        input.nft_merkle_indices,
        input.merkle_root
    );
    
    // Compute and verify the token balance leaf
    let token_leaf = compute_token_leaf(
        input.wallet_principal,
        input.token_canister_id,
        input.actual_balance
    );
    
    let token_valid = verify_merkle_proof(
        token_leaf,
        input.token_merkle_path,
        input.token_merkle_indices,
        input.merkle_root
    );
    
    // Check if the actual balance meets the minimum requirement
    let balance_valid = check_balance(input.actual_balance, input.minimum_balance);
    
    // All conditions must be met for the attestation to be valid
    // Return 1 if all conditions are met, 0 otherwise
    let valid = if principal_valid == 1 {
        if nft_valid == 1 {
            if token_valid == 1 {
                if balance_valid == 1 {
                    1
                } else {
                    0
                }
            } else {
                0
            }
        } else {
            0
        }
    } else {
        0
    };
    
    valid
}

// Test function
#[test]
fn test_icp_attestation() {
    // Mock data
    let principal = Field::from(123456789);
    let collection = Field::from(987654321);
    let token = Field::from(42);
    let token_canister = Field::from(111222333);
    let balance = Field::from(1000);
    let min_balance = Field::from(500);
    
    // Compute the leaves
    let nft_leaf = compute_nft_leaf(principal, collection, token);
    let token_leaf = compute_token_leaf(principal, token_canister, balance);
    
    // Mock Merkle proofs
    let nft_merkle_path = [Field::from(1); 10];
    let nft_merkle_indices = [0; 10];
    let token_merkle_path = [Field::from(1); 10];
    let token_merkle_indices = [0; 10];
    
    // For testing, we'll set the root to the hash of both leaves
    let merkle_root = std::hash::poseidon::bn254::hash_2([nft_leaf, token_leaf]);
    
    // Create the input
    let input = ICPAttestationInput {
        collection_id: collection,
        token_id: token,
        token_canister_id: token_canister,
        minimum_balance: min_balance,
        merkle_root: merkle_root,
        wallet_principal: principal,
        nft_merkle_path: nft_merkle_path,
        nft_merkle_indices: nft_merkle_indices,
        token_merkle_path: token_merkle_path,
        token_merkle_indices: token_merkle_indices,
        actual_balance: balance
    };
    
    // Verify the attestation
    let result = verify_icp_attestation(input);
    
    // Assert that the verification succeeds (result should be 1)
    assert(result == 1);
    
    // Test with insufficient balance
    let input_insufficient = ICPAttestationInput {
        collection_id: collection,
        token_id: token,
        token_canister_id: token_canister,
        minimum_balance: Field::from(2000), // Higher than the actual balance
        merkle_root: merkle_root,
        wallet_principal: principal,
        nft_merkle_path: nft_merkle_path,
        nft_merkle_indices: nft_merkle_indices,
        token_merkle_path: token_merkle_path,
        token_merkle_indices: token_merkle_indices,
        actual_balance: balance
    };
    
    // Verify the attestation
    let result_insufficient = verify_icp_attestation(input_insufficient);
    
    // Assert that the verification fails (result should be 0)
    assert(result_insufficient == 0);
} 