use wasm_bindgen::prelude::*;

use chacha20poly1305::{aead::Aead, aead::KeyInit, XChaCha20Poly1305};
use rand::RngCore;

#[wasm_bindgen]
pub fn encode_chat_text_v1(text: &str) -> Vec<u8> {
	holi_p2p::frame::encode_chat_text_v1(text)
}

#[wasm_bindgen]
pub fn encode_file_offer_v1(id: &str, filename: &str, mime_type: &str, size: u64) -> Vec<u8> {
	holi_p2p::frame::encode_file_offer_v1(&holi_p2p::frame::FileOffer {
		id: id.to_string(),
		filename: filename.to_string(),
		mime_type: mime_type.to_string(),
		size,
	})
}

#[wasm_bindgen]
pub fn encode_file_accept_v1(id: &str) -> Vec<u8> {
	holi_p2p::frame::encode_file_accept_v1(id)
}

#[wasm_bindgen]
pub fn encode_file_reject_v1(id: &str, reason: &str) -> Vec<u8> {
	holi_p2p::frame::encode_file_reject_v1(id, reason)
}

#[wasm_bindgen]
pub fn encode_file_chunk_v1(id: &str, chunk_index: u32, chunk_bytes: &[u8]) -> Vec<u8> {
	holi_p2p::frame::encode_file_chunk_v1(id, chunk_index, chunk_bytes)
}

#[wasm_bindgen]
pub fn encode_file_end_v1(id: &str) -> Vec<u8> {
	holi_p2p::frame::encode_file_end_v1(id)
}

#[wasm_bindgen]
pub fn decode_frame_type_v1(bytes: &[u8]) -> Result<u8, JsValue> {
	let (frame, _used) = holi_p2p::frame::decode_v1(bytes, 1024 * 1024)
		.map_err(|e| JsValue::from_str(&format!("decode error: {e:?}")))?;
	Ok(frame.frame_type as u8)
}

#[wasm_bindgen]
pub fn decode_chat_text_payload_v1(bytes: &[u8]) -> Result<String, JsValue> {
	let (frame, _used) = holi_p2p::frame::decode_v1(bytes, 1024 * 1024)
		.map_err(|e| JsValue::from_str(&format!("decode error: {e:?}")))?;
	if frame.frame_type != holi_p2p::frame::FrameType::ChatText {
		return Err(JsValue::from_str("not ChatText"));
	}
	String::from_utf8(frame.payload).map_err(|_| JsValue::from_str("payload not utf-8"))
}

#[wasm_bindgen]
pub fn decode_file_offer_v1(bytes: &[u8]) -> Result<JsValue, JsValue> {
	let (frame, _used) = holi_p2p::frame::decode_v1(bytes, 1024 * 1024)
		.map_err(|e| JsValue::from_str(&format!("decode error: {e:?}")))?;
	if frame.frame_type != holi_p2p::frame::FrameType::FileOffer {
		return Err(JsValue::from_str("not FileOffer"));
	}
	let offer = holi_p2p::frame::decode_file_offer_payload_v1(&frame.payload)
		.map_err(|e| JsValue::from_str(&format!("decode payload error: {e:?}")))?;

	let obj = js_sys::Object::new();
	js_sys::Reflect::set(&obj, &JsValue::from_str("id"), &JsValue::from_str(&offer.id))?;
	js_sys::Reflect::set(
		&obj,
		&JsValue::from_str("filename"),
		&JsValue::from_str(&offer.filename),
	)?;
	js_sys::Reflect::set(
		&obj,
		&JsValue::from_str("mimeType"),
		&JsValue::from_str(&offer.mime_type),
	)?;
	// JS can't represent all u64 exactly; we assume file sizes are < 2^53.
	let size_f64 = offer.size as f64;
	js_sys::Reflect::set(&obj, &JsValue::from_str("size"), &JsValue::from_f64(size_f64))?;
	Ok(obj.into())
}

#[wasm_bindgen]
pub fn decode_file_accept_id_v1(bytes: &[u8]) -> Result<String, JsValue> {
	let (frame, _used) = holi_p2p::frame::decode_v1(bytes, 1024 * 1024)
		.map_err(|e| JsValue::from_str(&format!("decode error: {e:?}")))?;
	if frame.frame_type != holi_p2p::frame::FrameType::FileAccept {
		return Err(JsValue::from_str("not FileAccept"));
	}
	holi_p2p::frame::decode_file_accept_payload_v1(&frame.payload)
		.map_err(|e| JsValue::from_str(&format!("decode payload error: {e:?}")))
}

#[wasm_bindgen]
pub fn decode_file_reject_v1(bytes: &[u8]) -> Result<JsValue, JsValue> {
	let (frame, _used) = holi_p2p::frame::decode_v1(bytes, 1024 * 1024)
		.map_err(|e| JsValue::from_str(&format!("decode error: {e:?}")))?;
	if frame.frame_type != holi_p2p::frame::FrameType::FileReject {
		return Err(JsValue::from_str("not FileReject"));
	}
	let rej = holi_p2p::frame::decode_file_reject_payload_v1(&frame.payload)
		.map_err(|e| JsValue::from_str(&format!("decode payload error: {e:?}")))?;

	let obj = js_sys::Object::new();
	js_sys::Reflect::set(&obj, &JsValue::from_str("id"), &JsValue::from_str(&rej.id))?;
	js_sys::Reflect::set(
		&obj,
		&JsValue::from_str("reason"),
		&JsValue::from_str(&rej.reason),
	)?;
	Ok(obj.into())
}

fn parse_key_32(key_bytes: &[u8]) -> Result<[u8; 32], JsValue> {
	if key_bytes.len() != 32 {
		return Err(JsValue::from_str("key must be 32 bytes"));
	}
	let mut key = [0u8; 32];
	key.copy_from_slice(key_bytes);
	Ok(key)
}

fn parse_nonce_24(nonce_bytes: &[u8]) -> Result<[u8; holi_p2p::frame::ENVELOPE_NONCE_LEN], JsValue> {
	if nonce_bytes.len() != holi_p2p::frame::ENVELOPE_NONCE_LEN {
		return Err(JsValue::from_str("nonce must be 24 bytes"));
	}
	let mut nonce = [0u8; holi_p2p::frame::ENVELOPE_NONCE_LEN];
	nonce.copy_from_slice(nonce_bytes);
	Ok(nonce)
}

#[wasm_bindgen]
pub fn encrypt_envelope_v1(key_bytes: &[u8], inner_frame_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
	let key = parse_key_32(key_bytes)?;
	let cipher = XChaCha20Poly1305::new((&key).into());

	let mut nonce = [0u8; holi_p2p::frame::ENVELOPE_NONCE_LEN];
	rand::rngs::OsRng.fill_bytes(&mut nonce);

	let ct = cipher
		.encrypt((&nonce).into(), inner_frame_bytes)
		.map_err(|_| JsValue::from_str("encrypt failed"))?;

	Ok(holi_p2p::frame::encode_encrypted_envelope_v1(&nonce, &ct))
}

#[wasm_bindgen]
pub fn encrypt_envelope_v1_with_nonce(
	key_bytes: &[u8],
	nonce_bytes: &[u8],
	inner_frame_bytes: &[u8],
) -> Result<Vec<u8>, JsValue> {
	let key = parse_key_32(key_bytes)?;
	let nonce = parse_nonce_24(nonce_bytes)?;
	let cipher = XChaCha20Poly1305::new((&key).into());
	let ct = cipher
		.encrypt((&nonce).into(), inner_frame_bytes)
		.map_err(|_| JsValue::from_str("encrypt failed"))?;
	Ok(holi_p2p::frame::encode_encrypted_envelope_v1(&nonce, &ct))
}

#[wasm_bindgen]
pub fn decrypt_envelope_v1(key_bytes: &[u8], envelope_frame_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
	let key = parse_key_32(key_bytes)?;
	let cipher = XChaCha20Poly1305::new((&key).into());

	let (frame, _used) = holi_p2p::frame::decode_v1(envelope_frame_bytes, 1024 * 1024)
		.map_err(|e| JsValue::from_str(&format!("decode error: {e:?}")))?;
	if frame.frame_type != holi_p2p::frame::FrameType::EncryptedEnvelope {
		return Err(JsValue::from_str("not EncryptedEnvelope"));
	}
	let (nonce, ciphertext) = holi_p2p::frame::decode_encrypted_envelope_payload_v1(&frame.payload)
		.map_err(|e| JsValue::from_str(&format!("decode payload error: {e:?}")))?;

	let pt = cipher
		.decrypt((&nonce).into(), ciphertext.as_slice())
		.map_err(|_| JsValue::from_str("decrypt failed"))?;
	Ok(pt)
}

#[wasm_bindgen]
pub fn decode_file_chunk_v1(bytes: &[u8]) -> Result<JsValue, JsValue> {
	let (frame, _used) = holi_p2p::frame::decode_v1(bytes, 1024 * 1024)
		.map_err(|e| JsValue::from_str(&format!("decode error: {e:?}")))?;
	if frame.frame_type != holi_p2p::frame::FrameType::FileChunk {
		return Err(JsValue::from_str("not FileChunk"));
	}
	let chunk = holi_p2p::frame::decode_file_chunk_payload_v1(&frame.payload)
		.map_err(|e| JsValue::from_str(&format!("decode payload error: {e:?}")))?;

	let obj = js_sys::Object::new();
	js_sys::Reflect::set(&obj, &JsValue::from_str("id"), &JsValue::from_str(&chunk.id))?;
	js_sys::Reflect::set(
		&obj,
		&JsValue::from_str("chunkIndex"),
		&JsValue::from_f64(chunk.chunk_index as f64),
	)?;
	let data = js_sys::Uint8Array::from(chunk.data.as_slice());
	js_sys::Reflect::set(&obj, &JsValue::from_str("data"), &data.into())?;
	Ok(obj.into())
}

#[wasm_bindgen]
pub fn decode_file_end_id_v1(bytes: &[u8]) -> Result<String, JsValue> {
	let (frame, _used) = holi_p2p::frame::decode_v1(bytes, 1024 * 1024)
		.map_err(|e| JsValue::from_str(&format!("decode error: {e:?}")))?;
	if frame.frame_type != holi_p2p::frame::FrameType::FileEnd {
		return Err(JsValue::from_str("not FileEnd"));
	}
	holi_p2p::frame::decode_file_end_payload_v1(&frame.payload)
		.map_err(|e| JsValue::from_str(&format!("decode payload error: {e:?}")))
}
