//! Holi.tools QR Code Generator
//!
//! Lightweight WASM module for generating QR codes as SVG.
//! Uses fast_qr for high-performance QR generation and holi-qr for styled rendering.

use fast_qr::convert::svg::SvgBuilder;
use fast_qr::qr::QRBuilder;
use fast_qr::ECL;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// Import from holi-qr core
use holi_qr::{
    body_path_with_neighbors, decode_image, eye_ball_path, eye_frame_path, generate_qr,
    rasterize_svg_alpha, render_svg_styled, verify_svg, BodyShape, ErrorCorrectionLevel,
    EyeBallShape, EyeFrameShape, Neighbors, StyledRenderOptions,
};

/// Options for styled QR generation (JSON-serializable for WASM)
#[derive(Serialize, Deserialize, Default)]
pub struct QRStyleOptions {
    #[serde(default)]
    pub margin: Option<usize>,
    #[serde(default)]
    pub fg_color: Option<String>,
    #[serde(default)]
    pub bg_color: Option<String>,
    #[serde(default)]
    pub body_shape: Option<String>,
    #[serde(default)]
    pub eye_frame_shape: Option<String>,
    #[serde(default)]
    pub eye_ball_shape: Option<String>,
    #[serde(default)]
    pub ecc: Option<String>,
}

/// Generate a QR code as an SVG string.
///
/// # Arguments
/// * `text` - The text/URL to encode
///
/// # Returns
/// SVG string representation of the QR code
#[wasm_bindgen]
pub fn generate_qr_svg(text: &str) -> Result<String, JsValue> {
    let qrcode = QRBuilder::new(text)
        .ecl(ECL::M) // Medium error correction
        .build()
        .map_err(|e| JsValue::from_str(&format!("QR generation failed: {:?}", e)))?;

    let svg = SvgBuilder::default().to_str(&qrcode);

    Ok(svg)
}

/// Generate a QR code with custom error correction level.
///
/// # Arguments
/// * `text` - The text/URL to encode
/// * `ecl` - Error correction level: "L", "M", "Q", or "H"
///
/// # Returns
/// SVG string representation of the QR code
#[wasm_bindgen]
pub fn generate_qr_svg_with_ecl(text: &str, ecl: &str) -> Result<String, JsValue> {
    let error_level = match ecl.to_uppercase().as_str() {
        "L" => ECL::L, // ~7% recovery
        "M" => ECL::M, // ~15% recovery
        "Q" => ECL::Q, // ~25% recovery
        "H" => ECL::H, // ~30% recovery
        _ => return Err(JsValue::from_str("Invalid ECL. Use: L, M, Q, or H")),
    };

    let qrcode = QRBuilder::new(text)
        .ecl(error_level)
        .build()
        .map_err(|e| JsValue::from_str(&format!("QR generation failed: {:?}", e)))?;

    let svg = SvgBuilder::default().to_str(&qrcode);

    Ok(svg)
}

/// Generate a styled QR code with custom shapes and colors.
///
/// # Arguments
/// * `text` - The text/URL to encode
/// * `options_json` - JSON string with style options
///
/// # Returns
/// SVG string representation of the styled QR code
#[wasm_bindgen]
pub fn generate_styled_svg(text: &str, options_json: &str) -> Result<String, JsValue> {
    // Parse options
    let opts: QRStyleOptions = serde_json::from_str(options_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid options JSON: {}", e)))?;

    // Determine ECL
    let ecl = match opts.ecc.as_deref().unwrap_or("M").to_uppercase().as_str() {
        "L" => ErrorCorrectionLevel::Low,
        "M" => ErrorCorrectionLevel::Medium,
        "Q" => ErrorCorrectionLevel::Quartile,
        "H" => ErrorCorrectionLevel::High,
        _ => ErrorCorrectionLevel::Medium,
    };

    // Generate QR code using holi-qr core
    let qr = generate_qr(text, ecl)
        .map_err(|e| JsValue::from_str(&format!("QR generation failed: {:?}", e)))?;

    // Build styled options
    let styled_opts = StyledRenderOptions {
        margin: opts.margin.unwrap_or(4),
        fg_color: opts.fg_color.unwrap_or_else(|| "#000000".to_string()),
        bg_color: opts.bg_color.unwrap_or_else(|| "#FFFFFF".to_string()),
        body_shape: BodyShape::from_str(opts.body_shape.as_deref().unwrap_or("square")),
        eye_frame_shape: EyeFrameShape::from_str(
            opts.eye_frame_shape.as_deref().unwrap_or("square"),
        ),
        eye_ball_shape: EyeBallShape::from_str(opts.eye_ball_shape.as_deref().unwrap_or("square")),
    };

    // Render styled SVG
    let svg = render_svg_styled(&qr, &styled_opts);

    Ok(svg)
}

/// Returns QR matrix as flat byte array [size, ...data] for WebGL texture upload.
/// First byte is size, rest are 0 (light) or 255 (dark).
///
/// This matches the wasm-qr-svg API so the web preview can stay consistent.
#[wasm_bindgen]
pub fn get_qr_matrix(text: &str, ecl: &str, mask: i32) -> Result<Vec<u8>, JsValue> {
    let m = generate_matrix_with_mask(text, ecl, mask)?;
    let size = m.size;
    let raw = m.get_data();
    if raw.len() != size * size {
        return Err(JsValue::from_str("Matrix size mismatch"));
    }

    let mut out = Vec::with_capacity(1 + raw.len());
    if size > u8::MAX as usize {
        return Err(JsValue::from_str("QR size too large"));
    }
    out.push(size as u8);
    out.extend(raw.into_iter().map(|v| if v == 1 { 255 } else { 0 }));
    Ok(out)
}

/// Compose SVG through the same pure Rust renderer used by native Holi Local.
#[wasm_bindgen]
pub fn render_official_svg(text: &str, config_json: &str) -> Result<String, JsValue> {
    holi_qr::render_official_svg(text, config_json)
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

#[wasm_bindgen]
pub struct QrMatrix {
    pub size: usize,
    data: Vec<u8>,
}

#[wasm_bindgen]
impl QrMatrix {
    pub fn get_data(&self) -> Vec<u8> {
        self.data.clone()
    }
}

/// Generate raw QR matrix data
#[wasm_bindgen]
pub fn generate_matrix(text: &str, ecl: &str) -> Result<QrMatrix, JsValue> {
    generate_matrix_with_mask(text, ecl, -1) // -1 means auto
}

/// Generate raw QR matrix data with specific mask pattern
/// mask: 0-7 for specific pattern, -1 for auto
#[wasm_bindgen]
pub fn generate_matrix_with_mask(text: &str, ecl: &str, mask: i32) -> Result<QrMatrix, JsValue> {
    let error_level = match ecl.to_uppercase().as_str() {
        "L" => ECL::L,
        "M" => ECL::M,
        "Q" => ECL::Q,
        "H" => ECL::H,
        _ => return Err(JsValue::from_str("Invalid ECL")),
    };

    // Build QR code with optional mask
    let qrcode = if mask >= 0 && mask <= 7 {
        let mask_pattern = match mask {
            0 => fast_qr::Mask::Checkerboard,
            1 => fast_qr::Mask::HorizontalLines,
            2 => fast_qr::Mask::VerticalLines,
            3 => fast_qr::Mask::DiagonalLines,
            4 => fast_qr::Mask::LargeCheckerboard,
            5 => fast_qr::Mask::Fields,
            6 => fast_qr::Mask::Diamonds,
            7 => fast_qr::Mask::Meadow,
            _ => fast_qr::Mask::Checkerboard,
        };
        QRBuilder::new(text)
            .ecl(error_level)
            .mask(mask_pattern)
            .build()
    } else {
        QRBuilder::new(text).ecl(error_level).build()
    }
    .map_err(|e| JsValue::from_str(&format!("Gen failed: {:?}", e)))?;

    // fast_qr stores `data` as a fixed-size 177x177 backing array.
    // Only the first `size x size` area is meaningful for the current QR.
    let size = qrcode.size;
    let mut data: Vec<u8> = Vec::with_capacity(size * size);
    for y in 0..size {
        for x in 0..size {
            data.push(if qrcode[y][x].value() { 1 } else { 0 });
        }
    }

    Ok(QrMatrix { size, data })
}

/// Get the version info for this module
#[wasm_bindgen]
pub fn qr_version() -> String {
    "holi-wasm-qr v0.4.0 (styled shapes)".to_string()
}

/// Verify that an SVG string contains a scannable QR code.
///
/// # Arguments
/// * `svg` - The SVG string content
///
/// # Returns
/// Result containing the decoded text or an error message.
#[wasm_bindgen]
pub fn verify_qr_svg(svg: &str) -> Result<String, JsValue> {
    verify_svg(svg).map_err(|e| JsValue::from_str(&format!("Verification failed: {:?}", e)))
}

/// Decode a QR code from image bytes (PNG/JPEG).
///
/// # Arguments
/// * `image_data` - Raw bytes of the image file
///
/// # Returns
/// Result containing the decoded text or an error message.
#[wasm_bindgen]
pub fn decode_qr_image(image_data: &[u8]) -> Result<String, JsValue> {
    decode_image(image_data).map_err(|e| JsValue::from_str(&format!("Decode failed: {:?}", e)))
}

/// The same styled SVG engine as the browser, rasterized locally to PNG bytes.
#[wasm_bindgen]
pub fn render_official_png(text: &str, config_json: &str, size: u32) -> Result<Vec<u8>, JsValue> {
    let svg = render_official_svg(text, config_json)?;
    holi_qr::rasterize_svg_png(&svg, size).map_err(|error| JsValue::from_str(&error.to_string()))
}

/// Generate a body-module alpha mask atlas for the WebGL preview.
///
/// Rust is the shape source-of-truth (same geometry used for the official SVG).
/// The preview uses WebGL for speed, but samples this atlas to render the *exact* same shapes.
///
/// Atlas layout:
/// - 16x16 tiles (256 variants)
/// - Each tile corresponds to an 8-neighbor bitmask around the module:
///   bit0=L, bit1=R, bit2=U, bit3=D, bit4=LU, bit5=RU, bit6=LD, bit7=RD.
#[wasm_bindgen]
pub fn get_body_mask_atlas(body_shape: &str, tile_size: u32) -> Result<Vec<u8>, JsValue> {
    if tile_size == 0 || tile_size > 256 {
        return Err(JsValue::from_str("tile_size must be in 1..=256"));
    }

    let shape = BodyShape::from_str(body_shape);
    let mut d = String::new();

    for mask in 0u32..=255u32 {
        let tx = (mask % 16) as f64;
        let ty = (mask / 16) as f64;
        let n = Neighbors {
            l: (mask & 1) != 0,
            r: (mask & 2) != 0,
            u: (mask & 4) != 0,
            d: (mask & 8) != 0,
            lu: (mask & 16) != 0,
            ru: (mask & 32) != 0,
            ld: (mask & 64) != 0,
            rd: (mask & 128) != 0,
        };

        d.push_str(&body_path_with_neighbors(shape, tx, ty, n));
    }

    let svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="{}" fill="white"/></svg>"#,
        d
    );

    let out_size = tile_size * 16;
    rasterize_svg_alpha(&svg, out_size)
        .map_err(|e| JsValue::from_str(&format!("atlas rasterize failed: {:?}", e)))
}

/// Generate a single 7x7 finder-pattern alpha mask tile for the WebGL preview.
///
/// The mask includes both the eye frame and the eye ball, unioned together.
#[wasm_bindgen]
pub fn get_eye_mask(
    eye_frame_shape: &str,
    eye_ball_shape: &str,
    tile_size: u32,
) -> Result<Vec<u8>, JsValue> {
    if tile_size == 0 || tile_size > 1024 {
        return Err(JsValue::from_str("tile_size must be in 1..=1024"));
    }

    let frame = EyeFrameShape::from_str(eye_frame_shape);
    let ball = EyeBallShape::from_str(eye_ball_shape);

    let frame_d = eye_frame_path(frame, 0.0, 0.0);
    let ball_d = eye_ball_path(ball, 2.0, 2.0);

    let svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7"><path d="{}" fill="white" fill-rule="evenodd"/><path d="{}" fill="white"/></svg>"#,
        frame_d, ball_d
    );

    rasterize_svg_alpha(&svg, tile_size)
        .map_err(|e| JsValue::from_str(&format!("eye rasterize failed: {:?}", e)))
}
