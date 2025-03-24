import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Int "mo:base/Int";
import HashMap "mo:base/HashMap";
import Errors = "./errors";
import Storage = "./storage";
import Logger = "./logger";
import CanisterInterfaces = "./canister_interfaces";
import Metrics = "./metrics";

actor MainCanister {
    // ZK canister interface
    private let zk_canister = CanisterInterfaces.create_zk_canister_actor();
    
    // Initialize storage and logger
    private let storage = HashMap.HashMap<Text, Storage.AttestationData>(0, Text.equal, Text.hash);
    private let logger = Logger.createLogger();
    private let metrics = Metrics.createMetrics();

    // Helper function to fetch NFT merkle proof
    private func fetch_nft_merkle_proof(collection_id: Nat64, token_id: Nat64) : async [{
        index: Nat64;
        value: [Nat8];
    }] {
        let nft_canister = CanisterInterfaces.create_nft_canister(Principal.fromText("bkyz2-fmaaa-aaaaa-qaaaq-cai"));
        let proof = await nft_canister.get_merkle_proof(token_id);
        [{
            index = Nat64.fromNat(0);
            value = proof.merkle_indices;
        }]
    };

    // Helper function to fetch token merkle proof
    private func fetch_token_merkle_proof(token_canister_id: Principal, wallet_principal: Principal) : async [{
        index: Nat64;
        value: [Nat8];
    }] {
        let token_canister = CanisterInterfaces.create_token_canister(token_canister_id);
        let proof = await token_canister.get_merkle_proof(wallet_principal);
        [{
            index = Nat64.fromNat(0);
            value = proof.merkle_indices;
        }]
    };
    
    // Create a new attestation
    public func create_attestation(request: {
        collection_id: Nat64;
        token_id: Nat64;
        token_canister_id: Principal;
        minimum_balance: Nat64;
        wallet_principal: Principal;
    }) : async {
        #Ok: {
            proof_id: Text;
            attestation: Storage.AttestationData;
        };
        #Err: Text;
    } {
        let start_time = Time.now();
        
        // Cleanup expired attestations
        Storage.cleanup_expired_attestations(logger, storage);
        Metrics.record_cleanup(logger, metrics);
        
        // Generate unique proof ID
        let proof_id = generate_proof_id();
        
        // Fetch merkle tree data from NFT and token canisters
        let nft_merkle_proof = await fetch_nft_merkle_proof(request.collection_id, request.token_id);
        let token_merkle_proof = await fetch_token_merkle_proof(request.token_canister_id, request.wallet_principal);
        
        // Store attestation data
        let attestation = {
            collection_id = request.collection_id;
            token_id = request.token_id;
            token_canister_id = request.token_canister_id;
            minimum_balance = request.minimum_balance;
            wallet_principal = request.wallet_principal;
            timestamp = Time.now();
            merkle_proof = nft_merkle_proof;
        };
        
        Storage.store_attestation(logger, storage, proof_id, attestation);
        
        let processing_time = Time.now() - start_time;
        Metrics.record_attestation_creation(logger, metrics, processing_time);
        
        Logger.log(logger, #Info, "Created attestation", ?("Proof ID: " # proof_id));
        
        #Ok({
            proof_id;
            attestation;
        });
    };
    
    // Verify an existing attestation
    public func verify_attestation(proof_id: Text) : async {
        #Ok: Bool;
        #Err: Text;
    } {
        let start_time = Time.now();
        
        // Get attestation data
        let attestation = Storage.get_attestation(logger, storage, proof_id);
        
        switch (attestation) {
            case (null) {
                Metrics.record_verification(logger, metrics, false);
                #Err("Attestation not found")
            };
            case (?attestation) {
                // Verify attestation using ZK canister
                let result = await zk_canister.verify_attestation({
                    proof_id;
                    attestation;
                });
                
                let processing_time = Time.now() - start_time;
                Metrics.record_verification(logger, metrics, true);
                
                Logger.log(logger, #Info, "Verified attestation", ?("Proof ID: " # proof_id));
                
                #Ok(result)
            };
        };
    };
    
    // Get the canister's principal
    public func get_canister_principal() : async Principal {
        Principal.fromActor(MainCanister)
    };
    
    // Get logs
    public query func get_logs() : async [{
        timestamp: Int;
        level: {
            #Debug;
            #Info;
            #Warning;
            #Error;
        };
        message: Text;
        details: ?Text;
    }] {
        Logger.get_logs(logger)
    };
    
    // Get metrics
    public query func get_metrics() : async {
        total_attestations: Nat;
        successful_verifications: Nat;
        failed_verifications: Nat;
        total_processing_time: Int;
        request_count: Nat;
        last_cleanup: Int;
    } {
        Metrics.get_metrics(metrics)
    };
    
    // Reset metrics
    public func reset_metrics() : async () {
        Metrics.reset_metrics(logger, metrics);
    };
    
    // Helper function to generate a unique proof ID
    private func generate_proof_id() : Text {
        let timestamp = Time.now();
        let random = Nat64.toText(Nat64.fromNat(Int.abs(timestamp)));
        "proof_" # random
    };
}; 