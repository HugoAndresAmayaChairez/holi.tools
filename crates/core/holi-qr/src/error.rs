//! Error types for QR generation

use thiserror::Error;

/// Errors that can occur during QR code generation
#[derive(Error, Debug)]
pub enum QrError {
    /// The input text is empty
    #[error("Input text cannot be empty")]
    EmptyInput,

    /// The input text is too long for the given error correction level
    #[error("Input text is too long ({length} characters)")]
    InputTooLong { length: usize },

    /// Internal QR generation error
    #[error("QR generation failed: {0}")]
    GenerationFailed(String),
    
    /// QR verification failed
    #[error("Verification failed: {0}")]
    VerificationFailed(String),
}
