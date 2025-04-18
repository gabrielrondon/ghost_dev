use halo2_proofs::{
    arithmetic::Field,
    circuit::{AssignedCell, Chip, Layouter, SimpleFloorPlanner, Value},
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Instance, Selector},
    poly::Rotation,
};
use pasta_curves::pallas;

// Range Circuit
#[derive(Clone)]
pub struct TokenRangeConfig {
    value: Column<Advice>,
    lower: Column<Instance>,
    upper: Column<Instance>,
    selector: Selector,
}

#[derive(Default)]
pub struct TokenRangeCircuit {
    pub balance: Value<pallas::Base>,
    pub lower_bound: Value<pallas::Base>,
    pub upper_bound: Value<pallas::Base>,
}

impl Circuit<pallas::Base> for TokenRangeCircuit {
    type Config = TokenRangeConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self::default()
    }

    fn configure(meta: &mut ConstraintSystem<pallas::Base>) -> Self::Config {
        let value = meta.advice_column();
        let lower = meta.instance_column();
        let upper = meta.instance_column();
        let selector = meta.selector();

        meta.enable_equality(value);
        meta.enable_equality(lower);
        meta.enable_equality(upper);

        meta.create_gate("range check", |meta| {
            let s = meta.query_selector(selector);
            let v = meta.query_advice(value, Rotation::cur());
            let l = meta.query_instance(lower, Rotation::cur());
            let u = meta.query_instance(upper, Rotation::cur());

            vec![
                s.clone() * (v.clone() - l.clone()), // v >= l
                s * (u - v),                         // v <= u
            ]
        });

        TokenRangeConfig {
            value,
            lower,
            upper,
            selector,
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<pallas::Base>,
    ) -> Result<(), Error> {
        layouter.assign_region(
            || "range check",
            |mut region| {
                config.selector.enable(&mut region, 0)?;

                // Assign balance value
                region.assign_advice(
                    || "balance",
                    config.value,
                    0,
                    || self.balance,
                )?;

                Ok(())
            },
        )
    }
}

// Exact Value Circuit
#[derive(Clone)]
pub struct TokenExactValueConfig {
    value: Column<Advice>,
    expected: Column<Instance>,
    selector: Selector,
}

#[derive(Default)]
pub struct TokenExactValueCircuit {
    pub value: Value<pallas::Base>,
    pub expected: Value<pallas::Base>,
}

impl Circuit<pallas::Base> for TokenExactValueCircuit {
    type Config = TokenExactValueConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self::default()
    }

    fn configure(meta: &mut ConstraintSystem<pallas::Base>) -> Self::Config {
        let value = meta.advice_column();
        let expected = meta.instance_column();
        let selector = meta.selector();

        meta.enable_equality(value);
        meta.enable_equality(expected);

        meta.create_gate("equality check", |meta| {
            let s = meta.query_selector(selector);
            let v = meta.query_advice(value, Rotation::cur());
            let e = meta.query_instance(expected, Rotation::cur());

            vec![s * (v - e)] // v == e
        });

        TokenExactValueConfig {
            value,
            expected,
            selector,
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<pallas::Base>,
    ) -> Result<(), Error> {
        layouter.assign_region(
            || "equality check",
            |mut region| {
                config.selector.enable(&mut region, 0)?;

                // Assign value
                region.assign_advice(
                    || "value",
                    config.value,
                    0,
                    || self.value,
                )?;

                Ok(())
            },
        )
    }
} 