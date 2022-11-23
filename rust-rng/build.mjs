// Adopted from: https://github.com/paritytech/smoldot/blob/main/bin/wasm-node/javascript/prepare.mjs

// Smoldot
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
import * as zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { parse } from '@babel/parser';
import traversePkg from '@babel/traverse';
const { default: traverse } = traversePkg;
import generatePkg from '@babel/generator';
const { default: generate } = generatePkg;
import { isFunctionDeclaration } from '@babel/types';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = path.join(__dirname, "dist");
const WASM_PACK_OUTPUT = path.join(BUILD_DIR, 'wasm-pack');
const WASM_PACK_WASM = path.join(WASM_PACK_OUTPUT, 'rust_rng_bg.wasm');
const WASM_PACK_JS_GLUE = path.join(WASM_PACK_OUTPUT, 'rust_rng.js');
const WASM_OUTPUT_DIR = path.join(BUILD_DIR, 'wasm');
const RESULT_PATH = path.join(WASM_PACK_OUTPUT, 'rust_rng.js');
const WASM_CHUNK_SIZE = 1024 * 1024;

clearDir();
wasmPackBuild();
wasmIt();
bundleJs();

function clearDir() {
  execSync(`rm -rf ${BUILD_DIR}`);
}

// TODO: is release
function wasmPackBuild() {
  execSync(`wasm-pack build --release --target web -d ${WASM_PACK_OUTPUT}`);
}

function bundleJs() {
  execSync(`npx rollup -c`)
}

function wasmIt() {
  createAndSaveWasmChunks();

  const importStatements = `import wasmBase64 from '../wasm/index.js';\n`;

  const wasmLoadFunc = `async function load(module, imports) {
    // Reference: https://stackoverflow.com/a/41106346/2649048
    // TODO: Replace call to deprecated Buffer API
    const arrayBufferFromBase64 = (base64String) => Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
        
    const wasmBytecode = arrayBufferFromBase64(wasmBase64);
    const instance = await WebAssembly.instantiate(wasmBytecode, imports);
    return instance;
}
`;

  const jsWrapperContent = fs.readFileSync(WASM_PACK_JS_GLUE, 'utf8');
  const ast = parse(jsWrapperContent, { sourceType: 'module' });

  traverse(ast, {
    enter(path) {
      const { node } = path;
      if (isFunctionDeclaration(node) && node.id.name === 'load') {
        const newDeclaration = parse(wasmLoadFunc, { sourceType: 'module' });
        node.body.body = newDeclaration.program.body[0].body.body
      }
      if (isFunctionDeclaration(node) && node.id.name === 'init') {
        node.body.body[2] = parse("");
      }
    }
  });

  const { code: transformedCode } = generate(ast);


  fs.writeFileSync(RESULT_PATH, importStatements + transformedCode, 'utf8');
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
