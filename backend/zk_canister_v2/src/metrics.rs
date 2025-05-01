use candid::{CandidType, Deserialize};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::HashMap;

#[derive(Debug, Default, Clone, CandidType, Deserialize)]
pub struct CanisterMetrics {
    pub total_proofs_generated: u64,
    pub total_proofs_verified: u64,
    pub avg_proof_generation_time_ms: u64,
    pub avg_proof_verification_time_ms: u64,
    pub total_errors: u64,
    pub error_types: Vec<(String, u64)>,
}

thread_local! {
    static METRICS: RefCell<CanisterMetrics> = RefCell::new(CanisterMetrics::default());
}

pub fn record_proof_generation() {
    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.total_proofs_generated += 1;
    });
}

pub fn record_verification() {
    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.total_proofs_verified += 1;
    });
}

pub fn record_error() {
    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.total_errors += 1;
    });
}

pub fn get_metrics() -> CanisterMetrics {
    METRICS.with(|m| m.borrow().clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_recording() {
        record_proof_generation();
        record_verification();
        record_error();

        let metrics = get_metrics();
        assert_eq!(metrics.total_proofs_generated, 1);
        assert_eq!(metrics.total_proofs_verified, 1);
        assert_eq!(metrics.total_errors, 1);
    }
}
