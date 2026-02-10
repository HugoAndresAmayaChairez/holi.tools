//! SVG path generators for QR code shapes
//!
//! This module contains all the SVG path generation logic for:
//! - Body shapes (data modules)
//! - Eye frame shapes (outer finder pattern frames)
//! - Eye ball shapes (inner finder pattern centers)

use std::fmt::Write;

/// Body shape types for data modules
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum BodyShape {
    #[default]
    Square,
    Rounded,
    Dots,
    Diamond,
    Star,
    Classy,
    ClassyRounded,
    Arrow,
    ArrowLeft,
    Heart,
    Hexagon,
    Octagon,
    Cross,
    Plus,
    Blob,
    Clover,
    MiniSquare,
    TinyDots,
    Hash,
    Leaf,
}

/// Eye frame shape types (outer 7x7 finder pattern)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EyeFrameShape {
    #[default]
    Square,
    Circle,
    Rounded,
    Leaf,
    Cushion,
    Double,
    Fancy,
    DotsSquare,
    HeavyRounded,
    CloverFrame,
}

/// Eye ball shape types (inner 3x3 finder pattern center)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EyeBallShape {
    #[default]
    Square,
    Circle,
    Diamond,
    Rounded,
    Star,
    Heart,
    Hexagon,
    BarsH,
    BarsV,
    DotsGrid,
    Flower,
    Clover,
    Cushion,
    Octagon,
}

impl BodyShape {
    /// Parse from string (for WASM/JSON interop)
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "square" => Self::Square,
            "rounded" => Self::Rounded,
            "dots" => Self::Dots,
            "diamond" => Self::Diamond,
            "star" => Self::Star,
            "classy" => Self::Classy,
            "classy-rounded" | "classyrounded" => Self::ClassyRounded,
            "arrow" => Self::Arrow,
            "arrow-left" | "arrowleft" => Self::ArrowLeft,
            "heart" => Self::Heart,
            "hexagon" => Self::Hexagon,
            "octagon" => Self::Octagon,
            "cross" => Self::Cross,
            "plus" => Self::Plus,
            "blob" => Self::Blob,
            "clover" => Self::Clover,
            "mini-square" | "minisquare" => Self::MiniSquare,
            "tiny-dots" | "tinydots" => Self::TinyDots,
            "hash" => Self::Hash,
            "leaf" => Self::Leaf,
            _ => Self::Square,
        }
    }
}

impl EyeFrameShape {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "square" => Self::Square,
            "circle" => Self::Circle,
            "rounded" => Self::Rounded,
            "leaf" => Self::Leaf,
            "cushion" => Self::Cushion,
            "double" => Self::Double,
            "fancy" => Self::Fancy,
            "dots-square" | "dotssquare" => Self::DotsSquare,
            "heavy-rounded" | "heavyrounded" => Self::HeavyRounded,
            "clover-frame" | "cloverframe" => Self::CloverFrame,
            _ => Self::Square,
        }
    }
}

impl EyeBallShape {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "square" => Self::Square,
            "circle" => Self::Circle,
            "diamond" => Self::Diamond,
            "rounded" => Self::Rounded,
            "star" => Self::Star,
            "heart" => Self::Heart,
            "hexagon" => Self::Hexagon,
            "bars-h" | "barsh" => Self::BarsH,
            "bars-v" | "barsv" => Self::BarsV,
            "dots-grid" | "dotsgrid" => Self::DotsGrid,
            "flower" => Self::Flower,
            "clover" => Self::Clover,
            "cushion" => Self::Cushion,
            "octagon" => Self::Octagon,
            _ => Self::Square,
        }
    }
}

/// Generate SVG path for a body module at position (px, py)
/// Module size is 1x1
pub fn body_path(shape: BodyShape, px: f64, py: f64) -> String {
    match shape {
        BodyShape::Square => format!("M{},{}h1v1h-1z", px, py),
        
        BodyShape::Rounded => format!(
            "M{},{}h0.8q0.1,0 0.1,0.1v0.8q0,0.1 -0.1,0.1h-0.8q-0.1,0 -0.1,-0.1v-0.8q0,-0.1 0.1,-0.1z",
            px + 0.1, py
        ),
        
        BodyShape::Dots => format!(
            "M{},{} m-0.45,0 a0.45,0.45 0 1,0 0.9,0 a0.45,0.45 0 1,0 -0.9,0",
            px + 0.5, py + 0.5
        ),
        
        BodyShape::Diamond => format!(
            "M{},{} L{},{} L{},{} L{},{} Z",
            px + 0.5, py,
            px + 1.0, py + 0.5,
            px + 0.5, py + 1.0,
            px, py + 0.5
        ),
        
        BodyShape::Star => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            px + 0.5, py,
            px + 0.65, py + 0.35,
            px + 1.0, py + 0.5,
            px + 0.65, py + 0.65,
            px + 0.5, py + 1.0,
            px + 0.35, py + 0.65,
            px, py + 0.5,
            px + 0.35, py + 0.35
        ),
        
        BodyShape::Classy => format!(
            "M{},{} h1 v0.6 q0,0.4 -0.4,0.4 h-0.6 Z",
            px, py
        ),
        
        BodyShape::ClassyRounded => format!(
            "M{},{}h0.8q0.1,0 0.1,0.1v0.8q0,0.1 -0.1,0.1h-0.8q-0.1,0 -0.1,-0.1v-0.8q0,-0.1 0.1,-0.1z",
            px + 0.1, py
        ),
        
        BodyShape::Arrow => format!(
            "M{},{} h0.5 v-0.2 l0.5,0.5 l-0.5,0.5 v-0.2 h-0.5 Z",
            px, py + 0.2
        ),
        
        BodyShape::ArrowLeft => format!(
            "M{},{} h-0.5 v-0.2 l-0.5,0.5 l0.5,0.5 v-0.2 h0.5 Z",
            px + 1.0, py + 0.2
        ),
        
        BodyShape::Heart => format!(
            "M{},{} L{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            px + 0.5, py + 0.9,
            px + 0.1, py + 0.5,
            px, py + 0.2, px + 0.25, py + 0.15,
            px + 0.5, py + 0.2, px + 0.5, py + 0.4,
            px + 0.5, py + 0.2, px + 0.75, py + 0.15,
            px + 1.0, py + 0.2, px + 0.9, py + 0.5
        ),
        
        BodyShape::Hexagon => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            px + 0.2, py,
            px + 0.8, py,
            px + 1.0, py + 0.5,
            px + 0.8, py + 1.0,
            px + 0.2, py + 1.0,
            px, py + 0.5
        ),
        
        BodyShape::Octagon => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            px + 0.3, py,
            px + 0.7, py,
            px + 1.0, py + 0.3,
            px + 1.0, py + 0.7,
            px + 0.7, py + 1.0,
            px + 0.3, py + 1.0,
            px, py + 0.7,
            px, py + 0.3
        ),
        
        BodyShape::Cross => format!(
            "M{},{} h0.4 v0.3 h0.3 v0.4 h-0.3 v0.3 h-0.4 v-0.3 h-0.3 v-0.4 h0.3 Z",
            px + 0.3, py
        ),
        
        BodyShape::Plus => format!(
            "M{},{} h0.5 v0.25 h0.25 v0.5 h-0.25 v0.25 h-0.5 v-0.25 h-0.25 v-0.5 h0.25 Z",
            px + 0.25, py
        ),
        
        BodyShape::Blob => format!(
            "M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            px + 0.5, py + 0.05,
            px + 0.95, py + 0.05, px + 0.95, py + 0.5,
            px + 0.95, py + 0.95, px + 0.5, py + 0.95,
            px + 0.05, py + 0.95, px + 0.05, py + 0.5,
            px + 0.05, py + 0.05, px + 0.5, py + 0.05
        ),
        
        BodyShape::Clover => {
            let mut s = String::new();
            // 4 circles forming a clover (Thicker r=0.30)
            for (dx, dy) in [(0.5, 0.25), (0.75, 0.5), (0.5, 0.75), (0.25, 0.5)] {
                write!(
                    s,
                    "M{},{} m-0.30,0 a0.30,0.30 0 1,0 0.60,0 a0.30,0.30 0 1,0 -0.60,0 ",
                    px + dx, py + dy
                ).unwrap();
            }
            s
        },
        
        BodyShape::MiniSquare => format!("M{},{}h0.6v0.6h-0.6z", px + 0.2, py + 0.2),
        
        BodyShape::TinyDots => format!(
            "M{},{} m-0.3,0 a0.3,0.3 0 1,0 0.6,0 a0.3,0.3 0 1,0 -0.6,0",
            px + 0.5, py + 0.5
        ),
        
        BodyShape::Hash => {
             // Explicit 12-point Polygon (Thickness 0.4, Width 0.9)
             let x1 = px+0.05; let x2 = px+0.3; let x3 = px+0.7; let x4 = px+0.95;
             let y1 = py+0.05; let y2 = py+0.3; let y3 = py+0.7; let y4 = py+0.95;
             format!(
                 "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
                 x2, y1, x3, y1, x3, y2, x4, y2, x4, y3, x3, y3, x3, y4, x2, y4, x2, y3, x1, y3, x1, y2, x2, y2
             )
        },
        
        BodyShape::Leaf => format!(
            "M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            px + 0.5, py + 0.05,
            px + 0.95, py + 0.05, px + 0.95, py + 0.5,
            px + 0.95, py + 0.95, px + 0.5, py + 0.95,
            px + 0.05, py + 0.95, px + 0.05, py + 0.5,
            px + 0.05, py + 0.05, px + 0.5, py + 0.05
        ),
    }
}

/// Generate SVG path for eye frame at position (fx, fy)
/// Frame size is 7x7 with 1-unit thick border
pub fn eye_frame_path(shape: EyeFrameShape, fx: f64, fy: f64) -> String {
    match shape {
        EyeFrameShape::Square => format!(
            "M{},{} h7 v7 h-7 z M{},{} v5 h5 v-5 h-5 z",
            fx, fy, fx + 1.0, fy + 1.0
        ),
        
        EyeFrameShape::Circle => format!(
            "M{},{} A3.5,3.5 0 1,1 {},{} A3.5,3.5 0 1,1 {},{} \
             M{},{} A2.5,2.5 0 1,0 {},{} A2.5,2.5 0 1,0 {},{} Z",
            fx + 3.5, fy, fx + 3.5, fy + 7.0, fx + 3.5, fy,
            fx + 3.5, fy + 1.0, fx + 3.5, fy + 6.0, fx + 3.5, fy + 1.0
        ),
        
        EyeFrameShape::Rounded => format!(
            "M{},{} h3 a2,2 0 0 1 2,2 v3 a2,2 0 0 1 -2,2 h-3 a2,2 0 0 1 -2,-2 v-3 a2,2 0 0 1 2,-2 z \
             M{},{} a1,1 0 0 0 -1,1 v3 a1,1 0 0 0 1,1 h3 a1,1 0 0 0 1,-1 v-3 a1,1 0 0 0 -1,-1 h-3 z",
            fx + 2.0, fy, fx + 2.0, fy + 1.0
        ),
        
        EyeFrameShape::Leaf => format!(
            "M{},{} h4 a3,3 0 0 1 3,3 v4 h-4 a3,3 0 0 1 -3,-3 v-4 z \
             M{},{} v3 a2,2 0 0 0 2,2 h3 v-3 a2,2 0 0 0 -2,-2 h-3 z",
            fx, fy, fx + 1.0, fy + 1.0
        ),
        
        EyeFrameShape::Cushion => format!(
            "M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z \
             M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            fx + 3.5, fy, fx + 7.0, fy, fx + 7.0, fy + 3.5,
            fx + 7.0, fy + 7.0, fx + 3.5, fy + 7.0,
            fx, fy + 7.0, fx, fy + 3.5,
            fx, fy, fx + 3.5, fy,
            fx + 3.5, fy + 1.0, fx + 1.0, fy + 1.0, fx + 1.0, fy + 3.5,
            fx + 1.0, fy + 6.0, fx + 3.5, fy + 6.0,
            fx + 6.0, fy + 6.0, fx + 6.0, fy + 3.5,
            fx + 6.0, fy + 1.0, fx + 3.5, fy + 1.0
        ),
        
        EyeFrameShape::Double => format!(
            "M{},{} h7 v7 h-7 z M{},{} v6 h6 v-6 h-6 z \
             M{},{} h5 v5 h-5 z M{},{} v4 h4 v-4 h-4 z",
            fx, fy, fx + 0.5, fy + 0.5,
            fx + 1.0, fy + 1.0, fx + 1.5, fy + 1.5
        ),
        
        EyeFrameShape::Fancy => format!(
            "M{},{} h5 l1,1 v5 l-1,1 h-5 l-1,-1 v-5 l1,-1 z \
             M{},{} l-0.5,0.5 v4 l0.5,0.5 h4 l0.5,-0.5 v-4 l-0.5,-0.5 h-4 z",
            fx + 1.0, fy, fx + 1.5, fy + 1.0
        ),
        
        EyeFrameShape::DotsSquare => format!(
            "M{},{} h7 v7 h-7 z M{},{} v5 h5 v-5 h-5 z",
            fx, fy, fx + 1.0, fy + 1.0
        ),
        
        EyeFrameShape::HeavyRounded => format!(
            "M{},{} h2 a2.5,2.5 0 0 1 2.5,2.5 v2 a2.5,2.5 0 0 1 -2.5,2.5 h-2 a2.5,2.5 0 0 1 -2.5,-2.5 v-2 a2.5,2.5 0 0 1 2.5,-2.5 z \
             M{},{} a1.5,1.5 0 0 0 -1.5,1.5 v2 a1.5,1.5 0 0 0 1.5,1.5 h2 a1.5,1.5 0 0 0 1.5,-1.5 v-2 a1.5,1.5 0 0 0 -1.5,-1.5 h-2 z",
            fx + 2.5, fy, fx + 2.5, fy + 1.0
        ),
        
        EyeFrameShape::CloverFrame => format!(
            "M{},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} Z \
             M{},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} Z",
            fx + 3.5, fy, fx + 5.5, fy, fx + 7.0, fy + 1.5, fx + 7.0, fy + 3.5,
            fx + 7.0, fy + 5.5, fx + 5.5, fy + 7.0, fx + 3.5, fy + 7.0,
            fx + 1.5, fy + 7.0, fx, fy + 5.5, fx, fy + 3.5,
            fx, fy + 1.5, fx + 1.5, fy, fx + 3.5, fy,
            fx + 3.5, fy + 1.0, fx + 1.5, fy + 1.0, fx + 1.0, fy + 1.5, fx + 1.0, fy + 3.5,
            fx + 1.0, fy + 5.5, fx + 1.5, fy + 6.0, fx + 3.5, fy + 6.0,
            fx + 5.5, fy + 6.0, fx + 6.0, fy + 5.5, fx + 6.0, fy + 3.5,
            fx + 6.0, fy + 1.5, fx + 5.5, fy + 1.0, fx + 3.5, fy + 1.0
        ),
    }
}

/// Generate SVG path for eye ball at position (bx, by)
/// Ball size is 3x3
pub fn eye_ball_path(shape: EyeBallShape, bx: f64, by: f64) -> String {
    match shape {
        EyeBallShape::Square => format!("M{},{} h3 v3 h-3 z", bx, by),
        
        EyeBallShape::Circle => format!(
            "M{},{} a1.5,1.5 0 1,0 0,3 a1.5,1.5 0 1,0 0,-3 z",
            bx + 1.5, by
        ),
        
        EyeBallShape::Diamond => format!(
            "M{},{} L{},{} L{},{} L{},{} Z",
            bx + 1.5, by,
            bx + 3.0, by + 1.5,
            bx + 1.5, by + 3.0,
            bx, by + 1.5
        ),
        
        EyeBallShape::Rounded => format!(
            "M{},{} h2 a0.5,0.5 0 0 1 0.5,0.5 v2 a0.5,0.5 0 0 1 -0.5,0.5 h-2 a0.5,0.5 0 0 1 -0.5,-0.5 v-2 a0.5,0.5 0 0 1 0.5,-0.5 z",
            bx + 0.5, by
        ),
        
        EyeBallShape::Star => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z M{},{} m-0.8,0 a0.8,0.8 0 1,0 1.6,0 a0.8,0.8 0 1,0 -1.6,0",
            bx + 1.5, by,
            bx + 1.9, by + 1.1,
            bx + 3.0, by + 1.5,
            bx + 1.9, by + 1.9,
            bx + 1.5, by + 3.0,
            bx + 1.1, by + 1.9,
            bx, by + 1.5,
            bx + 1.1, by + 1.1,
            bx + 1.5, by + 1.5
        ),
        
        EyeBallShape::Heart => format!(
            "M{},{} L{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            bx + 1.5, by + 2.8,
            bx + 0.2, by + 1.2,
            bx, by + 0.5, bx + 0.8, by + 0.2,
            bx + 1.2, by + 0.1, bx + 1.5, by + 0.6,
            bx + 1.8, by + 0.1, bx + 2.2, by + 0.2,
            bx + 3.0, by + 0.5, bx + 2.8, by + 1.2
        ),
        
        EyeBallShape::Hexagon => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            bx + 0.5, by + 0.2,
            bx + 2.5, by + 0.2,
            bx + 3.0, by + 1.5,
            bx + 2.5, by + 2.8,
            bx + 0.5, by + 2.8,
            bx, by + 1.5
        ),
        
        EyeBallShape::BarsH => format!(
            "M{},{} h3 v0.9 h-3 z M{},{} h3 v0.9 h-3 z M{},{} h3 v0.9 h-3 z",
            bx, by + 0.05,
            bx, by + 1.05,
            bx, by + 2.05
        ),
        
        EyeBallShape::BarsV => format!(
            "M{},{} v3 h0.9 v-3 z M{},{} v3 h0.9 v-3 z M{},{} v3 h0.9 v-3 z",
            bx + 0.05, by,
            bx + 1.05, by,
            bx + 2.05, by
        ),
        
        EyeBallShape::DotsGrid => {
            let mut s = String::new();
            for row in 0..3 {
                for col in 0..3 {
                    let cx = bx + 0.5 + col as f64;
                    let cy = by + 0.5 + row as f64;
                    write!(
                        s,
                        "M{},{} a0.45,0.45 0 1,1 -0.9,0 a0.45,0.45 0 1,1 0.9,0 ",
                        cx + 0.45, cy
                    ).unwrap();
                }
            }
            s
        },
        
        EyeBallShape::Flower => {
            let mut s = String::new();
            // 4 petals + center
            for (dx, dy) in [(1.5, 0.2), (2.8, 1.5), (1.5, 2.8), (0.2, 1.5)] {
                write!(
                    s,
                    "M{},{} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0 ",
                    bx + dx, by + dy
                ).unwrap();
            }
            // Center
            write!(
                s,
                "M{},{} m-0.6,0 a0.6,0.6 0 1,0 1.2,0 a0.6,0.6 0 1,0 -1.2,0 ",
                bx + 1.5, by + 1.5
            ).unwrap();
            s
        },
        
        EyeBallShape::Clover => {
            let mut s = String::new();
            // Add Center Mass
            write!(
                s,
                "M{},{} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0 ",
                bx + 1.5, by + 1.5
            ).unwrap();
            
            for (dx, dy) in [(1.5, 0.6), (2.4, 1.5), (1.5, 2.4), (0.6, 1.5)] {
                write!(
                    s,
                    "M{},{} m-0.6,0 a0.6,0.6 0 1,0 1.2,0 a0.6,0.6 0 1,0 -1.2,0 ",
                    bx + dx, by + dy
                ).unwrap();
            }
            s
        },
        
        EyeBallShape::Cushion => format!(
            "M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            bx + 1.5, by + 0.1,
            bx + 2.9, by + 0.1, bx + 2.9, by + 1.5,
            bx + 2.9, by + 2.9, bx + 1.5, by + 2.9,
            bx + 0.1, by + 2.9, bx + 0.1, by + 1.5,
            bx + 0.1, by + 0.1, bx + 1.5, by + 0.1
        ),
        
        EyeBallShape::Octagon => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            bx + 0.9, by + 0.1,
            bx + 2.1, by + 0.1,
            bx + 2.9, by + 0.9,
            bx + 2.9, by + 2.1,
            bx + 2.1, by + 2.9,
            bx + 0.9, by + 2.9,
            bx + 0.1, by + 2.1,
            bx + 0.1, by + 0.9
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_body_paths_valid() {
        let shapes = [
            BodyShape::Square,
            BodyShape::Dots,
            BodyShape::Diamond,
            BodyShape::Star,
        ];
        
        for shape in shapes {
            let path = body_path(shape, 5.0, 5.0);
            assert!(!path.is_empty());
            assert!(path.starts_with('M') || path.starts_with('m'));
        }
    }

    #[test]
    fn test_eye_frame_paths_valid() {
        let shapes = [
            EyeFrameShape::Square,
            EyeFrameShape::Circle,
            EyeFrameShape::Rounded,
        ];
        
        for shape in shapes {
            let path = eye_frame_path(shape, 0.0, 0.0);
            assert!(!path.is_empty());
        }
    }

    #[test]
    fn test_eye_ball_paths_valid() {
        let shapes = [
            EyeBallShape::Square,
            EyeBallShape::Circle,
            EyeBallShape::DotsGrid,
        ];
        
        for shape in shapes {
            let path = eye_ball_path(shape, 2.0, 2.0);
            assert!(!path.is_empty());
        }
    }
}
