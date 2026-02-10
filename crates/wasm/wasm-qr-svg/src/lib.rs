//! Micro Rust SVG Renderer
//! Target: < 10KB WASM
//! logic: Generates optimized <path> data string for QR code

#![no_std]

extern crate alloc;
use alloc::string::String;
use alloc::vec::Vec;
use alloc::format;
use wasm_bindgen::prelude::*;
use qrcodegen::{QrCode, QrCodeEcc, QrSegment, Version, Mask};

// Use wee_alloc as the global allocator.
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

fn get_ecc(c: &str) -> QrCodeEcc {
    match c {
        "L" => QrCodeEcc::Low,
        "Q" => QrCodeEcc::Quartile,
        "H" => QrCodeEcc::High,
        _ => QrCodeEcc::Medium,
    }
}

fn create_qr(text: &str, ecc_char: &str, mask_idx: i32) -> Option<QrCode> {
    let ecc = get_ecc(ecc_char);
    let segments = QrSegment::make_segments(text);
    
    let mask = if mask_idx >= 0 && mask_idx <= 7 {
        Some(Mask::new(mask_idx as u8))
    } else {
        None
    };

    QrCode::encode_segments_advanced(
        &segments,
        ecc,
        Version::new(1),
        Version::new(40),
        mask,
        false
    ).ok()
}

/// Returns QR matrix as flat byte array [size, ...data] for WebGL texture upload
/// First byte is size, rest are 0 (light) or 255 (dark)
#[wasm_bindgen]
pub fn get_qr_matrix(text: &str, ecc: &str, mask: i32) -> Vec<u8> {
    let qr = match create_qr(text, ecc, mask) {
        Some(q) => q,
        None => return Vec::new(),
    };
    
    let size = qr.size() as usize;
    let mut data = Vec::with_capacity(1 + size * size);
    
    // First byte is size
    data.push(size as u8);
    
    // Matrix data (row-major)
    for y in 0..size {
        for x in 0..size {
            data.push(if qr.get_module(x as i32, y as i32) { 255 } else { 0 });
        }
    }
    
    data
}

#[wasm_bindgen]
pub fn generate_svg(text: &str, shape: u8, ecc: &str, mask: i32) -> String {
    let qr = match create_qr(text, ecc, mask) {
        Some(q) => q,
        None => return String::from("<svg></svg>"),
    };
    
    let size = qr.size();
    
    // Reserve capacity (approximate) - Dots need more space than squares
    let mut svg = String::with_capacity(100 + (size as usize * size as usize) * 20);

    svg.push_str("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ");
    push_usize(&mut svg, size as usize);
    svg.push_str(" ");
    push_usize(&mut svg, size as usize);
    svg.push_str("\" fill=\"currentColor\"><path d=\"");

    for y in 0..size {
        for x in 0..size {
            // Skip Finder Patterns (7x7 corners)
            if (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7) {
                continue;
            }

            if qr.get_module(x, y) {
                if shape == 1 {
                     // Circle / Dots (r=0.45)
                     svg.push_str("M");
                     push_usize(&mut svg, x as usize);
                     svg.push_str(".05,");
                     push_usize(&mut svg, y as usize);
                     svg.push_str(".5a.45.45 0 1 0 .9 0a.45.45 0 1 0 -.9 0");
                } else if shape == 2 {
                     // Rounded Square (rx=0.1)
                     svg.push_str("M");
                     push_usize(&mut svg, x as usize);
                     svg.push_str(".1,");
                     push_usize(&mut svg, y as usize);
                     svg.push_str(".1h.8a.1.1 0 0 1 .1.1v.8a.1.1 0 0 1 -.1.1h-.8a.1.1 0 0 1 -.1-.1v-.8a.1.1 0 0 1 .1-.1z "); 
                } else if shape == 3 {
                     // Liquid / Connected
                     // 1. Draw central circle always
                     svg.push_str("M");
                     push_usize(&mut svg, x as usize);
                     svg.push_str(".5,");
                     push_usize(&mut svg, y as usize);
                     svg.push_str(".5a.5.5 0 1 0 1 0a.5.5 0 1 0 -1 0 "); // r=0.5 circle
                     
                     // 2. Connect Right if dark
                     // Check bounds
                     if x < size - 1 && qr.get_module(x + 1, y) {
                        svg.push_str("M");
                        push_usize(&mut svg, x as usize);
                        svg.push_str(".5,");
                        push_usize(&mut svg, y as usize);
                        svg.push_str("h0.6v1h-0.6z "); // Overlap slightly (.6) to avoid gaps
                     }
                     
                     // 3. Connect Bottom if dark
                     if y < size - 1 && qr.get_module(x, y + 1) {
                        svg.push_str("M");
                        push_usize(&mut svg, x as usize);
                        svg.push_str(",");
                        push_usize(&mut svg, y as usize);
                        svg.push_str(".5h1v0.6h-1z ");
                     }
                } else {
                     // Square (Default)
                     svg.push_str("M");
                     push_usize(&mut svg, x as usize);
                     svg.push_str(" ");
                     push_usize(&mut svg, y as usize);
                     svg.push_str("h1v1h-1z");
                }
            }
        }
    }
    
    // Footer
    svg.push_str("\"/></svg>");
    
    svg
}

// Minimal integer-to-string pusher to avoid heavy std::fmt code if possible
fn push_usize(s: &mut String, mut n: usize) {
    if n == 0 {
        s.push('0');
        return;
    }
    
    let mut buffer = [0u8; 20];
    let mut i = 0;
    
    while n > 0 {
        buffer[i] = (n % 10) as u8 + b'0';
        n /= 10;
        i += 1;
    }
    
    while i > 0 {
        i -= 1;
        s.push(buffer[i] as char);
    }
}
