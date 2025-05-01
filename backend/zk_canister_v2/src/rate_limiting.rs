use candid::Principal;
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;

const RATE_LIMIT_WINDOW_NANOS: u64 = 60_000_000_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW: u32 = 10;

thread_local! {
    static RATE_LIMITS: RefCell<HashMap<Principal, Vec<u64>>> = RefCell::new(HashMap::new());
}

#[derive(Debug)]
pub enum RateLimitError {
    TooManyRequests { allowed_after: u64 },
}

pub fn can_generate_proof(principal: &Principal) -> bool {
    let now = time();
    let window_start = now - RATE_LIMIT_WINDOW_NANOS;

    RATE_LIMITS.with(|limits| {
        let limits = limits.borrow();
        if let Some(timestamps) = limits.get(principal) {
            let recent_requests = timestamps.iter().filter(|&&ts| ts > window_start).count();
            recent_requests < MAX_REQUESTS_PER_WINDOW as usize
        } else {
            true // No requests yet, so allowed
        }
    })
}

pub fn check_rate_limit(principal: &Principal) -> Result<(), RateLimitError> {
    let now = time();
    let window_start = now - RATE_LIMIT_WINDOW_NANOS;

    RATE_LIMITS.with(|limits| {
        let mut limits = limits.borrow_mut();
        let timestamps = limits.entry(*principal).or_insert_with(Vec::new);

        // Remove old timestamps
        timestamps.retain(|&ts| ts > window_start);

        // Check if we're over the limit
        if timestamps.len() >= MAX_REQUESTS_PER_WINDOW as usize {
            let oldest_timestamp = timestamps[0];
            let allowed_after = oldest_timestamp + RATE_LIMIT_WINDOW_NANOS;
            return Err(RateLimitError::TooManyRequests { allowed_after });
        }

        // Add new timestamp
        timestamps.push(now);
        Ok(())
    })
}

pub fn cleanup_rate_limits() {
    let now = time();
    let window_start = now - RATE_LIMIT_WINDOW_NANOS;

    RATE_LIMITS.with(|limits| {
        let mut limits = limits.borrow_mut();
        limits.retain(|_, timestamps| {
            timestamps.retain(|&ts| ts > window_start);
            !timestamps.is_empty()
        });
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limiting() {
        let principal = Principal::anonymous();

        // Should allow MAX_REQUESTS_PER_WINDOW requests
        for _ in 0..MAX_REQUESTS_PER_WINDOW {
            assert!(check_rate_limit(&principal).is_ok());
        }

        // Next request should fail
        match check_rate_limit(&principal) {
            Err(RateLimitError::TooManyRequests { allowed_after }) => {
                assert!(allowed_after > time());
            }
            _ => panic!("Expected rate limit error"),
        }
    }

    #[test]
    fn test_cleanup() {
        let principal = Principal::anonymous();

        // Add some requests
        for _ in 0..5 {
            assert!(check_rate_limit(&principal).is_ok());
        }

        // Verify requests are tracked
        RATE_LIMITS.with(|limits| {
            assert!(!limits.borrow().is_empty());
        });

        // Run cleanup
        cleanup_rate_limits();

        // Verify old entries are removed
        RATE_LIMITS.with(|limits| {
            assert!(!limits.borrow().is_empty()); // Recent entries should remain
        });
    }

    #[test]
    fn test_can_generate_proof() {
        let principal = Principal::anonymous();
        
        // Initially should be allowed
        assert!(can_generate_proof(&principal));

        // Make some requests
        for _ in 0..MAX_REQUESTS_PER_WINDOW {
            assert!(check_rate_limit(&principal).is_ok());
        }

        // Should not be allowed to generate more proofs
        assert!(!can_generate_proof(&principal));
    }
}
