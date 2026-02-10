use rand::RngCore;
use rand::rngs::OsRng;
use crate::identity::IdentityKey;
use wasm_bindgen::prelude::*;

/// Generates a random 32-byte challenge (Nonce).
pub fn generate_challenge() -> [u8; 32] {
    let mut nonce = [0u8; 32];
    OsRng.fill_bytes(&mut nonce);
    nonce
}

/// Signs a challenge with the user's identity.
pub fn sign_challenge(identity: &IdentityKey, challenge: &[u8]) -> [u8; 64] {
    identity.sign(challenge)
}

/// Verifies a challenge response.
/// Returns true if the signature is valid for the given challenge and public key.
pub fn verify_challenge_response(
    public_key_bytes: &[u8; 32],
    challenge: &[u8],
    signature_bytes: &[u8; 64]
) -> bool {
    IdentityKey::verify(public_key_bytes, challenge, signature_bytes)
}

// --- WASM Bindings for Simulation ---

#[wasm_bindgen]
pub struct HandshakeSimulator {
    alice: IdentityKey,
    bob: IdentityKey,
    current_challenge: Option<Vec<u8>>,
}

#[wasm_bindgen]
impl HandshakeSimulator {
    pub fn new() -> Self {
        HandshakeSimulator {
            alice: IdentityKey::generate(),
            bob: IdentityKey::generate(),
            current_challenge: None,
        }
    }

    pub fn get_alice_pub(&self) -> String {
        hex::encode(self.alice.public_key_bytes())
    }

    pub fn get_bob_pub(&self) -> String {
        hex::encode(self.bob.public_key_bytes())
    }

    pub fn alice_generates_challenge(&mut self) -> String {
        let c = generate_challenge();
        self.current_challenge = Some(c.to_vec());
        hex::encode(c)
    }

    pub fn bob_signs_challenge(&self) -> String {
        if let Some(c) = &self.current_challenge {
            let sig = sign_challenge(&self.bob, c);
            hex::encode(sig)
        } else {
            "No challenge".to_string()
        }
    }

    pub fn alice_verifies_bob(&self, signature_hex: &str) -> bool {
        if let Some(c) = &self.current_challenge {
            if let Ok(sig_bytes) = hex::decode(signature_hex) {
                if sig_bytes.len() == 64 {
                    let mut sig_arr = [0u8; 64];
                    sig_arr.copy_from_slice(&sig_bytes);
                    let bob_pub = self.bob.public_key_bytes();
                    return verify_challenge_response(&bob_pub, c, &sig_arr);
                }
            }
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_handshake_flow() {
        // Peer A (Verifier) generates a challenge
        let challenge = generate_challenge();

        // Peer B (Prover) has an identity
        let peer_b_identity = IdentityKey::generate();
        let peer_b_pub_key = peer_b_identity.public_key_bytes();

        // Peer B signs the challenge
        let signature = sign_challenge(&peer_b_identity, &challenge);

        // Peer A verifies the signature matches Peer B's public key and the challenge
        let is_valid = verify_challenge_response(&peer_b_pub_key, &challenge, &signature);
        assert!(is_valid, "Handshake verification failed");
    }

    #[test]
    fn test_handshake_tampering() {
        let challenge = generate_challenge();
        let peer_b_identity = IdentityKey::generate();
        let peer_b_pub_key = peer_b_identity.public_key_bytes();

        let signature = sign_challenge(&peer_b_identity, &challenge);

        // Attacker tries to use a different challenge
        let fake_challenge = generate_challenge();
        assert!(!verify_challenge_response(&peer_b_pub_key, &fake_challenge, &signature));

        // Attacker tries to use a different signature
        let mut fake_signature = signature;
        fake_signature[0] = !fake_signature[0]; // Bit flip
        assert!(!verify_challenge_response(&peer_b_pub_key, &challenge, &fake_signature));
    }
}
