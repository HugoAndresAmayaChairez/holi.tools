//! QR code verification and scanning module (optional, requires 'verify' feature)
//!
//! This module provides the ability to:
//! 1. Verify that a generated QR code SVG is scannable
//! 2. Decode QR codes from raw image data (for user-uploaded images)

use crate::error::QrError;

/// Rasterize a generated QR SVG to PNG without consulting the host filesystem.
#[cfg(feature = "verify")]
pub fn rasterize_svg_png(svg: &str, size: u32) -> Result<Vec<u8>, QrError> {
    if !(128..=4096).contains(&size) {
        return Err(QrError::VerificationFailed("PNG size must be 128–4096".into()));
    }
    let mut options = resvg::usvg::Options::default();
    // No filesystem lookup for SVG image references, even for direct Rust callers.
    options.image_href_resolver.resolve_string = Box::new(|_, _| None);
    let tree = resvg::usvg::Tree::from_str(svg, &options)
        .map_err(|_| QrError::VerificationFailed("Invalid SVG".into()))?;
    let mut pixmap = tiny_skia::Pixmap::new(size, size)
        .ok_or_else(|| QrError::VerificationFailed("Failed to allocate PNG".into()))?;
    let scale = (size as f32 / tree.size().width()).min(size as f32 / tree.size().height());
    resvg::render(&tree, tiny_skia::Transform::from_scale(scale, scale), &mut pixmap.as_mut());
    pixmap.encode_png().map_err(|_| QrError::VerificationFailed("PNG encoding failed".into()))
}

#[cfg(all(test, feature = "verify"))]
mod png_tests {
    use super::*;
    #[test]
    fn generated_png_decodes_and_has_requested_dimensions() {
        let qr = crate::generate_qr("Holi Local: hola", crate::ErrorCorrectionLevel::Medium).unwrap();
        let svg = crate::render_svg(&qr);
        let png = rasterize_svg_png(&svg, 512).unwrap();
        let decoded = image::load_from_memory(&png).unwrap();
        assert_eq!((decoded.width(), decoded.height()), (512, 512));
        assert_eq!(decode_image(&png).unwrap(), "Holi Local: hola");
        assert!(rasterize_svg_png(&svg, 4097).is_err());
        assert!(rasterize_svg_png(&svg, 0).is_err());
    }
}

/// Rasterize an SVG into an alpha mask (single channel).
///
/// This is used by the web preview pipeline to keep WebGL shapes 1:1 with the official SVG
/// (Rust is the source-of-truth; WebGL only samples the mask texture).
#[cfg(feature = "verify")]
pub fn rasterize_svg_alpha(svg: &str, size: u32) -> Result<Vec<u8>, QrError> {
    use resvg::usvg;

    let options = usvg::Options::default();
    let tree = usvg::Tree::from_str(svg, &options)
        .map_err(|e| QrError::VerificationFailed(format!("SVG parse error: {}", e)))?;

    let mut pixmap = tiny_skia::Pixmap::new(size, size)
        .ok_or_else(|| QrError::VerificationFailed("Failed to create pixmap".into()))?;

    // Transparent background; draw only the paths.
    // Note: resvg renders with antialiasing; alpha values will be 0..255.

    let tree_size = tree.size();
    let scale = (size as f32 / tree_size.width()).min(size as f32 / tree_size.height());
    let transform = tiny_skia::Transform::from_scale(scale, scale);
    resvg::render(&tree, transform, &mut pixmap.as_mut());

    let pixels = pixmap.data();
    let mut alpha: Vec<u8> = Vec::with_capacity((size as usize) * (size as usize));
    for chunk in pixels.chunks(4) {
        alpha.push(chunk[3]);
    }
    Ok(alpha)
}

#[cfg(not(feature = "verify"))]
pub fn rasterize_svg_alpha(_svg: &str, _size: u32) -> Result<Vec<u8>, QrError> {
    Err(QrError::VerificationFailed(
        "SVG rasterization not available. Enable 'verify' feature.".into(),
    ))
}

/// Verify that an SVG QR code is scannable using rxing (ZXing port)
///
/// This function renders the SVG to a bitmap and attempts to decode it.
///
/// # Arguments
/// * `svg` - The SVG string to verify
///
/// # Returns
/// * `Ok(String)` - The decoded text if successful
/// * `Err(QrError)` - Error if the QR code cannot be decoded
#[cfg(feature = "verify")]
pub fn verify_svg(svg: &str) -> Result<String, QrError> {
    use resvg::usvg;
    use rxing::common::HybridBinarizer;
    use rxing::BinaryBitmap;
    use rxing::Luma8LuminanceSource;
    use rxing::MultiFormatReader;
    use rxing::Reader;
    use rxing::{BarcodeFormat, DecodeHintType, DecodeHintValue};

    // Parse SVG using resvg
    let options = usvg::Options::default();
    let tree = usvg::Tree::from_str(svg, &options)
        .map_err(|e| QrError::VerificationFailed(format!("SVG parse error: {}", e)))?;

    // Render to pixmap at high resolution
    let size = 800u32;

    let mut pixmap = tiny_skia::Pixmap::new(size, size)
        .ok_or_else(|| QrError::VerificationFailed("Failed to create pixmap".into()))?;

    // White background (important for transparent QRs)
    pixmap.fill(tiny_skia::Color::WHITE);

    // Calculate scale to fit
    let tree_size = tree.size();
    let scale = (size as f32 / tree_size.width()).min(size as f32 / tree_size.height());

    let transform = tiny_skia::Transform::from_scale(scale, scale);
    resvg::render(&tree, transform, &mut pixmap.as_mut());

    // Convert RGBA to grayscale (luma) for rxing
    let pixels = pixmap.data();
    let width = pixmap.width() as usize;
    let height = pixmap.height() as usize;

    let mut luma: Vec<u8> = Vec::with_capacity(width * height);
    for chunk in pixels.chunks(4) {
        // RGBA -> grayscale using luminosity formula
        let r = chunk[0] as u32;
        let g = chunk[1] as u32;
        let b = chunk[2] as u32;
        let gray = ((r * 299 + g * 587 + b * 114) / 1000) as u8;
        luma.push(gray);
    }

    // Create rxing source using Luma8 (grayscale bytes)
    let source = Luma8LuminanceSource::new(luma, width as u32, height as u32);
    let mut bitmap = BinaryBitmap::new(HybridBinarizer::new(source));

    // Configure hints for better detection
    let mut hints = rxing::DecodingHintDictionary::new();
    hints.insert(
        DecodeHintType::POSSIBLE_FORMATS,
        DecodeHintValue::PossibleFormats(vec![BarcodeFormat::QR_CODE].into_iter().collect()),
    );
    hints.insert(DecodeHintType::TRY_HARDER, DecodeHintValue::TryHarder(true));

    // Decode
    let mut reader = MultiFormatReader::default();
    let result = reader
        .decode_with_hints(&mut bitmap, &hints)
        .map_err(|e| QrError::VerificationFailed(format!("Decode error: {:?}", e)))?;

    Ok(result.getText().to_string())
}

/// Decode a QR code from raw image bytes (PNG/JPEG)
///
/// This function is useful for scanning user-uploaded images.
///
/// # Arguments
/// * `image_data` - Raw bytes of a PNG or JPEG image
///
/// # Returns
/// * `Ok(String)` - The decoded text if successful
/// * `Err(QrError)` - Error if no QR code found or decoding failed
#[cfg(feature = "verify")]
pub fn decode_image(image_data: &[u8]) -> Result<String, QrError> {
    use image::GenericImageView;
    use rxing::common::HybridBinarizer;
    use rxing::BinaryBitmap;
    use rxing::Luma8LuminanceSource;
    use rxing::MultiFormatReader;
    use rxing::Reader;
    use rxing::{BarcodeFormat, DecodeHintType, DecodeHintValue};

    // Load image
    let img = image::load_from_memory(image_data)
        .map_err(|e| QrError::VerificationFailed(format!("Image load error: {}", e)))?;

    let (width, height) = img.dimensions();

    // Convert to grayscale
    let gray = img.to_luma8();
    let luma: Vec<u8> = gray.into_raw();

    // Create rxing source
    let source = Luma8LuminanceSource::new(luma, width, height);
    let mut bitmap = BinaryBitmap::new(HybridBinarizer::new(source));

    // Configure hints
    let mut hints = rxing::DecodingHintDictionary::new();
    hints.insert(
        DecodeHintType::POSSIBLE_FORMATS,
        DecodeHintValue::PossibleFormats(vec![BarcodeFormat::QR_CODE].into_iter().collect()),
    );
    hints.insert(DecodeHintType::TRY_HARDER, DecodeHintValue::TryHarder(true));

    // Decode
    let mut reader = MultiFormatReader::default();
    let result = reader
        .decode_with_hints(&mut bitmap, &hints)
        .map_err(|e| QrError::VerificationFailed(format!("Decode error: {:?}", e)))?;

    Ok(result.getText().to_string())
}

/// Stub function when 'verify' feature is not enabled
#[cfg(not(feature = "verify"))]
pub fn verify_svg(_svg: &str) -> Result<String, QrError> {
    Err(QrError::VerificationFailed(
        "Verification not available. Enable 'verify' feature.".into(),
    ))
}

/// Stub function when 'verify' feature is not enabled
#[cfg(not(feature = "verify"))]
pub fn decode_image(_image_data: &[u8]) -> Result<String, QrError> {
    Err(QrError::VerificationFailed(
        "Decoding not available. Enable 'verify' feature.".into(),
    ))
}

#[cfg(all(test, feature = "verify"))]
mod tests {
    use super::*;
    use crate::{generate_qr, render_svg_styled, ErrorCorrectionLevel, StyledRenderOptions};

    #[test]
    fn test_verify_basic_qr() {
        let text = "https://holi.tools";
        let qr = generate_qr(text, ErrorCorrectionLevel::Medium).unwrap();
        let svg = render_svg_styled(&qr, &StyledRenderOptions::default());

        let decoded = verify_svg(&svg).expect("Should decode successfully");
        assert_eq!(decoded, text);
    }

    #[test]
    fn test_verify_with_dots_shape() {
        use crate::BodyShape;

        let text = "test-dots";
        let qr = generate_qr(text, ErrorCorrectionLevel::High).unwrap();
        let options = StyledRenderOptions {
            body_shape: BodyShape::Dots,
            ..Default::default()
        };
        let svg = render_svg_styled(&qr, &options);

        let decoded = verify_svg(&svg).expect("Dots shape should be scannable");
        assert_eq!(decoded, text);
    }
}
