import Time "mo:base/Time";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import { throwError } = "./errors";

module {
    public type LogLevel = {
        #Debug;
        #Info;
        #Warning;
        #Error;
    };
    
    public type LogEntry = {
        timestamp: Int;
        level: LogLevel;
        message: Text;
        details: ?Text;
    };
    
    public type Logger = {
        var logs: Buffer.Buffer<LogEntry>;
    };
    
    public let MAX_LOGS = 1000;
    
    public func createLogger() : Logger {
        {
            var logs = Buffer.Buffer<LogEntry>(0);
        }
    };
    
    public func log(logger: Logger, level: LogLevel, message: Text, details: ?Text) {
        let entry = {
            timestamp = Time.now();
            level = level;
            message = message;
            details = details;
        };
        
        logger.logs.add(entry);
        
        // Keep only the last MAX_LOGS entries
        let size = logger.logs.size();
        if (size > MAX_LOGS) {
            let new_logs = Buffer.Buffer<LogEntry>(MAX_LOGS);
            for (i in Iter.range(size - MAX_LOGS, size - 1)) {
                new_logs.add(logger.logs.get(i));
            };
            logger.logs := new_logs;
        };
    };
    
    public func get_logs(logger: Logger) : [LogEntry] {
        Buffer.toArray(logger.logs)
    };
    
    public func get_logs_by_level(logger: Logger, level: LogLevel) : [LogEntry] {
        let filtered = Buffer.Buffer<LogEntry>(0);
        for (entry in logger.logs.vals()) {
            if (entry.level == level) {
                filtered.add(entry);
            };
        };
        Buffer.toArray(filtered)
    };
    
    public func get_logs_by_time_range(logger: Logger, start: Int, end: Int) : [LogEntry] {
        let filtered = Buffer.Buffer<LogEntry>(0);
        for (entry in logger.logs.vals()) {
            if (entry.timestamp >= start and entry.timestamp <= end) {
                filtered.add(entry);
            };
        };
        Buffer.toArray(filtered)
    };
    
    public func clear_logs(logger: Logger) {
        logger.logs := Buffer.Buffer<LogEntry>(0);
    };
} 