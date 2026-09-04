//! Encrypted Vault for Project Data
//!
//! Combines identity and encryption for secure project storage.

use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use crate::identity::IdentityKey;
use crate::encryption::EncryptionKey;

/// Secure vault for managing encrypted projects
#[wasm_bindgen]
pub struct Vault {
    identity: IdentityKey,
    #[wasm_bindgen(skip)]
    projects: HashMap<String, EncryptionKey>,
}

#[wasm_bindgen]
impl Vault {
    /// Create a new vault with a fresh identity
    #[wasm_bindgen(constructor)]
    pub fn new() -> Vault {
        Vault {
            identity: IdentityKey::generate(),
            projects: HashMap::new(),
        }
    }

    /// Get the vault's public identity key as hex
    pub fn get_public_key(&self) -> String {
        self.identity.public_key_hex()
    }

    /// Sign a message with the vault's identity
    pub fn sign(&self, message: &[u8]) -> Vec<u8> {
        self.identity.sign(message)
    }

    /// Create a new encrypted project
    pub fn create_project(&mut self, project_id: &str) -> String {
        let key = EncryptionKey::generate();
        self.projects.insert(project_id.to_string(), key);
        format!("Project '{}' created", project_id)
    }

    /// Check if a project exists
    pub fn has_project(&self, project_id: &str) -> bool {
        self.projects.contains_key(project_id)
    }

    /// List all project IDs
    pub fn list_projects(&self) -> Vec<String> {
        self.projects.keys().cloned().collect()
    }

    /// Encrypt data for a specific project
    pub fn encrypt(&self, project_id: &str, data: &[u8]) -> Result<Vec<u8>, JsValue> {
        self.projects.get(project_id)
            .ok_or_else(|| JsValue::from_str("Project not found"))?
            .encrypt(data)
    }

    /// Decrypt data for a specific project
    pub fn decrypt(&self, project_id: &str, encrypted_data: &[u8]) -> Result<Vec<u8>, JsValue> {
        self.projects.get(project_id)
            .ok_or_else(|| JsValue::from_str("Project not found"))?
            .decrypt(encrypted_data)
    }

    /// Export a project key (for sharing or backup)
    pub fn export_project_key(&self, project_id: &str) -> Result<String, JsValue> {
        self.projects.get(project_id)
            .ok_or_else(|| JsValue::from_str("Project not found"))
            .map(|k| k.to_hex())
    }

    /// Import a project key
    pub fn import_project_key(&mut self, project_id: &str, key_hex: &str) -> Result<(), JsValue> {
        let key = EncryptionKey::from_hex(key_hex)?;
        self.projects.insert(project_id.to_string(), key);
        Ok(())
    }

    /// Delete a project
    pub fn delete_project(&mut self, project_id: &str) -> bool {
        self.projects.remove(project_id).is_some()
    }
}

impl Default for Vault {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(all(test, target_arch = "wasm32"))]
mod tests {
    use super::*;

    #[test]
    fn test_vault_workflow() {
        let mut vault = Vault::new();
        let pub_key = vault.get_public_key();
        assert_eq!(pub_key.len(), 64); // Hex string of 32 bytes

        vault.create_project("test-project");
        assert!(vault.has_project("test-project"));

        let data = b"Sensitive Data";
        let encrypted = vault.encrypt("test-project", data).unwrap();
        assert_ne!(data, encrypted.as_slice());

        let decrypted = vault.decrypt("test-project", &encrypted).unwrap();
        assert_eq!(data, decrypted.as_slice());
    }

    #[test]
    fn test_vault_key_export_import() {
        let mut vault1 = Vault::new();
        vault1.create_project("shared");
        
        let data = b"Shared secret";
        let encrypted = vault1.encrypt("shared", data).unwrap();
        
        // Export key
        let key_hex = vault1.export_project_key("shared").unwrap();
        
        // Import to another vault
        let mut vault2 = Vault::new();
        vault2.import_project_key("shared", &key_hex).unwrap();
        
        // Should be able to decrypt
        let decrypted = vault2.decrypt("shared", &encrypted).unwrap();
        assert_eq!(data, decrypted.as_slice());
    }
}
