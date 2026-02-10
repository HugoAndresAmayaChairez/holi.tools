# @holi/wasm-core

Rust → WebAssembly core for Holi.tools.

Goal: use `wgpu` (Rust) on the web via WebGPU, keeping heavy rendering/algorithms in Rust/WASM.

## Prereqs

- `rustup` + stable toolchain
- `wasm-pack`

## Build

From repo root:

- `pnpm --filter @holi/wasm-core wasm:dev`
- `pnpm --filter @holi/wasm-core wasm:build`

Output goes to `packages/wasm-core/pkg/`.

## Current status

This is a minimal background renderer that clears the screen with an animated color using `wgpu`.

Next step: expose a stable JS API and wire it into `apps/main` behind a feature flag.
