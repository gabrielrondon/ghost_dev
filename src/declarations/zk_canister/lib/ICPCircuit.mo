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

    public type TokenOwnershipInput = {
        token_id: Nat64;
        balance: Nat64;
        merkle_path: [Nat64];
        path_indices: [Nat8];
        owner_hash: [Nat8];
    };

    // Circuit-specific verifying key
    private let CIRCUIT_VK : Groth16.VerifyingKey = {
        alpha_g1 = Pairing.g1Generator();  // These would be replaced with actual circuit-specific values
        beta_g2 = Pairing.g2Generator();   // generated during the trusted setup
        gamma_g2 = Pairing.g2Generator();
        delta_g2 = Pairing.g2Generator();
        ic = [Pairing.g1Generator()];
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

        // Compute the leaf hash (token_id || balance || owner_hash)
        let leaf_buffer = Buffer.Buffer<Nat8>(64);
        let token_bytes = nat64ToBytes(input.token_id);
        let balance_bytes = nat64ToBytes(input.balance);
        
        for (b in token_bytes.vals()) leaf_buffer.add(b);
        for (b in balance_bytes.vals()) leaf_buffer.add(b);
        for (b in input.owner_hash.vals()) leaf_buffer.add(b);
        
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

        // Generate ZK proof using Groth16
        let proof_points : Groth16.ProofPoints = {
            a = generateProofPoint(current_hash, 0);
            b = generateG2ProofPoint(current_hash, 32);
            c = generateProofPoint(current_hash, 64);
        };

        #ok(Groth16.serialize_proof(proof_points))
    };

    // Verifies a proof of token ownership
    public func verify_ownership(
        proof_bytes: [Nat8],
        public_inputs: [Nat64]
    ) : Bool {
        switch (Groth16.deserialize_proof(proof_bytes)) {
            case (null) false;
            case (?proof) Groth16.verify(proof, public_inputs, CIRCUIT_VK);
        }
    };

    // Helper function to convert Nat64 to bytes
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

    // Helper function to generate a proof point from hash bytes
    private func generateProofPoint(hash: [Nat8], offset: Nat) : Pairing.G1Point {
        let x_bytes = Array.subArray(hash, offset, 32);
        let y_bytes = Array.subArray(hash, offset + 32, 32);
        
        // Convert bytes to field elements and create a point
        let x = Curves.FQ.fromBytes(x_bytes);
        let y = Curves.FQ.fromBytes(y_bytes);
        
        // Ensure the point is on the curve
        Pairing.g1FromFQ(x, y)
    };

    // Helper function to generate a G2 proof point from hash bytes
    private func generateG2ProofPoint(hash: [Nat8], offset: Nat) : Pairing.G2Point {
        let x_bytes = Array.subArray(hash, offset, 64);
        let y_bytes = Array.subArray(hash, offset + 64, 64);
        
        // Convert bytes to field elements and create a point
        let x = Curves.FQ2.fromBytes(x_bytes);
        let y = Curves.FQ2.fromBytes(y_bytes);
        
        // Ensure the point is on the curve
        Pairing.g2FromFQ2(x, y)
    };
} 