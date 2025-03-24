import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Errors = "./errors";
import Logger = "./logger";

module {
    // Constants
    private let EXPIRATION_TIME_NANOS : Int = 86_400_000_000_000; // 24 hours in nanoseconds (24 * 60 * 60 * 1_000_000_000)

    // Type for attestation data
    public type AttestationData = {
        collection_id: Nat64;
        token_id: Nat64;
        token_canister_id: Principal;
        minimum_balance: Nat64;
        wallet_principal: Principal;
        timestamp: Int;
        merkle_proof: [{
            index: Nat64;
            value: [Nat8];
        }];
    };

    // Store an attestation
    public func store_attestation(logger: Logger.Logger, storage: HashMap.HashMap<Text, AttestationData>, proof_id: Text, attestation: AttestationData) {
        storage.put(proof_id, attestation);
        Logger.log(logger, #Info, "Stored attestation", ?("Proof ID: " # proof_id));
    };

    // Get an attestation
    public func get_attestation(logger: Logger.Logger, storage: HashMap.HashMap<Text, AttestationData>, proof_id: Text) : ?AttestationData {
        let attestation = storage.get(proof_id);
        switch (attestation) {
            case (null) {
                Logger.log(logger, #Warning, "Attestation not found", ?("Proof ID: " # proof_id));
            };
            case (?_) {
                Logger.log(logger, #Info, "Retrieved attestation", ?("Proof ID: " # proof_id));
            };
        };
        attestation
    };

    // Delete an attestation
    public func delete_attestation(logger: Logger.Logger, storage: HashMap.HashMap<Text, AttestationData>, proof_id: Text) {
        storage.delete(proof_id);
        Logger.log(logger, #Info, "Deleted attestation", ?("Proof ID: " # proof_id));
    };

    // Get all attestations
    public func get_all_attestations(logger: Logger.Logger, storage: HashMap.HashMap<Text, AttestationData>) : [(Text, AttestationData)] {
        Logger.log(logger, #Info, "Retrieved all attestations", null);
        Iter.toArray(storage.entries())
    };

    // Get attestations by wallet
    public func get_attestations_by_wallet(logger: Logger.Logger, storage: HashMap.HashMap<Text, AttestationData>, wallet_principal: Principal) : [(Text, AttestationData)] {
        let filtered = Iter.filter(storage.entries(), func((_, attestation): (Text, AttestationData)): Bool {
            Principal.equal(attestation.wallet_principal, wallet_principal)
        });
        Logger.log(logger, #Info, "Retrieved attestations by wallet", ?Principal.toText(wallet_principal));
        Iter.toArray(filtered)
    };

    // Cleanup expired attestations
    public func cleanup_expired_attestations(logger: Logger.Logger, storage: HashMap.HashMap<Text, AttestationData>) {
        let current_time = Time.now();
        let expired_proofs = Iter.filter(storage.entries(), func((_, attestation): (Text, AttestationData)): Bool {
            is_attestation_expired(attestation, current_time)
        });
        
        for ((proof_id, _) in expired_proofs) {
            delete_attestation(logger, storage, proof_id);
        };
        
        Logger.log(logger, #Info, "Cleaned up expired attestations", null);
    };

    // Private helper function to check if an attestation is expired
    private func is_attestation_expired(attestation: AttestationData, current_time: Int) : Bool {
        let expiration_time = attestation.timestamp + EXPIRATION_TIME_NANOS;
        current_time > expiration_time
    };
}; 