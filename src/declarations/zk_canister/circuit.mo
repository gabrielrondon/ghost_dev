import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Nat8 "mo:base/Nat8";
import Error "mo:base/Error";
import { throwError } = "./errors";

module {
    // Field size for the circuit (in bits)
    private let FIELD_SIZE = 254;
    
    // Maximum value for a field element
    private let MAX_FIELD_VALUE = 2 ** FIELD_SIZE - 1;
    
    // Convert a Nat64 to a field element
    public func nat64_to_field(n: Nat64) : Nat64 {
        if (n > MAX_FIELD_VALUE) {
            throwError(#ConversionError("Value too large for field"));
        };
        n
    };
    
    // Convert a field element to Nat64
    public func field_to_nat64(f: Nat64) : Nat64 {
        if (f > MAX_FIELD_VALUE) {
            throwError(#ConversionError("Field element too large for Nat64"));
        };
        f
    };
    
    // Convert a Principal to a field element
    public func principal_to_field(p: Principal) : Nat64 {
        let bytes = Principal.toBlob(p);
        let value = Nat64.fromNat(Blob.toNat(bytes));
        nat64_to_field(value)
    };
    
    // Convert a field element to Principal
    public func field_to_principal(f: Nat64) : Principal {
        let value = field_to_nat64(f);
        let bytes = Blob.fromNat(Nat64.toNat(value));
        Principal.fromBlob(bytes)
    };
    
    // Pack a field element into bytes
    public func field_to_bytes(f: Nat64) : [Nat8] {
        let value = field_to_nat64(f);
        let bytes = Buffer.Buffer<Nat8>(8);
        var n = value;
        for (i in Iter.range(0, 7)) {
            bytes.add(Nat8.fromNat(Nat64.toNat(n % 256)));
            n := n / 256;
        };
        Buffer.toArray(bytes)
    };
    
    // Unpack bytes into a field element
    public func bytes_to_field(bytes: [Nat8]) : Nat64 {
        if (Array.size(bytes) != 8) {
            throwError(#ConversionError("Invalid byte array size"));
        };
        var value : Nat64 = 0;
        for (i in Iter.range(0, 7)) {
            value := value + Nat64.fromNat(Nat8.toNat(bytes[i])) * (256 ** Nat64.fromNat(i));
        };
        nat64_to_field(value)
    };
    
    // Validate input parameters
    public func validate_input(input: {
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
    }) {
        // Check array sizes
        if (Array.size(input.nft_merkle_path) != 10) {
            throwError(#InvalidInput("NFT merkle path must have length 10"));
        };
        if (Array.size(input.nft_merkle_indices) != 10) {
            throwError(#InvalidInput("NFT merkle indices must have length 10"));
        };
        if (Array.size(input.token_merkle_path) != 10) {
            throwError(#InvalidInput("Token merkle path must have length 10"));
        };
        if (Array.size(input.token_merkle_indices) != 10) {
            throwError(#InvalidInput("Token merkle indices must have length 10"));
        };
        
        // Check merkle indices
        for (i in input.nft_merkle_indices.vals()) {
            if (i > 1) {
                throwError(#InvalidInput("NFT merkle indices must be 0 or 1"));
            };
        };
        for (i in input.token_merkle_indices.vals()) {
            if (i > 1) {
                throwError(#InvalidInput("Token merkle indices must be 0 or 1"));
            };
        };
        
        // Check balance
        if (input.actual_balance < input.minimum_balance) {
            throwError(#InvalidInput("Actual balance is less than minimum balance"));
        };
    };
} 