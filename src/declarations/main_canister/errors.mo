import Error "mo:base/Error";
import Debug "mo:base/Debug";

module {
    public type MainError = {
        #InvalidInput : Text;
        #ZKCanisterError : Text;
        #StorageError : Text;
        #VerificationError : Text;
        #InternalError : Text;
    };
    
    public func throwError(error: MainError) : () {
        let err = switch (error) {
            case (#InvalidInput(msg)) {
                "Invalid input: " # msg;
            };
            case (#ZKCanisterError(msg)) {
                "ZK canister error: " # msg;
            };
            case (#StorageError(msg)) {
                "Storage error: " # msg;
            };
            case (#VerificationError(msg)) {
                "Verification error: " # msg;
            };
            case (#InternalError(msg)) {
                "Internal error: " # msg;
            };
        };
        ignore Error.reject(err);
    };
} 