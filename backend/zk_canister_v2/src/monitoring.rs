use candid::{CandidType, Deserialize};
use ic_cdk::api::time;
use serde::Serialize;
use std::fmt;
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod,
};

use crate::metrics::CanisterMetrics;

const ALERT_ERROR_RATE_THRESHOLD: u64 = 10; // 10 errors
const ALERT_PROOF_GEN_TIME_THRESHOLD: u64 = 5000; // 5 seconds in ms
const ALERT_VERIFY_TIME_THRESHOLD: u64 = 2000; // 2 seconds in ms
const ALERT_MEMORY_THRESHOLD: u64 = 1024 * 1024 * 1024; // 1GB

#[derive(Debug, CandidType, Deserialize)]
pub enum AlertSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

impl fmt::Display for AlertSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AlertSeverity::Info => write!(f, "INFO"),
            AlertSeverity::Warning => write!(f, "WARNING"),
            AlertSeverity::Error => write!(f, "ERROR"),
            AlertSeverity::Critical => write!(f, "CRITICAL"),
        }
    }
}

#[derive(Debug, CandidType, Deserialize)]
pub struct Alert {
    pub severity: AlertSeverity,
    pub message: String,
    pub timestamp: u64,
}

impl Alert {
    pub fn new(severity: AlertSeverity, message: String) -> Self {
        Self {
            severity,
            message,
            timestamp: time(),
        }
    }
}

pub async fn check_alerts(metrics: &CanisterMetrics) -> Result<Vec<Alert>, String> {
    let mut alerts = Vec::new();

    // Check error rate
    if metrics.total_errors > 10 {
        alerts.push(Alert::new(
            AlertSeverity::Warning,
            format!("High error rate detected: {} errors", metrics.total_errors),
        ));
    }

    // Check proof generation time
    if metrics.avg_proof_generation_time_ms > 5000 {
        alerts.push(Alert::new(
            AlertSeverity::Warning,
            format!("High proof generation time: {}ms", metrics.avg_proof_generation_time_ms),
        ));
    }

    // Check verification time
    if metrics.avg_proof_verification_time_ms > 2000 {
        alerts.push(Alert::new(
            AlertSeverity::Warning,
            format!("High proof verification time: {}ms", metrics.avg_proof_verification_time_ms),
        ));
    }

    Ok(alerts)
}

async fn send_alert(alert: &Alert) -> Result<(), String> {
    // TODO: Implement alert sending mechanism (e.g., to a monitoring service)
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alert_creation() {
        let alert = Alert::new(AlertSeverity::Warning, "Test alert".to_string());
        assert!(alert.timestamp > 0);
        assert!(matches!(alert.severity, AlertSeverity::Warning));
    }
}
