//! Ed25519 Identity Management
//!
//! Provides keypair generation, signing, and verification.

use ed25519_dalek::{SigningKey, VerifyingKey, Signer, Verifier, Signature};
use rand::rngs::OsRng;
use serde::{Serialize, Deserialize};
use std::fmt;
use wasm_bindgen::prelude::*;

/// Ed25519 identity keypair for signing and verification
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct IdentityKey {
    #[wasm_bindgen(skip)]
    secret_bytes: [u8; 32],
}

#[wasm_bindgen]
impl IdentityKey {
    /// Generate a new random identity keypair
    #[wasm_bindgen(constructor)]
    pub fn generate() -> Self {
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        IdentityKey {
            secret_bytes: signing_key.to_bytes(),
        }
    }

    /// Get the public key as hex string
    pub fn public_key_hex(&self) -> String {
        hex::encode(self.public_key_bytes())
    }

    /// Get the public key as bytes
    pub fn public_key_bytes(&self) -> Vec<u8> {
        let signing_key = SigningKey::from_bytes(&self.secret_bytes);
        signing_key.verifying_key().to_bytes().to_vec()
    }

    /// Sign a message
    pub fn sign(&self, message: &[u8]) -> Vec<u8> {
        let signing_key = SigningKey::from_bytes(&self.secret_bytes);
        signing_key.sign(message).to_bytes().to_vec()
    }

    /// Verify a signature against a public key
    pub fn verify_signature(public_key: &[u8], message: &[u8], signature: &[u8]) -> bool {
        if public_key.len() != 32 || signature.len() != 64 {
            return false;
        }
        
        let mut pk_bytes = [0u8; 32];
        let mut sig_bytes = [0u8; 64];
        pk_bytes.copy_from_slice(public_key);
        sig_bytes.copy_from_slice(signature);

        if let Ok(verifying_key) = VerifyingKey::from_bytes(&pk_bytes) {
            let sig = Signature::from_bytes(&sig_bytes);
            return verifying_key.verify(message, &sig).is_ok();
        }
        false
    }

    /// Export identity as JSON
    pub fn to_json(&self) -> Result<String, JsValue> {
        serde_json::to_string(self)
            .map_err(|e| JsValue::from_str(&format!("Serialization failed: {}", e)))
    }

    /// Import identity from JSON
    pub fn from_json(json: &str) -> Result<IdentityKey, JsValue> {
        serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&format!("Deserialization failed: {}", e)))
    }
}

impl fmt::Debug for IdentityKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("IdentityKey")
         .field("public", &hex::encode(self.public_key_bytes()))
         .finish()
    }
}

#[cfg(all(test, target_arch = "wasm32"))]
mod tests {
    use super::*;

    #[test]
    fn test_identity_generation_and_signing() {
        let identity = IdentityKey::generate();
        let message = b"Hello P2P World";
        let signature = identity.sign(message);
        let public_key = identity.public_key_bytes();

        assert!(IdentityKey::verify_signature(&public_key, message, &signature));
    }

    #[test]
    fn test_identity_verification_failure() {
        let identity = IdentityKey::generate();
        let message = b"Hello P2P World";
        let signature = identity.sign(message);
        let public_key = identity.public_key_bytes();

        let wrong_message = b"Hacked Message";
        assert!(!IdentityKey::verify_signature(&public_key, wrong_message, &signature));
    }
}
