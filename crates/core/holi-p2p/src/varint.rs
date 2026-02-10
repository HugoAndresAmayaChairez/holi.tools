#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VarintError {
	UnexpectedEof,
	Overflow,
}

pub fn encode_u32_varint(mut value: u32, out: &mut Vec<u8>) {
	while value >= 0x80 {
		out.push(((value as u8) & 0x7F) | 0x80);
		value >>= 7;
	}
	out.push(value as u8);
}

pub fn decode_u32_varint(input: &[u8]) -> Result<(u32, usize), VarintError> {
	let mut result: u32 = 0;
	let mut shift = 0;
	for (i, &byte) in input.iter().enumerate() {
		let bits = (byte & 0x7F) as u32;
		if shift >= 32 {
			return Err(VarintError::Overflow);
		}
		result |= bits << shift;
		if (byte & 0x80) == 0 {
			return Ok((result, i + 1));
		}
		shift += 7;
	}
	Err(VarintError::UnexpectedEof)
}

pub fn encode_u64_varint(mut value: u64, out: &mut Vec<u8>) {
	while value >= 0x80 {
		out.push(((value as u8) & 0x7F) | 0x80);
		value >>= 7;
	}
	out.push(value as u8);
}

pub fn decode_u64_varint(input: &[u8]) -> Result<(u64, usize), VarintError> {
	let mut result: u64 = 0;
	let mut shift = 0;
	for (i, &byte) in input.iter().enumerate() {
		let bits = (byte & 0x7F) as u64;
		if shift >= 64 {
			return Err(VarintError::Overflow);
		}
		result |= bits << shift;
		if (byte & 0x80) == 0 {
			return Ok((result, i + 1));
		}
		shift += 7;
	}
	Err(VarintError::UnexpectedEof)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn roundtrip_varint() {
		let values = [0u32, 1, 2, 127, 128, 129, 16_383, 16_384, u32::MAX];
		for value in values {
			let mut buf = Vec::new();
			encode_u32_varint(value, &mut buf);
			let (decoded, used) = decode_u32_varint(&buf).unwrap();
			assert_eq!(decoded, value);
			assert_eq!(used, buf.len());
		}
	}

	#[test]
	fn roundtrip_varint_u64() {
		let values = [0u64, 1, 2, 127, 128, 129, 16_383, 16_384, u64::MAX];
		for value in values {
			let mut buf = Vec::new();
			encode_u64_varint(value, &mut buf);
			let (decoded, used) = decode_u64_varint(&buf).unwrap();
			assert_eq!(decoded, value);
			assert_eq!(used, buf.len());
		}
	}
}
