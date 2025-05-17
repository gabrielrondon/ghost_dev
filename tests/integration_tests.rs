use candid::Principal;
use ic_agent::Agent;
use zk_canister_v2::{
    TokenOwnershipInput,
    CanisterError,
    init,
    generate_proof,
    verify_proof,
    set_proof_expiry_seconds,
};

const LOCAL_REPLICA_URL: &str = "http://localhost:4943";
const CANISTER_ID: &str = "rrkah-fqaaa-aaaaa-aaaaq-cai"; // Update with your actual canister ID

async fn setup() -> Agent {
    let agent = Agent::builder()
        .with_url(LOCAL_REPLICA_URL)
        .with_identity(ic_agent::identity::AnonymousIdentity)
        .build()
        .expect("Failed to create agent");
    
    agent.fetch_root_key().await.expect("Failed to fetch root key");
    agent
}

#[tokio::test]
async fn test_proof_generation_and_verification() {
    let agent = setup().await;
    
    // Test input
    let input = TokenOwnershipInput {
        balance: 1000,
        min_range: 0,
        max_range: 2000,
    };

    // Generate proof
    let proof_id = generate_proof(input).expect("Failed to generate proof");

    // Verify proof
    let is_valid = verify_proof(proof_id).expect("Failed to verify proof");
    assert!(is_valid, "Proof verification failed");
}

#[tokio::test]
async fn test_invalid_range() {
    // Test with invalid range (min > max)
    let input = TokenOwnershipInput {
        balance: 1000,
        min_range: 2000,
        max_range: 1000,
    };

    let result = generate_proof(input);
    assert!(matches!(result, Err(CanisterError::InvalidInput(_))));
}

#[tokio::test]
async fn test_proof_expiry() {
    // Set expiry to 0 so proofs expire immediately
    set_proof_expiry_seconds(0);

    let input = TokenOwnershipInput {
        balance: 1000,
        min_range: 0,
        max_range: 2000,
    };

    let proof_id = generate_proof(input).expect("Failed to generate proof");

    let result = verify_proof(proof_id);
    assert!(matches!(result, Err(CanisterError::ProofExpired)));

    // Restore default expiry for other tests
    set_proof_expiry_seconds(24 * 60 * 60);
}

#[tokio::test]
async fn test_concurrent_proofs() {
    let mut handles = vec![];
    
    for i in 0..5 {
        let handle = tokio::spawn(async move {
            let input = TokenOwnershipInput {
                balance: 1000 + i,
                min_range: 0,
                max_range: 2000,
            };
            
            generate_proof(input)
        });
        handles.push(handle);
    }

    let results = futures::future::join_all(handles).await;
    
    // Check that all proofs were generated successfully
    for result in results {
        assert!(result.unwrap().is_ok());
    }
} 