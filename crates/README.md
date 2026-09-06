# crates/

Selective Rust/WASM code that supports shipping Holi web products.

- `core/holi-qr`: tested QR algorithm and verification core.
- `core/holi-p2p`: tested binary protocol primitives.
- `wasm/*`: thin browser adapters; `wasm-qr` also targets Node for Holi Local.

The unused `wasm-qr-lite` and `wasm-renderer` experiments were retired under
ADR 0003. `wasm-core` remains only for the Test app's vault/webgpu consumers.

Do not migrate ordinary web logic into Rust by default. A crate needs a named
shipping consumer, measurable value, and target-environment tests. See
`docs/architecture.md` and `docs/decisions/0001-web-first-rust.md` for the
current disposition of every crate.
