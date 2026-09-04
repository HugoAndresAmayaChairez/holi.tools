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
    Capsule,
    Chain,
    Pixel,
    Water,
}

/// Eye frame shape types (outer 7x7 finder pattern)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum EyeFrameShape {
    #[default]
    Square,
    Circle,
    Rounded,
    Diamond,
    Leaf,
    Cushion,
    Shield,
    Double,
    Fancy,
    DotsSquare,
    HeavyRounded,
    CloverFrame,
    Bevel,
    Orbit,
    Flux,
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
    Leaf,
    Shield,
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
            "capsule" => Self::Capsule,
            "chain" => Self::Chain,
            "pixel" => Self::Pixel,
            "water" => Self::Water,
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
            "diamond" => Self::Diamond,
            "leaf" => Self::Leaf,
            "cushion" => Self::Cushion,
            "shield" => Self::Shield,
            "double" => Self::Double,
            "fancy" => Self::Fancy,
            "dots-square" | "dotssquare" => Self::DotsSquare,
            "heavy-rounded" | "heavyrounded" => Self::HeavyRounded,
            "clover-frame" | "cloverframe" => Self::CloverFrame,
            "bevel" => Self::Bevel,
            "orbit" => Self::Orbit,
            "flux" => Self::Flux,
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
            "leaf" => Self::Leaf,
            "shield" => Self::Shield,
            _ => Self::Square,
        }
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct Neighbors {
    pub l: bool,
    pub r: bool,
    pub u: bool,
    pub d: bool,
    pub lu: bool,
    pub ru: bool,
    pub ld: bool,
    pub rd: bool,
}

fn rounded_rect_path(x: f64, y: f64, w: f64, h: f64, r: f64) -> String {
    let r = r.max(0.0).min((w.min(h)) / 2.0);
    format!(
        "M{},{} h{} a{},{} 0 0 1 {},{} v{} a{},{} 0 0 1 -{},{} h-{} a{},{} 0 0 1 -{},-{} v-{} a{},{} 0 0 1 {},-{} z",
        x + r,
        y,
        w - 2.0 * r,
        r,
        r,
        r,
        r,
        h - 2.0 * r,
        r,
        r,
        r,
        r,
        w - 2.0 * r,
        r,
        r,
        r,
        r,
        h - 2.0 * r,
        r,
        r,
        r,
        r
    )
}

fn circle_path(cx: f64, cy: f64, r: f64) -> String {
    let r = r.max(0.0);
    format!(
        "M{},{} a{},{} 0 1,1 -{},0 a{},{} 0 1,1 {},0",
        cx + r,
        cy,
        r,
        r,
        2.0 * r,
        r,
        r,
        2.0 * r
    )
}

/// Rounded rectangle with an independent radius per corner (tl, tr, br, bl).
/// Corners with radius 0 stay sharp, which lets connected modules fuse into
/// continuous capsules/streams while free ends stay round.
fn corner_rect_path(x: f64, y: f64, w: f64, h: f64, tl: f64, tr: f64, br: f64, bl: f64) -> String {
    let cap = (w.min(h)) / 2.0;
    let (tl, tr, br, bl) = (tl.min(cap), tr.min(cap), br.min(cap), bl.min(cap));
    let mut s = String::new();
    write!(s, "M{},{}", x + tl, y).unwrap();
    write!(s, " h{}", w - tl - tr).unwrap();
    if tr > 0.0 {
        write!(s, " a{},{} 0 0 1 {},{}", tr, tr, tr, tr).unwrap();
    }
    write!(s, " v{}", h - tr - br).unwrap();
    if br > 0.0 {
        write!(s, " a{},{} 0 0 1 -{},{}", br, br, br, br).unwrap();
    }
    write!(s, " h-{}", w - br - bl).unwrap();
    if bl > 0.0 {
        write!(s, " a{},{} 0 0 1 -{},-{}", bl, bl, bl, bl).unwrap();
    }
    write!(s, " v-{}", h - bl - tl).unwrap();
    if tl > 0.0 {
        write!(s, " a{},{} 0 0 1 {},-{}", tl, tl, tl, tl).unwrap();
    }
    s.push_str(" z");
    s
}

/// A module that fuses with its cardinal neighbours: sharp where a neighbour
/// continues the run, fully round where the run ends. `inset` pulls free
/// sides slightly inward so isolated modules read as dots/pills.
fn fused_module_path(
    px: f64,
    py: f64,
    n: Neighbors,
    inset: f64,
    connect_h: bool,
    connect_v: bool,
) -> String {
    let l = connect_h && n.l;
    let r = connect_h && n.r;
    let u = connect_v && n.u;
    let d = connect_v && n.d;
    let x0 = px + if l { 0.0 } else { inset };
    let x1 = px + 1.0 - if r { 0.0 } else { inset };
    let y0 = py + if u { 0.0 } else { inset };
    let y1 = py + 1.0 - if d { 0.0 } else { inset };
    let rad = 0.5;
    let tl = if l || u { 0.0 } else { rad };
    let tr = if r || u { 0.0 } else { rad };
    let br = if r || d { 0.0 } else { rad };
    let bl = if l || d { 0.0 } else { rad };
    corner_rect_path(x0, y0, x1 - x0, y1 - y0, tl, tr, br, bl)
}

/// Generate SVG path for a body module at position (px, py)
/// Module size is 1x1
pub fn body_path(shape: BodyShape, px: f64, py: f64) -> String {
    match shape {
        BodyShape::Square => format!("M{},{}h1v1h-1z", px, py),

        // Rounded modules should still carry enough area for scanning.
        BodyShape::Rounded => rounded_rect_path(px + 0.08, py + 0.08, 0.84, 0.84, 0.28),

        BodyShape::Dots => format!(
            "M{},{} m-0.43,0 a0.43,0.43 0 1,0 0.86,0 a0.43,0.43 0 1,0 -0.86,0",
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
            "M{},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} Z",
            // Start at the top indentation, then loop around the lobes to the bottom point and back.
            px + 0.5, py + 0.35,
            px + 0.5, py + 0.2,  px + 0.3, py + 0.1,  px + 0.18, py + 0.25,
            px + 0.02, py + 0.45, px + 0.2, py + 0.7,  px + 0.5, py + 0.92,
            px + 0.8, py + 0.7,  px + 0.98, py + 0.45, px + 0.82, py + 0.25,
            px + 0.7, py + 0.1,  px + 0.5, py + 0.2,  px + 0.5, py + 0.35
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
            "M{},{} m-0.34,0 a0.34,0.34 0 1,0 0.68,0 a0.34,0.34 0 1,0 -0.68,0",
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
        // Neighbor-aware shapes must use `body_path_with_neighbors`.
        BodyShape::Capsule | BodyShape::Chain | BodyShape::Pixel | BodyShape::Water => {
            body_path_with_neighbors(shape, px, py, Neighbors::default())
        }
    }
}

pub fn body_path_with_neighbors(shape: BodyShape, px: f64, py: f64, n: Neighbors) -> String {
    match shape {
        BodyShape::Capsule => {
            // Runs of modules fuse into continuous pills (both axes); free ends are round.
            fused_module_path(px, py, n, 0.06, true, true)
        }
        BodyShape::Chain => {
            // Beads on a chain: a round bead per module, solid links to cardinal neighbours.
            let mut s = String::new();
            let cx = px + 0.5;
            let cy = py + 0.5;
            s.push_str(&circle_path(cx, cy, 0.36));
            let half = 0.11;
            if n.l {
                s.push_str(&rounded_rect_path(px, cy - half, 0.5, half * 2.0, 0.0));
            }
            if n.r {
                s.push_str(&rounded_rect_path(cx, cy - half, 0.5, half * 2.0, 0.0));
            }
            if n.u {
                s.push_str(&rounded_rect_path(cx - half, py, half * 2.0, 0.5, 0.0));
            }
            if n.d {
                s.push_str(&rounded_rect_path(cx - half, cy, half * 2.0, 0.5, 0.0));
            }
            s
        }
        BodyShape::Pixel => {
            // Uniform pixel grid: every module is the same slightly-inset square.
            let inset = 0.09;
            let side = 1.0 - 2.0 * inset;
            format!(
                "M{},{}h{}v{}h-{}z",
                px + inset,
                py + inset,
                side,
                side,
                side
            )
        }
        BodyShape::Water => {
            // Drops that run downwards: vertical neighbours fuse into streams,
            // isolated modules are teardrops, horizontal neighbours stay separate drops.
            let any_v = n.u || n.d;
            if !any_v {
                let cx = px + 0.5;
                return format!(
                    "M{},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} Z",
                    cx, py + 0.06,
                    px + 0.82, py + 0.18, px + 0.94, py + 0.44, px + 0.86, py + 0.72,
                    px + 0.78, py + 0.92, px + 0.62, py + 0.98, cx, py + 0.98,
                    px + 0.38, py + 0.98, px + 0.22, py + 0.92, px + 0.14, py + 0.72,
                    px + 0.06, py + 0.44, px + 0.18, py + 0.18, cx, py + 0.06
                );
            }
            fused_module_path(px, py, n, 0.08, false, true)
        }
        _ => body_path(shape, px, py),
    }
}

/// Generate SVG path for eye frame at position (fx, fy)
/// Frame size is 7x7 with 1-unit thick border
pub fn eye_frame_path(shape: EyeFrameShape, fx: f64, fy: f64) -> String {
    match shape {
        EyeFrameShape::Square => format!(
            "M{},{} h7 v7 h-7 z M{},{} v5 h5 v-5 h-5 z",
            fx,
            fy,
            fx + 1.0,
            fy + 1.0
        ),

        EyeFrameShape::Circle => format!(
            "M{},{} A3.5,3.5 0 1,1 {},{} A3.5,3.5 0 1,1 {},{} \
             M{},{} A2.5,2.5 0 1,0 {},{} A2.5,2.5 0 1,0 {},{} Z",
            fx + 3.5,
            fy,
            fx + 3.5,
            fy + 7.0,
            fx + 3.5,
            fy,
            fx + 3.5,
            fy + 1.0,
            fx + 3.5,
            fy + 6.0,
            fx + 3.5,
            fy + 1.0
        ),

        EyeFrameShape::Rounded => {
            format!(
                "{}{}",
                rounded_rect_path(fx, fy, 7.0, 7.0, 1.65),
                rounded_rect_path(fx + 1.0, fy + 1.0, 5.0, 5.0, 1.05),
            )
        }

        EyeFrameShape::Diamond => format!(
            "M{},{} L{},{} L{},{} L{},{} Z M{},{} L{},{} L{},{} L{},{} Z",
            fx + 3.5,
            fy,
            fx + 7.0,
            fy + 3.5,
            fx + 3.5,
            fy + 7.0,
            fx,
            fy + 3.5,
            fx + 3.5,
            fy + 1.0,
            fx + 6.0,
            fy + 3.5,
            fx + 3.5,
            fy + 6.0,
            fx + 1.0,
            fy + 3.5
        ),

        EyeFrameShape::Leaf => format!(
            "M{},{} h4 a3,3 0 0 1 3,3 v4 h-4 a3,3 0 0 1 -3,-3 v-4 z \
             M{},{} v3 a2,2 0 0 0 2,2 h3 v-3 a2,2 0 0 0 -2,-2 h-3 z",
            fx,
            fy,
            fx + 1.0,
            fy + 1.0
        ),

        EyeFrameShape::Cushion => format!(
            "M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z \
             M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            fx + 3.5,
            fy,
            fx + 7.0,
            fy,
            fx + 7.0,
            fy + 3.5,
            fx + 7.0,
            fy + 7.0,
            fx + 3.5,
            fy + 7.0,
            fx,
            fy + 7.0,
            fx,
            fy + 3.5,
            fx,
            fy,
            fx + 3.5,
            fy,
            fx + 3.5,
            fy + 1.0,
            fx + 1.0,
            fy + 1.0,
            fx + 1.0,
            fy + 3.5,
            fx + 1.0,
            fy + 6.0,
            fx + 3.5,
            fy + 6.0,
            fx + 6.0,
            fy + 6.0,
            fx + 6.0,
            fy + 3.5,
            fx + 6.0,
            fy + 1.0,
            fx + 3.5,
            fy + 1.0
        ),

        EyeFrameShape::Shield => format!(
            "M{},{} h7 v7 h-7 z M{},{} v5 h5 v-5 h-5 z",
            fx,
            fy,
            fx + 1.0,
            fy + 1.0
        ),

        EyeFrameShape::Double => format!(
            "M{},{} h7 v7 h-7 z M{},{} v5 h5 v-5 h-5 z",
            fx,
            fy,
            fx + 1.0,
            fy + 1.0
        ),

        EyeFrameShape::Fancy => format!(
            "M{},{} h5 l1,1 v5 l-1,1 h-5 l-1,-1 v-5 l1,-1 z \
             M{},{} l-0.5,0.5 v4 l0.5,0.5 h4 l0.5,-0.5 v-4 l-0.5,-0.5 h-4 z",
            fx + 1.0,
            fy,
            fx + 1.5,
            fy + 1.0
        ),

        EyeFrameShape::DotsSquare => format!(
            "M{},{} h7 v7 h-7 z M{},{} v5 h5 v-5 h-5 z",
            fx,
            fy,
            fx + 1.0,
            fy + 1.0
        ),

        EyeFrameShape::HeavyRounded => {
            format!(
                "{}{}",
                rounded_rect_path(fx, fy, 7.0, 7.0, 2.35),
                rounded_rect_path(fx + 1.0, fy + 1.0, 5.0, 5.0, 1.55),
            )
        }

        EyeFrameShape::CloverFrame => {
            // Four-lobed rounded frame: scalloped outside, gently bulging inside.
            format!(
                concat!("M{},{} h0.5 Q{},{} {},{} h0.5 a2,2 0 0 1 2,2 v0.5 Q{},{} {},{} v0.5 a2,2 0 0 1 -2,2 h-0.5 Q{},{} {},{} h-0.5 a2,2 0 0 1 -2,-2 v-0.5 Q{},{} {},{} v-0.5 a2,2 0 0 1 2,-2 Z", " ", "M{},{} h0.5 Q{},{} {},{} h0.5 a1.2,1.2 0 0 1 1.2,1.2 v0.5 Q{},{} {},{} v0.5 a1.2,1.2 0 0 1 -1.2,1.2 h-0.5 Q{},{} {},{} h-0.5 a1.2,1.2 0 0 1 -1.2,-1.2 v-0.5 Q{},{} {},{} v-0.5 a1.2,1.2 0 0 1 1.2,-1.2 Z"),
                fx + 2.0, fy, fx + 3.5, fy + 0.5, fx + 4.5, fy, fx + 6.5, fy + 3.5, fx + 7.0, fy + 4.5, fx + 3.5, fy + 6.5, fx + 2.5, fy + 7.0, fx + 0.5, fy + 3.5, fx, fy + 2.5,
                fx + 2.2, fy + 1.0, fx + 3.5, fy + 1.24, fx + 4.3, fy + 1.0, fx + 5.76, fy + 3.5, fx + 6.0, fy + 4.3, fx + 3.5, fy + 5.76, fx + 2.7, fy + 6.0, fx + 1.24, fy + 3.5, fx + 1.0, fy + 2.7
            )
        }
        EyeFrameShape::Bevel => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z \
             M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            fx + 0.8,
            fy,
            fx + 6.2,
            fy,
            fx + 7.0,
            fy + 0.8,
            fx + 7.0,
            fy + 6.2,
            fx + 6.2,
            fy + 7.0,
            fx + 0.8,
            fy + 7.0,
            fx,
            fy + 6.2,
            fx,
            fy + 0.8,
            fx + 1.7,
            fy + 1.0,
            fx + 5.3,
            fy + 1.0,
            fx + 6.0,
            fy + 1.7,
            fx + 6.0,
            fy + 5.3,
            fx + 5.3,
            fy + 6.0,
            fx + 1.7,
            fy + 6.0,
            fx + 1.0,
            fy + 5.3,
            fx + 1.0,
            fy + 1.7
        ),
        EyeFrameShape::Orbit => {
            format!(
                "{}{}",
                rounded_rect_path(fx + 0.18, fy + 0.18, 6.64, 6.64, 2.55),
                rounded_rect_path(fx + 1.35, fy + 1.35, 4.30, 4.30, 1.45),
            )
        }
        EyeFrameShape::Flux => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z \
             M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            fx + 1.2,
            fy,
            fx + 5.8,
            fy,
            fx + 7.0,
            fy + 1.2,
            fx + 7.0,
            fy + 5.8,
            fx + 5.8,
            fy + 7.0,
            fx + 1.2,
            fy + 7.0,
            fx,
            fy + 5.8,
            fx,
            fy + 1.2,
            fx + 2.2,
            fy + 1.4,
            fx + 4.8,
            fy + 1.4,
            fx + 5.6,
            fy + 2.2,
            fx + 5.6,
            fy + 4.8,
            fx + 4.8,
            fy + 5.6,
            fx + 2.2,
            fy + 5.6,
            fx + 1.4,
            fy + 4.8,
            fx + 1.4,
            fy + 2.2
        ),
    }
}

/// Generate the outer silhouette of an eye frame, without the inner hole.
pub fn eye_frame_outer_path(shape: EyeFrameShape, fx: f64, fy: f64) -> String {
    match shape {
        EyeFrameShape::Circle => format!(
            "M{},{} A3.5,3.5 0 1,1 {},{} A3.5,3.5 0 1,1 {},{} Z",
            fx + 3.5,
            fy,
            fx + 3.5,
            fy + 7.0,
            fx + 3.5,
            fy
        ),
        EyeFrameShape::Rounded => rounded_rect_path(fx, fy, 7.0, 7.0, 1.65),
        EyeFrameShape::HeavyRounded => rounded_rect_path(fx, fy, 7.0, 7.0, 2.35),
        EyeFrameShape::Orbit => rounded_rect_path(fx + 0.18, fy + 0.18, 6.64, 6.64, 2.55),
        EyeFrameShape::Diamond => format!(
            "M{},{} L{},{} L{},{} L{},{} Z",
            fx + 3.5, fy, fx + 7.0, fy + 3.5, fx + 3.5, fy + 7.0, fx, fy + 3.5
        ),
        EyeFrameShape::Bevel => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            fx + 0.8,
            fy,
            fx + 6.2,
            fy,
            fx + 7.0,
            fy + 0.8,
            fx + 7.0,
            fy + 6.2,
            fx + 6.2,
            fy + 7.0,
            fx + 0.8,
            fy + 7.0,
            fx,
            fy + 6.2,
            fx,
            fy + 0.8
        ),
        EyeFrameShape::Flux => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            fx + 1.2,
            fy,
            fx + 5.8,
            fy,
            fx + 7.0,
            fy + 1.2,
            fx + 7.0,
            fy + 5.8,
            fx + 5.8,
            fy + 7.0,
            fx + 1.2,
            fy + 7.0,
            fx,
            fy + 5.8,
            fx,
            fy + 1.2
        ),
        EyeFrameShape::Leaf => {
            format!(
                "M{},{} h4 a3,3 0 0 1 3,3 v4 h-4 a3,3 0 0 1 -3,-3 v-4 z",
                fx, fy
            )
        }
        EyeFrameShape::Cushion => format!(
            "M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            fx + 3.5,
            fy,
            fx + 7.0,
            fy,
            fx + 7.0,
            fy + 3.5,
            fx + 7.0,
            fy + 7.0,
            fx + 3.5,
            fy + 7.0,
            fx,
            fy + 7.0,
            fx,
            fy + 3.5,
            fx,
            fy,
            fx + 3.5,
            fy
        ),
        EyeFrameShape::CloverFrame => format!(
            "M{},{} h0.5 Q{},{} {},{} h0.5 a2,2 0 0 1 2,2 v0.5 Q{},{} {},{} v0.5 a2,2 0 0 1 -2,2 h-0.5 Q{},{} {},{} h-0.5 a2,2 0 0 1 -2,-2 v-0.5 Q{},{} {},{} v-0.5 a2,2 0 0 1 2,-2 Z",
            fx + 2.0, fy, fx + 3.5, fy + 0.5, fx + 4.5, fy, fx + 6.5, fy + 3.5, fx + 7.0, fy + 4.5, fx + 3.5, fy + 6.5, fx + 2.5, fy + 7.0, fx + 0.5, fy + 3.5, fx, fy + 2.5
        ),
        _ => format!("M{},{} h7 v7 h-7 z", fx, fy),
    }
}

/// Generate SVG path for eye ball at position (bx, by)
/// Ball size is 3x3
pub fn eye_ball_path(shape: EyeBallShape, bx: f64, by: f64) -> String {
    match shape {
        EyeBallShape::Square => format!("M{},{} h3 v3 h-3 z", bx, by),

        EyeBallShape::Circle => format!(
            "M{},{} a1.5,1.5 0 1,0 0,3 a1.5,1.5 0 1,0 0,-3 z",
            bx + 1.5,
            by
        ),

        EyeBallShape::Diamond => format!(
            // Softly bulged diamond: keeps ~3 modules of dark on the scan axes.
            "M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            bx + 1.50,
            by + -0.05,
            bx + 2.70,
            by + 0.30,
            bx + 3.05,
            by + 1.50,
            bx + 2.70,
            by + 2.70,
            bx + 1.50,
            by + 3.05,
            bx + 0.30,
            by + 2.70,
            bx + -0.05,
            by + 1.50,
            bx + 0.30,
            by + 0.30,
            bx + 1.50,
            by + -0.05
        ),

        EyeBallShape::Rounded => rounded_rect_path(bx + 0.15, by + 0.15, 2.70, 2.70, 0.75),

        EyeBallShape::Star => {
            // Chubby 5-point star (outer 1.55, inner 1.15): wide enough on both
            // scan axes to keep the 1:1:3:1:1 finder ratio within tolerance.
            format!(
                "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
                bx + 1.50,
                by + -0.05,
                bx + 2.18,
                by + 0.57,
                bx + 2.97,
                by + 1.02,
                bx + 2.59,
                by + 1.86,
                bx + 2.41,
                by + 2.75,
                bx + 1.50,
                by + 2.65,
                bx + 0.59,
                by + 2.75,
                bx + 0.41,
                by + 1.86,
                bx + 0.03,
                by + 1.02,
                bx + 0.82,
                by + 0.57
            )
        }

        EyeBallShape::Heart => {
            format!(
            "M{},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} C{},{} {},{} {},{} Z",
            bx + 1.50, by + 0.82,
            bx + 1.50, by + 0.34, bx + 0.82, by + 0.10, bx + 0.42, by + 0.50,
            bx + 0.02, by + 0.94, bx + 0.24, by + 2.00, bx + 1.50, by + 2.96,
            bx + 2.76, by + 2.00, bx + 2.98, by + 0.94, bx + 2.58, by + 0.50,
            bx + 2.18, by + 0.10, bx + 1.50, by + 0.34, bx + 1.50, by + 0.82
        )
        }

        EyeBallShape::Hexagon => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            bx + 0.5,
            by + 0.2,
            bx + 2.5,
            by + 0.2,
            bx + 3.0,
            by + 1.5,
            bx + 2.5,
            by + 2.8,
            bx + 0.5,
            by + 2.8,
            bx,
            by + 1.5
        ),

        EyeBallShape::BarsH => format!(
            "M{},{} h2.9 v0.6 h-2.9 z M{},{} h3.0 v0.6 h-3.0 z M{},{} h2.9 v0.6 h-2.9 z \
             M{},{} h0.6 v3.0 h-0.6 z",
            bx + 0.05,
            by + 0.2,
            bx,
            by + 1.2,
            bx + 0.05,
            by + 2.2,
            bx + 1.2,
            by
        ),

        EyeBallShape::BarsV => format!(
            "M{},{} v2.9 h0.45 v-2.9 z M{},{} v3.0 h1.0 v-3.0 z M{},{} v2.9 h0.45 v-2.9 z",
            bx + 0.25,
            by + 0.05,
            bx + 1.0,
            by,
            bx + 2.30,
            by + 0.05
        ),

        EyeBallShape::DotsGrid => {
            // 3x3 grid of rounded tiles. The interior stays solid (scanners need an
            // unbroken 3-module dark run), so the grid reads on the outline only.
            let mut s = String::new();
            for row in 0..3 {
                for col in 0..3 {
                    let x = bx + col as f64;
                    let y = by + row as f64;
                    s.push_str(&rounded_rect_path(x, y, 1.0, 1.0, 0.3));
                }
            }
            s.push_str(&format!("M{},{} h2.4 v2.4 h-2.4 z", bx + 0.3, by + 0.3));
            s
        }

        EyeBallShape::Flower => {
            let mut s = String::new();
            // 4 petals + center
            for (dx, dy) in [(1.5, 0.2), (2.8, 1.5), (1.5, 2.8), (0.2, 1.5)] {
                write!(
                    s,
                    "M{},{} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0 ",
                    bx + dx,
                    by + dy
                )
                .unwrap();
            }
            // Center
            write!(
                s,
                "M{},{} m-0.6,0 a0.6,0.6 0 1,0 1.2,0 a0.6,0.6 0 1,0 -1.2,0 ",
                bx + 1.5,
                by + 1.5
            )
            .unwrap();
            s
        }

        EyeBallShape::Clover => {
            let mut s = String::new();
            // Add Center Mass
            write!(
                s,
                "M{},{} m-0.7,0 a0.7,0.7 0 1,0 1.4,0 a0.7,0.7 0 1,0 -1.4,0 ",
                bx + 1.5,
                by + 1.5
            )
            .unwrap();

            for (dx, dy) in [(1.5, 0.6), (2.4, 1.5), (1.5, 2.4), (0.6, 1.5)] {
                write!(
                    s,
                    "M{},{} m-0.6,0 a0.6,0.6 0 1,0 1.2,0 a0.6,0.6 0 1,0 -1.2,0 ",
                    bx + dx,
                    by + dy
                )
                .unwrap();
            }
            s
        }

        EyeBallShape::Cushion => format!(
            "M{},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Q{},{} {},{} Z",
            bx + 1.5,
            by + 0.1,
            bx + 2.9,
            by + 0.1,
            bx + 2.9,
            by + 1.5,
            bx + 2.9,
            by + 2.9,
            bx + 1.5,
            by + 2.9,
            bx + 0.1,
            by + 2.9,
            bx + 0.1,
            by + 1.5,
            bx + 0.1,
            by + 0.1,
            bx + 1.5,
            by + 0.1
        ),

        EyeBallShape::Octagon => format!(
            "M{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} L{},{} Z",
            bx + 0.9,
            by + 0.1,
            bx + 2.1,
            by + 0.1,
            bx + 2.9,
            by + 0.9,
            bx + 2.9,
            by + 2.1,
            bx + 2.1,
            by + 2.9,
            bx + 0.9,
            by + 2.9,
            bx + 0.1,
            by + 2.1,
            bx + 0.1,
            by + 0.9
        ),

        EyeBallShape::Leaf => format!(
            "M{},{} h1.5 a1.5,1.5 0 0 1 1.5,1.5 v1.5 h-1.5 a1.5,1.5 0 0 1 -1.5,-1.5 z",
            bx, by
        ),

        EyeBallShape::Shield => format!(
            "M{},{} h3 v1.5 a1.5,1.5 0 0 1 -1.5,1.5 a1.5,1.5 0 0 1 -1.5,-1.5 z",
            bx, by
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
