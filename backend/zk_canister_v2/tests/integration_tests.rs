use candid::{Nat, Principal};
use ic_agent::agent::http_transport::ReqwestHttpReplicaV2Transport;
use ic_agent::{Agent, Identity};
use tokio::test;
use ic_test_state_machine::{CanisterInstaller, StateMachine};

use zk_canister_v2::{
    CanisterError, HealthStatus, Metrics, TokenMetadata, TokenOwnershipInput, TokenStandard,
};

const CANISTER_ID: &str = "h5yqz-nqaaa-aaaad-aalnq-cai"; // Staging canister ID
const CANISTER_WAT: &str = r#"
(module
    (import "ic0" "msg_reply" (func $msg_reply))
    (import "ic0" "msg_reply_data_append" (func $msg_reply_data_append (param i32 i32)))
    (memory 1)
    (export "memory" (memory 0))
    (export "canister_update generate_proof" (func $generate_proof))
    (export "canister_query verify_proof" (func $verify_proof))
    (func $generate_proof
        (call $msg_reply))
    (func $verify_proof
        (call $msg_reply))
)
"#;

async fn setup_agent() -> Agent {
    let url = "https://ic0.app".to_string();
    let transport = ReqwestHttpReplicaV2Transport::create(url).unwrap();
    let agent = Agent::builder().with_transport(transport).build().unwrap();
    agent.fetch_root_key().await.unwrap();
    agent
}

async fn setup_test_environment() -> (StateMachine, Principal) {
    let mut state_machine = StateMachine::new();
    let canister_id = state_machine
        .install_canister(CANISTER_WAT.as_bytes().to_vec(), vec![])
        .unwrap();
    
    (state_machine, canister_id)
}

#[tokio::test]
async fn test_full_proof_flow() {
    let (mut state_machine, canister_id) = setup_test_environment().await;
    
    // Test proof generation
    let input = TokenOwnershipInput {
        balance: 100,
        min_range: 0,
        max_range: 1000,
    };
    
    let proof_id: Result<u64, CanisterError> = state_machine
        .execute_ingress(canister_id, "generate_proof", candid::encode_one(input).unwrap())
        .unwrap();
    
    assert!(proof_id.is_ok());
    
    // Test proof verification
    let verification: Result<bool, CanisterError> = state_machine
        .execute_ingress(canister_id, "verify_proof", candid::encode_one(proof_id.unwrap()).unwrap())
        .unwrap();
    
    assert!(verification.unwrap());
}

#[tokio::test]
async fn test_invalid_inputs() {
    let (mut state_machine, canister_id) = setup_test_environment().await;
    
    // Test with invalid balance
    let input = TokenOwnershipInput {
        balance: 0,
        min_range: 0,
        max_range: 1000,
    };
    
    let result: Result<u64, CanisterError> = state_machine
        .execute_ingress(canister_id, "generate_proof", candid::encode_one(input).unwrap())
        .unwrap();
    
    assert!(matches!(result, Err(CanisterError::InvalidInput(_))));
    
    // Test with invalid range
    let input = TokenOwnershipInput {
        balance: 100,
        min_range: 1000,
        max_range: 0,
    };
    
    let result: Result<u64, CanisterError> = state_machine
        .execute_ingress(canister_id, "generate_proof", candid::encode_one(input).unwrap())
        .unwrap();
    
    assert!(matches!(result, Err(CanisterError::InvalidInput(_))));
}

#[tokio::test]
async fn test_proof_expiration() {
    let (mut state_machine, canister_id) = setup_test_environment().await;
    
    // Generate a proof
    let input = TokenOwnershipInput {
        balance: 100,
        min_range: 0,
        max_range: 1000,
    };
    
    let proof_id: Result<u64, CanisterError> = state_machine
        .execute_ingress(canister_id, "generate_proof", candid::encode_one(input).unwrap())
        .unwrap();
    
    // Advance time by 25 hours
    state_machine.advance_time(25 * 60 * 60 * 1_000_000_000);
    
    // Try to verify expired proof
    let verification: Result<bool, CanisterError> = state_machine
        .execute_ingress(canister_id, "verify_proof", candid::encode_one(proof_id.unwrap()).unwrap())
        .unwrap();
    
    assert!(matches!(verification, Err(CanisterError::ProofExpired)));
}

#[tokio::test]
async fn test_concurrent_operations() {
    let (mut state_machine, canister_id) = setup_test_environment().await;
    
    let mut handles = vec![];
    
    // Generate multiple proofs concurrently
    for i in 0..5 {
        let state_machine_clone = state_machine.clone();
        let canister_id_clone = canister_id;
        
        let handle = tokio::spawn(async move {
            let input = TokenOwnershipInput {
                balance: 100 + i,
                min_range: 0,
                max_range: 1000,
            };
            
            let proof_id: Result<u64, CanisterError> = state_machine_clone
                .execute_ingress(canister_id_clone, "generate_proof", candid::encode_one(input).unwrap())
                .unwrap();
            
            assert!(proof_id.is_ok());
        });
        
        handles.push(handle);
    }
    
    // Wait for all operations to complete
    for handle in handles {
        handle.await.unwrap();
    }
}

#[tokio::test]
async fn test_metrics_and_health() {
    let (mut state_machine, canister_id) = setup_test_environment().await;
    
    // Generate some proofs to create metrics
    for _ in 0..3 {
        let input = TokenOwnershipInput {
            balance: 100,
            min_range: 0,
            max_range: 1000,
        };
        
        let _: Result<u64, CanisterError> = state_machine
            .execute_ingress(canister_id, "generate_proof", candid::encode_one(input).unwrap())
            .unwrap();
    }
    
    // Check metrics
    let metrics: Metrics = state_machine
        .execute_ingress(canister_id, "get_canister_metrics", vec![])
        .unwrap();
    
    assert_eq!(metrics.total_proofs, 3);
    
    // Check health status
    let health: Result<HealthStatus, CanisterError> = state_machine
        .execute_ingress(canister_id, "health_check", vec![])
        .unwrap();
    
    assert!(health.is_ok());
    let health = health.unwrap();
    assert_eq!(health.status, "healthy");
}
