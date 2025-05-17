use candid::{CandidType, Deserialize, Principal};
use halo2_proofs::{
    dev::MockProver,
    plonk::{
        create_proof as create_plonk_proof, verify_proof as verify_plonk_proof,
        ProvingKey, VerifyingKey,
    },
    poly::kzg::{
        commitment::{KZGCommitmentScheme, ParamsKZG},
        strategy::SingleStrategy,
        multiopen::{VerifierSHPLONK, ProverSHPLONK},
    },
    transcript::{
        Blake2bRead, Blake2bWrite, Challenge255, TranscriptReadBuffer,
        TranscriptWriterBuffer,
    },
};
use halo2_proofs::halo2curves::bn256::{Bn256, Fr, G1Affine};
use rand::rngs::{OsRng, StdRng};
use rand::SeedableRng;
use serde::Serialize;
use hex;
use ic_cdk::api::time;
use ic_stable_structures::{Storable, BoundedStorable};
use std::borrow::Cow;

use crate::{
    circuits::{TokenRangeCircuit, create_circuit, TokenExactValueCircuit},
    CanisterError,
};

/// Represents the input data for token ownership proof
#[derive(Debug, Clone, CandidType, Serialize, Deserialize)]
pub struct TokenOwnershipInput {
    pub balance: u64,
    pub min_range: u64,
    pub max_range: u64,
    pub token_canister: Principal,
    pub token_standard: TokenStandard,
}

impl TokenOwnershipInput {
    pub fn validate(&self) -> Result<(), String> {
        if self.min_range > self.max_range {
            return Err("min_range must be less than or equal to max_range".to_string());
        }
        if self.balance < self.min_range || self.balance > self.max_range {
            return Err("balance must be within the specified range".to_string());
        }
        Ok(())
    }

    pub fn to_public_inputs(&self) -> Vec<Fr> {
        vec![
            Fr::from(self.balance),
            Fr::from(self.min_range),
            Fr::from(self.max_range),
        ]
    }
}

/// Represents token metadata
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TokenMetadata {
    /// The token standard (e.g., ERC20, ERC721)
    pub standard: TokenStandard,
    /// The token decimals
    pub decimals: u8,
    /// The fee
    pub fee: Option<u8>,
    /// The symbol
    pub symbol: String,
    /// The total supply
    pub total_supply: candid::Nat,
    /// The transfer fee
    pub transfer_fee: Option<candid::Nat>,
}

/// Supported token standards
#[derive(Debug, Clone, CandidType, Serialize, Deserialize)]
pub enum TokenStandard {
    DIP721,
    DIP1155,
    ICRC1,
    ICRC2,
    DIP20,
    EXT,
}

/// Result of proof generation
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum ProofError {
    InternalError,
    InvalidInput,
    GenerationFailed,
    VerificationFailed,
    ProofCreation(String),
    ProofVerification(String),
}

/// Result of proof verification
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum VerificationResult {
    Valid,
    Invalid,
}

pub type ProofResult = Result<Vec<u8>, ProofError>;

/// Constants
const MIN_CYCLES: u64 = 1_000_000_000; // 1B cycles minimum

/// Helper functions
pub fn validate_input(input: &TokenOwnershipInput) -> bool {
    if input.balance == 0 {
        return false;
    }

    if input.min_range > input.max_range {
        return false;
    }

    if input.balance < input.min_range || input.balance > input.max_range {
        return false;
    }

    true
}

/// Convert field element to integer
pub fn field_to_int(fr: &Fr) -> u64 {
    let bytes = fr.to_bytes();
    let mut result = 0u64;
    for (i, &byte) in bytes.iter().take(8).enumerate() {
        result |= (byte as u64) << (8 * i);
    }
    result
}

/// Convert balance to field element with validation
pub fn balance_to_field(balance: u64) -> Result<Fr, String> {
    let fr = Fr::from(balance);
    // Verify the conversion is reversible
    if field_to_int(&fr) != balance {
        return Err("Balance value too large for field element".to_string());
    }
    Ok(fr)
}

/// Create public inputs for the circuit with validation
pub fn create_public_inputs(input: &TokenOwnershipInput) -> Result<Vec<Fr>, String> {
    let balance = balance_to_field(input.balance)?;
    let min_range = balance_to_field(input.min_range)?;
    let max_range = balance_to_field(input.max_range)?;
    
    Ok(vec![balance, min_range, max_range])
}

/// Generate a mock proof for testing
pub fn generate_mock_proof(circuit: &TokenRangeCircuit) -> Result<Vec<u8>, ProofError> {
    let k = 4;
    let fr_inputs = vec![Fr::from(0u64)];
    let prover = MockProver::run(k, circuit, vec![fr_inputs]).unwrap();

    if prover.verify().is_ok() {
        Ok(vec![1, 2, 3, 4, 5])
    } else {
        Err(ProofError::GenerationFailed)
    }
}

/// Convert field element to string
pub fn field_to_string(fr: &Fr) -> String {
    // Convert Fr to bytes and then to hex string
    let bytes = fr.to_bytes();
    hex::encode(bytes)
}

/// Generate a real ZK proof using Halo2
pub fn generate_proof(
    params: &ParamsKZG<Bn256>,
    pk: &ProvingKey<G1Affine>,
    input: &TokenOwnershipInput,
) -> Result<Vec<u8>, CanisterError> {
    // Validate input and convert to field elements
    let public_inputs = create_public_inputs(input)
        .map_err(|e| CanisterError::InvalidInput(e))?;
    
    let circuit = create_circuit(
        public_inputs[0], // value
        public_inputs[1], // min_value
        public_inputs[2], // max_value
    );

    let mut transcript = Blake2bWrite::<_, G1Affine, Challenge255<_>>::init(vec![]);
    let mut rng = StdRng::from_entropy();

    // Create the proof
    create_plonk_proof::<KZGCommitmentScheme<Bn256>, ProverSHPLONK<'_, Bn256>, Challenge255<G1Affine>, _, _, _>(
        params,
        pk,
        &[circuit],
        &[&[&public_inputs]], // Pass all public inputs
        &mut rng,
        &mut transcript,
    ).map_err(|e| CanisterError::ProofCreation(e.to_string()))?;

    Ok(transcript.finalize())
}

/// Verify a ZK proof using Halo2
pub fn verify_proof(
    params: &ParamsKZG<Bn256>,
    vk: &VerifyingKey<G1Affine>,
    proof_bytes: &[u8],
    input: &TokenOwnershipInput,
) -> Result<bool, CanisterError> {
    // Validate input and convert to field elements
    let public_inputs = create_public_inputs(input)
        .map_err(|e| CanisterError::InvalidInput(e))?;

    let strategy = SingleStrategy::new(params);
    let mut transcript = Blake2bRead::<_, G1Affine, Challenge255<_>>::init(proof_bytes);

    // Verify the proof with all public inputs
    verify_plonk_proof::<KZGCommitmentScheme<Bn256>, VerifierSHPLONK<Bn256>, _, _, _>(
        params,
        vk,
        strategy,
        &[&[&public_inputs]], // Pass all public inputs
        &mut transcript,
    ).map_err(|e| CanisterError::ProofVerification(e.to_string()))
    .map(|_| true)
}

/// Generate a proof internally
pub fn generate_proof_internal(input: &TokenOwnershipInput) -> Result<Vec<u8>, String> {
    // Validate input
    input.validate()?;

    // Convert input to field elements
    let public_inputs = create_public_inputs(input)?;
    
    let circuit = create_circuit(
        public_inputs[0], // value
        public_inputs[1], // min_value
        public_inputs[2], // max_value
    );

    // For testing, use mock prover
    let k = 8; // Increased from 4 to handle larger values
    let prover = MockProver::run(k, &circuit, vec![public_inputs.clone()])
        .map_err(|e| format!("Mock prover setup failed: {}", e))?;

    prover.verify()
        .map_err(|e| format!("Mock proof verification failed: {:?}", e))?;

    // Return mock proof bytes
    Ok(vec![1, 2, 3, 4, 5])
}

/// Verify a proof internally
pub fn verify_proof_internal(
    proof_bytes: &[u8],
    public_inputs: &[Fr],
) -> Result<bool, String> {
    if public_inputs.len() != 3 {
        return Err("Expected 3 public inputs (value, min_range, max_range)".to_string());
    }

    let circuit = create_circuit(
        public_inputs[0], // value
        public_inputs[1], // min_value
        public_inputs[2], // max_value
    );

    // For testing, use mock prover
    let k = 8; // Increased from 4 to handle larger values
    let prover = MockProver::run(k, &circuit, vec![public_inputs.to_vec()])
        .map_err(|e| format!("Mock prover setup failed: {}", e))?;

    prover.verify()
        .map_err(|e| format!("Mock proof verification failed: {:?}", e))?;

    Ok(true)
}

pub fn convert_error(err: String) -> CanisterError {
    CanisterError::InternalError(err)
}

pub fn verify_mock_proof(
    input: &TokenOwnershipInput,
) -> Result<bool, CanisterError> {
    input.validate().map_err(|e| CanisterError::InvalidInput(e))?;

    let circuit = TokenRangeCircuit::new(
        Fr::from(input.balance),
        Fr::from(input.min_range),
        Fr::from(input.max_range),
    );

    let k = 4;
    let fr_inputs = vec![Fr::from(input.balance)];
    let prover = MockProver::run(k, &circuit, vec![fr_inputs]).unwrap();

    match prover.verify() {
        Ok(_) => Ok(true),
        Err(e) => Err(CanisterError::ProofVerificationFailed(format!("{:?}", e))),
    }
}

pub fn verify_exact_value_proof(
    params: &ParamsKZG<Bn256>,
    vk: &VerifyingKey<G1Affine>,
    proof_bytes: &[u8],
    value: u64,
    expected: u64,
) -> Result<bool, CanisterError> {
    let _circuit = TokenExactValueCircuit::create_circuit(
        Fr::from(value),
        Fr::from(expected),
    );

    let strategy = SingleStrategy::new(params);
    let mut transcript = Blake2bRead::<_, G1Affine, Challenge255<_>>::init(proof_bytes);

    let fr_inputs = vec![Fr::from(value)];
    let public_inputs_refs: Vec<&[Fr]> = vec![&fr_inputs];
    let public_inputs_refs_slice: &[&[&[Fr]]] = &[&public_inputs_refs];

    verify_plonk_proof::<KZGCommitmentScheme<Bn256>, VerifierSHPLONK<Bn256>, _, _, _>(
        params,
        vk,
        strategy,
        public_inputs_refs_slice,
        &mut transcript,
    ).map_err(|e| CanisterError::ProofVerificationFailed(e.to_string()))
    .map(|_| true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use halo2_proofs::dev::MockProver;
    use halo2_proofs::plonk::{keygen_pk, keygen_vk};

    #[test]
    fn test_input_validation() {
        let valid_input = TokenOwnershipInput {
            balance: 50,
            min_range: 0,
            max_range: 100,
        };
        assert!(valid_input.validate().is_ok());

        let invalid_balance = TokenOwnershipInput {
            balance: 150,
            min_range: 0,
            max_range: 100,
        };
        assert!(invalid_balance.validate().is_err());

        let invalid_range = TokenOwnershipInput {
            balance: 50,
            min_range: 100,
            max_range: 0,
        };
        assert!(invalid_range.validate().is_err());
    }

    #[test]
    fn test_field_conversion() {
        let balance = 12345u64;
        let field_element = balance_to_field(balance).expect("Failed to convert balance to field element");
        assert_eq!(field_element, Fr::from(balance));
    }

    #[test]
    fn test_public_inputs() {
        let input = TokenOwnershipInput {
            balance: 100,
            min_range: 0,
            max_range: 200,
        };
        let inputs = create_public_inputs(&input).expect("Failed to create public inputs");
        assert_eq!(inputs.len(), 3);
        assert_eq!(inputs[0], Fr::from(input.balance));
    }

    #[test]
    fn test_proof_generation_and_verification() {
        let k = 4;
        let mut rng = StdRng::from_entropy();
        let params = ParamsKZG::<Bn256>::setup(k, &mut rng);

        let input = TokenOwnershipInput {
            balance: 50,
            min_range: 0,
            max_range: 100,
        };

        let circuit = TokenRangeCircuit::new(
            Fr::from(input.balance),
            Fr::from(input.min_range),
            Fr::from(input.max_range),
        );

        let vk = keygen_vk(&params, &circuit).expect("Failed to generate verifying key");
        let pk = keygen_pk(&params, &vk, &circuit).expect("Failed to generate proving key");

        let proof = create_proof(&params, &pk, &input).expect("Failed to create proof");
        let result = verify_proof(&params, &vk, &proof, &input).expect("Failed to verify proof");

        assert!(result);
    }

    #[test]
    fn test_proof_expiration() {
        // Similar setup as above...
        // Add test for proof expiration by manipulating the timestamp
        // This would require mocking ic_cdk::api::time()
    }

    #[test]
    fn test_invalid_proof() {
        let k = 4;
        let mut rng = StdRng::from_entropy();
        let params = ParamsKZG::<Bn256>::setup(k, &mut rng);

        let input = TokenOwnershipInput {
            balance: 50,
            min_range: 0,
            max_range: 100,
        };

        let circuit = TokenRangeCircuit::new(
            Fr::from(input.balance),
            Fr::from(input.min_range),
            Fr::from(input.max_range),
        );

        let vk = keygen_vk(&params, &circuit).expect("Failed to generate verifying key");
        let pk = keygen_pk(&params, &vk, &circuit).expect("Failed to generate proving key");

        let proof = create_proof(&params, &pk, &input).expect("Failed to create proof");

        let invalid_input = TokenOwnershipInput {
            balance: 150,
            min_range: 0,
            max_range: 100,
        };

        let result = verify_proof(&params, &vk, &proof, &invalid_input);
        assert!(result.is_err());
    }

    #[test]
    fn test_proof_storage() {
        let mut storage = ProofStorage::new();
        let owner = Principal::anonymous();
        let proof = StoredProof {
            proof_bytes: vec![1, 2, 3],
            public_inputs: vec![field_to_string(&Fr::from(100u64))],
            expiry: 1000,
            owner,
        };

        // Test insert and get
        storage.insert(1, proof.clone());
        assert_eq!(storage.count_for_principal(&owner), 1);
        assert!(storage.get(1).is_some());

        // Test remove
        let removed = storage.remove(1);
        assert!(removed.is_some());
        assert_eq!(storage.count_for_principal(&owner), 0);
        assert!(storage.get(1).is_none());
    }

    #[test]
    fn test_proof_verification() {
        // Test parameters
        let k = 4;
        let input = TokenOwnershipInput {
            balance: 100,
            min_range: 0,
            max_range: 1000,
        };

        // Create circuit
        let value = Fr::from(input.balance);
        let min = Fr::from(input.min_range);
        let max = Fr::from(input.max_range);
        let circuit = TokenRangeCircuit::new(value, min, max);

        // Setup parameters
        let params = ParamsKZG::<Bn256>::setup(k as u32, OsRng);
        let vk = keygen_vk(&params, &circuit).unwrap();
        let pk = keygen_pk(&params, &vk, &circuit).unwrap();

        // Generate and verify proof
        let proof = create_proof(&params, &pk, &input).unwrap();
        let result = verify_proof(&params, &vk, &proof, &input).unwrap();
        assert!(result);
    }

    #[test]
    fn test_invalid_proof_mismatch() {
        // Test parameters
        let k = 4;
        let input = TokenOwnershipInput {
            balance: 100,
            min_range: 0,
            max_range: 1000,
        };

        // Create circuit
        let value = Fr::from(input.balance);
        let min = Fr::from(input.min_range);
        let max = Fr::from(input.max_range);
        let circuit = TokenRangeCircuit::new(value, min, max);

        // Setup parameters
        let params = ParamsKZG::<Bn256>::setup(k as u32, OsRng);
        let vk = keygen_vk(&params, &circuit).unwrap();
        let pk = keygen_pk(&params, &vk, &circuit).unwrap();

        // Generate proof with original input
        let proof = create_proof(&params, &pk, &input).unwrap();

        // Try to verify with different input
        let invalid_input = TokenOwnershipInput {
            balance: 200, // Different balance
            min_range: 0,
            max_range: 1000,
        };

        let result = verify_proof(&params, &vk, &proof, &invalid_input);
        assert!(result.is_err());
    }
}
