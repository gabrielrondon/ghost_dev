use halo2_proofs::{
    arithmetic::Field,
    circuit::{AssignedCell, Chip, Layouter, Region, SimpleFloorPlanner, Value},
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Instance, Selector},
    poly::Rotation,
};
use pasta_curves::pallas;

// Number of bits for range check
const RANGE_BITS: usize = 64;

#[derive(Clone)]
struct TokenConfig {
    // Columns for main values
    balance: Column<Advice>,
    owner: Column<Advice>,
    token_id: Column<Advice>,
    // Range check columns
    range_check: Column<Advice>,
    // Selector for enabling constraints
    q_main: Selector,
    q_range: Selector,
    // Public inputs
    instance: Column<Instance>,
}

#[derive(Clone)]
struct TokenChip {
    config: TokenConfig,
}

impl Chip<pallas::Base> for TokenChip {
    type Config = TokenConfig;
    type Loaded = ();

    fn config(&self) -> &Self::Config {
        &self.config
    }

    fn loaded(&self) -> &Self::Loaded {
        &()
    }
}

impl TokenChip {
    fn construct(config: TokenConfig) -> Self {
        Self { config }
    }

    fn configure(
        meta: &mut ConstraintSystem<pallas::Base>,
    ) -> TokenConfig {
        let balance = meta.advice_column();
        let owner = meta.advice_column();
        let token_id = meta.advice_column();
        let range_check = meta.advice_column();
        let q_main = meta.selector();
        let q_range = meta.selector();
        let instance = meta.instance_column();

        // Enable equality on columns that need it
        meta.enable_equality(balance);
        meta.enable_equality(owner);
        meta.enable_equality(token_id);
        meta.enable_equality(instance);

        // Range check for balance
        meta.create_gate("range check", |meta| {
            let q_range = meta.query_selector(q_range);
            let value = meta.query_advice(range_check, Rotation::cur());
            let next_value = meta.query_advice(range_check, Rotation::next());

            // Ensure each value is in range [0, 2^RANGE_BITS)
            vec![q_range * (value.clone() * value - next_value)]
        });

        // Main token ownership constraint
        meta.create_gate("token ownership", |meta| {
            let q_main = meta.query_selector(q_main);
            let balance = meta.query_advice(balance, Rotation::cur());
            let owner = meta.query_advice(owner, Rotation::cur());
            let token_id = meta.query_advice(token_id, Rotation::cur());

            // Add constraints for token ownership verification
            vec![
                q_main * (balance.clone() * owner - token_id),
            ]
        });

        TokenConfig {
            balance,
            owner,
            token_id,
            range_check,
            q_main,
            q_range,
            instance,
        }
    }

    fn assign_balance(
        &self,
        mut layouter: impl Layouter<pallas::Base>,
        balance: Value<pallas::Base>,
    ) -> Result<AssignedCell<pallas::Base, pallas::Base>, Error> {
        layouter.assign_region(
            || "assign balance",
            |mut region: Region<pallas::Base>| {
                // Enable the range check selector
                self.config.q_range.enable(&mut region, 0)?;

                // Assign the balance value
                let balance_cell = region.assign_advice(
                    || "balance",
                    self.config.balance,
                    0,
                    || balance,
                )?;

                // Perform range check
                let mut value = balance;
                for i in 0..RANGE_BITS {
                    region.assign_advice(
                        || format!("range check {}", i),
                        self.config.range_check,
                        i,
                        || value,
                    )?;
                    value = value.map(|v| v * v);
                }

                Ok(balance_cell)
            },
        )
    }
}

#[derive(Default)]
struct TokenCircuit {
    balance: Value<pallas::Base>,
    owner: Value<pallas::Base>,
    token_id: Value<pallas::Base>,
}

impl Circuit<pallas::Base> for TokenCircuit {
    type Config = TokenConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self::default()
    }

    fn configure(meta: &mut ConstraintSystem<pallas::Base>) -> Self::Config {
        TokenChip::configure(meta)
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<pallas::Base>,
    ) -> Result<(), Error> {
        let chip = TokenChip::construct(config);

        // Assign balance with range check
        let balance_cell = chip.assign_balance(
            layouter.namespace(|| "assign balance with range check"),
            self.balance,
        )?;

        // Assign owner and token_id
        layouter.assign_region(
            || "assign owner and token_id",
            |mut region| {
                chip.config.q_main.enable(&mut region, 0)?;

                region.assign_advice(
                    || "owner",
                    chip.config.owner,
                    0,
                    || self.owner,
                )?;

                region.assign_advice(
                    || "token_id",
                    chip.config.token_id,
                    0,
                    || self.token_id,
                )?;

                Ok(())
            },
        )?;

        Ok(())
    }
} 