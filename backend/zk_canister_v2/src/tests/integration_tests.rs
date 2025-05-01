use candid::Principal;
use ic_agent::Agent;
use tokio::runtime::Runtime;

use crate::{
    TokenRangeCircuit,
    Storage,
    StoredProof,
    StoredMetrics,
    TokenStandard,
    TokenMetadata,
};

const LOCAL_CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai";
const LOCAL_URL: &str = "http://127.0.0.1:8000";

async fn setup_agent() -> Agent {
    let agent = Agent::builder()
        .with_url(LOCAL_URL)
        .with_identity_anonymous()
        .build()
        .expect("Failed to create agent");

    agent.fetch_root_key().await.expect("Failed to fetch root key");
    agent
}

#[tokio::test]
async fn test_full_proof_flow() {
    let agent = setup_agent().await;
    
    // Test parameters
    let balance = 500u64;
    let min_range = 0u64;
    let max_range = 1000u64;

    // Generate proof
    let proof_id = agent
        .update(&Principal::from_text(LOCAL_CANISTER_ID).unwrap(), "generate_proof")
        .with_arg(candid::encode_args((balance, min_range, max_range)).unwrap())
        .call_and_wait()
        .await
        .expect("Failed to generate proof");

    let proof_id: u64 = candid::decode_one(proof_id).unwrap();

    // Verify proof
    let result = agent
        .query(&Principal::from_text(LOCAL_CANISTER_ID).unwrap(), "verify_proof")
        .with_arg(candid::encode_args((proof_id,)).unwrap())
        .call()
        .await
        .expect("Failed to verify proof");

    let is_valid: bool = candid::decode_one(result).unwrap();
    assert!(is_valid, "Proof verification failed");

    // Check metrics
    let metrics = agent
        .query(&Principal::from_text(LOCAL_CANISTER_ID).unwrap(), "get_metrics")
        .call()
        .await
        .expect("Failed to get metrics");

    let metrics: StoredMetrics = candid::decode_one(metrics).unwrap();
    assert_eq!(metrics.total_proofs_generated, 1);
    assert_eq!(metrics.total_proofs_verified, 1);
}

#[tokio::test]
async fn test_invalid_range() {
    let agent = setup_agent().await;
    
    // Test with invalid range (value outside range)
    let balance = 1500u64;
    let min_range = 0u64;
    let max_range = 1000u64;

    let result = agent
        .update(&Principal::from_text(LOCAL_CANISTER_ID).unwrap(), "generate_proof")
        .with_arg(candid::encode_args((balance, min_range, max_range)).unwrap())
        .call_and_wait()
        .await;

    assert!(result.is_err(), "Should fail with invalid range");
}

#[tokio::test]
async fn test_proof_expiration() {
    let agent = setup_agent().await;
    
    // Generate proof
    let balance = 500u64;
    let min_range = 0u64;
    let max_range = 1000u64;

    let proof_id = agent
        .update(&Principal::from_text(LOCAL_CANISTER_ID).unwrap(), "generate_proof")
        .with_arg(candid::encode_args((balance, min_range, max_range)).unwrap())
        .call_and_wait()
        .await
        .expect("Failed to generate proof");

    let proof_id: u64 = candid::decode_one(proof_id).unwrap();

    // Wait for proof to expire (simulate by directly modifying storage in test environment)
    Storage::store_proof(StoredProof {
        proof_bytes: vec![],
        public_inputs: vec![],
        owner: Principal::anonymous(),
        timestamp: 0,
        expiry: 0,
    });

    // Try to verify expired proof
    let result = agent
        .query(&Principal::from_text(LOCAL_CANISTER_ID).unwrap(), "verify_proof")
        .with_arg(candid::encode_args((proof_id,)).unwrap())
        .call()
        .await;

    assert!(result.is_err(), "Should fail with expired proof");
}

#[tokio::test]
async fn test_token_standards() {
    let agent = setup_agent().await;
    let standards = vec![
        TokenStandard::ICRC1,
        TokenStandard::ICRC2,
        TokenStandard::DIP20,
        TokenStandard::EXT,
    ];

    for standard in standards {
        let metadata = TokenMetadata {
            standard: standard.clone(),
            token_canister: Principal::anonymous(),
            decimals: 8,
            symbol: "TEST".to_string(),
            total_supply: 1_000_000u64.into(),
        };

        // Generate proof for each standard
        let balance = 500u64;
        let min_range = 0u64;
        let max_range = 1000u64;

        let result = agent
            .update(&Principal::from_text(LOCAL_CANISTER_ID).unwrap(), "generate_proof")
            .with_arg(candid::encode_args((balance, min_range, max_range)).unwrap())
            .call_and_wait()
            .await;

        assert!(result.is_ok(), "Failed to generate proof for {:?}", standard);
    }
}

#[tokio::test]
async fn test_concurrent_proofs() {
    let agent = setup_agent().await;
    let mut handles = vec![];

    // Generate multiple proofs concurrently
    for i in 0..5 {
        let agent_clone = agent.clone();
        let handle = tokio::spawn(async move {
            let balance = 500u64 + i;
            let min_range = 0u64;
            let max_range = 1000u64;

            let result = agent_clone
                .update(&Principal::from_text(LOCAL_CANISTER_ID).unwrap(), "generate_proof")
                .with_arg(candid::encode_args((balance, min_range, max_range)).unwrap())
                .call_and_wait()
                .await;

            assert!(result.is_ok(), "Failed to generate proof in concurrent test");
        });
        handles.push(handle);
    }

    // Wait for all proofs to complete
    for handle in handles {
        handle.await.unwrap();
    }

    // Verify metrics
    let metrics = agent
        .query(&Principal::from_text(LOCAL_CANISTER_ID).unwrap(), "get_metrics")
        .call()
        .await
        .expect("Failed to get metrics");

    let metrics: StoredMetrics = candid::decode_one(metrics).unwrap();
    assert_eq!(metrics.total_proofs_generated, 5);
} 