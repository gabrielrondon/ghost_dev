import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Bool "mo:base/Bool";
import Logger "./logger";

module {
    public type Metrics = {
        var total_attestations: Nat;
        var successful_verifications: Nat;
        var failed_verifications: Nat;
        var total_processing_time: Int;
        var request_count: Nat;
        var last_cleanup: Int;
    };
    
    public func createMetrics() : Metrics {
        {
            var total_attestations = 0;
            var successful_verifications = 0;
            var failed_verifications = 0;
            var total_processing_time = 0;
            var request_count = 0;
            var last_cleanup = 0;
        }
    };
    
    public func record_attestation_creation(logger: Logger.Logger, metrics: Metrics, processing_time: Int) {
        metrics.total_attestations += 1;
        metrics.total_processing_time += processing_time;
        metrics.request_count += 1;
        Logger.log(logger, #Debug, "Recorded attestation creation", ?("Processing time: " # Int.toText(processing_time)));
    };
    
    public func record_verification(logger: Logger.Logger, metrics: Metrics, success: Bool) {
        if (success) {
            metrics.successful_verifications += 1;
        } else {
            metrics.failed_verifications += 1;
        };
        metrics.request_count += 1;
        Logger.log(logger, #Debug, "Recorded verification", ?("Success: " # Bool.toText(success)));
    };
    
    public func record_cleanup(logger: Logger.Logger, metrics: Metrics) {
        metrics.last_cleanup := Time.now();
        Logger.log(logger, #Debug, "Recorded cleanup", null);
    };
    
    public func get_metrics(metrics: Metrics) : {
        total_attestations: Nat;
        successful_verifications: Nat;
        failed_verifications: Nat;
        total_processing_time: Int;
        request_count: Nat;
        last_cleanup: Int;
    } {
        {
            total_attestations = metrics.total_attestations;
            successful_verifications = metrics.successful_verifications;
            failed_verifications = metrics.failed_verifications;
            total_processing_time = metrics.total_processing_time;
            request_count = metrics.request_count;
            last_cleanup = metrics.last_cleanup;
        }
    };
    
    public func get_average_processing_time(metrics: Metrics) : Int {
        if (metrics.request_count == 0) {
            0
        } else {
            metrics.total_processing_time / Int.abs(metrics.request_count)
        }
    };
    
    public func reset_metrics(logger: Logger.Logger, metrics: Metrics) {
        metrics.total_attestations := 0;
        metrics.successful_verifications := 0;
        metrics.failed_verifications := 0;
        metrics.total_processing_time := 0;
        metrics.request_count := 0;
        metrics.last_cleanup := Time.now();
        Logger.log(logger, #Info, "Reset metrics", null);
    };
} 