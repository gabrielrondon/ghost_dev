import Error "mo:base/Error";

module {
    public type ZKError = {
        #InvalidInput : Text;
        #CircuitError : Text;
        #VerificationError : Text;
        #ConversionError : Text;
        #InternalError : Text;
    };

    public func throwError(error: ZKError) {
        switch (error) {
            case (#InvalidInput(msg)) {
                Error.trap("Invalid input: " # msg);
            };
            case (#CircuitError(msg)) {
                Error.trap("Circuit error: " # msg);
            };
            case (#VerificationError(msg)) {
                Error.trap("Verification error: " # msg);
            };
            case (#ConversionError(msg)) {
                Error.trap("Conversion error: " # msg);
            };
            case (#InternalError(msg)) {
                Error.trap("Internal error: " # msg);
            };
        };
    };
} 