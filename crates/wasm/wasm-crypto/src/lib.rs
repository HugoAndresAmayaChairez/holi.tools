//! Holi.tools Cryptographic Primitives
//! 
//! Provides Ed25519 signing and ChaCha20-Poly1305 encryption.
//! Designed for identity, vault, and P2P communication.

pub mod identity;
pub mod encryption;
pub mod pake;
pub mod vault;

use wasm_bindgen::prelude::*;

/// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Get the version info for this module
#[wasm_bindgen]
pub fn crypto_version() -> String {
    "holi-wasm-crypto v0.1.0".to_string()
}
