# rust-rng

## Usage

Run tests

```bash
./scripts/test.sh
```

Build wasm

```bash
./scripts/build.sh
```

## Problem Description

In `src/lib.rs` there are two functions:

```
pub fn add_random_with_seed(left: u32, rng_seed: &[u8]) -> u32
pub fn add_random(left: u32) -> u32
```

The first function takes a seed and uses it to create a random number generator. The second function uses a random seed to create a random number generator.
The first one relies on the browser for the seed, the second one relies on the execution environment. Thus, the `add_random` is introducing reliance on `process`. See a generated `wasm-bindgen` file:

```rust
// From pkg/rust_rng.js

imports.wbg.__wbg_process_e56fd54cf6319b6c = function(arg0) {
    const ret = getObject(arg0).process;
    return addHeapObject(ret);
};
```

If we try running `add_random` in snap, we're going to receive an error:

```bash
"Cannot read properties of undefined (reading 'process')"
```

## Solution

We're going to use `add_random` instead of `add_random_with_seed`, and so we're going to rely on the browser to provide us with a source of randomness.

Notice that certain parts of code has been commented out in the repository.
You can search for string `Uncomment in order to reproduce the original error` to find these places.