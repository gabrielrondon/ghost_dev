use candid::{CandidType, Deserialize};
use serde::{Serialize};
use ic_cdk_macros::{query, update};
use ic_cdk::api::call::call;
use ic_cdk::api::time;
use ic_cdk::export::Principal;
use ic_stable_structures::{StableBTreeMap, Storable, BoundedStorable, memory_manager::VirtualMemory, DefaultMemoryImpl, Memory};
use serde_json::json;
use serde_json::to_vec;
use uuid::Uuid;

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct TaskConfig {
    priority: String,
    execution_delay: u64,
    retry_attempts: u8,
    disclosure_level: String,
    storage_type: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct Task {
    id: String,
    description: String,
    status: String, // pending, completed
    timestamp: u64,
    config: Option<TaskConfig>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct Reference {
    id: String,
    tasks: Vec<Task>,
    zk_proof: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct WalletVerificationRequest {
    wallet_address: String,
    nft_contract_address: Option<String>,
    chain_id: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct VerificationResult {
    is_verified: bool,
    proof_id: String,
    timestamp: u64,
    anonymous_reference: String,
}

impl Storable for Reference {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        std::borrow::Cow::Owned(serde_json::to_vec(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        serde_json::from_slice(&bytes).unwrap()
    }
}

impl BoundedStorable for Reference {
    const MAX_SIZE: u32 = 8192; // Increased to 8KB to handle more tasks
    const IS_FIXED_SIZE: bool = false;
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorableString(String);

impl Storable for StorableString {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        std::borrow::Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        StorableString(String::from_utf8(bytes.to_vec()).unwrap())
    }
}

impl BoundedStorable for StorableString {
    const MAX_SIZE: u32 = 256;
    const IS_FIXED_SIZE: bool = false;
}

thread_local! {
    static REFERENCES: StableBTreeMap<StorableString, Reference, VirtualMemory<DefaultMemoryImpl>> = 
        StableBTreeMap::new(VirtualMemory::new(DefaultMemoryImpl::default()));
}

// Storage for verification results
thread_local! {
    static VERIFICATION_RESULTS: std::cell::RefCell<StableBTreeMap<StorableString, VerificationResult, VirtualMemory<DefaultMemoryImpl>>> = 
        std::cell::RefCell::new(StableBTreeMap::init(
            ic_stable_structures::memory_manager::MemoryManager::init(DefaultMemoryImpl::default())
                .get(2)
        ));
}

#[update]
fn generate_reference() -> String {
    let id = Uuid::new_v4().to_string();
    let new_reference = Reference {
        id: id.clone(),
        tasks: vec![],
        zk_proof: None,
    };
    
    REFERENCES.with(|store| {
        store.insert(StorableString(id.clone()), new_reference);
    });
    id
}

#[update]
fn assign_task(reference_id: String, description: String, config: Option<TaskConfig>) -> Option<String> {
    let task_id = Uuid::new_v4().to_string();
    let task = Task {
        id: task_id.clone(),
        description,
        status: "pending".to_string(),
        timestamp: time(),
        config,
    };
    
    REFERENCES.with(|store| {
        let reference_option = store.get(&StorableString(reference_id.clone()));
        if let Some(reference) = reference_option {
            let mut reference = reference.clone();
            reference.tasks.push(task.clone());
            store.insert(StorableString(reference_id.clone()), reference);
            Some(task_id)
        } else {
            None
        }
    })
}

#[query]
fn get_tasks(reference_id: String) -> Option<Vec<Task>> {
    REFERENCES.with(|store| {
        store.get(&StorableString(reference_id)).map(|r| r.tasks.clone())
    })
}

async fn execute_single_task(task: &mut Task) {
    if let Some(config) = &task.config {
        // Handle task based on disclosure level
        match config.disclosure_level.as_str() {
            "anonymous" => generate_anonymous_proof(task),
            "redacted" => generate_redacted_proof(task),
            _ => generate_full_proof(task),
        }

        // Store proof based on storage type
        match config.storage_type.as_str() {
            "chain" => store_proof_on_chain(task).await,
            "ipfs" => store_proof_on_ipfs(task).await,
            "encrypted" => store_encrypted_proof(task).await,
            _ => store_proof_on_chain(task).await,
        }

        // Implement retry logic
        let mut attempts = 0;
        while attempts < config.retry_attempts as u64 {
            match execute_task_operation(task).await {
                Ok(_) => break,
                Err(_) => {
                    attempts += 1;
                    if attempts == config.retry_attempts as u64 {
                        break;
                    }
                    // Wait before retry
                    let current_time = time();
                    while time() < current_time + 1_000_000_000 { } // 1 second delay
                }
            }
        }
    } else {
        // Execute with default settings if no config
        let _ = execute_task_operation(task).await;
    }
    
    task.status = "completed".to_string();
}

fn generate_anonymous_proof(task: &Task) {
    // Implementation for anonymous proof generation
}

fn generate_redacted_proof(task: &Task) {
    // Implementation for redacted proof generation
}

fn generate_full_proof(task: &Task) {
    // Implementation for full proof generation
}

async fn store_proof_on_chain(task: &Task) {
    // Implementation for on-chain storage
}

async fn store_proof_on_ipfs(task: &Task) {
    // Implementation for IPFS storage
}

async fn store_encrypted_proof(task: &Task) {
    // Implementation for encrypted storage
}

async fn execute_task_operation(task: &Task) -> Result<(), &'static str> {
    // Here you would implement the actual task execution logic
    // For now, we just simulate success
    Ok(())
}

#[update]
async fn execute_tasks(reference_id: String) -> Option<Vec<Task>> {
    REFERENCES.with(|store| {
        let reference_option = store.get(&StorableString(reference_id.clone()));
        if let Some(reference) = reference_option {
            let mut reference = reference.clone();
            
            // Execute each task
            for task in &mut reference.tasks {
                if task.status == "pending" {
                    // Note: In a real implementation, you would want to handle
                    // task execution asynchronously and possibly in parallel
                    ic_cdk::spawn(execute_single_task(task));
                }
            }

            let zk_proof = generate_zk_proof(&reference.id);
            reference.zk_proof = Some(zk_proof.clone());
            execute_on_eth_btc(&reference.id);
            store.insert(StorableString(reference_id.clone()), reference);
            Some(reference.tasks.clone())
        } else {
            None
        }
    })
}

#[update]
fn delete_reference(reference_id: String) -> bool {
    REFERENCES.with(|store| {
        store.remove(&StorableString(reference_id)).is_some()
    })
}

fn generate_zk_proof(reference_id: &str) -> String {
    let proof_input = json!({
        "reference_id": reference_id,
        "timestamp": time(),
    });
    proof_input.to_string()
}

#[update]
async fn execute_on_eth_btc(reference_id: &str) {
    let chain_fusion_principal = Principal::management_canister();
    
    let eth_tx = json!({
        "chain": "Ethereum",
        "action": "execute_task",
        "reference_id": reference_id,
        "timestamp": time(),
    });

    let btc_tx = json!({
        "chain": "Bitcoin",
        "action": "execute_task",
        "reference_id": reference_id,
        "timestamp": time(),
    });

    let eth_payload = to_vec(&eth_tx).unwrap();
    let btc_payload = to_vec(&btc_tx).unwrap();

    let _eth_result: Result<(), _> = call::<(Vec<u8>,), ()>(
        chain_fusion_principal, 
        "execute_transaction", 
        (eth_payload,)
    ).await;
    
    let _btc_result: Result<(), _> = call::<(Vec<u8>,), ()>(
        chain_fusion_principal, 
        "execute_transaction", 
        (btc_payload,)
    ).await;
}

#[update]
fn verify_nft_ownership(request: WalletVerificationRequest) -> VerificationResult {
    let proof_id = Uuid::new_v4().to_string();
    let anonymous_reference = Uuid::new_v4().to_string();
    
    // In a real implementation, this would make external calls to verify NFT ownership
    // For now, we'll simulate verification based on the wallet address
    // This is a placeholder - in production, you would integrate with actual blockchain APIs
    
    // Simple simulation: if wallet address starts with "0x", consider it verified
    let is_verified = request.wallet_address.starts_with("0x");
    
    let result = VerificationResult {
        is_verified,
        proof_id: proof_id.clone(),
        timestamp: time(),
        anonymous_reference,
    };
    
    // Store the verification result
    VERIFICATION_RESULTS.with(|results| {
        results.borrow_mut().insert(StorableString(proof_id.clone()), result.clone());
    });
    
    // Create a reference with a task for this verification
    let reference_id = generate_reference();
    let task_description = format!(
        "NFT ownership verification for wallet {} on chain {}",
        request.wallet_address,
        request.chain_id
    );
    
    let config = TaskConfig {
        priority: "high".to_string(),
        execution_delay: 0,
        retry_attempts: 3,
        disclosure_level: "anonymous".to_string(),
        storage_type: "chain".to_string(),
    };
    
    assign_task(reference_id, task_description, Some(config));
    
    result
}

#[query]
fn get_verification_proof(proof_id: String) -> Option<VerificationResult> {
    VERIFICATION_RESULTS.with(|results| {
        results.borrow().get(&StorableString(proof_id)).cloned()
    })
}