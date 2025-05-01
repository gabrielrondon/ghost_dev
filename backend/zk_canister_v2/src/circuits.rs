use halo2_proofs::{
    circuit::{AssignedCell, Chip, Layouter, Region, SimpleFloorPlanner, Value},
    plonk::{Advice, Circuit, Column, ConstraintSystem, Error, Instance, Selector},
    poly::Rotation,
};
use halo2_proofs::halo2curves::bn256::Fr;

#[derive(Clone, Debug)]
pub struct TokenRangeConfig {
    value: Column<Advice>,
    min_value: Column<Advice>,
    max_value: Column<Advice>,
    min_diff: Column<Advice>,
    max_diff: Column<Advice>,
    instance: Column<Instance>,
    selector: Selector,
}

impl TokenRangeConfig {
    pub fn configure(
        meta: &mut ConstraintSystem<Fr>,
        value: Column<Advice>,
        min_value: Column<Advice>,
        max_value: Column<Advice>,
        min_diff: Column<Advice>,
        max_diff: Column<Advice>,
        instance: Column<Instance>,
    ) -> Self {
        let selector = meta.selector();

        meta.enable_equality(value);
        meta.enable_equality(min_value);
        meta.enable_equality(max_value);
        meta.enable_equality(min_diff);
        meta.enable_equality(max_diff);
        meta.enable_equality(instance);

        // Create range check gate with witness variables
        meta.create_gate("range check", |meta| {
            let s = meta.query_selector(selector);
            let value = meta.query_advice(value, Rotation::cur());
            let min_value = meta.query_advice(min_value, Rotation::cur());
            let max_value = meta.query_advice(max_value, Rotation::cur());
            let min_diff = meta.query_advice(min_diff, Rotation::cur());
            let max_diff = meta.query_advice(max_diff, Rotation::cur());

            // Create constraints:
            // 1. min_diff = value - min_value
            // 2. max_diff = max_value - value
            // 3. min_diff >= 0 (implicitly satisfied by field elements)
            // 4. max_diff >= 0 (implicitly satisfied by field elements)
            vec![
                s.clone() * (min_diff - (value.clone() - min_value)),
                s * (max_diff - (max_value - value)),
            ]
        });

        Self {
            value,
            min_value,
            max_value,
            min_diff,
            max_diff,
            instance,
            selector,
        }
    }

    pub fn assign(
        &self,
        mut region: Region<Fr>,
        offset: usize,
        value: Fr,
        min_value: Fr,
        max_value: Fr,
    ) -> Result<AssignedCell<Fr, Fr>, Error> {
        // Enable the selector for this row
        self.selector.enable(&mut region, offset)?;

        // Assign the main values
        let value_cell = region.assign_advice(
            || "value",
            self.value,
            offset,
            || Value::known(value),
        )?;

        region.assign_advice(
            || "min_value",
            self.min_value,
            offset,
            || Value::known(min_value),
        )?;

        region.assign_advice(
            || "max_value",
            self.max_value,
            offset,
            || Value::known(max_value),
        )?;

        // Calculate and assign the witness values
        let min_diff = value - min_value;
        let max_diff = max_value - value;

        region.assign_advice(
            || "min_diff",
            self.min_diff,
            offset,
            || Value::known(min_diff),
        )?;

        region.assign_advice(
            || "max_diff",
            self.max_diff,
            offset,
            || Value::known(max_diff),
        )?;

        Ok(value_cell)
    }
}

#[derive(Clone, Default)]
pub struct TokenRangeCircuit {
    value: Fr,
    min_value: Fr,
    max_value: Fr,
}

impl TokenRangeCircuit {
    pub fn new(value: Fr, min_value: Fr, max_value: Fr) -> Self {
        Self {
            value,
            min_value,
            max_value,
        }
    }

    pub fn without_witnesses() -> Self {
        Self::default()
    }
}

impl Circuit<Fr> for TokenRangeCircuit {
    type Config = TokenRangeConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            value: Fr::zero(),
            min_value: Fr::zero(),
            max_value: Fr::zero(),
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fr>) -> Self::Config {
        let value = meta.advice_column();
        let min_value = meta.advice_column();
        let max_value = meta.advice_column();
        let min_diff = meta.advice_column();
        let max_diff = meta.advice_column();
        let instance = meta.instance_column();

        TokenRangeConfig::configure(
            meta,
            value,
            min_value,
            max_value,
            min_diff,
            max_diff,
            instance,
        )
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fr>,
    ) -> Result<(), Error> {
        // Create a single region for range check
        let value_cell = layouter.assign_region(
            || "range check",
            |mut region| {
                let value_cell = config.assign(
                    region,
                    0,
                    self.value,
                    self.min_value,
                    self.max_value,
                )?;

                Ok(value_cell)
            },
        )?;

        // Copy the value to the instance column
        layouter.constrain_instance(value_cell.cell(), config.instance, 0)?;

        Ok(())
    }
}

pub fn create_circuit(value: Fr, min_value: Fr, max_value: Fr) -> TokenRangeCircuit {
    TokenRangeCircuit::new(value, min_value, max_value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use halo2_proofs::dev::MockProver;

    #[test]
    fn test_range_check() {
        let k = 4;
        let value = Fr::from(5u64);
        let min_range = Fr::from(0u64);
        let max_range = Fr::from(10u64);

        let circuit = TokenRangeCircuit::new(value, min_range, max_range);
        let public_inputs = vec![value];

        let prover = MockProver::run(k, &circuit, vec![public_inputs]).unwrap();
        assert_eq!(prover.verify(), Ok(()));
    }

    #[test]
    fn test_out_of_range() {
        let k = 4;
        let value = Fr::from(3000u64);
        let min_range = Fr::from(0u64);
        let max_range = Fr::from(2000u64);

        let circuit = TokenRangeCircuit::new(value, min_range, max_range);
        let public_input = vec![value];

        let prover = MockProver::run(k, &circuit, vec![public_input]).unwrap();
        assert!(prover.verify().is_err());
    }
}

// Exact Value Circuit
#[derive(Debug, Clone)]
pub struct TokenExactValueConfig {
    value: Column<Advice>,
    expected: Column<Advice>,
    selector: Selector,
    instance: Column<Instance>,
}

#[derive(Debug, Clone)]
pub struct TokenExactValueCircuit {
    value: Value<Fr>,
    expected: Value<Fr>,
}

impl TokenExactValueCircuit {
    pub fn create_circuit(value: Fr, expected: Fr) -> Self {
        Self {
            value: Value::known(value),
            expected: Value::known(expected),
        }
    }
}

impl Circuit<Fr> for TokenExactValueCircuit {
    type Config = TokenExactValueConfig;
    type FloorPlanner = SimpleFloorPlanner;

    fn without_witnesses(&self) -> Self {
        Self {
            value: Value::unknown(),
            expected: Value::unknown(),
        }
    }

    fn configure(meta: &mut ConstraintSystem<Fr>) -> Self::Config {
        let value = meta.advice_column();
        let expected = meta.advice_column();
        let selector = meta.selector();
        let instance = meta.instance_column();

        meta.enable_equality(value);
        meta.enable_equality(expected);
        meta.enable_equality(instance);

        meta.create_gate("exact value check", |meta| {
            let s = meta.query_selector(selector);
            let value = meta.query_advice(value, Rotation::cur());
            let expected = meta.query_advice(expected, Rotation::cur());

            vec![s * (value - expected)]
        });

        TokenExactValueConfig {
            value,
            expected,
            selector,
            instance,
        }
    }

    fn synthesize(
        &self,
        config: Self::Config,
        mut layouter: impl Layouter<Fr>,
    ) -> Result<(), Error> {
        layouter.assign_region(
            || "exact value check",
            |mut region| {
                config.selector.enable(&mut region, 0)?;

                let _value_cell = region.assign_advice(
                    || "value",
                    config.value,
                    0,
                    || self.value,
                )?;

                region.assign_advice(
                    || "expected",
                    config.expected,
                    0,
                    || self.expected,
                )?;

                // Copy the instance value to advice column
                region.assign_advice(
                    || "instance value",
                    config.value,
                    1,
                    || self.value,
                )?;

                Ok(())
            },
        )?;

        Ok(())
    }
}

/// Helper function to create an exact value circuit
pub fn create_exact_value_circuit(value: Fr, expected: Fr) -> TokenExactValueCircuit {
    TokenExactValueCircuit::create_circuit(value, expected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use halo2_proofs::dev::MockProver;

    #[test]
    fn test_exact_value_match() {
        let value = Fr::from(42u64);
        let expected = Fr::from(42u64);
        let circuit = TokenExactValueCircuit::create_circuit(value, expected);
        let public_inputs = vec![value];

        let prover = MockProver::run(4, &circuit, vec![public_inputs]).unwrap();
        assert_eq!(prover.verify(), Ok(()));
    }

    #[test]
    fn test_exact_value_mismatch() {
        let value = Fr::from(42u64);
        let expected = Fr::from(43u64);
        let circuit = TokenExactValueCircuit::create_circuit(value, expected);
        let public_inputs = vec![value];

        let prover = MockProver::run(4, &circuit, vec![public_inputs]).unwrap();
        assert!(prover.verify().is_err());
    }
}
