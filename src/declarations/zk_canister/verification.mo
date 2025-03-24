import Array "mo:base/Array";
import Nat64 "mo:base/Nat64";
import Nat8 "mo:base/Nat8";
import { throwError } = "./errors";
import { validate_input } = "./circuit";

module {
    // Verify a merkle path
    private func verify_merkle_path(
        leaf: Nat64,
        path: [Nat64],
        indices: [Nat8],
        root: Nat64
    ) : Bool {
        var current = leaf;
        for (i in Iter.range(0, Array.size(path) - 1)) {
            let sibling = path[i];
            let index = indices[i];
            if (index == 0) {
                current := hash_pair(current, sibling);
            } else {
                current := hash_pair(sibling, current);
            };
        };
        current == root
    };
    
    // Hash a pair of field elements
    private func hash_pair(a: Nat64, b: Nat64) : Nat64 {
        // This is a placeholder for the actual hash function
        // In a real implementation, this would use a cryptographic hash function
        // that maps two field elements to a single field element
        (a + b) % (2 ** 254)
    };
    
    // Verify NFT ownership
    private func verify_nft_ownership(
        collection_id: Nat64,
        token_id: Nat64,
        merkle_root: Nat64,
        merkle_path: [Nat64],
        merkle_indices: [Nat8]
    ) : Bool {
        let leaf = hash_pair(collection_id, token_id);
        verify_merkle_path(leaf, merkle_path, merkle_indices, merkle_root)
    };
    
    // Verify token balance
    private func verify_token_balance(
        token_canister_id: Nat64,
        wallet_principal: Nat64,
        minimum_balance: Nat64,
        merkle_root: Nat64,
        merkle_path: [Nat64],
        merkle_indices: [Nat8],
        actual_balance: Nat64
    ) : Bool {
        let leaf = hash_pair(token_canister_id, hash_pair(wallet_principal, actual_balance));
        verify_merkle_path(leaf, merkle_path, merkle_indices, merkle_root)
    };
    
    // Main verification function
    public func verify_proof(input: {
        collection_id: Nat64;
        token_id: Nat64;
        token_canister_id: Nat64;
        minimum_balance: Nat64;
        merkle_root: Nat64;
        wallet_principal: Nat64;
        nft_merkle_path: [Nat64];
        nft_merkle_indices: [Nat8];
        token_merkle_path: [Nat64];
        token_merkle_indices: [Nat8];
        actual_balance: Nat64;
    }) : Bool {
        // Validate input parameters
        validate_input(input);
        
        // Verify NFT ownership
        let nft_verified = verify_nft_ownership(
            input.collection_id,
            input.token_id,
            input.merkle_root,
            input.nft_merkle_path,
            input.nft_merkle_indices
        );
        
        if (not nft_verified) {
            throwError(#VerificationError("NFT ownership verification failed"));
        };
        
        // Verify token balance
        let balance_verified = verify_token_balance(
            input.token_canister_id,
            input.wallet_principal,
            input.minimum_balance,
            input.merkle_root,
            input.token_merkle_path,
            input.token_merkle_indices,
            input.actual_balance
        );
        
        if (not balance_verified) {
            throwError(#VerificationError("Token balance verification failed"));
        };
        
        true
    };
} 