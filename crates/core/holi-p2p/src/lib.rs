mod varint;

pub mod frame;

pub use varint::{decode_u32_varint, decode_u64_varint, encode_u32_varint, encode_u64_varint};
