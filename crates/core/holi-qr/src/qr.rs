//! QR code generation

use crate::error::QrError;
use fast_qr::qr::QRBuilder;
use fast_qr::ECL;

/// Error correction level for QR codes
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCorrectionLevel {
    /// ~7% recovery capacity
    Low,
    /// ~15% recovery capacity (recommended)
    Medium,
    /// ~25% recovery capacity
    Quartile,
    /// ~30% recovery capacity
    High,
}

impl From<ErrorCorrectionLevel> for ECL {
    fn from(level: ErrorCorrectionLevel) -> Self {
        match level {
            ErrorCorrectionLevel::Low => ECL::L,
            ErrorCorrectionLevel::Medium => ECL::M,
            ErrorCorrectionLevel::Quartile => ECL::Q,
            ErrorCorrectionLevel::High => ECL::H,
        }
    }
}

/// A generated QR code
#[derive(Debug)]
pub struct QrCode {
    /// The underlying fast_qr code
    pub(crate) inner: fast_qr::QRCode,
    /// The original input text
    pub text: String,
    /// The error correction level used
    pub ecl: ErrorCorrectionLevel,
}

impl QrCode {
    /// Get the size of the QR code in modules
    pub fn size(&self) -> usize {
        self.inner.size
    }

    /// Get the flattened module data (row by row)
    /// 1 = dark, 0 = light
    pub fn get_modules(&self) -> Vec<u8> {
        let size = self.inner.size;
        let mut modules = Vec::with_capacity(size * size);
        
        // fast_qr stores modules in .data as Vec<Module>
        // Module is a tuple struct Module(u8) where .value() returns true if dark
        for module in self.inner.data.iter() {
            if module.value() {
                modules.push(1);
            } else {
                modules.push(0);
            }
        }
        modules
    }
}

/// Generate a QR code from text
///
/// # Arguments
/// * `text` - The text to encode
/// * `ecl` - Error correction level
///
/// # Returns
/// A QrCode on success, or QrError on failure
///
/// # Example
/// ```rust
/// use holi_qr::{generate_qr, ErrorCorrectionLevel};
///
/// let qr = generate_qr("Hello", ErrorCorrectionLevel::Medium).unwrap();
/// assert!(qr.size() > 0);
/// ```
pub fn generate_qr(text: &str, ecl: ErrorCorrectionLevel) -> Result<QrCode, QrError> {
    if text.is_empty() {
        return Err(QrError::EmptyInput);
    }

    let inner = QRBuilder::new(text)
        .ecl(ecl.into())
        .build()
        .map_err(|e| QrError::GenerationFailed(format!("{:?}", e)))?;

    Ok(QrCode {
        inner,
        text: text.to_string(),
        ecl,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_qr() {
        let qr = generate_qr("https://holi.tools", ErrorCorrectionLevel::Medium).unwrap();
        assert!(qr.size() > 0);
        assert_eq!(qr.text, "https://holi.tools");
    }

    #[test]
    fn test_empty_input() {
        let result = generate_qr("", ErrorCorrectionLevel::Medium);
        assert!(result.is_err());
    }

    #[test]
    fn test_error_correction_levels() {
        for ecl in [
            ErrorCorrectionLevel::Low,
            ErrorCorrectionLevel::Medium,
            ErrorCorrectionLevel::Quartile,
            ErrorCorrectionLevel::High,
        ] {
            let qr = generate_qr("test", ecl).unwrap();
            assert_eq!(qr.ecl, ecl);
        }
    }
}
