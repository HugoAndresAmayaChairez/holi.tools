//! # Holi QR
//!
//! High-performance QR code generation library.
//!
//! This is a **pure Rust** library with no web dependencies.
//! It can be used in CLI tools, WASM, FFI bindings, or any Rust project.
//!
//! ## Example
//!
//! ```rust
//! use holi_qr::{generate_qr, render_svg, ErrorCorrectionLevel};
//!
//! let qr = generate_qr("https://holi.tools", ErrorCorrectionLevel::Medium).unwrap();
//! let svg = render_svg(&qr);
//! println!("{}", svg);
//! ```

mod error;
mod qr;
mod render;
mod shapes;
mod verify;

pub use error::QrError;
pub use qr::{generate_qr, QrCode, ErrorCorrectionLevel};
pub use render::{render_svg, render_svg_with_options, render_svg_styled, RenderOptions, StyledRenderOptions};
pub use shapes::{BodyShape, EyeFrameShape, EyeBallShape, body_path, eye_frame_path, eye_ball_path};
pub use verify::{verify_svg, decode_image};

