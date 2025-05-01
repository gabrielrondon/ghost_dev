use std::cell::RefCell;
use std::rc::Rc;

// Mock time for testing
thread_local! {
    static MOCK_TIME: RefCell<Option<u64>> = RefCell::new(None);
}

pub fn set_mock_time(time: u64) {
    MOCK_TIME.with(|t| {
        *t.borrow_mut() = Some(time);
    });
}

pub fn clear_mock_time() {
    MOCK_TIME.with(|t| {
        *t.borrow_mut() = None;
    });
}

pub fn get_time() -> u64 {
    MOCK_TIME.with(|t| t.borrow().unwrap_or_else(|| ic_cdk::api::time()))
}

// Mock cycle balance for testing
thread_local! {
    static MOCK_CYCLES: RefCell<Option<u64>> = RefCell::new(None);
}

pub fn set_mock_cycles(cycles: u64) {
    MOCK_CYCLES.with(|c| {
        *c.borrow_mut() = Some(cycles);
    });
}

pub fn clear_mock_cycles() {
    MOCK_CYCLES.with(|c| {
        *c.borrow_mut() = None;
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        init, prove_ownership, verify_proof, ProofError, TokenMetadata, TokenOwnershipInput,
        TokenStandard, VerificationResult,
    };
    use candid::Principal;
    use halo2_proofs::{dev::MockProver, pasta::Fp};
    use ic_cdk::api::time;

    #[test]
    fn test_range_check_valid() {
        let k = 4;
        let value = 5;
        let min = 0;
        let max = 10;

        let circuit = create_circuit(value, min, max);
        let prover = MockProver::run(k, &circuit, vec![vec![Fp::from(value)]]).unwrap();
        assert_eq!(prover.verify(), Ok(()));
    }

    #[test]
    fn test_range_check_below_min() {
        let k = 4;
        let value = 0;
        let min = 5;
        let max = 10;

        let circuit = create_circuit(value, min, max);
        let prover = MockProver::run(k, &circuit, vec![vec![Fp::from(value)]]).unwrap();
        assert!(prover.verify().is_err());
    }

    #[test]
    fn test_range_check_above_max() {
        let k = 4;
        let value = 15;
        let min = 0;
        let max = 10;

        let circuit = create_circuit(value, min, max);
        let prover = MockProver::run(k, &circuit, vec![vec![Fp::from(value)]]).unwrap();
        assert!(prover.verify().is_err());
    }

    #[test]
    fn test_proof_generation() {
        let result = generate_proof(5, 0, 10);
        assert!(result.is_ok());
        assert!(!result.unwrap().is_empty());
    }

    #[test]
    fn test_proof_verification() {
        let proof = generate_proof(5, 0, 10).unwrap();
        let result = verify_proof(&proof);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_empty_proof_verification() {
        let result = verify_proof(&[]);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Empty proof");
    }

    #[test]
    fn test_complete_flow() {
        // Initialize the canister
        init();

        // Create test input
        let input = TokenOwnershipInput {
            owner: Principal::anonymous(),
            token_metadata: TokenMetadata {
                standard: TokenStandard::ICRC1,
                decimals: 8,
                fee: None,
                symbol: "TEST".to_string(),
                total_supply: candid::Nat::from(1_000_000u64),
                transfer_fee: None,
            },
            balance_ranges: vec![(100, 0, 1000)],
            timestamp: time(),
            nonce: vec![1, 2, 3, 4],
        };

        // Generate proof
        let proof = prove_ownership(Principal::anonymous(), input.clone())
            .expect("Failed to generate proof");

        // Verify the proof
        match verify_proof(proof) {
            VerificationResult::Valid => (),
            VerificationResult::Invalid => panic!("Proof verification failed"),
        }
    }

    #[test]
    fn test_rate_limiting() {
        init();
        let principal = Principal::anonymous();
        let mut proofs = Vec::new();

        // Try to generate more proofs than allowed
        for i in 0..12 {
            let input = TokenOwnershipInput {
                owner: principal,
                token_metadata: TokenMetadata {
                    standard: TokenStandard::ICRC1,
                    decimals: 8,
                    fee: None,
                    symbol: "TEST".to_string(),
                    total_supply: candid::Nat::from(1_000_000u64),
                    transfer_fee: None,
                },
                balance_ranges: vec![(100 + i, 0, 1000)],
                timestamp: time(),
                nonce: vec![i as u8; 4],
            };

            match prove_ownership(principal, input) {
                Ok(proof) => proofs.push(proof),
                Err(ProofError::InternalError) if i >= 10 => (),
                Err(e) => panic!("Unexpected error: {:?}", e),
            }
        }

        assert_eq!(
            proofs.len(),
            10,
            "Should only allow 10 proofs per principal"
        );
    }

    #[test]
    fn test_proof_expiration() {
        init();
        let principal = Principal::anonymous();

        // Set initial time
        let initial_time = 1_000_000_000_000;
        set_mock_time(initial_time);

        let input = TokenOwnershipInput {
            owner: principal,
            token_metadata: TokenMetadata {
                standard: TokenStandard::ICRC1,
                decimals: 8,
                fee: None,
                symbol: "TEST".to_string(),
                total_supply: candid::Nat::from(1_000_000u64),
                transfer_fee: None,
            },
            balance_ranges: vec![(100, 0, 1000)],
            timestamp: get_time(),
            nonce: vec![1; 32], // 32 bytes nonce
        };

        // Generate proof
        let proof = prove_ownership(principal, input).expect("Failed to generate proof");

        // Fast forward time by 25 hours
        set_mock_time(initial_time + 25 * 60 * 60 * 1_000_000_000);

        // Verify expired proof
        match verify_proof(proof) {
            VerificationResult::Invalid => (),
            VerificationResult::Valid => panic!("Expired proof should be invalid"),
        }

        // Clean up
        clear_mock_time();
    }

    #[test]
    fn test_recent_proof_validation() {
        init();
        let principal = Principal::anonymous();

        // Set initial time
        let initial_time = 1_000_000_000_000;
        set_mock_time(initial_time);

        let input = TokenOwnershipInput {
            owner: principal,
            token_metadata: TokenMetadata {
                standard: TokenStandard::ICRC1,
                decimals: 8,
                fee: None,
                symbol: "TEST".to_string(),
                total_supply: candid::Nat::from(1_000_000u64),
                transfer_fee: None,
            },
            balance_ranges: vec![(100, 0, 1000)],
            timestamp: get_time(),
            nonce: vec![1; 32], // 32 bytes nonce
        };

        // Generate proof
        let proof = prove_ownership(principal, input).expect("Failed to generate proof");

        // Fast forward time by 1 hour (should still be valid)
        set_mock_time(initial_time + 1 * 60 * 60 * 1_000_000_000);

        // Verify recent proof
        match verify_proof(proof) {
            VerificationResult::Valid => (),
            VerificationResult::Invalid => panic!("Recent proof should be valid"),
        }

        // Clean up
        clear_mock_time();
    }

    #[test]
    fn test_invalid_inputs() {
        init();
        let principal = Principal::anonymous();

        // Test with empty balance ranges
        let input = TokenOwnershipInput {
            owner: principal,
            token_metadata: TokenMetadata {
                standard: TokenStandard::ICRC1,
                decimals: 8,
                fee: None,
                symbol: "TEST".to_string(),
                total_supply: candid::Nat::from(1_000_000u64),
                transfer_fee: None,
            },
            balance_ranges: vec![],
            timestamp: time(),
            nonce: vec![1, 2, 3, 4],
        };

        match prove_ownership(principal, input) {
            Err(ProofError::InvalidInput) => (),
            _ => panic!("Should reject empty balance ranges"),
        }

        // Test with invalid range (min > max)
        let input = TokenOwnershipInput {
            owner: principal,
            token_metadata: TokenMetadata {
                standard: TokenStandard::ICRC1,
                decimals: 8,
                fee: None,
                symbol: "TEST".to_string(),
                total_supply: candid::Nat::from(1_000_000u64),
                transfer_fee: None,
            },
            balance_ranges: vec![(100, 1000, 0)],
            timestamp: time(),
            nonce: vec![1, 2, 3, 4],
        };

        match prove_ownership(principal, input) {
            Err(ProofError::InvalidInput) => (),
            _ => panic!("Should reject invalid range"),
        }
    }

    #[test]
    fn test_cycle_management() {
        init();
        let principal = Principal::anonymous();

        // Test with insufficient cycles
        set_mock_cycles(MIN_CYCLES - 1);

        let input = TokenOwnershipInput {
            owner: principal,
            token_metadata: TokenMetadata {
                standard: TokenStandard::ICRC1,
                decimals: 8,
                fee: None,
                symbol: "TEST".to_string(),
                total_supply: candid::Nat::from(1_000_000u64),
                transfer_fee: None,
            },
            balance_ranges: vec![(100, 0, 1000)],
            timestamp: get_time(),
            nonce: vec![1; 32],
        };

        // Should fail due to insufficient cycles
        let result = prove_ownership(principal, input.clone());
        assert!(matches!(result, Err(CanisterError::InsufficientCycles(_))));

        // Test with sufficient cycles
        set_mock_cycles(MIN_CYCLES + PROOF_COST);
        let result = prove_ownership(principal, input.clone());
        assert!(result.is_ok());

        // Clean up
        clear_mock_cycles();
    }

    #[test]
    fn test_proof_limit_per_principal() {
        init();
        let principal = Principal::anonymous();
        set_mock_cycles(MIN_CYCLES + PROOF_COST * 20); // Enough cycles for all proofs

        let base_input = TokenOwnershipInput {
            owner: principal,
            token_metadata: TokenMetadata {
                standard: TokenStandard::ICRC1,
                decimals: 8,
                fee: None,
                symbol: "TEST".to_string(),
                total_supply: candid::Nat::from(1_000_000u64),
                transfer_fee: None,
            },
            balance_ranges: vec![(100, 0, 1000)],
            timestamp: get_time(),
            nonce: vec![1; 32],
        };

        // Generate MAX_PROOFS_PER_PRINCIPAL proofs
        for i in 0..MAX_PROOFS_PER_PRINCIPAL {
            let mut input = base_input.clone();
            input.nonce[0] = i as u8;
            let result = prove_ownership(principal, input);
            assert!(result.is_ok());
        }

        // Try to generate one more proof (should fail)
        let mut input = base_input.clone();
        input.nonce[0] = MAX_PROOFS_PER_PRINCIPAL as u8;
        let result = prove_ownership(principal, input);
        assert!(matches!(result, Err(CanisterError::ProofLimitExceeded)));

        // Clean up
        clear_mock_cycles();
    }

    #[test]
    fn test_proof_cost_deduction() {
        init();
        let principal = Principal::anonymous();
        let initial_cycles = MIN_CYCLES + PROOF_COST * 2;
        set_mock_cycles(initial_cycles);

        let input = TokenOwnershipInput {
            owner: principal,
            token_metadata: TokenMetadata {
                standard: TokenStandard::ICRC1,
                decimals: 8,
                fee: None,
                symbol: "TEST".to_string(),
                total_supply: candid::Nat::from(1_000_000u64),
                transfer_fee: None,
            },
            balance_ranges: vec![(100, 0, 1000)],
            timestamp: get_time(),
            nonce: vec![1; 32],
        };

        // Generate first proof
        let result = prove_ownership(principal, input.clone());
        assert!(result.is_ok());

        // Check remaining cycles
        let remaining_cycles = MOCK_CYCLES.with(|c| c.borrow().unwrap());
        assert_eq!(remaining_cycles, initial_cycles - PROOF_COST);

        // Clean up
        clear_mock_cycles();
    }
}
