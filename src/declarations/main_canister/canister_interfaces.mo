import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import { throwError } = "./errors";
import Storage = "./storage";

module {
    // NFT canister interface
    public type NFTCanister = actor {
        get_merkle_proof: (Nat64) -> async {
            merkle_root: Nat64;
            merkle_path: [Nat64];
            merkle_indices: [Nat8];
        };
    };
    
    // Token canister interface
    public type TokenCanister = actor {
        get_merkle_proof: (Principal) -> async {
            merkle_root: Nat64;
            merkle_path: [Nat64];
            merkle_indices: [Nat8];
            balance: Nat64;
        };
    };

    // ZK canister interface
    public type ZKCanister = actor {
        verify_attestation: ({
            proof_id: Text;
            attestation: Storage.AttestationData;
        }) -> async Bool;
    };
    
    // Create NFT canister actor
    public func create_nft_canister(principal: Principal) : NFTCanister {
        actor (Principal.toText(principal))
    };
    
    // Create token canister actor
    public func create_token_canister(principal: Principal) : TokenCanister {
        actor (Principal.toText(principal))
    };

    // Create ZK canister actor
    public func create_zk_canister_actor() : ZKCanister {
        actor ("bd3sg-teaaa-aaaaa-qaaba-cai")
    };
} 