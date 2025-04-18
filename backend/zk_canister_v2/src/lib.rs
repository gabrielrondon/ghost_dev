use candid::{CandidType, Deserialize};
use ic_cdk_macros::*;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::cell::RefCell;
use hex;

// Types
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum TokenStandard {
    ICRC1,
    ICRC2,
    ICRC3,
    ICRC4,
    ICP,
    DIP20,
    EXT,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TokenMetadata {
    pub chain_id: u64,
    pub token_address: String,
    pub token_standard: TokenStandard,
    pub token_id: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TokenOwnershipInput {
    pub token: TokenMetadata,
    pub owner_address: String,
    pub balance: String,
    pub block_number: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum ProofGenerationError {
    InvalidInput,
    InternalError,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum ProofVerificationError {
    InvalidProof,
    InternalError,
}

type ProofId = String;
type ProofBlob = Vec<u8>;

thread_local! {
    static PROOFS: RefCell<HashMap<ProofId, ProofBlob>> = RefCell::new(HashMap::new());
}

#[update]
pub async fn prove_ownership(
    caller: String,
    input: TokenOwnershipInput,
) -> Result<ProofId, ProofGenerationError> {
    // Generate a unique proof ID
    let proof_id = generate_proof_id(&caller, &input);
    
    // Generate proof blob
    let proof_blob = generate_proof_blob(&caller, &input);
    
    // Store proof
    PROOFS.with(|proofs| {
        proofs.borrow_mut().insert(proof_id.clone(), proof_blob);
    });
    
    Ok(proof_id)
}

#[query]
pub fn verify_proof(proof_id: ProofId) -> Result<bool, ProofVerificationError> {
    PROOFS.with(|proofs| {
        match proofs.borrow().get(&proof_id) {
            Some(_) => Ok(true),
            None => Err(ProofVerificationError::InvalidProof),
        }
    })
}

// Helper functions
fn generate_proof_id(caller: &str, input: &TokenOwnershipInput) -> String {
    let mut hasher = Sha256::new();
    hasher.update(caller.as_bytes());
    hasher.update(serde_json::to_string(input).unwrap().as_bytes());
    hex::encode(hasher.finalize())
}

fn generate_proof_blob(caller: &str, input: &TokenOwnershipInput) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(caller.as_bytes());
    hasher.update(serde_json::to_string(input).unwrap().as_bytes());
    hasher.finalize().to_vec()
}

// Candid interface
candid::export_service!();

#[query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
} 