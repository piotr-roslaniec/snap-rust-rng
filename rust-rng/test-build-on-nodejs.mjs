import { default as wasm } from './dist/wasm-pack/rust_rng.js';

async function main() {
  const result = await wasm.default();
  return result;
}

console.log("starting...");
main()
  .then(wasm => {
    console.log("finished with success");
    console.log("add", wasm.add(1, 2));
    console.log({ wasm })
  })
  .catch(console.log)
