import rustRng from './dist/rust_rng.js';

async function main() {
  const lib = await rustRng.init()
  console.log("add", lib.add(1, 2));
}

main().catch(console.log);
