import { OnRpcRequestHandler } from '@metamask/snap-types';
import {
  InitOutput,
  // add_random,
  add_random_with_seed
} from 'wasm-bundler';
import { getRandomBytes } from './random';

import { initializeWasm } from './wasm';

let wasm: InitOutput;

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  if (!wasm) {
    wasm = await initializeWasm();
  }

  console.log({ request });

  switch (request.method) {
    // Uncomment in order to reproduce the original error
    // case 'add_random':
    //   return add_random(request.params[0]);
    case 'add_random_with_seed':
      return add_random_with_seed(request.params[0], getRandomBytes());
    default:
      throw new Error('Method not found.');
  }
};
