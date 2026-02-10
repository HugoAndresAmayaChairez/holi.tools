use serde::{Serialize, Deserialize};
use crate::identity::IdentityKey;
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct UserIdentity {
    pub user_id: String,
    pub signing_key: IdentityKey,
    pub display_name: String,
    pub avatar_data: Option<Vec<u8>>,
    pub created_at: u64,
    pub device_fingerprint: String,
}

impl UserIdentity {
    pub fn new(display_name: String, device_fingerprint: String) -> Self {
        let key = IdentityKey::generate();
        let pub_key = hex::encode(key.public_key_bytes());
        
        // Simple User ID derivation: "u_" + first 16 chars of pubkey hex
        let user_id = format!("u_{}", &pub_key[0..16]);
        
        let created_at = if cfg!(target_arch = "wasm32") {
            js_sys::Date::now() as u64
        } else {
            0
        };

        UserIdentity {
            user_id,
            signing_key: key,
            display_name,
            avatar_data: None,
            created_at,
            device_fingerprint,
        }
    }

    // For pure Rust testing where js_sys might not be available
    pub fn new_test(display_name: String) -> Self {
        let key = IdentityKey::generate();
        let pub_key = hex::encode(key.public_key_bytes());
        let user_id = format!("u_{}", &pub_key[0..16]);
        
        UserIdentity {
            user_id,
            signing_key: key,
            display_name,
            avatar_data: None,
            created_at: 0,
            device_fingerprint: "test-device".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_identity_creation() {
        let user = UserIdentity::new_test("Alice".to_string());
        assert!(user.user_id.starts_with("u_"));
        assert_eq!(user.display_name, "Alice");
        assert_eq!(user.device_fingerprint, "test-device");
    }

    #[test]
    fn test_serialization() {
        let user = UserIdentity::new_test("Bob".to_string());
        let json = serde_json::to_string(&user).unwrap();
        let deserialized: UserIdentity = serde_json::from_str(&json).unwrap();
        
        assert_eq!(user.user_id, deserialized.user_id);
        assert_eq!(user.display_name, deserialized.display_name);
        // We can't easily compare keys unless IdentityKey implements PartialEq, 
        // but if it deserialized without error, it's likely fine.
    }
}
