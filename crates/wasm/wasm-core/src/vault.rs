use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;
use crate::identity::IdentityKey;
use crate::crypto::ProjectKey;
use crate::storage::{StorageProvider, InMemoryStorage};

#[wasm_bindgen]
pub struct Vault {
    // We wrap complex types that are not wasm_bindgen compatible in pure Rust structs
    // or use serde-wasm-bindgen for passing them around.
    // For internal state, we keep them as Rust types.
    identity: IdentityKey,
    projects: HashMap<String, ProjectKey>,
    // We use Box<dyn StorageProvider> to allow different storage backends.
    // However, for WASM interoperability, passing Trait objects is tricky.
    // For now, we'll hardcode InMemoryStorage or use a generic if we weren't exporting via wasm_bindgen directly.
    // To export via wasm_bindgen, the struct cannot have generics or lifetime parameters.
    // We'll wrap the storage in a Box.
    // Note: dyn StorageProvider must be Send + Sync which it is.
    #[wasm_bindgen(skip)]
    pub storage: Box<dyn StorageProvider>,
}

#[wasm_bindgen]
impl Vault {
    pub fn new() -> Vault {
        let identity = IdentityKey::generate();
        let storage = Box::new(InMemoryStorage::new());
        Vault {
            identity,
            projects: HashMap::new(),
            storage,
        }
    }

    pub fn get_identity_public_key(&self) -> String {
        hex::encode(self.identity.public_key_bytes())
    }

    pub fn create_project(&mut self, project_id: &str) -> String {
        let key = ProjectKey::generate();
        self.projects.insert(project_id.to_string(), key);
        // In a real app, we would save the key to storage here.
        format!("Project {} created", project_id)
    }

    pub fn encrypt_project_data(&self, project_id: &str, data: &[u8]) -> Result<Vec<u8>, JsValue> {
        if let Some(key) = self.projects.get(project_id) {
            key.encrypt(data).map_err(|e| JsValue::from_str(&e))
        } else {
            Err(JsValue::from_str("Project not found"))
        }
    }

    pub fn decrypt_project_data(&self, project_id: &str, encrypted_data: &[u8]) -> Result<Vec<u8>, JsValue> {
        if let Some(key) = self.projects.get(project_id) {
            key.decrypt(encrypted_data).map_err(|e| JsValue::from_str(&e))
        } else {
            Err(JsValue::from_str("Project not found"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_workflow() {
        let mut vault = Vault::new();
        let pub_key = vault.get_identity_public_key();
        assert_eq!(pub_key.len(), 64); // Hex string of 32 bytes

        vault.create_project("test-project");
        
        let data = b"Sensitive Data";
        let encrypted = vault.encrypt_project_data("test-project", data).unwrap();
        assert_ne!(data, encrypted.as_slice());

        let decrypted = vault.decrypt_project_data("test-project", &encrypted).unwrap();
        assert_eq!(data, decrypted.as_slice());
    }
}
