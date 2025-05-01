use crate::proof::TokenStandard;
use candid::{CandidType, Deserialize, Principal, Nat};
use ic_cdk::api::call::RejectionCode;
use num_bigint::BigUint;

#[derive(CandidType, Deserialize)]
struct ICRC1BalanceArgs {
    owner: Principal,
}

#[derive(CandidType, Deserialize)]
struct ICRC2AllowanceArgs {
    owner: Principal,
    spender: Principal,
}

#[derive(CandidType, Deserialize)]
struct DIP20BalanceArgs {
    owner: Principal,
}

mod token_verification {
    use super::*;

    fn format_rejection_error(msg: String, code: RejectionCode) -> String {
        format!("{}: {:?}", msg, code)
    }

    pub async fn verify_icrc_balance(
        token_canister: Principal,
        owner: Principal,
        expected_balance: u64,
    ) -> Result<bool, String> {
        match ic_cdk::api::call::call::<_, (Nat,)>(token_canister, "icrc1_balance_of", (owner,)).await {
            Ok((balance,)) => Ok(balance.0 == BigUint::from(expected_balance)),
            Err((code, msg)) => Err(format_rejection_error(msg, code))
        }
    }

    pub async fn verify_dip20_balance(
        token_canister: Principal,
        owner: Principal,
        expected_balance: u64,
    ) -> Result<bool, String> {
        match ic_cdk::api::call::call::<_, (Nat,)>(token_canister, "balanceOf", (owner,)).await {
            Ok((balance,)) => Ok(balance.0 == BigUint::from(expected_balance)),
            Err((code, msg)) => Err(format_rejection_error(msg, code))
        }
    }

    pub async fn verify_ext_balance(
        token_canister: Principal,
        owner: Principal,
        expected_balance: u64,
    ) -> Result<bool, String> {
        match ic_cdk::api::call::call::<_, (Nat,)>(token_canister, "balance", (owner,)).await {
            Ok((balance,)) => Ok(balance.0 == BigUint::from(expected_balance)),
            Err((code, msg)) => Err(format_rejection_error(msg, code))
        }
    }

    pub async fn verify_dip721_ownership(
        token_canister: Principal,
        token_id: u64,
        owner: Principal,
    ) -> Result<bool, String> {
        match ic_cdk::api::call::call::<_, (Principal,)>(token_canister, "ownerOf", (token_id,)).await {
            Ok((token_owner,)) => Ok(token_owner == owner),
            Err((code, msg)) => Err(format_rejection_error(msg, code))
        }
    }

    pub async fn verify_dip1155_ownership(
        token_canister: Principal,
        token_id: u64,
        owner: Principal,
    ) -> Result<bool, String> {
        match ic_cdk::api::call::call::<_, (Nat,)>(token_canister, "balanceOf", (owner, token_id)).await {
            Ok((balance,)) => Ok(balance.0 > BigUint::from(0u64)),
            Err((code, msg)) => Err(format_rejection_error(msg, code))
        }
    }
}

pub async fn verify_token_balance(
    token_canister: Principal,
    owner: Principal,
    expected_balance: u64,
    standard: &TokenStandard,
) -> Result<bool, String> {
    match standard {
        TokenStandard::ICRC1 | TokenStandard::ICRC2 => {
            token_verification::verify_icrc_balance(token_canister, owner, expected_balance).await
        },
        TokenStandard::DIP20 => token_verification::verify_dip20_balance(token_canister, owner, expected_balance).await,
        TokenStandard::EXT => token_verification::verify_ext_balance(token_canister, owner, expected_balance).await,
        TokenStandard::DIP721 | TokenStandard::DIP1155 => {
            Err("DIP721 and DIP1155 balance verification not implemented".to_string())
        }
    }
}

pub async fn verify_token_ownership(
    token_canister: Principal,
    token_id: u64,
    owner: Principal,
    standard: &TokenStandard,
) -> Result<bool, String> {
    match standard {
        TokenStandard::DIP721 => token_verification::verify_dip721_ownership(token_canister, token_id, owner).await,
        TokenStandard::DIP1155 => token_verification::verify_dip1155_ownership(token_canister, token_id, owner).await,
        TokenStandard::ICRC1 | TokenStandard::ICRC2 | TokenStandard::DIP20 | TokenStandard::EXT => {
            Err("Token ownership verification not supported for this standard".to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_balance_verification_args() {
        let owner = Principal::anonymous();

        // Test ICRC1 args
        let icrc_args = ICRC1BalanceArgs { owner };
        assert_eq!(icrc_args.owner, owner);

        // Test DIP20 args
        let dip20_args = DIP20BalanceArgs { owner };
        assert_eq!(dip20_args.owner, owner);
    }

    #[test]
    fn test_token_standard_serialization() {
        let standard = TokenStandard::DIP721;
        let serialized = candid::encode_one(&standard).unwrap();
        let deserialized: TokenStandard = candid::decode_one(&serialized).unwrap();
        assert_eq!(standard, deserialized);
    }
}
