import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Result "mo:base/Result";
import SHA256 "mo:sha256/SHA256";
import Curves "mo:curves/Curves";
import Pairing "mo:pairing/BLS12381";

module {
    public type ProofPoints = {
        a: Pairing.G1Point;
        b: Pairing.G2Point;
        c: Pairing.G1Point;
    };

    public type VerifyingKey = {
        alpha_g1: Pairing.G1Point;
        beta_g2: Pairing.G2Point;
        gamma_g2: Pairing.G2Point;
        delta_g2: Pairing.G2Point;
        ic: [Pairing.G1Point];
    };

    // Converts bytes to field elements for the BLS12-381 curve
    public func bytes_to_field(bytes: [Nat8]) : [Nat64] {
        let field_size = 32; // 256 bits
        let num_elements = bytes.size() / field_size;
        let result = Buffer.Buffer<Nat64>(num_elements);
        
        var i = 0;
        while (i < num_elements) {
            var element : Nat64 = 0;
            var j = 0;
            while (j < 8) { // Process 8 bytes at a time for Nat64
                element := element << 8 | Nat64.fromNat(Nat8.toNat(bytes[i * field_size + j]));
                j += 1;
            };
            result.add(element);
            i += 1;
        };
        
        Buffer.toArray(result)
    };

    // Verifies a Groth16 proof
    public func verify(
        proof: ProofPoints,
        public_inputs: [Nat64],
        vk: VerifyingKey
    ) : Bool {
        if (public_inputs.size() + 1 != vk.ic.size()) return false;

        // Compute the linear combination of public inputs with IC points
        var acc = vk.ic[0];
        for (i in Iter.range(0, public_inputs.size() - 1)) {
            acc := Pairing.g1Add(acc, Pairing.g1Mul(vk.ic[i + 1], public_inputs[i]));
        };

        // Check pairing equation
        let pairing_checks = [
            // e(A, B) = e(α, β)
            Pairing.pair(proof.a, proof.b) == Pairing.pair(vk.alpha_g1, vk.beta_g2) and
            // e(A + C, γ) = e(acc, δ)
            Pairing.pair(Pairing.g1Add(proof.a, proof.c), vk.gamma_g2) == 
            Pairing.pair(acc, vk.delta_g2)
        ];

        Array.all(pairing_checks, func(x: Bool) : Bool { x })
    };

    // Serializes a proof into bytes for storage or transmission
    public func serialize_proof(proof: ProofPoints) : [Nat8] {
        let buffer = Buffer.Buffer<Nat8>(256); // Approximate size
        
        // Serialize G1 point A
        let a_bytes = Pairing.g1ToBytes(proof.a);
        for (b in a_bytes.vals()) buffer.add(b);
        
        // Serialize G2 point B
        let b_bytes = Pairing.g2ToBytes(proof.b);
        for (b in b_bytes.vals()) buffer.add(b);
        
        // Serialize G1 point C
        let c_bytes = Pairing.g1ToBytes(proof.c);
        for (b in c_bytes.vals()) buffer.add(b);
        
        Buffer.toArray(buffer)
    };

    // Deserializes a proof from bytes
    public func deserialize_proof(bytes: [Nat8]) : ?ProofPoints {
        if (bytes.size() != 256) return null; // Expected size for Groth16 proof
        
        let a_bytes = Array.subArray(bytes, 0, 64);
        let b_bytes = Array.subArray(bytes, 64, 128);
        let c_bytes = Array.subArray(bytes, 192, 64);
        
        switch (Pairing.g1FromBytes(a_bytes), Pairing.g2FromBytes(b_bytes), Pairing.g1FromBytes(c_bytes)) {
            case (?a, ?b, ?c) {
                ?{
                    a = a;
                    b = b;
                    c = c;
                }
            };
            case _ null
        }
    };
} 