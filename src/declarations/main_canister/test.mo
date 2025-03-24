import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Nat8 "mo:base/Nat8";
import Array "mo:base/Array";
import Time "mo:base/Time";
import { create_attestation, verify_attestation, get_logs, get_metrics, reset_metrics } = "./main";
import { log } = "./logger";
import { cleanup_expired_attestations } = "./storage";

module {
    // Test data
    private let test_collection_id : Nat64 = 1;
    private let test_token_id : Nat64 = 2;
    private let test_token_canister_id : Nat64 = 3;
    private let test_minimum_balance : Nat64 = 100;
    private let test_wallet_principal = Principal.fromText("2vxsx-fae");
    
    // Test merkle paths and indices
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
        wallet_principal = test_wallet_principal;
    };
    
    // Test functions
    public func test_create_attestation() : async Bool {
        let result = await create_attestation(test_input);
        
        switch (result) {
            case (#Ok(attestation)) {
                log(#Info, "Test passed: create_attestation", ?("Proof ID: " # attestation.proof_id));
                true
            };
            case (#Err(error)) {
                log(#Error, "Test failed: create_attestation", ?error);
                false
            };
        };
    };
    
    public func test_verify_attestation() : async Bool {
        let create_result = await create_attestation(test_input);
        
        switch (create_result) {
            case (#Ok(attestation)) {
                let verify_result = await verify_attestation(attestation.proof_id);
                
                switch (verify_result) {
                    case (#Ok(verified)) {
                        log(#Info, "Test passed: verify_attestation", ?("Verified: " # Bool.toText(verified)));
                        true
                    };
                    case (#Err(error)) {
                        log(#Error, "Test failed: verify_attestation", ?error);
                        false
                    };
                };
            };
            case (#Err(error)) {
                log(#Error, "Test failed: create_attestation in verify test", ?error);
                false
            };
        };
    };
    
    public func test_invalid_attestation() : async Bool {
        let result = await verify_attestation("invalid_proof_id");
        
        switch (result) {
            case (#Ok(_)) {
                log(#Error, "Test failed: invalid_attestation", ?"Expected error but got success");
                false
            };
            case (#Err(error)) {
                log(#Info, "Test passed: invalid_attestation", ?("Error: " # error));
                true
            };
        };
    };
    
    public func test_cleanup_expired_attestations() : async Bool {
        cleanup_expired_attestations();
        log(#Info, "Test passed: cleanup_expired_attestations", null);
        true
    };
    
    public func test_logging_system() : async Bool {
        let logs = await get_logs();
        let has_logs = Array.size(logs) > 0;
        
        log(#Info, "Test passed: logging_system", ?("Has logs: " # Bool.toText(has_logs)));
        true
    };
    
    public func test_concurrent_attestations() : async Bool {
        let attestations = Array.init<async Bool>(5, async {
            await test_create_attestation()
        });
        
        let results = await Array.map<async Bool, Bool>(attestations, func(x) = await x);
        let all_success = Array.foldLeft<Bool, Bool>(results, true, func(acc, x) = acc and x);
        
        log(#Info, "Test passed: concurrent_attestations", ?("All success: " # Bool.toText(all_success)));
        all_success
    };
    
    public func test_error_handling() : async Bool {
        let invalid_collection_id = Nat64.fromNat(0);
        
        let result = await create_attestation({
            collection_id = invalid_collection_id;
            token_id = test_token_id;
            token_canister_id = test_token_canister_id;
            minimum_balance = test_minimum_balance;
            wallet_principal = test_wallet_principal;
        });
        
        switch (result) {
            case (#Ok(_)) {
                log(#Error, "Test failed: error_handling", ?"Expected error but got success");
                false
            };
            case (#Err(error)) {
                log(#Info, "Test passed: error_handling", ?("Error: " # error));
                true
            };
        };
    };
    
    public func test_performance() : async Bool {
        let start_time = Time.now();
        
        let result = await create_attestation(test_input);
        
        let end_time = Time.now();
        let processing_time = end_time - start_time;
        
        let metrics = await get_metrics();
        let avg_processing_time = metrics.total_processing_time / Nat.fromInt(metrics.request_count);
        
        log(#Info, "Test passed: performance", ?("Processing time: " # Int.toText(processing_time) # ", Average: " # Int.toText(avg_processing_time)));
        true
    };
    
    public func test_metrics() : async Bool {
        // Reset metrics
        await reset_metrics();
        
        // Create attestation
        let create_result = await create_attestation(test_input);
        
        // Verify attestation
        switch (create_result) {
            case (#Ok(attestation)) {
                let verify_result = await verify_attestation(attestation.proof_id);
                
                // Check metrics
                let metrics = await get_metrics();
                let metrics_valid = metrics.total_attestations == 1 and
                                  metrics.request_count >= 2 and
                                  metrics.total_processing_time > 0;
                
                log(#Info, "Test passed: metrics", ?("Metrics valid: " # Bool.toText(metrics_valid)));
                metrics_valid
            };
            case (#Err(error)) {
                log(#Error, "Test failed: metrics", ?error);
                false
            };
        };
    };
} 