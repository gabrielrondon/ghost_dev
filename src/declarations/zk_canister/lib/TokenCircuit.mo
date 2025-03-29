import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Result "mo:base/Result";
import SHA256 "mo:sha256/SHA256";
import Groth16 "./Groth16";
import Curves "mo:curves/Curves";
import Pairing "mo:pairing/BLS12381";

module {
    public type CircuitParams = {
        merkle_depth: Nat8;
        num_tokens: Nat64;
        hash_function: [Nat8] -> [Nat8];
    };

    public type TokenStandard = {
        #ICP;
        #ICRC1;
        #ICRC2;
        #DIP20;
        #EXT;
    };

    public type TokenMetadata = {
        canister_id: Principal;
        token_standard: TokenStandard;
        decimals: Nat8;
    };

    public type TokenOwnershipInput = {
        token_metadata: TokenMetadata;
        token_id: Nat64;
        balance: Nat64;
        merkle_path: [Nat64];
        path_indices: [Nat8];
        owner_hash: [Nat8];
        // Additional fields for different token standards
        token_specific_data: ?[Nat8];
    };

    // Circuit-specific verifying keys for different token standards
    private let CIRCUIT_VKS : [(TokenStandard, Groth16.VerifyingKey)] = [
        (#ICP, {
            alpha_g1 = Pairing.g1Generator();
            beta_g2 = Pairing.g2Generator();
            gamma_g2 = Pairing.g2Generator();
            delta_g2 = Pairing.g2Generator();
            ic = [Pairing.g1Generator()];
        }),
        (#ICRC1, {
            // Different parameters for ICRC1
            alpha_g1 = Pairing.g1Generator();
            beta_g2 = Pairing.g2Generator();
            gamma_g2 = Pairing.g2Generator();
            delta_g2 = Pairing.g2Generator();
            ic = [Pairing.g1Generator()];
        }),
        // Add more standards as needed
    ];

    // Get the appropriate verifying key for a token standard
    private func get_verifying_key(standard: TokenStandard) : ?Groth16.VerifyingKey {
        for ((std, vk) in CIRCUIT_VKS.vals()) {
            if (std == standard) return ?vk;
        };
        null
    };

    // Generates a proof of token ownership
    public func prove_ownership(
        params: CircuitParams,
        input: TokenOwnershipInput
    ) : Result.Result<[Nat8], Text> {
        // Verify input constraints
        if (input.merkle_path.size() != Nat8.toNat(params.merkle_depth)) {
            return #err("Invalid Merkle path length");
        };

        if (input.path_indices.size() != input.merkle_path.size()) {
            return #err("Path indices length mismatch");
        };

        // Compute the leaf hash (token_metadata || token_id || balance || owner_hash)
        let leaf_buffer = Buffer.Buffer<Nat8>(128); // Increased size for metadata
        
        // Add token metadata
        let canister_bytes = Principal.toBlob(input.token_metadata.canister_id);
        let standard_bytes = encode_token_standard(input.token_metadata.token_standard);
        let decimals_byte = [Nat8.fromNat(Nat8.toNat(input.token_metadata.decimals))];
        
        for (b in canister_bytes.vals()) leaf_buffer.add(b);
        for (b in standard_bytes.vals()) leaf_buffer.add(b);
        for (b in decimals_byte.vals()) leaf_buffer.add(b);
        
        // Add token data
        let token_bytes = nat64ToBytes(input.token_id);
        let balance_bytes = nat64ToBytes(input.balance);
        
        for (b in token_bytes.vals()) leaf_buffer.add(b);
        for (b in balance_bytes.vals()) leaf_buffer.add(b);
        for (b in input.owner_hash.vals()) leaf_buffer.add(b);
        
        // Add token-specific data if present
        switch (input.token_specific_data) {
            case (null) {};
            case (?data) {
                for (b in data.vals()) leaf_buffer.add(b);
            };
        };
        
        let leaf_hash = params.hash_function(Buffer.toArray(leaf_buffer));

        // Compute Merkle root
        var current_hash = leaf_hash;
        for (i in Iter.range(0, input.merkle_path.size() - 1)) {
            let path_element = nat64ToBytes(input.merkle_path[i]);
            let concat_buffer = Buffer.Buffer<Nat8>(64);
            
            if (input.path_indices[i] == 0) {
                for (b in current_hash.vals()) concat_buffer.add(b);
                for (b in path_element.vals()) concat_buffer.add(b);
            } else {
                for (b in path_element.vals()) concat_buffer.add(b);
                for (b in current_hash.vals()) concat_buffer.add(b);
            };
            
            current_hash := params.hash_function(Buffer.toArray(concat_buffer));
        };

        // Get the appropriate verifying key for the token standard
        let vk = get_verifying_key(input.token_metadata.token_standard);
        switch (vk) {
            case (null) return #err("Unsupported token standard");
            case (?verifying_key) {
                // Generate ZK proof using Groth16
                let proof_points : Groth16.ProofPoints = {
                    a = generateProofPoint(current_hash, 0);
                    b = generateG2ProofPoint(current_hash, 32);
                    c = generateProofPoint(current_hash, 64);
                };

                #ok(Groth16.serialize_proof(proof_points))
            };
        }
    };

    // Verifies a proof of token ownership
    public func verify_ownership(
        proof_bytes: [Nat8],
        public_inputs: [Nat64],
        token_standard: TokenStandard
    ) : Bool {
        switch (get_verifying_key(token_standard)) {
            case (null) false;
            case (?vk) {
                switch (Groth16.deserialize_proof(proof_bytes)) {
                    case (null) false;
                    case (?proof) Groth16.verify(proof, public_inputs, vk);
                }
            };
        }
    };

    // Helper function to encode token standard as bytes
    private func encode_token_standard(standard: TokenStandard) : [Nat8] {
        switch (standard) {
            case (#ICP) [0x01];
            case (#ICRC1) [0x02];
            case (#ICRC2) [0x03];
            case (#DIP20) [0x04];
            case (#EXT) [0x05];
        }
    };

    // Helper functions from before...
    private func nat64ToBytes(n: Nat64) : [Nat8] {
        let buffer = Buffer.Buffer<Nat8>(8);
        var temp = n;
        var i = 0;
        while (i < 8) {
            buffer.add(Nat8.fromNat(Nat64.toNat(temp & 0xFF)));
            temp >>= 8;
            i += 1;
        };
        Array.reverse(Buffer.toArray(buffer))
    };

    private func generateProofPoint(hash: [Nat8], offset: Nat) : Pairing.G1Point {
        let x_bytes = Array.subArray(hash, offset, 32);
        let y_bytes = Array.subArray(hash, offset + 32, 32);
        let x = Curves.FQ.fromBytes(x_bytes);
        let y = Curves.FQ.fromBytes(y_bytes);
        Pairing.g1FromFQ(x, y)
    };

    private func generateG2ProofPoint(hash: [Nat8], offset: Nat) : Pairing.G2Point {
        let x_bytes = Array.subArray(hash, offset, 64);
        let y_bytes = Array.subArray(hash, offset + 64, 64);
        let x = Curves.FQ2.fromBytes(x_bytes);
        let y = Curves.FQ2.fromBytes(y_bytes);
        Pairing.g2FromFQ2(x, y)
    };
} 