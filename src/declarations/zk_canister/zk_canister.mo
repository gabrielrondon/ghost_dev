import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Hash "mo:base/Hash";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Nat8 "mo:base/Nat8";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Time "mo:base/Time";
import SHA256 "mo:sha256/SHA256";
import Groth16 "./lib/Groth16";
import TokenCircuit "./lib/TokenCircuit";

actor ZKCanister {
    // Types
    public type TokenOwnershipInput = TokenCircuit.TokenOwnershipInput;
    public type TokenStandard = TokenCircuit.TokenStandard;
    public type Error = {
        #NotAuthorized: Text;
        #InvalidInput: Text;
        #ProofGenerationFailed: Text;
        #VerificationFailed: Text;
        #RateLimitExceeded: Text;
        #UnsupportedTokenStandard: Text;
    };

    // State
    private stable var authorized_principals: [Principal] = [];
    private stable var circuit_params: TokenCircuit.CircuitParams = {
        merkle_depth = 32;
        num_tokens = 1_000_000;
        hash_function = SHA256.sha256;
    };

    // Rate limiting
    private stable var requestCount : Nat = 0;
    private let MAX_REQUESTS_PER_MINUTE = 100;
    private let REQUEST_WINDOW = 60_000_000_000; // 1 minute in nanoseconds
    private var lastRequestReset = Time.now();

    // Nonce tracking for replay protection
    private let usedNonces = HashMap.HashMap<Nat64, Bool>(0, Nat64.equal, Hash.hash);
    private stable var currentNonce: Nat64 = 0;

    // Supported token standards
    private let SUPPORTED_STANDARDS : [TokenStandard] = [
        #ICP,
        #ICRC1,
        #ICRC2,
        #DIP20,
        #EXT
    ];

    // System initialization
    system func init() {
        circuit_params := {
            merkle_depth = 32;
            num_tokens = 1_000_000;
            hash_function = SHA256.sha256;
        };
    };

    // Rate limiting helper
    private func checkAndUpdateRateLimit() : Bool {
        let now = Time.now();
        if (now - lastRequestReset > REQUEST_WINDOW) {
            requestCount := 0;
            lastRequestReset := now;
        };

        if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
            return false;
        };

        requestCount += 1;
        true
    };

    // Nonce generation for replay protection
    private func generateNonce() : Nat64 {
        currentNonce += 1;
        currentNonce
    };

    // Error logging
    private func logError(error: Error) {
        Debug.print("Error occurred: " # debug_show(error));
    };

    // Public functions
    public shared(msg) func generate_proof(input: TokenOwnershipInput) : async Result.Result<[Nat8], Error> {
        // Rate limiting
        if (not checkAndUpdateRateLimit()) {
            logError(#RateLimitExceeded("Too many requests"));
            return #err(#RateLimitExceeded("Please try again later"));
        };

        // Authorization check
        if (not is_authorized(msg.caller)) {
            logError(#NotAuthorized("Unauthorized caller"));
            return #err(#NotAuthorized("Not authorized to generate proofs"));
        };

        // Check if token standard is supported
        if (not is_supported_standard(input.token_metadata.token_standard)) {
            logError(#UnsupportedTokenStandard("Unsupported token standard"));
            return #err(#UnsupportedTokenStandard("Token standard not supported"));
        };

        // Input validation
        if (not validate_input(input)) {
            logError(#InvalidInput("Invalid input parameters"));
            return #err(#InvalidInput("Invalid input parameters"));
        };

        // Generate proof with error handling
        try {
            switch (TokenCircuit.prove_ownership(circuit_params, input)) {
                case (#ok(proof)) {
                    #ok(proof)
                };
                case (#err(e)) {
                    logError(#ProofGenerationFailed(e));
                    #err(#ProofGenerationFailed(e))
                };
            }
        } catch (e) {
            logError(#ProofGenerationFailed(Error.message(e)));
            #err(#ProofGenerationFailed("Failed to generate proof"))
        }
    };

    public shared(msg) func verify_proof(
        proof: [Nat8],
        public_inputs: [Nat64],
        token_standard: TokenStandard
    ) : async Result.Result<Bool, Error> {
        // Rate limiting
        if (not checkAndUpdateRateLimit()) {
            return #err(#RateLimitExceeded("Too many requests"));
        };

        // Authorization check
        if (not is_authorized(msg.caller)) {
            return #err(#NotAuthorized("Not authorized to verify proofs"));
        };

        // Generate and check nonce for replay protection
        let nonce = generateNonce();
        switch (usedNonces.get(nonce)) {
            case (?true) return #err(#InvalidInput("Replay attack detected"));
            case (_) {};
        };

        // Verify the proof
        try {
            let isValid = TokenCircuit.verify_ownership(proof, public_inputs, token_standard);
            if (isValid) {
                usedNonces.put(nonce, true);
                #ok(true)
            } else {
                #err(#VerificationFailed("Invalid proof"))
            }
        } catch (e) {
            logError(#VerificationFailed(Error.message(e)));
            #err(#VerificationFailed("Verification failed"))
        }
    };

    public shared(msg) func add_authorized_principal(principal: Principal) : async Result.Result<(), Text> {
        // Only allow existing authorized principals to add new ones
        if (not is_authorized(msg.caller)) {
            return #err("Not authorized");
        };

        // Add the new principal if not already authorized
        if (not is_authorized(principal)) {
            authorized_principals := Array.append(authorized_principals, [principal]);
        };

        #ok()
    };

    public query func get_circuit_params() : async TokenCircuit.CircuitParams {
        circuit_params
    };

    public query func get_supported_standards() : async [TokenStandard] {
        SUPPORTED_STANDARDS
    };

    public query func get_request_count() : async Nat {
        requestCount
    };

    public query func get_current_nonce() : async Nat64 {
        currentNonce
    };

    // Private helper functions
    private func is_authorized(caller: Principal) : Bool {
        if (authorized_principals.size() == 0) return true;
        Array.find(authorized_principals, func(p: Principal) : Bool { p == caller }) != null
    };

    private func is_supported_standard(standard: TokenStandard) : Bool {
        switch (standard) {
            case (#ICP) true;
            case (#ICRC1) true;
            case (#ICRC2) true;
            case (#DIP20) true;
            case (#EXT) true;
            case (_) false;
        }
    };

    private func validate_input(input: TokenOwnershipInput) : Bool {
        // Check Merkle path length
        if (input.merkle_path.size() != Nat8.toNat(circuit_params.merkle_depth)) {
            return false;
        };

        // Check path indices length
        if (input.path_indices.size() != input.merkle_path.size()) {
            return false;
        };

        // Check token ID range
        if (input.token_id >= circuit_params.num_tokens) {
            return false;
        };

        // Check owner hash length
        if (input.owner_hash.size() != 32) {
            return false;
        };

        // Check token metadata
        if (Principal.isAnonymous(input.token_metadata.canister_id)) {
            return false;
        };

        if (input.token_metadata.decimals > 18) {
            return false;
        };

        true
    };
} 