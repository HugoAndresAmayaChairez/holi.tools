//! QR code verification and scanning module (optional, requires 'verify' feature)
//!
//! This module provides the ability to:
//! 1. Verify that a generated QR code SVG is scannable
//! 2. Decode QR codes from raw image data (for user-uploaded images)

use crate::error::QrError;

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
    use rxing::{BarcodeFormat, DecodeHintType, DecodeHintValue};
    use rxing::common::HybridBinarizer;
    use rxing::BinaryBitmap;
    use rxing::Luma8LuminanceSource;
    use rxing::MultiFormatReader;
    use rxing::Reader;
    
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
    hints.insert(
        DecodeHintType::TRY_HARDER,
        DecodeHintValue::TryHarder(true),
    );
    
    // Decode
    let mut reader = MultiFormatReader::default();
    let result = reader.decode_with_hints(&mut bitmap, &hints)
        .map_err(|e| QrError::VerificationFailed(format!("Decode error: {:?}", e)))?;;
    
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
    use rxing::{BarcodeFormat, DecodeHintType, DecodeHintValue};
    use rxing::common::HybridBinarizer;
    use rxing::BinaryBitmap;
    use rxing::Luma8LuminanceSource;
    use rxing::MultiFormatReader;
    use rxing::Reader;
    
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
    hints.insert(
        DecodeHintType::TRY_HARDER,
        DecodeHintValue::TryHarder(true),
    );
    
    // Decode
    let mut reader = MultiFormatReader::default();
    let result = reader.decode_with_hints(&mut bitmap, &hints)
        .map_err(|e| QrError::VerificationFailed(format!("Decode error: {:?}", e)))?;;
    
    Ok(result.getText().to_string())
}

/// Stub function when 'verify' feature is not enabled
#[cfg(not(feature = "verify"))]
pub fn verify_svg(_svg: &str) -> Result<String, QrError> {
    Err(QrError::VerificationFailed(
        "Verification not available. Enable 'verify' feature.".into()
    ))
}

/// Stub function when 'verify' feature is not enabled
#[cfg(not(feature = "verify"))]
pub fn decode_image(_image_data: &[u8]) -> Result<String, QrError> {
    Err(QrError::VerificationFailed(
        "Decoding not available. Enable 'verify' feature.".into()
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
