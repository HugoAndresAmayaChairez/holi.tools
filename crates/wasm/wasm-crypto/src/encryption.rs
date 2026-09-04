//! XChaCha20-Poly1305 Encryption
//!
//! Provides authenticated encryption for project data.

use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce
};
use serde::{Serialize, Deserialize};
use std::fmt;
use wasm_bindgen::prelude::*;

/// Symmetric encryption key for project data
#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct EncryptionKey {
    #[wasm_bindgen(skip)]
    key_bytes: [u8; 32],
}

#[wasm_bindgen]
impl EncryptionKey {
    /// Generate a new random encryption key
    #[wasm_bindgen(constructor)]
    pub fn generate() -> Self {
        let key = XChaCha20Poly1305::generate_key(&mut OsRng);
        EncryptionKey {
            key_bytes: key.into(),
        }
    }

    /// Create key from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<EncryptionKey, JsValue> {
        if bytes.len() != 32 {
            return Err(JsValue::from_str("Key must be 32 bytes"));
        }
        let mut key_bytes = [0u8; 32];
        key_bytes.copy_from_slice(bytes);
        Ok(EncryptionKey { key_bytes })
    }

    /// Export key as bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        self.key_bytes.to_vec()
    }

    /// Encrypts data using XChaCha20-Poly1305.
    /// Returns: nonce (24 bytes) + ciphertext + tag (16 bytes)
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
        let cipher = XChaCha20Poly1305::new(&self.key_bytes.into());
        let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng);

        let ciphertext = cipher.encrypt(&nonce, plaintext)
            .map_err(|e| JsValue::from_str(&format!("Encryption failed: {}", e)))?;

        // Prepend nonce to ciphertext
        let mut result = nonce.to_vec();
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypts data. Expects: nonce (24 bytes) + ciphertext + tag.
    pub fn decrypt(&self, encrypted_data: &[u8]) -> Result<Vec<u8>, JsValue> {
        if encrypted_data.len() < 24 {
            return Err(JsValue::from_str("Data too short to contain nonce"));
        }

        let nonce = XNonce::from_slice(&encrypted_data[0..24]);
        let ciphertext = &encrypted_data[24..];

        let cipher = XChaCha20Poly1305::new(&self.key_bytes.into());

        cipher.decrypt(nonce, ciphertext)
            .map_err(|e| JsValue::from_str(&format!("Decryption failed: {}", e)))
    }

    /// Export key as hex string
    pub fn to_hex(&self) -> String {
        hex::encode(&self.key_bytes)
    }

    /// Import key from hex string
    pub fn from_hex(hex_str: &str) -> Result<EncryptionKey, JsValue> {
        let bytes = hex::decode(hex_str)
            .map_err(|e| JsValue::from_str(&format!("Invalid hex: {}", e)))?;
        Self::from_bytes(&bytes)
    }
}

impl fmt::Debug for EncryptionKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("EncryptionKey")
         .field("key_bytes", &"REDACTED")
         .finish()
    }
}

#[cfg(all(test, target_arch = "wasm32"))]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_decryption() {
        let key = EncryptionKey::generate();
        let original_data = b"Secret Project Data";

        let encrypted = key.encrypt(original_data).expect("Encryption failed");
        assert_ne!(original_data, encrypted.as_slice());

        let decrypted = key.decrypt(&encrypted).expect("Decryption failed");
        assert_eq!(original_data, decrypted.as_slice());
    }

    #[test]
    fn test_decryption_wrong_key() {
        let key1 = EncryptionKey::generate();
        let key2 = EncryptionKey::generate();
        let original_data = b"Top Secret";

        let encrypted = key1.encrypt(original_data).expect("Encryption failed");

        let result = key2.decrypt(&encrypted);
        assert!(result.is_err());
    }
}
