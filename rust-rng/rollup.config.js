import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
    {
        input: 'dist/wasm-pack/rust_rng.js',
        output: {
            name: 'wasmBundler',
            file: 'dist/wasm-pack/rust_rng.js',
            format: 'umd'
        },
        plugins: [
            resolve(),
            commonjs(),
        ],
    },
];