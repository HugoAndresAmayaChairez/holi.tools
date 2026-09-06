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
pub use qr::{generate_qr, ErrorCorrectionLevel, QrCode};
pub use render::{
    build_styled_svg_paths, render_svg, render_svg_styled, render_svg_with_options, RenderOptions,
    StyledRenderOptions, StyledSvgPaths,
};
pub use shapes::{
    body_path, body_path_with_neighbors, eye_ball_path, eye_frame_outer_path, eye_frame_path,
    BodyShape, EyeBallShape, EyeFrameShape, Neighbors,
};
pub use verify::rasterize_svg_alpha;
#[cfg(feature = "verify")]
pub use verify::rasterize_svg_png;
pub use verify::{decode_image, verify_svg};
