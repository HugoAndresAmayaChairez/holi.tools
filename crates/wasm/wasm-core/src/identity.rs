use ed25519_dalek::{SigningKey, VerifyingKey, Signer, Verifier, Signature};
use rand::rngs::OsRng;
use serde::{Serialize, Deserialize};
use std::fmt;

// Wrapper struct for serializability
#[derive(Serialize, Deserialize)]
pub struct IdentityKey {
    // We store the secret bytes to be easily serializable.
    // In a real app, we might want to be more careful with memory,
    // but for WASM boundaries, this is standard.
    secret_bytes: [u8; 32],
}

impl IdentityKey {
    pub fn generate() -> Self {
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        IdentityKey {
            secret_bytes: signing_key.to_bytes(),
        }
    }

    pub fn public_key_bytes(&self) -> [u8; 32] {
        let signing_key = SigningKey::from_bytes(&self.secret_bytes);
        signing_key.verifying_key().to_bytes()
    }

    pub fn sign(&self, message: &[u8]) -> [u8; 64] {
        let signing_key = SigningKey::from_bytes(&self.secret_bytes);
        signing_key.sign(message).to_bytes()
    }

    pub fn verify(public_bytes: &[u8; 32], message: &[u8], signature_bytes: &[u8; 64]) -> bool {
        if let Ok(verifying_key) = VerifyingKey::from_bytes(public_bytes) {
            let signature = Signature::from_bytes(signature_bytes);
            return verifying_key.verify(message, &signature).is_ok();
        }
        false
    }
}

// Debug implementation for easier testing output
impl fmt::Debug for IdentityKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("IdentityKey")
         .field("public", &hex::encode(self.public_key_bytes()))
         .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identity_generation_and_signing() {
        let identity = IdentityKey::generate();
        let message = b"Hello P2P World";
        let signature = identity.sign(message);
        let public_key = identity.public_key_bytes();

        assert!(IdentityKey::verify(&public_key, message, &signature));
    }

    #[test]
    fn test_identity_verification_failure() {
        let identity = IdentityKey::generate();
        let message = b"Hello P2P World";
        let signature = identity.sign(message);
        let public_key = identity.public_key_bytes();

        let wrong_message = b"Hacked Message";
        assert!(!IdentityKey::verify(&public_key, wrong_message, &signature));
    }
}
