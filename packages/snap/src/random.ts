const RNG_SEED_SIZE = 32;

export const getRandomBytes = (): Uint8Array => {
  if (!window.crypto?.getRandomValues) {
    throw new Error('window.crypto.getRandomValues not available');
  }
  const randomBytes = new Int32Array(RNG_SEED_SIZE / 4);
  window.crypto.getRandomValues(randomBytes);
  return new Uint8Array(randomBytes.buffer);
};
