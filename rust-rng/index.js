#!/usr/bin/env node
// Adopted from: https://github.com/paritytech/smoldot/blob/main/bin/wasm-node/javascript/prepare.mjs

// Copyright (C) 2019-2022  Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: GPL-3.0-or-later WITH Classpath-exception-2.0

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import * as toml from 'toml';

const __dirname = process.cwd();
const PROJECT_NAME = toml.parse(fs.readFileSync(path.join(__dirname, 'Cargo.toml'))).package.name.replace('-', '_');

const BUILD_DIR = path.join(__dirname, "dist");
const WASM_PACK_WASM = path.join(BUILD_DIR, `${PROJECT_NAME}_bg.wasm`);
const WASM_PACK_ENTRYPOINT = path.join(BUILD_DIR, `${PROJECT_NAME}.js`);
const WASM_PACK_DEFS = path.join(BUILD_DIR, `${PROJECT_NAME}.d.ts`);
const WASM_OUTPUT_DIR = path.join(BUILD_DIR, 'wasm');
const RESULT_PATH = path.join(BUILD_DIR, `${PROJECT_NAME}.js`);
const WASM_CHUNK_SIZE = 1024 * 1024;

console.log("Cleaning dir")
clearDir();
console.log("Packing with wasm-pack")
wasmPackBuild();
console.log("Bundling")
wasmIt();
console.log("Bundling all together")
bundleJs();

function clearDir() {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true })
}

// TODO: allow to choose between --release and --debug
function wasmPackBuild() {
  execSync(`npx wasm-pack build --release --target web -d ${BUILD_DIR}`)
}

function bundleJs() {
  execSync(`npx rollup -i ${WASM_PACK_ENTRYPOINT} --exports named -o ${RESULT_PATH} --name ${PROJECT_NAME} -f umd -p @rollup/plugin-node-resolve -p @rollup/plugin-commonjs`)
}

function wasmIt() {
  createAndSaveWasmChunks();

  const importStatements = `import wasmBase64 from './wasm/index.js';\n`;

  const initUnit = `
  exports.init = async function uniInit() {
    const imports = getImports();

    const arrayBufferFromBase64 = (base64String) => Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
    const wasmBytecode = arrayBufferFromBase64(wasmBase64);
    const { instance, module } = await WebAssembly.instantiate(wasmBytecode, imports);

    return finalizeInit(instance, module);
  }
  `;

  const initOrig = `export default function init`;
  const initNoDefault = `export function init`;

  const defs = fs.readFileSync(WASM_PACK_DEFS, 'utf-8');
  fs.writeFileSync(WASM_PACK_DEFS, defs.replace(initOrig, initNoDefault));

  const jsWrapperContent = fs.readFileSync(WASM_PACK_ENTRYPOINT, 'utf8');

  fs.writeFileSync(RESULT_PATH, importStatements + jsWrapperContent + initUnit, 'utf8');
}

// TODO: writes can be async
function createAndSaveWasmChunks() {
  if (!fs.existsSync(WASM_OUTPUT_DIR)) {
    fs.mkdirSync(WASM_OUTPUT_DIR);
  }
  // At the time of writing, there is unfortunately no standard cross-platform solution to the
  // problem of importing WebAssembly files. We base64-encode the .wasm file and integrate it as
  // a string. It is the safe but non-optimal solution.
  // Because raw .wasm compresses better than base64-encoded .wasm, we deflate the .wasm before
  // base64 encoding it. For some reason, `deflate(base64(deflate(wasm)))` is 15% to 20% smaller
  // than `deflate(base64(wasm))`.
  // Additionally, because the Mozilla extension store refuses packages containing individual
  // files that are more than 4 MiB, we have to split our base64-encoded deflate-encoded wasm
  // into multiple small size files.
  const wasmData = fs.readFileSync(WASM_PACK_WASM);
  // TODO: maybe enable deflate require modicition in wasmLoadFunc
  // let base64Data = zlib.deflateSync(wasmData).toString('base64');
  let base64Data = wasmData.toString('base64');
  let imports = '';
  let fileNum = 0;
  let chunksSum = '""';

  while (base64Data.length !== 0) {
    const chunk = base64Data.slice(0, WASM_CHUNK_SIZE);

    fs.writeFileSync(
      path.join(WASM_OUTPUT_DIR, `wasm${fileNum}.js`),
      `export default function() { return "${chunk}"; }`
    );

    imports += `import { default as wasm${fileNum} } from './wasm${fileNum}.js';\n`;
    chunksSum += ` + wasm${fileNum}()`;
    fileNum += 1;
    base64Data = base64Data.slice(WASM_CHUNK_SIZE);
  }

  fs.writeFileSync(
    path.join(WASM_OUTPUT_DIR, 'index.js'),
    `${imports}export default ${chunksSum}`
  );
}
