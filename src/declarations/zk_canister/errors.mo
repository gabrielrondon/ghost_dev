import Debug "mo:base/Debug";

module {
    public type ZKError = {
        #InvalidInput;
        #CircuitError;
        #ProofGenerationError;
        #VerificationError;
        #UnauthorizedAccess;
        #SystemError;
        #InvalidProof;
        #InvalidParameters;
        #InvalidSignature;
    };

    public func throwError(error: ZKError) : () {
        switch (error) {
            case (#InvalidInput) {
                Debug.trap("Invalid input parameters provided");
            };
            case (#CircuitError) {
                Debug.trap("Error in circuit execution");
            };
            case (#ProofGenerationError) {
                Debug.trap("Failed to generate zero-knowledge proof");
            };
            case (#VerificationError) {
                Debug.trap("Error during proof verification");
            };
            case (#UnauthorizedAccess) {
                Debug.trap("Unauthorized access attempt");
            };
            case (#SystemError) {
                Debug.trap("System error occurred");
            };
            case (#InvalidProof) {
                Debug.trap("Invalid or malformed proof provided");
            };
            case (#InvalidParameters) {
                Debug.trap("Invalid circuit parameters provided");
            };
            case (#InvalidSignature) {
                Debug.trap("Invalid signature in the request");
            };
        };
    };
} 