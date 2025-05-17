use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, Storable, BoundedStorable,
};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::HashMap;
use candid::{Decode, Encode};
use halo2_proofs::halo2curves::bn256::Fr;
use crate::proof::TokenStandard;

type Memory = VirtualMemory<DefaultMemoryImpl>;

const PROOF_MEMORY_ID: MemoryId = MemoryId::new(0);
const METRICS_MEMORY_ID: MemoryId = MemoryId::new(1);

const MAX_VALUE_SIZE: u32 = 100 * 1024; // 100KB max size for stored proofs

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static PROOF_STORAGE: RefCell<StableBTreeMap<u64, StoredProof, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(PROOF_MEMORY_ID))
        )
    );

    static METRICS_STORAGE: RefCell<StableBTreeMap<u64, StoredMetrics, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(METRICS_MEMORY_ID))
        )
    );
}

#[derive(Debug, Default, CandidType, Deserialize)]
pub struct ProofStorage {
    pub proofs: HashMap<u64, StoredProof>,
    pub counts: HashMap<Principal, u32>,
}

impl ProofStorage {
    pub fn new() -> Self {
        Self {
            proofs: HashMap::new(),
            counts: HashMap::new(),
        }
    }

    pub fn insert(&mut self, id: u64, proof: StoredProof) {
        let count = self.counts.entry(proof.owner).or_insert(0);
        *count += 1;
        self.proofs.insert(id, proof);
    }

    pub fn get(&self, id: u64) -> Option<&StoredProof> {
        self.proofs.get(&id)
    }

    pub fn remove(&mut self, id: u64) -> Option<StoredProof> {
        if let Some(proof) = self.proofs.remove(&id) {
            if let Some(count) = self.counts.get_mut(&proof.owner) {
                *count = count.saturating_sub(1);
                if *count == 0 {
                    self.counts.remove(&proof.owner);
                }
            }
            Some(proof)
        } else {
            None
        }
    }

    pub fn count_for_principal(&self, principal: Principal) -> u32 {
        self.counts.get(&principal).copied().unwrap_or(0)
    }

    pub fn cleanup_expired(&mut self, current_time: u64) {
        let expired_ids: Vec<u64> = self.proofs
            .iter()
            .filter(|(_, proof)| proof.is_expired(current_time))
            .map(|(id, _)| *id)
            .collect();

        for id in expired_ids {
            self.remove(id);
        }
    }

    pub fn to_stable(&self) -> Vec<u8> {
        candid::encode_one(self).unwrap()
    }

    pub fn from_stable(bytes: Vec<u8>) -> Self {
        candid::decode_one(&bytes).unwrap_or_default()
    }
}

impl Storable for ProofStorage {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.to_stable())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self::from_stable(bytes.to_vec())
    }
}

impl BoundedStorable for ProofStorage {
    const MAX_SIZE: u32 = 100 * 1024 * 1024; // 100MB max size
    const IS_FIXED_SIZE: bool = false;
}

#[derive(Debug, Default, CandidType, Deserialize)]
pub struct StoredMetrics {
    pub total_proofs_generated: u64,
    pub total_proofs_verified: u64,
    pub avg_proof_generation_time_ms: u64,
    pub avg_proof_verification_time_ms: u64,
    pub total_errors: u64,
    pub error_types: HashMap<String, u64>,
}

impl StoredMetrics {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record_proof_generation(&mut self, time_ms: u64) {
        self.total_proofs_generated += 1;
        self.avg_proof_generation_time_ms = (
            self.avg_proof_generation_time_ms * (self.total_proofs_generated - 1) + time_ms
        ) / self.total_proofs_generated;
    }

    pub fn record_proof_verification(&mut self, time_ms: u64) {
        self.total_proofs_verified += 1;
        self.avg_proof_verification_time_ms = (
            self.avg_proof_verification_time_ms * (self.total_proofs_verified - 1) + time_ms
        ) / self.total_proofs_verified;
    }

    pub fn record_error(&mut self, error_type: String) {
        self.total_errors += 1;
        *self.error_types.entry(error_type).or_insert(0) += 1;
    }
}

impl Storable for StoredMetrics {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap_or_default()
    }
}

impl BoundedStorable for StoredMetrics {
    const MAX_SIZE: u32 = 10 * 1024; // 10KB max size
    const IS_FIXED_SIZE: bool = false;
}

pub struct Storage;

impl Storage {
    pub fn store_proof(id: u64, proof: StoredProof) {
        PROOF_STORAGE.with(|storage| {
            storage.borrow_mut().insert(id, proof);
        });
    }

    pub fn get_proof(proof_id: u64) -> Option<StoredProof> {
        PROOF_STORAGE.with(|storage| storage.borrow().get(&proof_id))
    }

    pub fn cleanup_expired_proofs() {
        let current_time = ic_cdk::api::time();
        PROOF_STORAGE.with(|storage| {
            let mut storage = storage.borrow_mut();
            let expired: Vec<u64> = storage
                .iter()
                .filter(|(_, proof)| proof.expiry < current_time)
                .map(|(id, _)| id)
                .collect();

            for id in expired {
                storage.remove(&id);
            }
        });
    }

    pub fn update_metrics(metrics: StoredMetrics) {
        let timestamp = ic_cdk::api::time();
        METRICS_STORAGE.with(|storage| {
            storage.borrow_mut().insert(timestamp, metrics);
        });
    }

    pub fn get_latest_metrics() -> Option<StoredMetrics> {
        METRICS_STORAGE.with(|storage| {
            storage
                .borrow()
                .iter()
                .max_by_key(|(timestamp, _)| *timestamp)
                .map(|(_, metrics)| metrics)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ic_cdk::api::time;

    #[test]
    fn test_proof_storage() {
        let mut storage = ProofStorage::new();
        let owner = Principal::anonymous();
        let proof = StoredProof {
            proof_bytes: vec![1, 2, 3],
            public_inputs: vec!["input".to_string()],
            expiry: time() + 3600 * 1000_000_000, // 1 hour from now
            owner,
        };

        // Test insertion
        let id = storage.insert(proof.clone(), owner);
        assert_eq!(storage.count_for_principal(owner), 1);

        // Test retrieval
        let stored = storage.get(id).unwrap();
        assert_eq!(stored.proof_bytes, proof.proof_bytes);

        // Test removal
        storage.remove(id);
        assert_eq!(storage.count_for_principal(owner), 0);
        assert!(storage.get(id).is_none());
    }

    #[test]
    fn test_metrics_storage() {
        let metrics = StoredMetrics {
            total_proofs_generated: 10,
            total_proofs_verified: 8,
            avg_proof_generation_time_ms: 100.0,
            avg_proof_verification_time_ms: 50.0,
            total_errors: 0,
            error_types: HashMap::new(),
        };

        Storage::update_metrics(metrics.clone());
        let retrieved = Storage::get_latest_metrics().unwrap();

        assert_eq!(
            retrieved.total_proofs_generated,
            metrics.total_proofs_generated
        );
        assert_eq!(
            retrieved.total_proofs_verified,
            metrics.total_proofs_verified
        );
    }
}

#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct StoredProof {
    pub proof_bytes: Vec<u8>,
    pub public_inputs: Vec<String>,
    pub expiry: u64,
    pub owner: Principal,
    pub token_canister: Principal,
    pub token_standard: TokenStandard,
    pub verified_balance: u64,
}

impl StoredProof {
    pub fn new(
        proof_bytes: Vec<u8>,
        public_inputs: Vec<String>,
        expiry: u64,
        owner: Principal,
        token_canister: Principal,
        token_standard: TokenStandard,
        verified_balance: u64,
    ) -> Self {
        Self {
            proof_bytes,
            public_inputs,
            expiry,
            owner,
            token_canister,
            token_standard,
            verified_balance,
        }
    }

    pub fn is_expired(&self, current_time: u64) -> bool {
        current_time >= self.expiry
    }

    pub fn get_public_inputs_as_fr(&self) -> Result<Vec<Fr>, String> {
        self.public_inputs.iter()
            .map(|hex_str| {
                let bytes = hex::decode(hex_str)
                    .map_err(|e| format!("Failed to decode hex string: {:?}", e))?;
                if bytes.len() != 32 {
                    return Err("Invalid field element length".to_string());
                }
                let mut arr = [0u8; 32];
                arr.copy_from_slice(&bytes);
                let fr = Fr::from_bytes(&arr);
                if fr.is_some().into() {
                    Ok(fr.unwrap())
                } else {
                    Err("Invalid field element".to_string())
                }
            })
            .collect()
    }
}

impl Storable for StoredProof {
    fn to_bytes(&self) -> Cow<[u8]> {
        let bytes = candid::encode_one(self).unwrap();
        Cow::Owned(bytes)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }
}

impl BoundedStorable for StoredProof {
    const MAX_SIZE: u32 = 100 * 1024; // 100KB max size
    const IS_FIXED_SIZE: bool = false;
}
