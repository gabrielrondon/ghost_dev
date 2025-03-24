import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Nat8 "mo:base/Nat8";
import { throwError } = "./errors";
import { verify_proof } = "./verification";

actor {
    // Verify a proof of NFT ownership and token balance
    public func verify_attestation(input: {
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
    }) : async Bool {
        try {
            verify_proof(input)
        } catch (e) {
            throwError(#InternalError("Verification failed: " # Error.message(e)))
        }
    };
    
    // Get the canister's principal
    public func get_canister_principal() : async Principal {
        Principal.fromActor(actor {})
    };
} 