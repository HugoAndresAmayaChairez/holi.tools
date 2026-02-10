use crate::varint::{
	decode_u32_varint, decode_u64_varint, encode_u32_varint, encode_u64_varint, VarintError,
};

pub const MAGIC: [u8; 2] = [b'H', b'O'];
pub const VERSION_V1: u8 = 1;
pub const ENVELOPE_NONCE_LEN: usize = 24;

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FrameType {
	Ping = 0x01,
	Pong = 0x02,
	ChatText = 0x10,
	FileOffer = 0x20,
	FileAccept = 0x21,
	FileReject = 0x22,
	FileChunk = 0x23,
	FileEnd = 0x24,
	ProtocolError = 0x7F,
	EncryptedEnvelope = 0x50,
}

impl FrameType {
	pub fn from_u8(value: u8) -> Option<Self> {
		Some(match value {
			0x01 => Self::Ping,
			0x02 => Self::Pong,
			0x10 => Self::ChatText,
			0x20 => Self::FileOffer,
			0x21 => Self::FileAccept,
			0x22 => Self::FileReject,
			0x23 => Self::FileChunk,
			0x24 => Self::FileEnd,
			0x7F => Self::ProtocolError,
			0x50 => Self::EncryptedEnvelope,
			_ => return None,
		})
	}
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frame {
	pub frame_type: FrameType,
	pub flags: u8,
	pub payload: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileOffer {
	pub id: String,
	pub filename: String,
	pub mime_type: String,
	pub size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileChunk {
	pub id: String,
	pub chunk_index: u32,
	pub data: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileReject {
	pub id: String,
	pub reason: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DecodeError {
	UnexpectedEof,
	BadMagic,
	UnsupportedVersion { version: u8 },
	UnknownFrameType { frame_type: u8 },
	Varint(VarintError),
	LengthTooLarge { length: u32, max: u32 },
	InvalidUtf8,
	BadEnvelope,
}

impl From<VarintError> for DecodeError {
	fn from(value: VarintError) -> Self {
		Self::Varint(value)
	}
}

pub fn encode_v1(frame: &Frame, out: &mut Vec<u8>) {
	out.extend_from_slice(&MAGIC);
	out.push(VERSION_V1);
	out.push(frame.frame_type as u8);
	out.push(frame.flags);
	encode_u32_varint(frame.payload.len() as u32, out);
	out.extend_from_slice(&frame.payload);
}

pub fn decode_v1(input: &[u8], max_payload_len: u32) -> Result<(Frame, usize), DecodeError> {
	if input.len() < 5 {
		return Err(DecodeError::UnexpectedEof);
	}
	if input[0..2] != MAGIC {
		return Err(DecodeError::BadMagic);
	}
	let version = input[2];
	if version != VERSION_V1 {
		return Err(DecodeError::UnsupportedVersion { version });
	}
	let frame_type_raw = input[3];
	let flags = input[4];
	let frame_type = FrameType::from_u8(frame_type_raw)
		.ok_or(DecodeError::UnknownFrameType { frame_type: frame_type_raw })?;

	let (payload_len, varint_len) = decode_u32_varint(&input[5..])?;
	if payload_len > max_payload_len {
		return Err(DecodeError::LengthTooLarge {
			length: payload_len,
			max: max_payload_len,
		});
	}
	let header_len = 5 + varint_len;
	let total_len = header_len + payload_len as usize;
	if input.len() < total_len {
		return Err(DecodeError::UnexpectedEof);
	}
	let payload = input[header_len..total_len].to_vec();
	Ok((
		Frame {
			frame_type,
			flags,
			payload,
		},
		total_len,
	))
}

pub fn encode_chat_text_v1(text: &str) -> Vec<u8> {
	let frame = Frame {
		frame_type: FrameType::ChatText,
		flags: 0,
		payload: text.as_bytes().to_vec(),
	};
	let mut out = Vec::with_capacity(2 + 1 + 1 + 1 + 5 + frame.payload.len());
	encode_v1(&frame, &mut out);
	out
}

fn encode_string(out: &mut Vec<u8>, value: &str) {
	encode_u32_varint(value.as_bytes().len() as u32, out);
	out.extend_from_slice(value.as_bytes());
}

fn decode_string(input: &[u8]) -> Result<(String, usize), DecodeError> {
	let (len, n) = decode_u32_varint(input)?;
	let start = n;
	let end = start + len as usize;
	if input.len() < end {
		return Err(DecodeError::UnexpectedEof);
	}
	let s = std::str::from_utf8(&input[start..end])
		.map_err(|_| DecodeError::InvalidUtf8)?
		.to_string();
	Ok((s, end))
}

pub fn encode_file_offer_v1(offer: &FileOffer) -> Vec<u8> {
	let mut payload = Vec::new();
	encode_string(&mut payload, &offer.id);
	encode_string(&mut payload, &offer.filename);
	encode_string(&mut payload, &offer.mime_type);
	encode_u64_varint(offer.size, &mut payload);

	let frame = Frame {
		frame_type: FrameType::FileOffer,
		flags: 0,
		payload,
	};
	let mut out = Vec::new();
	encode_v1(&frame, &mut out);
	out
}

pub fn encode_file_accept_v1(id: &str) -> Vec<u8> {
	let mut payload = Vec::new();
	encode_string(&mut payload, id);
	let frame = Frame {
		frame_type: FrameType::FileAccept,
		flags: 0,
		payload,
	};
	let mut out = Vec::new();
	encode_v1(&frame, &mut out);
	out
}

pub fn decode_file_accept_payload_v1(payload: &[u8]) -> Result<String, DecodeError> {
	let (id, _used) = decode_string(payload)?;
	Ok(id)
}

pub fn encode_file_reject_v1(id: &str, reason: &str) -> Vec<u8> {
	let mut payload = Vec::new();
	encode_string(&mut payload, id);
	encode_string(&mut payload, reason);
	let frame = Frame {
		frame_type: FrameType::FileReject,
		flags: 0,
		payload,
	};
	let mut out = Vec::new();
	encode_v1(&frame, &mut out);
	out
}

pub fn encode_encrypted_envelope_v1(nonce: &[u8; ENVELOPE_NONCE_LEN], ciphertext: &[u8]) -> Vec<u8> {
	let mut payload = Vec::with_capacity(ENVELOPE_NONCE_LEN + ciphertext.len());
	payload.extend_from_slice(nonce);
	payload.extend_from_slice(ciphertext);
	let frame = Frame {
		frame_type: FrameType::EncryptedEnvelope,
		flags: 0,
		payload,
	};
	let mut out = Vec::new();
	encode_v1(&frame, &mut out);
	out
}

pub fn decode_encrypted_envelope_payload_v1(
	payload: &[u8],
) -> Result<([u8; ENVELOPE_NONCE_LEN], Vec<u8>), DecodeError> {
	if payload.len() < ENVELOPE_NONCE_LEN {
		return Err(DecodeError::BadEnvelope);
	}
	let mut nonce = [0u8; ENVELOPE_NONCE_LEN];
	nonce.copy_from_slice(&payload[..ENVELOPE_NONCE_LEN]);
	let ciphertext = payload[ENVELOPE_NONCE_LEN..].to_vec();
	Ok((nonce, ciphertext))
}

pub fn decode_file_reject_payload_v1(payload: &[u8]) -> Result<FileReject, DecodeError> {
	let (id, i1) = decode_string(payload)?;
	let (reason, _i2) = decode_string(&payload[i1..])?;
	Ok(FileReject { id, reason })
}

pub fn decode_file_offer_payload_v1(payload: &[u8]) -> Result<FileOffer, DecodeError> {
	let (id, i1) = decode_string(payload)?;
	let (filename, i2) = decode_string(&payload[i1..])?;
	let (mime_type, i3) = decode_string(&payload[i1 + i2..])?;
	let (size, _i4) = decode_u64_varint(&payload[i1 + i2 + i3..])?;
	Ok(FileOffer {
		id,
		filename,
		mime_type,
		size,
	})
}

pub fn encode_file_chunk_v1(id: &str, chunk_index: u32, data: &[u8]) -> Vec<u8> {
	let mut payload = Vec::with_capacity(id.len() + data.len() + 16);
	encode_string(&mut payload, id);
	encode_u32_varint(chunk_index, &mut payload);
	payload.extend_from_slice(data);

	let frame = Frame {
		frame_type: FrameType::FileChunk,
		flags: 0,
		payload,
	};
	let mut out = Vec::new();
	encode_v1(&frame, &mut out);
	out
}

pub fn decode_file_chunk_payload_v1(payload: &[u8]) -> Result<FileChunk, DecodeError> {
	let (id, i1) = decode_string(payload)?;
	let (chunk_index, n2) = decode_u32_varint(&payload[i1..])?;
	let data_start = i1 + n2;
	if data_start > payload.len() {
		return Err(DecodeError::UnexpectedEof);
	}
	Ok(FileChunk {
		id,
		chunk_index,
		data: payload[data_start..].to_vec(),
	})
}

pub fn encode_file_end_v1(id: &str) -> Vec<u8> {
	let mut payload = Vec::new();
	encode_string(&mut payload, id);
	let frame = Frame {
		frame_type: FrameType::FileEnd,
		flags: 0,
		payload,
	};
	let mut out = Vec::new();
	encode_v1(&frame, &mut out);
	out
}

pub fn decode_file_end_payload_v1(payload: &[u8]) -> Result<String, DecodeError> {
	let (id, _used) = decode_string(payload)?;
	Ok(id)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn encode_decode_roundtrip() {
		let frame = Frame {
			frame_type: FrameType::Ping,
			flags: 0xAA,
			payload: vec![1, 2, 3, 4, 5],
		};
		let mut bytes = Vec::new();
		encode_v1(&frame, &mut bytes);

		let (decoded, used) = decode_v1(&bytes, 1024).unwrap();
		assert_eq!(used, bytes.len());
		assert_eq!(decoded, frame);
	}

	#[test]
	fn decode_rejects_big_payload() {
		let frame = Frame {
			frame_type: FrameType::Ping,
			flags: 0,
			payload: vec![0u8; 33],
		};
		let mut bytes = Vec::new();
		encode_v1(&frame, &mut bytes);

		let err = decode_v1(&bytes, 32).unwrap_err();
		assert!(matches!(err, DecodeError::LengthTooLarge { .. }));
	}

	#[test]
	fn chat_text_helper() {
		let bytes = encode_chat_text_v1("hola");
		let (decoded, used) = decode_v1(&bytes, 1024).unwrap();
		assert_eq!(used, bytes.len());
		assert_eq!(decoded.frame_type, FrameType::ChatText);
		assert_eq!(decoded.payload, b"hola".to_vec());
	}

	#[test]
	fn file_offer_roundtrip() {
		let offer = FileOffer {
			id: "id-1".to_string(),
			filename: "hello.txt".to_string(),
			mime_type: "text/plain".to_string(),
			size: 1234,
		};
		let bytes = encode_file_offer_v1(&offer);
		let (frame, used) = decode_v1(&bytes, 1024 * 1024).unwrap();
		assert_eq!(used, bytes.len());
		assert_eq!(frame.frame_type, FrameType::FileOffer);
		let decoded_offer = decode_file_offer_payload_v1(&frame.payload).unwrap();
		assert_eq!(decoded_offer, offer);
	}

	#[test]
	fn file_accept_roundtrip() {
		let bytes = encode_file_accept_v1("id-a");
		let (frame, _used) = decode_v1(&bytes, 1024 * 1024).unwrap();
		assert_eq!(frame.frame_type, FrameType::FileAccept);
		let id = decode_file_accept_payload_v1(&frame.payload).unwrap();
		assert_eq!(id, "id-a");
	}

	#[test]
	fn file_reject_roundtrip() {
		let bytes = encode_file_reject_v1("id-r", "too big");
		let (frame, _used) = decode_v1(&bytes, 1024 * 1024).unwrap();
		assert_eq!(frame.frame_type, FrameType::FileReject);
		let rej = decode_file_reject_payload_v1(&frame.payload).unwrap();
		assert_eq!(rej.id, "id-r");
		assert_eq!(rej.reason, "too big");
	}

	#[test]
	fn encrypted_envelope_roundtrip() {
		let nonce = [7u8; ENVELOPE_NONCE_LEN];
		let ciphertext = b"ciphertext-bytes".to_vec();
		let bytes = encode_encrypted_envelope_v1(&nonce, &ciphertext);
		let (frame, _used) = decode_v1(&bytes, 1024 * 1024).unwrap();
		assert_eq!(frame.frame_type, FrameType::EncryptedEnvelope);
		let (n2, ct2) = decode_encrypted_envelope_payload_v1(&frame.payload).unwrap();
		assert_eq!(n2, nonce);
		assert_eq!(ct2, ciphertext);
	}

	#[test]
	fn file_chunk_roundtrip() {
		let bytes = encode_file_chunk_v1("id-2", 42, b"chunkdata");
		let (frame, _used) = decode_v1(&bytes, 1024 * 1024).unwrap();
		assert_eq!(frame.frame_type, FrameType::FileChunk);
		let decoded = decode_file_chunk_payload_v1(&frame.payload).unwrap();
		assert_eq!(decoded.id, "id-2");
		assert_eq!(decoded.chunk_index, 42);
		assert_eq!(decoded.data, b"chunkdata".to_vec());
	}

	#[test]
	fn file_end_roundtrip() {
		let bytes = encode_file_end_v1("id-3");
		let (frame, _used) = decode_v1(&bytes, 1024 * 1024).unwrap();
		assert_eq!(frame.frame_type, FrameType::FileEnd);
		let id = decode_file_end_payload_v1(&frame.payload).unwrap();
		assert_eq!(id, "id-3");
	}
}
