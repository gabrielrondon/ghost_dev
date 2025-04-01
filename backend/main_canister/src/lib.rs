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
use sha2;
use sha2::{Sha256, Digest};
use hex;
use ic_stable_structures::storable::{Bound, BoundedStorable};

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

impl Storable for VerificationResult {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(self.proof_id.as_bytes());
        bytes.extend_from_slice(&[self.is_valid as u8]);
        bytes.extend_from_slice(&(self.timestamp as u64).to_le_bytes());
        std::borrow::Cow::Owned(bytes)
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        let bytes = bytes.as_ref();
        let proof_id = String::from_utf8_lossy(&bytes[0..bytes.len().min(32)]).to_string();
        let is_valid = if bytes.len() > 32 { bytes[32] != 0 } else { false };
        let timestamp = if bytes.len() >= 41 {
            u64::from_le_bytes(bytes[33..41].try_into().unwrap_or_default()) as u128
        } else {
            0
        };
        
        Self {
            proof_id,
            is_valid,
            timestamp,
        }
    }
}

impl BoundedStorable for VerificationResult {
    const MAX_SIZE: u32 = 256; // Set an appropriate maximum size
    const IS_FIXED_SIZE: bool = false;
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct TokenProofRequest {
    token_id: String,
    min_balance: u64,
    wallet_address: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
struct TokenProofResult {
    proof_id: String,
    token_id: String,
    merkle_root: String,
    proof_data: Vec<u8>,
    anonymous_reference: String,
    timestamp: u128,
    is_valid: bool,
}

impl Storable for TokenProofResult {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(self.proof_id.as_bytes());
        bytes.extend_from_slice(self.token_id.as_bytes());
        bytes.extend_from_slice(self.merkle_root.as_bytes());
        
        // Store proof data length and content
        let data_len = (self.proof_data.len() as u32).to_le_bytes();
        bytes.extend_from_slice(&data_len);
        bytes.extend_from_slice(&self.proof_data);
        
        bytes.extend_from_slice(self.anonymous_reference.as_bytes());
        
        // Store timestamp and valid flag
        let timestamp_bytes = (self.timestamp as u64).to_le_bytes();
        bytes.extend_from_slice(&timestamp_bytes);
        bytes.push(self.is_valid as u8);
        
        std::borrow::Cow::Owned(bytes)
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        let bytes = bytes.as_ref();
        let mut offset = 0;
        
        // Read proof_id (first 32 bytes or less)
        let proof_id_len = bytes.len().min(32);
        let proof_id = String::from_utf8_lossy(&bytes[0..proof_id_len]).to_string();
        offset += proof_id_len;
        
        // Read token_id (next 32 bytes or less)
        let token_id_len = bytes.len().saturating_sub(offset).min(32);
        let token_id = if token_id_len > 0 {
            String::from_utf8_lossy(&bytes[offset..offset+token_id_len]).to_string()
        } else {
            String::new()
        };
        offset += token_id_len;
        
        // Read merkle_root (next 32 bytes or less)
        let merkle_root_len = bytes.len().saturating_sub(offset).min(32);
        let merkle_root = if merkle_root_len > 0 {
            String::from_utf8_lossy(&bytes[offset..offset+merkle_root_len]).to_string()
        } else {
            String::new()
        };
        offset += merkle_root_len;
        
        // Read proof data length (4 bytes) and content
        let mut proof_data = Vec::new();
        if bytes.len() >= offset + 4 {
            let data_len_bytes = &bytes[offset..offset+4];
            let data_len = u32::from_le_bytes([
                data_len_bytes[0], 
                data_len_bytes[1], 
                data_len_bytes[2], 
                data_len_bytes[3]
            ]) as usize;
            offset += 4;
            
            if bytes.len() >= offset + data_len {
                proof_data = bytes[offset..offset+data_len].to_vec();
                offset += data_len;
            }
        }
        
        // Read anonymous_reference (next 32 bytes or less)
        let anon_ref_len = bytes.len().saturating_sub(offset).min(32);
        let anonymous_reference = if anon_ref_len > 0 {
            String::from_utf8_lossy(&bytes[offset..offset+anon_ref_len]).to_string()
        } else {
            String::new()
        };
        offset += anon_ref_len;
        
        // Read timestamp (8 bytes) and valid flag (1 byte)
        let timestamp = if bytes.len() >= offset + 8 {
            let timestamp_bytes = &bytes[offset..offset+8];
            u64::from_le_bytes([
                timestamp_bytes[0], 
                timestamp_bytes[1], 
                timestamp_bytes[2], 
                timestamp_bytes[3],
                timestamp_bytes[4], 
                timestamp_bytes[5], 
                timestamp_bytes[6], 
                timestamp_bytes[7]
            ]) as u128
        } else {
            0
        };
        offset += 8;
        
        let is_valid = bytes.len() > offset && bytes[offset] != 0;
        
        Self {
            proof_id,
            token_id,
            merkle_root,
            proof_data,
            anonymous_reference,
            timestamp,
            is_valid,
        }
    }
}

impl BoundedStorable for TokenProofResult {
    const MAX_SIZE: u32 = 1024; // Set an appropriate maximum size
    const IS_FIXED_SIZE: bool = false;
}

// Add ICP ledger interface

#[derive(CandidType, Deserialize)]
struct Account {
    owner: Principal,
    subaccount: Option<[u8; 32]>,
}

#[derive(CandidType, Deserialize)]
struct ICPBalance {
    e8s: u64,  // ICP balance in e8s (10^-8 ICP)
}

const ICP_LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

async fn get_icp_balance(account: Account) -> Result<u64, String> {
    let ledger_id = Principal::from_text(ICP_LEDGER_CANISTER_ID)
        .map_err(|e| format!("Invalid ledger ID: {}", e))?;
    
    let balance_result: Result<(ICPBalance,), _> = call(
        ledger_id,
        "account_balance",
        (account,)
    ).await;
    
    match balance_result {
        Ok((balance,)) => Ok(balance.e8s),
        Err((_, msg)) => Err(format!("Failed to get balance: {}", msg))
    }
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
                .get(Memory::from(2))
        ));
}

// Storage for merkle root
thread_local! {
    static MERKLE_ROOT: std::cell::RefCell<String> = std::cell::RefCell::new(String::new());
}

// Storage for token proofs
thread_local! {
    static TOKEN_PROOFS: std::cell::RefCell<StableBTreeMap<StorableString, TokenProofResult, VirtualMemory<DefaultMemoryImpl>>> = 
        std::cell::RefCell::new(StableBTreeMap::init(
            ic_stable_structures::memory_manager::MemoryManager::init(DefaultMemoryImpl::default())
                .get(Memory::from(3))
        ));
}

// Merkle tree node structure - essential for building the tree hierarchy
#[derive(Clone, Debug)]
struct MerkleNode {
    hash: Vec<u8>,
    left: Option<Box<MerkleNode>>,
    right: Option<Box<MerkleNode>>,
}

// Balance leaf structure - represents individual token balance entries
#[derive(Clone, Debug)]
struct BalanceLeaf {
    principal: Principal,
    token_id: u64,
    balance: u64,
}

impl BalanceLeaf {
    // Hash function for leaf nodes - ensures data integrity
    fn hash(&self) -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(self.principal.as_slice());
        hasher.update(&self.token_id.to_be_bytes());
        hasher.update(&self.balance.to_be_bytes());
        hasher.finalize().to_vec()
    }
}

// Merkle tree implementation - manages the entire tree structure
struct MerkleTree {
    root: Option<MerkleNode>,
    leaves: Vec<BalanceLeaf>,
}

impl MerkleTree {
    // Create new empty tree - initialization point for the tree
    fn new() -> Self {
        MerkleTree {
            root: None,
            leaves: Vec::new(),
        }
    }
    
    // Add a new balance entry - updates tree with new token balance
    fn add_balance(&mut self, principal: Principal, token_id: u64, balance: u64) {
        let leaf = BalanceLeaf {
            principal,
            token_id,
            balance,
        };
        self.leaves.push(leaf);
        self.rebuild_tree();
    }
    
    // Update existing balance - crucial for maintaining current state
    fn update_balance(&mut self, principal: Principal, token_id: u64, new_balance: u64) -> bool {
        if let Some(leaf) = self.leaves.iter_mut().find(|l| l.principal == principal && l.token_id == token_id) {
            leaf.balance = new_balance;
            self.rebuild_tree();
            true
        } else {
            false
        }
    }
    
    // Rebuild entire tree - ensures tree consistency after updates
    fn rebuild_tree(&mut self) {
        if self.leaves.is_empty() {
            self.root = None;
            return;
        }
        
        let mut current_level: Vec<MerkleNode> = self.leaves.iter()
            .map(|leaf| MerkleNode {
                hash: leaf.hash(),
                left: None,
                right: None,
            })
            .collect();
        
        while current_level.len() > 1 {
            let mut next_level = Vec::new();
            for chunk in current_level.chunks(2) {
                match chunk {
                    [left] => next_level.push(left.clone()),
                    [left, right] => {
                        let mut hasher = Sha256::new();
                        hasher.update(&left.hash);
                        hasher.update(&right.hash);
                        next_level.push(MerkleNode {
                            hash: hasher.finalize().to_vec(),
                            left: Some(Box::new(left.clone())),
                            right: Some(Box::new(right.clone())),
                        });
                    }
                    _ => unreachable!(),
                }
            }
            current_level = next_level;
        }
        
        self.root = Some(current_level.remove(0));
    }
    
    // Generate proof path - essential for ZK proof verification
    fn generate_proof(&self, principal: Principal, token_id: u64) -> Option<(Vec<Vec<u8>>, Vec<bool>)> {
        let target_leaf = self.leaves.iter()
            .position(|l| l.principal == principal && l.token_id == token_id)?;
        
        let mut proof = Vec::new();
        let mut path_indices = Vec::new();
        let mut current_pos = target_leaf;
        let mut current_level: Vec<_> = self.leaves.iter().map(|l| l.hash()).collect();
        
        while current_level.len() > 1 {
            let sibling_pos = if current_pos % 2 == 0 {
                current_pos + 1
            } else {
                current_pos - 1
            };
            
            if sibling_pos < current_level.len() {
                proof.push(current_level[sibling_pos].clone());
                path_indices.push(current_pos % 2 == 0);
            }
            
            current_pos /= 2;
            current_level = current_level.chunks(2)
                .map(|chunk| {
                    let mut hasher = Sha256::new();
                    hasher.update(&chunk[0]);
                    if chunk.len() > 1 {
                        hasher.update(&chunk[1]);
                    }
                    hasher.finalize().to_vec()
                })
                .collect();
        }
        
        Some((proof, path_indices))
    }
    
    // Get current root hash - needed for proof verification
    fn root_hash(&self) -> Option<Vec<u8>> {
        self.root.as_ref().map(|node| node.hash.clone())
    }
}

// Thread-local storage for the Merkle tree - maintains global tree state
thread_local! {
    static MERKLE_TREE: std::cell::RefCell<MerkleTree> = std::cell::RefCell::new(MerkleTree::new());
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

#[update]
async fn generate_token_proof(request: TokenProofRequest) -> Result<TokenProofResult, String> {
    // Validate request
    if request.min_balance == 0 {
        return Err("Minimum balance must be greater than 0".to_string());
    }

    // Get current merkle root
    let merkle_root = MERKLE_ROOT.with(|root| root.borrow().clone());
    if merkle_root.is_empty() {
        return Err("Merkle root not initialized".to_string());
    }

    // Convert wallet address to Principal
    let wallet_principal = Principal::from_text(&request.wallet_address)
        .map_err(|e| format!("Invalid wallet address: {}", e))?;

    // Get actual token balance from ICP ledger
    let account = Account {
        owner: wallet_principal,
        subaccount: None,
    };
    
    let actual_balance = get_icp_balance(account).await?;
    
    if actual_balance < request.min_balance {
        return Err("Insufficient balance".to_string());
    }

    // Prepare input for ZK circuit
    let token_metadata = TokenMetadata {
        canister_id: Principal::from_text(ICP_LEDGER_CANISTER_ID).unwrap(),
        token_standard: TokenStandard::ICP,
        decimals: 8,  // ICP uses 8 decimal places
    };

    let circuit_input = TokenOwnershipInput {
        token_metadata,
        token_id: 1,  // ICP token ID is always 1
        balance: actual_balance,
        owner_hash: hash_principal(&wallet_principal),
        merkle_path: generate_merkle_path(wallet_principal, actual_balance),
        path_indices: generate_path_indices(),
        token_specific_data: None,
    };

    // Generate ZK proof using the circuit
    let zk_canister = Principal::from_text("hi7bu-myaaa-aaaad-aaloa-cai")
        .map_err(|e| format!("Invalid ZK canister ID: {}", e))?;
    
    let proof_result: Result<Vec<u8>, String> = call(
        zk_canister,
        "prove_ownership",
        (CIRCUIT_PARAMS, circuit_input)
    ).await.map_err(|(_, msg)| msg)?;

    let proof_data = proof_result.iter()
        .enumerate()
        .map(|(i, &b)| (i as u8, vec![b]))
        .collect();

    let proof_id = Uuid::new_v4().to_string();
    let anonymous_reference = Uuid::new_v4().to_string();
    
    let result = TokenProofResult {
        proof_id: proof_id.clone(),
        token_id: request.token_id.clone(),
        merkle_root,
        proof_data,
        anonymous_reference: anonymous_reference.clone(),
        timestamp: ic_cdk::api::time(),
        is_valid: true,
    };
    
    // Store the proof
    TOKEN_PROOFS.with(|proofs| {
        proofs.borrow_mut().insert(StorableString(proof_id.clone()), result.clone());
    });
    
    Ok(result)
}

// Helper function to hash a Principal for the circuit
fn hash_principal(principal: &Principal) -> Vec<u8> {
    let mut hasher = sha2::Sha256::new();
    hasher.update(principal.as_slice());
    hasher.finalize().to_vec()
}

// Helper function to generate Merkle path - now uses actual Merkle tree
fn generate_merkle_path(principal: Principal, balance: u64) -> Vec<u64> {
    MERKLE_TREE.with(|tree| {
        let mut tree = tree.borrow_mut();
        // Update or add the balance to the tree
        if !tree.update_balance(principal, 1, balance) {
            tree.add_balance(principal, 1, balance);
        }
        // Convert proof format for ZK circuit
        if let Some((proof, _)) = tree.generate_proof(principal, 1) {
            proof.iter()
                .map(|hash| u64::from_be_bytes(hash[0..8].try_into().unwrap()))
                .collect()
        } else {
            vec![] // Empty proof as fallback
        }
    })
}

// Helper function to generate path indices - now uses actual Merkle tree
fn generate_path_indices() -> Vec<u8> {
    MERKLE_TREE.with(|tree| {
        // Get proof for any leaf (we only need the indices)
        if let Some(leaf) = tree.borrow().leaves.first() {
            if let Some((_, indices)) = tree.borrow().generate_proof(leaf.principal, leaf.token_id) {
                indices.iter().map(|&b| b as u8).collect()
            } else {
                vec![]
            }
        } else {
            vec![]
        }
    })
}

#[query]
fn get_merkle_root() -> Result<String, String> {
    MERKLE_TREE.with(|tree| {
        tree.borrow()
            .root_hash()
            .map(|hash| hex::encode(hash))
            .ok_or_else(|| "Merkle root not initialized".to_string())
    })
}

#[update]
fn update_merkle_root(root: String) -> Result<(), String> {
    // This function is now deprecated since the root is managed by the tree
    Err("Merkle root is now managed automatically by the tree".to_string())
}

// Add new function to get balance proof - useful for frontend verification
#[query]
fn get_balance_proof(principal: Principal, token_id: u64) -> Option<(Vec<Vec<u8>>, Vec<bool>)> {
    MERKLE_TREE.with(|tree| {
        tree.borrow().generate_proof(principal, token_id)
    })
}

#[derive(CandidType, Deserialize, Clone, Debug)]
enum TokenStandard {
    ICP,
    ERC20,
    ICRC1,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct TokenMetadata {
    canister_id: Principal,
    token_standard: TokenStandard,
    decimals: u8,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct TokenOwnershipInput {
    token_metadata: TokenMetadata,
    token_id: u64,
    balance: u64,
    owner_hash: Vec<u8>,
    merkle_path: Vec<u64>,
    path_indices: Vec<u8>,
    token_specific_data: Option<Vec<u8>>,
}

// Circuit parameters (in production, these would be loaded from a file)
const CIRCUIT_PARAMS: &[u8] = &[0u8; 32];  // Placeholder

#[update]
async fn verify_token_proof(zk_canister: Principal, proof: Vec<u8>) -> Result<bool, String> {
    ic_cdk::println!("Verifying token proof with ZK canister");
    
    // Call the ZK canister to verify the proof
    match ic_cdk::call(zk_canister, "verify_proof", (proof,)).await {
        Ok(result) => {
            let is_valid: Result<bool, String> = result;
            match is_valid {
                Ok(valid) => Ok(valid),
                Err(e) => Err(format!("ZK canister returned an error: {}", e))
            }
        },
        Err((code, msg)) => {
            Err(format!("Failed to call ZK canister: {} (code: {:?})", msg, code))
        }
    }
}

// Function to store verification results
fn store_verification_result(proof_id: String, is_valid: bool) {
    let result = VerificationResult {
        proof_id: proof_id.clone(),
        is_valid,
        timestamp: ic_cdk::api::time(),
    };

    VERIFICATION_RESULTS.with(|results| {
        results.borrow_mut().insert(StorableString(proof_id.clone()), result);
    });
}

// Function to store token proofs
fn store_token_proof(proof_id: String, token_id: String, merkle_root: String, proof_data: Vec<u8>, anonymous_reference: String) -> TokenProofResult {
    let result = TokenProofResult {
        proof_id: proof_id.clone(),
        token_id,
        merkle_root,
        proof_data,
        anonymous_reference,
        timestamp: ic_cdk::api::time(),
        is_valid: true,
    };

    TOKEN_PROOFS.with(|proofs| {
        proofs.borrow_mut().insert(StorableString(proof_id.clone()), result.clone());
    });

    result
}

#[query]
fn __get_candid_interface_tmp_hack() -> String {
    include_str!("../main_canister.did").to_string()
}

// For newer versions of dfx, you may also want to export the Candid interface 
#[cfg(test)]
mod tests {
    use super::*;
    use candid::{export_service, Principal};

    #[test]
    fn export_candid() {
        export_service!();
        std::println!("{}", __export_service());
    }
}