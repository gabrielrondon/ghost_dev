use dep::std;

// Governance Verification Circuit
// This circuit verifies that a user has participated in governance
// without revealing their wallet address

struct GovernanceInput {
    // Public inputs
    proposal_id: Field,        // The proposal ID
    vote_option: Field,        // The vote option (1 = yes, 2 = no, 3 = abstain)
    merkle_root: Field,        // The Merkle root of the governance participation tree
    
    // Private inputs
    wallet_address: Field,     // The wallet address (kept private)
    voting_power: Field,       // The voting power used (kept private)
    merkle_path: [Field; 10],  // The Merkle proof path
    merkle_indices: [u8; 10]   // The indices for the Merkle proof
}

// Compute the hash of wallet address, proposal ID, vote option, and voting power
fn compute_leaf(wallet: Field, proposal: Field, vote: Field, power: Field) -> Field {
    // We need to hash 4 fields, but poseidon hash functions in std only support up to 3 inputs
    // So we'll do a two-step hashing
    let hash_input1 = [wallet, proposal, vote];
    let hash1 = std::hash::poseidon::bn254::hash_3(hash_input1);
    
    let hash_input2 = [hash1, power];
    std::hash::poseidon::bn254::hash_2(hash_input2)
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

// Main function that verifies governance participation
fn verify_governance(input: GovernanceInput) -> pub Field {
    // Compute the leaf hash
    let leaf = compute_leaf(
        input.wallet_address,
        input.proposal_id,
        input.vote_option,
        input.voting_power
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
fn test_governance_verification() {
    // Mock data
    let wallet = Field::from(123456789);
    let proposal = Field::from(987654321);
    let vote = Field::from(1); // Yes vote
    let power = Field::from(100); // Voting power
    
    // Compute the leaf
    let leaf = compute_leaf(wallet, proposal, vote, power);
    
    // Mock Merkle proof (in a real scenario, this would be generated from the actual tree)
    let merkle_path = [Field::from(1); 10];
    let merkle_indices = [0; 10];
    
    // For testing, we'll set the root to the leaf (simulating a tree with just one node)
    let merkle_root = leaf;
    
    // Create the input
    let input = GovernanceInput {
        proposal_id: proposal,
        vote_option: vote,
        merkle_root: merkle_root,
        wallet_address: wallet,
        voting_power: power,
        merkle_path: merkle_path,
        merkle_indices: merkle_indices
    };
    
    // Verify the proof
    let result = verify_governance(input);
    
    // Assert that the verification succeeds (result should be 1)
    assert(result == 1);
} 