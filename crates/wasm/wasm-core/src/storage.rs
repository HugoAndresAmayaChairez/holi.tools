use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone)]
pub enum StorageError {
    NotFound,
    AccessDenied,
    IOError(String),
}

// We use a manual async trait pattern here to avoid adding 'async-trait' crate dependency
// and keep it simple for WASM compilation.
pub trait StorageProvider: Send + Sync {
    fn read(&self, path: &str) -> Result<Vec<u8>, StorageError>;
    fn write(&self, path: &str, data: &[u8]) -> Result<(), StorageError>;
    fn delete(&self, path: &str) -> Result<(), StorageError>;
    fn list(&self) -> Result<Vec<String>, StorageError>;
}

// In-Memory implementation for testing and temporary storage
pub struct InMemoryStorage {
    files: Arc<Mutex<HashMap<String, Vec<u8>>>>,
}

impl InMemoryStorage {
    pub fn new() -> Self {
        InMemoryStorage {
            files: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl StorageProvider for InMemoryStorage {
    fn read(&self, path: &str) -> Result<Vec<u8>, StorageError> {
        let files = self.files.lock().unwrap();
        files.get(path).cloned().ok_or(StorageError::NotFound)
    }

    fn write(&self, path: &str, data: &[u8]) -> Result<(), StorageError> {
        let mut files = self.files.lock().unwrap();
        files.insert(path.to_string(), data.to_vec());
        Ok(())
    }

    fn delete(&self, path: &str) -> Result<(), StorageError> {
        let mut files = self.files.lock().unwrap();
        files.remove(path);
        Ok(())
    }

    fn list(&self) -> Result<Vec<String>, StorageError> {
        let files = self.files.lock().unwrap();
        Ok(files.keys().cloned().collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_in_memory_storage() {
        let storage = InMemoryStorage::new();
        
        // Write
        storage.write("test.txt", b"hello").unwrap();
        
        // Read
        let content = storage.read("test.txt").unwrap();
        assert_eq!(content, b"hello");
        
        // List
        let files = storage.list().unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0], "test.txt");
        
        // Delete
        storage.delete("test.txt").unwrap();
        assert!(storage.read("test.txt").is_err());
    }
}
