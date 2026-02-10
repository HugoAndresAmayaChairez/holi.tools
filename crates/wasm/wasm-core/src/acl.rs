use std::collections::HashMap;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum PermissionRole {
    Owner,
    Editor,
    Viewer,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PeerPermission {
    pub user_id: String,
    pub role: PermissionRole,
    pub is_revoked: bool,
    pub since: u64,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct AccessControlList {
    // Maps user_id -> PeerPermission
    permissions: HashMap<String, PeerPermission>,
}

impl AccessControlList {
    pub fn new() -> Self {
        AccessControlList {
            permissions: HashMap::new(),
        }
    }

    pub fn grant(&mut self, user_id: &str, role: PermissionRole) {
        // If entry exists, update it. If revoked, unrevoke it.
        let now = if cfg!(target_arch = "wasm32") {
            js_sys::Date::now() as u64
        } else {
            0 // Mock time for testing
        };

        let perm = self.permissions.entry(user_id.to_string()).or_insert(PeerPermission {
            user_id: user_id.to_string(),
            role: role.clone(),
            is_revoked: false,
            since: now,
        });
        
        perm.role = role;
        perm.is_revoked = false;
        perm.since = now;
    }

    pub fn revoke(&mut self, user_id: &str) {
        if let Some(perm) = self.permissions.get_mut(user_id) {
            perm.is_revoked = true;
        }
        // If user doesn't exist, we don't need to do anything (default deny)
    }

    pub fn check_access(&self, user_id: &str) -> Option<&PermissionRole> {
        if let Some(perm) = self.permissions.get(user_id) {
            if !perm.is_revoked {
                return Some(&perm.role);
            }
        }
        None
    }

    pub fn is_allowed(&self, user_id: &str) -> bool {
        self.check_access(user_id).is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_acl_grant_and_check() {
        let mut acl = AccessControlList::new();
        acl.grant("user_123", PermissionRole::Editor);

        assert!(acl.is_allowed("user_123"));
        assert_eq!(acl.check_access("user_123"), Some(&PermissionRole::Editor));
        assert!(!acl.is_allowed("user_456"));
    }

    #[test]
    fn test_acl_revocation() {
        let mut acl = AccessControlList::new();
        acl.grant("user_123", PermissionRole::Viewer);
        assert!(acl.is_allowed("user_123"));

        acl.revoke("user_123");
        assert!(!acl.is_allowed("user_123"));
        assert_eq!(acl.check_access("user_123"), None);
    }
}
