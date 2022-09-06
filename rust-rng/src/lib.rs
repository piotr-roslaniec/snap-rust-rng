use rand::{rngs::StdRng, Rng, SeedableRng};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add_random_with_seed(left: u32, rng_seed: &[u8]) -> u32 {
    console_error_panic_hook::set_once();
    let rng_seed: [u8; 32] = rng_seed.try_into().unwrap();
    let rng = &mut StdRng::from_seed(rng_seed);
    let right = rng.gen::<u32>();
    left + right
}

// Uncomment in order to reproduce the original error
// #[wasm_bindgen]
pub fn add_random(left: u32) -> u32 {
    console_error_panic_hook::set_once();
    let rng = &mut StdRng::from_entropy();
    let right = rng.gen::<u32>();
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[test]
    #[wasm_bindgen_test]
    fn adds_random_with_seed() {
        let rng_seed: &[u8; 32] = b"00000000000000000000000000000001";
        let result = add_random_with_seed(2, rng_seed);
        assert_eq!(result, 1834257540);
    }

    #[test]
    // #[wasm_bindgen_test]
    fn adds_random() {
        let result = add_random(2);
        assert!(result != 2);
    }
}
