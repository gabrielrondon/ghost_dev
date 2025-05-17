use candid::{CandidType, Deserialize};
use halo2_proofs::{
    plonk::{
        keygen_pk, keygen_vk, ProvingKey,
        VerifyingKey,
    },
    poly::kzg::commitment::ParamsKZG,
    halo2curves::bn256::{Bn256, G1Affine},
};
use ic_cdk::{
    api::{caller, time},
    storage::{stable_save, stable_restore},
};
use ic_cdk_macros::{heartbeat, init, post_upgrade, pre_upgrade, query, update};
use rand::{rngs::StdRng, SeedableRng};
use std::{
    cell::RefCell,
    fmt,
};
use serde::Serialize;

use crate::{
    circuits::TokenRangeCircuit,
    metrics::{CanisterMetrics, get_metrics},
    proof::{TokenOwnershipInput, generate_proof_internal, verify_proof_internal, TokenStandard},
    storage::{ProofStorage, StoredProof},
    token_verification::verify_token_balance,
};

mod circuits;
mod metrics;
mod monitoring;
mod proof;
mod rate_limiting;
mod storage;
mod token_verification;

// Constants
const MIN_CYCLES: u64 = 1_000_000_000_000; // 1T cycles
const PROOF_COST: u64 = 100_000_000_000; // 100B cycles
const MAX_PROOFS_PER_PRINCIPAL: usize = 10;
const K: u32 = 8;
const PROOF_EXPIRY_SECONDS: u64 = 24 * 60 * 60; // 24 hours

// Add custom random number generator for IC
use getrandom::register_custom_getrandom;

fn custom_getrandom(buf: &mut [u8]) -> Result<(), getrandom::Error> {
    let timestamp = time();
    let mut bytes = timestamp.to_be_bytes().to_vec();
    bytes.extend_from_slice(&caller().as_slice());
    
    // Use timestamp and caller as seed
    let len = buf.len().min(bytes.len());
    buf[..len].copy_from_slice(&bytes[..len]);
    
    // Fill remaining bytes with a simple PRNG
    for i in len..buf.len() {
        buf[i] = ((timestamp >> (i % 8)) & 0xff) as u8;
    }
    
    Ok(())
}

register_custom_getrandom!(custom_getrandom);

#[derive(Debug, CandidType, Deserialize)]
pub enum CanisterError {
    NotInitialized(String),
    ProofGenerationFailed(String),
    ProofVerificationFailed(String),
    ProofNotFound(String),
    ProofExpired(String),
    InvalidInput(String),
    InsufficientCycles(String),
    StorageError(String),
    RateLimitExceeded(String),
    InternalError(String),
    ProofCreation(String),
    ProofVerification(String),
    TokenVerificationFailed(String),
}

impl From<String> for CanisterError {
    fn from(error: String) -> Self {
        CanisterError::InvalidInput(error)
    }
}

impl fmt::Display for CanisterError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotInitialized(msg) => write!(f, "Not initialized: {}", msg),
            Self::ProofGenerationFailed(msg) => write!(f, "Failed to generate proof: {}", msg),
            Self::ProofVerificationFailed(msg) => write!(f, "Failed to verify proof: {}", msg),
            Self::ProofNotFound(msg) => write!(f, "Proof not found: {}", msg),
            Self::ProofExpired(msg) => write!(f, "Proof expired: {}", msg),
            Self::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            Self::InsufficientCycles(msg) => write!(f, "Insufficient cycles: {}", msg),
            Self::StorageError(msg) => write!(f, "Storage error: {}", msg),
            Self::RateLimitExceeded(msg) => write!(f, "Rate limit exceeded: {}", msg),
            Self::InternalError(msg) => write!(f, "Internal error: {}", msg),
            Self::ProofCreation(msg) => write!(f, "Failed to create proof: {}", msg),
            Self::ProofVerification(msg) => write!(f, "Failed to verify proof: {}", msg),
            Self::TokenVerificationFailed(msg) => write!(f, "Token verification failed: {}", msg),
        }
    }
}

// State management
thread_local! {
    static PROOFS: RefCell<ProofStorage> = RefCell::new(ProofStorage::new());
    static PARAMS: RefCell<Option<ParamsKZG<Bn256>>> = RefCell::new(None);
    static PROVING_KEY: RefCell<Option<ProvingKey<G1Affine>>> = RefCell::new(None);
    static VERIFYING_KEY: RefCell<Option<VerifyingKey<G1Affine>>> = RefCell::new(None);
    static METRICS: RefCell<CanisterMetrics> = RefCell::new(CanisterMetrics::default());
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct HttpRequest {
    url: String,
    method: String,
    body: Vec<u8>,
    headers: Vec<(String, String)>,
}

#[derive(CandidType, Serialize, Deserialize)]
pub struct HttpResponse {
    status_code: u16,
    headers: Vec<(String, String)>,
    body: Vec<u8>,
}

#[init]
pub fn init() {
    let mut rng = StdRng::from_entropy();
    let params = ParamsKZG::<Bn256>::setup(K, &mut rng);
    
    // Create an empty circuit for key generation
    let empty_circuit = TokenRangeCircuit::without_witnesses();
    
    let vk = keygen_vk(&params, &empty_circuit)
        .expect("Failed to generate verifying key");
    let pk = keygen_pk(&params, vk.clone(), &empty_circuit)
        .expect("Failed to generate proving key");

    PARAMS.with(|p| *p.borrow_mut() = Some(params));
    PROVING_KEY.with(|k| *k.borrow_mut() = Some(pk));
    VERIFYING_KEY.with(|k| *k.borrow_mut() = Some(vk));
}

#[update]
pub async fn generate_proof(input: TokenOwnershipInput) -> Result<u64, String> {
    input.validate()?;

    let owner = caller();
    let verified = verify_token_balance(
        input.token_canister,
        owner,
        input.balance,
        &input.token_standard,
    ).await?;
    if !verified {
        return Err("Balance verification failed".into());
    }

    let start_time = time();
    let proof_bytes = generate_proof_internal(&input)?;
    let end_time = time();
    let duration_ms = (end_time - start_time) / 1_000_000; // Convert to milliseconds

    let expiry = time() + PROOF_EXPIRY_SECONDS * 1_000_000_000; // Convert to nanoseconds

    // Convert public inputs to hex strings
    let public_inputs: Vec<String> = input.to_public_inputs()
        .iter()
        .map(|fr| proof::field_to_string(fr))
        .collect();

    let stored_proof = StoredProof::new(
        proof_bytes,
        public_inputs,
        expiry,
        owner,
        input.token_canister,
        input.token_standard,
        input.balance,
    );

    let proof_id = time();
    PROOFS.with(|proofs| {
        proofs.borrow_mut().insert(proof_id, stored_proof);
    });

    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.total_proofs_generated += 1;
        let prev_avg = metrics.avg_proof_generation_time_ms;
        metrics.avg_proof_generation_time_ms = 
            ((prev_avg as u128 * (metrics.total_proofs_generated - 1) as u128 + duration_ms as u128) 
            / metrics.total_proofs_generated as u128) as u64;
    });

    Ok(proof_id)
}

#[query]
pub fn verify_proof_by_id(proof_id_str: String) -> Result<bool, String> {
    let proof_id = proof_id_str.parse::<u64>()
        .map_err(|_| "Invalid proof ID format".to_string())?;

    let stored_proof = PROOFS.with(|proofs| {
        proofs.borrow().get(proof_id).cloned()
    }).ok_or_else(|| "Proof not found".to_string())?;

    if stored_proof.is_expired(time()) {
        return Err("Proof has expired".to_string());
    }

    let start_time = time();
    let public_inputs = stored_proof.get_public_inputs_as_fr()
        .map_err(|e| format!("Failed to convert public inputs: {}", e))?;

    let result = verify_proof_internal(&stored_proof.proof_bytes, &public_inputs);
    let end_time = time();
    let duration_ms = (end_time - start_time) / 1_000_000; // Convert to milliseconds

    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.total_proofs_verified += 1;
        let prev_avg = metrics.avg_proof_verification_time_ms;
        metrics.avg_proof_verification_time_ms = 
            ((prev_avg as u128 * (metrics.total_proofs_verified - 1) as u128 + duration_ms as u128) 
            / metrics.total_proofs_verified as u128) as u64;

        if let Err(e) = &result {
            metrics.total_errors += 1;
            let error_type = e.to_string();
            let mut found = false;
            for (err_type, count) in metrics.error_types.iter_mut() {
                if err_type == &error_type {
                    *count += 1;
                    found = true;
                    break;
                }
            }
            if !found {
                metrics.error_types.push((error_type, 1));
            }
        }
    });

    result
}

#[query]
pub fn get_canister_metrics() -> CanisterMetrics {
    get_metrics()
}

#[heartbeat]
pub fn cleanup_expired_proofs() {
    let current_time = time();
    PROOFS.with(|proofs| {
        proofs.borrow_mut().cleanup_expired(current_time);
    });
}

#[pre_upgrade]
pub fn pre_upgrade() {
    let proofs_data = PROOFS.with(|proofs| proofs.borrow().to_stable());
    stable_save((proofs_data,)).expect("Failed to save state");
}

#[post_upgrade]
pub fn post_upgrade() {
    match stable_restore::<(Vec<u8>,)>() {
        Ok((proofs_data,)) => {
            PROOFS.with(|proofs| {
                *proofs.borrow_mut() = ProofStorage::from_stable(proofs_data);
            });
        }
        Err(e) => {
            // Initialize with empty state if restoration fails
            ic_cdk::println!("State restoration failed, initializing empty state: {}", e);
            PROOFS.with(|proofs| {
                *proofs.borrow_mut() = ProofStorage::new();
            });
        }
    }

    // Re-initialize cryptographic parameters
    init();
}

// Helper functions to get cryptographic parameters
pub fn get_params() -> ParamsKZG<Bn256> {
    PARAMS.with(|p| {
        p.borrow()
            .clone()
            .expect("Cryptographic parameters not initialized")
    })
}

pub fn get_proving_key() -> ProvingKey<G1Affine> {
    PROVING_KEY.with(|k| {
        k.borrow()
            .clone()
            .expect("Proving key not initialized")
    })
}

pub fn get_verifying_key() -> VerifyingKey<G1Affine> {
    VERIFYING_KEY.with(|k| {
        k.borrow()
            .clone()
            .expect("Verifying key not initialized")
    })
}

#[derive(Debug, Clone, CandidType, Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub cycles: u64,
    pub memory_mb: f64,
    pub timestamp: u64,
}

#[query]
pub fn health_check() -> Result<HealthStatus, String> {
    let cycles = ic_cdk::api::canister_balance();
    let memory_size = 0.0; // TODO: Implement memory size calculation

    Ok(HealthStatus {
        status: "healthy".to_string(),
        cycles,
        memory_mb: memory_size,
        timestamp: time(),
    })
}

candid::export_service!();

#[query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proof_lifecycle() {
        // Test proof generation
        let result = generate_proof(TokenOwnershipInput {
            balance: 1000,
            min_range: 0,
            max_range: 2000,
        });
        assert!(result.is_ok());
        let proof_id = result.unwrap();

        // Test proof verification
        let verify_result = verify_proof_by_id(proof_id.to_string());
        assert!(verify_result.is_ok());
        assert!(verify_result.unwrap());
    }
}
