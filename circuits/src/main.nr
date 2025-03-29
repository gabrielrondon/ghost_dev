use dep::std;

// Error types for better error handling
enum CircuitError {
    InvalidDepth,
    InvalidBalance,
    InvalidMerklePath,
    InvalidHash
}

struct CircuitInput {
    // Public inputs
    token_id: Field,
    min_balance: Field,
    merkle_root: Field,
    tree_depth: Field,

    // Private inputs
    wallet_principal: Field,
    actual_balance: Field,
    merkle_path: [Field; 32],
    path_indices: [u8; 32]
}

fn validate_input(input: CircuitInput) -> bool {
    // Validate tree depth
    let depth = input.tree_depth as u8;
    if depth <= 0 || depth > 32 {
        return false;
    }

    // Validate balance with overflow check
    let actual_balance_int = input.actual_balance as u64;
    let min_balance_int = input.min_balance as u64;
    if actual_balance_int < min_balance_int {
        return false;
    }

    // All validations passed
    true
}

pub fn main(input: CircuitInput) -> pub bool {
    // Validate input first
    assert(validate_input(input));

    // Validate tree depth
    let depth = input.tree_depth as u8;
    assert(depth > 0 && depth <= 32);

    // Validate balance with overflow protection
    let actual_balance_int = input.actual_balance as u64;
    let min_balance_int = input.min_balance as u64;
    assert(actual_balance_int >= min_balance_int);

    // Compute leaf with improved gas efficiency
    let leaf = compute_leaf(input.wallet_principal, input.token_id, input.actual_balance);
    
    // Verify Merkle proof with optimized computation
    let computed_root = compute_merkle_root(leaf, input.merkle_path, input.path_indices, depth);
    assert(computed_root == input.merkle_root);
    
    true
}

fn compute_leaf(wallet: Field, token: Field, balance: Field) -> Field {
    // Optimized hash computation for leaf node
    std::hash::poseidon::bn254::hash_3([wallet, token, balance])
}

fn compute_merkle_root(leaf: Field, merkle_path: [Field; 32], path_indices: [u8; 32], depth: u8) -> Field {
    let mut current = leaf;
    
    // Gas-optimized Merkle root computation
    for i in 0..depth {
        // Validate path index
        assert(path_indices[i] == 0 || path_indices[i] == 1);
        
        // Use bit operations for efficiency
        let path_bit = path_indices[i] & 1;
        let (left, right) = if path_bit == 0 {
            (current, merkle_path[i])
        } else {
            (merkle_path[i], current);
        };
        
        current = std::hash::poseidon::bn254::hash_2([left, right]);
    }
    
    current
}

#[test]
fn test_valid_proof() {
    let input = CircuitInput {
        token_id: 1.into(),
        min_balance: 100.into(),
        merkle_root: 123.into(), // Test value
        tree_depth: 32.into(),
        wallet_principal: 456.into(), // Test value
        actual_balance: 200.into(),
        merkle_path: [1.into(); 32], // Test path
        path_indices: [0; 32] // Test indices
    };

    assert(validate_input(input));
    assert(main(input));
}

#[test]
fn test_invalid_balance() {
    let input = CircuitInput {
        token_id: 1.into(),
        min_balance: 200.into(),
        merkle_root: 123.into(),
        tree_depth: 32.into(),
        wallet_principal: 456.into(),
        actual_balance: 100.into(), // Less than min_balance
        merkle_path: [1.into(); 32],
        path_indices: [0; 32]
    };

    assert(!validate_input(input));
}

#[test]
fn test_invalid_depth() {
    let input = CircuitInput {
        token_id: 1.into(),
        min_balance: 100.into(),
        merkle_root: 123.into(),
        tree_depth: 33.into(), // Invalid depth
        wallet_principal: 456.into(),
        actual_balance: 200.into(),
        merkle_path: [1.into(); 32],
        path_indices: [0; 32]
    };

    assert(!validate_input(input));
}

#[test]
fn test_merkle_path_computation() {
    let wallet = 1.into();
    let token = 2.into();
    let balance = 100.into();
    
    let leaf = compute_leaf(wallet, token, balance);
    assert(leaf != 0.into());
    
    let merkle_path = [1.into(); 32];
    let path_indices = [0; 32];
    let depth = 32;
    
    let root = compute_merkle_root(leaf, merkle_path, path_indices, depth);
    assert(root != 0.into());
}
