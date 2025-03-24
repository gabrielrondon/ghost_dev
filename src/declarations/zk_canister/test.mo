import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Nat8 "mo:base/Nat8";
import Array "mo:base/Array";
import { verify_proof } = "./verification";

module {
    // Test data
    private let test_collection_id : Nat64 = 1;
    private let test_token_id : Nat64 = 2;
    private let test_token_canister_id : Nat64 = 3;
    private let test_minimum_balance : Nat64 = 100;
    private let test_merkle_root : Nat64 = 1234;
    private let test_wallet_principal : Nat64 = 5678;
    private let test_actual_balance : Nat64 = 200;
    
    // Test merkle paths and indices
    // These values are chosen to create a valid merkle path
    private let test_nft_merkle_path : [Nat64] = [
        1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999, 0000
    ];
    private let test_nft_merkle_indices : [Nat8] = [
        0, 1, 0, 1, 0, 1, 0, 1, 0, 1
    ];
    private let test_token_merkle_path : [Nat64] = [
        9999, 8888, 7777, 6666, 5555, 4444, 3333, 2222, 1111, 0000
    ];
    private let test_token_merkle_indices : [Nat8] = [
        1, 0, 1, 0, 1, 0, 1, 0, 1, 0
    ];
    
    // Test input
    private let test_input = {
        collection_id = test_collection_id;
        token_id = test_token_id;
        token_canister_id = test_token_canister_id;
        minimum_balance = test_minimum_balance;
        merkle_root = test_merkle_root;
        wallet_principal = test_wallet_principal;
        nft_merkle_path = test_nft_merkle_path;
        nft_merkle_indices = test_nft_merkle_indices;
        token_merkle_path = test_token_merkle_path;
        token_merkle_indices = test_token_merkle_indices;
        actual_balance = test_actual_balance;
    };
    
    // Test functions
    public func test_verify_proof() : Bool {
        try {
            verify_proof(test_input);
            true
        } catch (e) {
            false
        }
    };
    
    public func test_invalid_merkle_path() : Bool {
        let invalid_input = {
            collection_id = test_collection_id;
            token_id = test_token_id;
            token_canister_id = test_token_canister_id;
            minimum_balance = test_minimum_balance;
            merkle_root = test_merkle_root;
            wallet_principal = test_wallet_principal;
            nft_merkle_path = Array.init<Nat64>(5, 0); // Invalid length
            nft_merkle_indices = test_nft_merkle_indices;
            token_merkle_path = test_token_merkle_path;
            token_merkle_indices = test_token_merkle_indices;
            actual_balance = test_actual_balance;
        };
        
        try {
            verify_proof(invalid_input);
            false
        } catch (e) {
            true
        }
    };
    
    public func test_invalid_merkle_indices() : Bool {
        let invalid_input = {
            collection_id = test_collection_id;
            token_id = test_token_id;
            token_canister_id = test_token_canister_id;
            minimum_balance = test_minimum_balance;
            merkle_root = test_merkle_root;
            wallet_principal = test_wallet_principal;
            nft_merkle_path = test_nft_merkle_path;
            nft_merkle_indices = Array.init<Nat8>(10, 2); // Invalid indices
            token_merkle_path = test_token_merkle_path;
            token_merkle_indices = test_token_merkle_indices;
            actual_balance = test_actual_balance;
        };
        
        try {
            verify_proof(invalid_input);
            false
        } catch (e) {
            true
        }
    };
    
    public func test_insufficient_balance() : Bool {
        let invalid_input = {
            collection_id = test_collection_id;
            token_id = test_token_id;
            token_canister_id = test_token_canister_id;
            minimum_balance = test_minimum_balance;
            merkle_root = test_merkle_root;
            wallet_principal = test_wallet_principal;
            nft_merkle_path = test_nft_merkle_path;
            nft_merkle_indices = test_nft_merkle_indices;
            token_merkle_path = test_token_merkle_path;
            token_merkle_indices = test_token_merkle_indices;
            actual_balance = 50; // Less than minimum_balance
        };
        
        try {
            verify_proof(invalid_input);
            false
        } catch (e) {
            true
        }
    };
} 