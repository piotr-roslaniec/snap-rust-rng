import { OnRpcRequestHandler } from '@metamask/snap-types';

import initWasm from '../../../rust-rng/dist/index';

let wasm;


export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  if (!wasm) {
    wasm = await initWasm();
  }

  console.log({ request });

  switch (request.method) {
    case 'add':
      return wasm.add(2, 2);
    default:
      throw new Error('Method not found.');
  }
};
