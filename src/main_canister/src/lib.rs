use candid::{CandidType, Deserialize};
use ic_cdk_macros::*;

#[derive(CandidType, Deserialize)]
pub struct ProofRequest {
    pub token_id: String,
    pub owner: String,
}

#[derive(CandidType, Deserialize)]
pub struct ProofResponse {
    pub reference: String,
    pub proof: Vec<u8>,
}

#[update]
pub async fn request_proof(input: ProofRequest) -> ProofResponse {
    // Implementation will be added later
    ProofResponse {
        reference: "test-reference".to_string(),
        proof: vec![],
    }
}

#[query]
pub fn get_proof_status(reference: String) -> String {
    // Implementation will be added later
    "pending".to_string()
} 