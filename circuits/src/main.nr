use dep::std;

struct CircuitInput {
    // Public inputs
    collection_id: Field,
    token_id: Field,
    min_balance: Field,
    merkle_root: Field,

    // Private inputs
    wallet_principal: Field,
    actual_balance: Field,
    nft_merkle_path: [Field; 32],
    nft_path_indices: [u8; 32],
    token_merkle_path: [Field; 32],
    token_path_indices: [u8; 32]
}

fn main(input: CircuitInput) {
    let actual_balance_int = input.actual_balance as u64;
    let min_balance_int = input.min_balance as u64;
    assert(actual_balance_int >= min_balance_int);

    let nft_leaf = std::hash::poseidon::bn254::hash_2([input.collection_id, input.token_id]);
    let token_leaf = std::hash::poseidon::bn254::hash_2([input.wallet_principal, input.actual_balance]);

    let computed_nft_root = compute_merkle_root(nft_leaf, input.nft_merkle_path, input.nft_path_indices);
    let computed_token_root = compute_merkle_root(token_leaf, input.token_merkle_path, input.token_path_indices);

    assert(computed_nft_root == input.merkle_root);
    assert(computed_token_root == input.merkle_root);
}

fn compute_merkle_root(leaf: Field, merkle_path: [Field; 32], path_indices: [u8; 32]) -> Field {
    let mut current = leaf;
    for i in 0..2 {
        std::println(current);
        std::println(merkle_path[i]);
        std::println(path_indices[i]);
        
        if path_indices[i] == 0 {
            current = std::hash::poseidon::bn254::hash_2([current, merkle_path[i]]);
        } else {
            current = std::hash::poseidon::bn254::hash_2([merkle_path[i], current]);
        }
        std::println(current);
    }
    current
}

#[test]
fn test_main() {
    let collection_id = 1;
    let token_id = 2;
    let wallet_principal = 123456789;
    let actual_balance = 200;
    let min_balance = 100;
    
    // Compute the leaves
    let nft_leaf = std::hash::poseidon::bn254::hash_2([collection_id, token_id]);
    let token_leaf = std::hash::poseidon::bn254::hash_2([wallet_principal, actual_balance]);
    
    std::println(nft_leaf);
    std::println(token_leaf);
    
    // Compute the Merkle tree
    let level1_left = std::hash::poseidon::bn254::hash_2([nft_leaf, token_leaf]);
    let level1_right = std::hash::poseidon::bn254::hash_2([1, 2]); // Same random values as JS
    let merkle_root = std::hash::poseidon::bn254::hash_2([level1_left, level1_right]);
    
    std::println(level1_left);
    std::println(level1_right);
    std::println(merkle_root);

    // Set up NFT Merkle path
    let mut nft_merkle_path: [Field; 32] = [0; 32];
    nft_merkle_path[0] = token_leaf;    // Sibling at level 0
    nft_merkle_path[1] = level1_right;  // Sibling at level 1

    // Set up token Merkle path
    let mut token_merkle_path: [Field; 32] = [0; 32];
    token_merkle_path[0] = nft_leaf;     // Sibling at level 0
    token_merkle_path[1] = level1_right; // Sibling at level 1

    // Path indices from Prover.toml
    let mut nft_path_indices: [u8; 32] = [0; 32];
    nft_path_indices[0] = 0; // NFT leaf is on the left
    nft_path_indices[1] = 0; // level1_left is on the left

    let mut token_path_indices: [u8; 32] = [0; 32];
    token_path_indices[0] = 1; // Token leaf is on the right
    token_path_indices[1] = 0; // level1_left is on the left

    let input = CircuitInput {
        collection_id,
        token_id,
        wallet_principal,
        actual_balance,
        min_balance,
        merkle_root,
        nft_merkle_path,
        nft_path_indices,
        token_merkle_path,
        token_path_indices
    };

    main(input);
}
