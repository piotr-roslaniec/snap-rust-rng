import { OnRpcRequestHandler } from '@metamask/snap-types';
import { init } from '../../../rust-rng/dist/rust_rng';

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  let wasm = await init();
  console.log({ request });

  switch (request.method) {
    case 'add':
      return wasm.add(2, 2);
    default:
      throw new Error('Method not found.');
  }
};
