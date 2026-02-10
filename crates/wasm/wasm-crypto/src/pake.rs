//! Password-Authenticated Key Exchange (PAKE)
//!
//! Current implementation: SPAKE2 over Ed25519Group.
//!
//! Notes:
//! - This is meant to be used for establishing a per-session symmetric key
//!   without ever sending the password or a password-derived key.
//! - The raw SPAKE2 output is further expanded via HKDF-SHA256 to produce a
//!   domain-separated 32-byte session key.

use hkdf::Hkdf;
use sha2::Sha256;
use spake2::{Ed25519Group, Identity, Password, Spake2};
use wasm_bindgen::prelude::*;

const HOLI_PAKE_SALT_V1: &[u8] = b"holi.pake.salt.v1";
const HOLI_PAKE_INFO_SESSION_KEY_V1: &[u8] = b"holi.pake.info.session_key.v1";

fn hkdf_32(shared_key_material: &[u8]) -> Result<[u8; 32], JsValue> {
    let hk = Hkdf::<Sha256>::new(Some(HOLI_PAKE_SALT_V1), shared_key_material);
    let mut okm = [0u8; 32];
    hk.expand(HOLI_PAKE_INFO_SESSION_KEY_V1, &mut okm)
        .map_err(|_| JsValue::from_str("HKDF expand failed"))?;
    Ok(okm)
}

fn spake_err(e: spake2::Error) -> JsValue {
    JsValue::from_str(&format!("SPAKE2 failed: {e}"))
}

/// SPAKE2 role A (typically: offerer / initiator).
#[wasm_bindgen]
pub struct Spake2A {
    state: Option<Spake2<Ed25519Group>>,
    outbound_msg: Vec<u8>,
}

#[wasm_bindgen]
impl Spake2A {
    /// Start SPAKE2 role A.
    ///
    /// `id_a` / `id_b` are protocol identity strings that bind the handshake.
    /// For holi, these should be stable per pairing context (e.g. contact IDs).
    #[wasm_bindgen(constructor)]
    pub fn new(password: &[u8], id_a: &[u8], id_b: &[u8]) -> Result<Spake2A, JsValue> {
        let (state, outbound_msg) = Spake2::<Ed25519Group>::start_a(
            &Password::new(password),
            &Identity::new(id_a),
            &Identity::new(id_b),
        );

        Ok(Spake2A {
            state: Some(state),
            outbound_msg,
        })
    }

    /// Get the outbound message to send to the peer.
    pub fn message(&self) -> Vec<u8> {
        self.outbound_msg.clone()
    }

    /// Finish the handshake with the peer's message and derive a 32-byte session key.
    pub fn finish(&mut self, inbound_msg: &[u8]) -> Result<Vec<u8>, JsValue> {
        let state = self
            .state
            .take()
            .ok_or_else(|| JsValue::from_str("SPAKE2 state already consumed"))?;

        let shared = state.finish(inbound_msg).map_err(spake_err)?;
        let session_key = hkdf_32(&shared)?;
        Ok(session_key.to_vec())
    }
}

/// SPAKE2 role B (typically: answerer / responder).
#[wasm_bindgen]
pub struct Spake2B {
    state: Option<Spake2<Ed25519Group>>,
    outbound_msg: Vec<u8>,
}

#[wasm_bindgen]
impl Spake2B {
    /// Start SPAKE2 role B.
    #[wasm_bindgen(constructor)]
    pub fn new(password: &[u8], id_a: &[u8], id_b: &[u8]) -> Result<Spake2B, JsValue> {
        let (state, outbound_msg) = Spake2::<Ed25519Group>::start_b(
            &Password::new(password),
            &Identity::new(id_a),
            &Identity::new(id_b),
        );

        Ok(Spake2B {
            state: Some(state),
            outbound_msg,
        })
    }

    /// Get the outbound message to send to the peer.
    pub fn message(&self) -> Vec<u8> {
        self.outbound_msg.clone()
    }

    /// Finish the handshake with the peer's message and derive a 32-byte session key.
    pub fn finish(&mut self, inbound_msg: &[u8]) -> Result<Vec<u8>, JsValue> {
        let state = self
            .state
            .take()
            .ok_or_else(|| JsValue::from_str("SPAKE2 state already consumed"))?;

        let shared = state.finish(inbound_msg).map_err(spake_err)?;
        let session_key = hkdf_32(&shared)?;
        Ok(session_key.to_vec())
    }
}

/// SPAKE2 symmetric mode (both sides call the same API).
///
/// Useful when you don't want to pre-assign A/B roles.
#[wasm_bindgen]
pub struct Spake2Symmetric {
    state: Option<Spake2<Ed25519Group>>,
    outbound_msg: Vec<u8>,
}

#[wasm_bindgen]
impl Spake2Symmetric {
    #[wasm_bindgen(constructor)]
    pub fn new(password: &[u8], id_s: &[u8]) -> Result<Spake2Symmetric, JsValue> {
        let (state, outbound_msg) = Spake2::<Ed25519Group>::start_symmetric(
            &Password::new(password),
            &Identity::new(id_s),
        );

        Ok(Spake2Symmetric {
            state: Some(state),
            outbound_msg,
        })
    }

    pub fn message(&self) -> Vec<u8> {
        self.outbound_msg.clone()
    }

    pub fn finish(&mut self, inbound_msg: &[u8]) -> Result<Vec<u8>, JsValue> {
        let state = self
            .state
            .take()
            .ok_or_else(|| JsValue::from_str("SPAKE2 state already consumed"))?;

        let shared = state.finish(inbound_msg).map_err(spake_err)?;
        let session_key = hkdf_32(&shared)?;
        Ok(session_key.to_vec())
    }
}

#[cfg(all(test, target_arch = "wasm32"))]
mod tests {
    use super::*;

    #[test]
    fn spake2_ab_roundtrip_derives_same_key() {
        let password = b"correct horse battery staple";
        let id_a = b"holi:test:alice";
        let id_b = b"holi:test:bob";

        let mut a = Spake2A::new(password, id_a, id_b).unwrap();
        let mut b = Spake2B::new(password, id_a, id_b).unwrap();

        let a_msg = a.message();
        let b_msg = b.message();

        let a_key = a.finish(&b_msg).unwrap();
        let b_key = b.finish(&a_msg).unwrap();

        assert_eq!(a_key.len(), 32);
        assert_eq!(a_key, b_key);
    }

    #[test]
    fn spake2_symmetric_roundtrip_derives_same_key() {
        let password = b"123456";
        let id_s = b"holi:test:symmetric";

        let mut p1 = Spake2Symmetric::new(password, id_s).unwrap();
        let mut p2 = Spake2Symmetric::new(password, id_s).unwrap();

        let m1 = p1.message();
        let m2 = p2.message();

        let k1 = p1.finish(&m2).unwrap();
        let k2 = p2.finish(&m1).unwrap();

        assert_eq!(k1.len(), 32);
        assert_eq!(k1, k2);
    }
}
