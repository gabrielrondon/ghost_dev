import Blob "mo:base/Blob";
import Nat64 "mo:base/Nat64";
import Nat8 "mo:base/Nat8";
import Error "mo:base/Error";
import File "mo:base/File";
import Debug "mo:base/Debug";
import { throwError } from "./errors";
import NoirProver "mo:noir-prover/NoirProver";
import NoirVerifier "mo:noir-verifier/NoirVerifier";

actor ZKCanister {
    // Types
    type ICPAttestationInput = {
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
    };

    type VerificationResult = {
        is_valid: Bool;
        proof: [Nat8];
        public_inputs: [Nat64];
    };
    
    // Circuit and key loading
    private func loadFile(path: Text) : Blob {
        try {
            let contents = File.read(path);
            switch contents {
                case (?data) data;
                case null {
                    Debug.print("Failed to load file: " # path);
                    throwError(#LoadError("Failed to load file: " # path));
                    Blob.fromArray([]);
                };
            };
        } catch (e) {
            Debug.print("Error loading file: " # Error.message(e));
            throwError(#LoadError("Error loading file: " # Error.message(e)));
            Blob.fromArray([]);
        };
    };
    
    // Store the compiled Noir circuit
    private let _circuit: Blob = loadFile("circuits/build/circuit.r1cs");
    
    // Store the proving key
    private let _proving_key: Blob = loadFile("circuits/build/proving_key.json");
    
    // Store the verification key
    private let _verification_key: Blob = loadFile("circuits/build/verification_key.json");
    
    // Initialize circuit and keys
    private func initializeCircuit() : async Bool {
        if (Blob.toArray(_circuit).size() == 0) {
            Debug.print("Circuit not loaded properly");
            return false;
        };
        
        if (Blob.toArray(_proving_key).size() == 0) {
            Debug.print("Proving key not loaded properly");
            return false;
        };
        
        if (Blob.toArray(_verification_key).size() == 0) {
            Debug.print("Verification key not loaded properly");
            return false;
        };
        
        true
    };

    // Generate a proof for an ICP attestation
    public func generate_proof(input: ICPAttestationInput) : async VerificationResult {
        // Ensure circuit and keys are loaded
        let initialized = await initializeCircuit();
        if (not initialized) {
            throwError(#InitializationError("Circuit or keys not loaded properly"));
        };
        
        try {
            // Convert input to circuit format
            let circuit_inputs = {
                collection_id = _nat64_to_field(input.collection_id);
                token_id = _nat64_to_field(input.token_id);
                token_canister_id = _nat64_to_field(input.token_canister_id);
                minimum_balance = _nat64_to_field(input.minimum_balance);
                merkle_root = _nat64_to_field(input.merkle_root);
                wallet_principal = _nat64_to_field(input.wallet_principal);
                actual_balance = _nat64_to_field(input.actual_balance);
            };

            // Generate proof using Noir circuit
            let proof_result = await NoirProver.prove(_circuit, _proving_key, circuit_inputs);
            
            {
                is_valid = proof_result.success;
                proof = proof_result.proof;
                public_inputs = [
                    input.collection_id,
                    input.token_id,
                    input.token_canister_id,
                    input.minimum_balance,
                    input.merkle_root
                ];
            }
        } catch (e) {
            Debug.print("Error generating proof: " # Error.message(e));
            throwError(#ProofGenerationError("Failed to generate proof"));
        };
    };
    
    // Verify a proof
    public func verify_proof(proof: [Nat8], public_inputs: [Nat64]) : async Bool {
        // Ensure circuit and keys are loaded
        let initialized = await initializeCircuit();
        if (not initialized) {
            throwError(#InitializationError("Circuit or keys not loaded properly"));
        };
        
        try {
            // Verify the proof using Noir verifier
            let verification_result = await NoirVerifier.verify(
                _verification_key,
                proof,
                public_inputs
            );
            
            verification_result
        } catch (e) {
            Debug.print("Error verifying proof: " # Error.message(e));
            throwError(#ProofVerificationError("Failed to verify proof"));
        };
    };
    
    // Get the circuit's public parameters
    public func get_circuit_params() : async [Nat8] {
        // TODO: Return the circuit's public parameters
        // This will be used by clients to prepare their inputs
        []
    };
    
    // Helper function to convert Nat64 to Field (for the circuit)
    private func _nat64_to_field(n: Nat64) : Nat64 {
        // TODO: Implement proper conversion
        n
    };
    
    // Helper function to convert Field to Nat64 (from the circuit)
    private func _field_to_nat64(f: Nat64) : Nat64 {
        // TODO: Implement proper conversion
        f
    };
} 