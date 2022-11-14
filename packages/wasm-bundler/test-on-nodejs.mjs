import wasm from './output.js';

async function main() {
  const result = await wasm();
  return result;
}

console.log("starting...");
main()
  .then(result => {
    console.log("finished with success");
    console.log("add", result.add(1, 2));
    console.log({result})
  })
  .catch(console.log)
