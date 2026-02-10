//! Holi.tools QR Code Generator
//! 
//! Lightweight WASM module for generating QR codes as SVG.
//! Uses fast_qr for high-performance QR generation and holi-qr for styled rendering.

use wasm_bindgen::prelude::*;
use fast_qr::convert::svg::SvgBuilder;
use fast_qr::qr::QRBuilder;
use fast_qr::ECL;
use serde::{Deserialize, Serialize};

// Import from holi-qr core
use holi_qr::{
    generate_qr, render_svg_styled, ErrorCorrectionLevel,
    BodyShape, EyeFrameShape, EyeBallShape, StyledRenderOptions,
    verify_svg, decode_image
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

    let svg = SvgBuilder::default()
        .to_str(&qrcode);

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

    let svg = SvgBuilder::default()
        .to_str(&qrcode);

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
        eye_frame_shape: EyeFrameShape::from_str(opts.eye_frame_shape.as_deref().unwrap_or("square")),
        eye_ball_shape: EyeBallShape::from_str(opts.eye_ball_shape.as_deref().unwrap_or("square")),
    };
    
    // Render styled SVG
    let svg = render_svg_styled(&qr, &styled_opts);
    
    Ok(svg)
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
    use fast_qr::Mask;
    
    let error_level = match ecl.to_uppercase().as_str() {
        "L" => ECL::L, "M" => ECL::M, "Q" => ECL::Q, "H" => ECL::H,
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
        QRBuilder::new(text)
            .ecl(error_level)
            .build()
    }.map_err(|e| JsValue::from_str(&format!("Gen failed: {:?}", e)))?;

    // fast_qr stores data as [Module; N]
    // We need to convert to flat Vec<u8> (0/1)
    let data: Vec<u8> = qrcode.data.iter()
        .map(|m| if m.value() { 1 } else { 0 })
        .collect();

    Ok(QrMatrix {
        size: qrcode.size,
        data,
    })
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
    verify_svg(svg)
        .map_err(|e| JsValue::from_str(&format!("Verification failed: {:?}", e)))
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
    decode_image(image_data)
        .map_err(|e| JsValue::from_str(&format!("Decode failed: {:?}", e)))
}

