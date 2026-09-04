use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce
};
use serde::{Serialize, Deserialize};
use std::fmt;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone)]
pub struct ProjectKey {
    #[wasm_bindgen(skip)]
    pub key_bytes: [u8; 32],
}

#[wasm_bindgen]
impl ProjectKey {
    #[wasm_bindgen(constructor)]
    pub fn generate() -> Self {
        let key = XChaCha20Poly1305::generate_key(&mut OsRng);
        ProjectKey {
            key_bytes: key.into(),
        }
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<ProjectKey, String> {
        if bytes.len() != 32 {
            return Err("Key must be 32 bytes".into());
        }
        let mut key_bytes = [0u8; 32];
        key_bytes.copy_from_slice(bytes);
        Ok(ProjectKey { key_bytes })
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        self.key_bytes.to_vec()
    }

    /// Encrypts data using XChaCha20-Poly1305.
    /// Returns: nonce (24 bytes) + ciphertext + tag (16 bytes)
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, String> {
        let cipher = XChaCha20Poly1305::new(&self.key_bytes.into());
        let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng); // 24-bytes; unique per message
        
        let ciphertext = cipher.encrypt(&nonce, plaintext)
            .map_err(|e| format!("Encryption failed: {}", e))?;
            
        // Prepend nonce to ciphertext for storage/transmission
        let mut result = nonce.to_vec();
        result.extend_from_slice(&ciphertext);
        
        Ok(result)
    }

    /// Decrypts data. Expects input to be: nonce (24 bytes) + ciphertext + tag.
    pub fn decrypt(&self, encrypted_data: &[u8]) -> Result<Vec<u8>, String> {
        if encrypted_data.len() < 24 {
            return Err("Data too short to contain nonce".into());
        }

        let nonce = XNonce::from_slice(&encrypted_data[0..24]);
        let ciphertext = &encrypted_data[24..];

        let cipher = XChaCha20Poly1305::new(&self.key_bytes.into());
        
        cipher.decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))
    }
}

impl fmt::Debug for ProjectKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ProjectKey")
         .field("key_bytes", &"REDACTED")
         .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_encryption_decryption() {
        let key = ProjectKey::generate();
        let original_data = b"Secret Project Data";
        
        let encrypted = key.encrypt(original_data).expect("Encryption failed");
        assert_ne!(original_data, encrypted.as_slice());
        
        let decrypted = key.decrypt(&encrypted).expect("Decryption failed");
        assert_eq!(original_data, decrypted.as_slice());
    }

    #[test]
    fn test_project_decryption_wrong_key() {
        let key1 = ProjectKey::generate();
        let key2 = ProjectKey::generate();
        let original_data = b"Top Secret";
        
        let encrypted = key1.encrypt(original_data).expect("Encryption failed");
        
        // Try decrypting with wrong key
        let result = key2.decrypt(&encrypted);
        assert!(result.is_err());
    }
}
