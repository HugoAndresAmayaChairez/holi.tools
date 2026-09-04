//! Emits SVG path data for the Shapes panel thumbnails so the UI previews
//! use exactly the geometry the renderer ships.
//! Run: cargo run --release --example shape_previews > ../../../web/apps/qr/src/lib/constants/shape-previews.json
use holi_qr::{body_path_with_neighbors, eye_ball_path, eye_frame_path, BodyShape, EyeBallShape, EyeFrameShape, Neighbors};

const PATTERN: [[u8; 5]; 5] = [
    [1, 1, 0, 1, 1],
    [1, 1, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 1, 1, 1],
    [1, 1, 0, 1, 1],
];

fn dark(x: i32, y: i32) -> bool {
    x >= 0 && y >= 0 && x < 5 && y < 5 && PATTERN[y as usize][x as usize] == 1
}

fn main() {
    let bodies = ["square", "rounded", "dots", "tiny-dots", "capsule", "chain", "diamond", "water", "pixel"];
    let frames = ["square", "rounded", "circle", "diamond", "cushion", "leaf", "clover-frame", "bevel", "orbit", "flux"];
    let balls = ["square", "rounded", "circle", "diamond", "star", "heart", "hexagon", "dots-grid", "bars-h", "bars-v"];

    let mut out = String::from("{\n  \"body\": {\n");
    for (i, b) in bodies.iter().enumerate() {
        let shape = BodyShape::from_str(b);
        let mut d = String::new();
        for y in 0..5 {
            for x in 0..5 {
                if !dark(x, y) { continue; }
                let n = Neighbors {
                    l: dark(x - 1, y), r: dark(x + 1, y), u: dark(x, y - 1), d: dark(x, y + 1),
                    lu: dark(x - 1, y - 1), ru: dark(x + 1, y - 1), ld: dark(x - 1, y + 1), rd: dark(x + 1, y + 1),
                };
                d.push_str(&body_path_with_neighbors(shape, x as f64, y as f64, n));
            }
        }
        out.push_str(&format!("    \"{}\": \"{}\"{}\n", b, d.trim(), if i + 1 < bodies.len() { "," } else { "" }));
    }
    out.push_str("  },\n  \"frame\": {\n");
    for (i, f) in frames.iter().enumerate() {
        let d = eye_frame_path(EyeFrameShape::from_str(f), 0.0, 0.0);
        out.push_str(&format!("    \"{}\": \"{}\"{}\n", f, d.trim(), if i + 1 < frames.len() { "," } else { "" }));
    }
    out.push_str("  },\n  \"ball\": {\n");
    for (i, e) in balls.iter().enumerate() {
        let d = eye_ball_path(EyeBallShape::from_str(e), 0.0, 0.0);
        out.push_str(&format!("    \"{}\": \"{}\"{}\n", e, d.trim(), if i + 1 < balls.len() { "," } else { "" }));
    }
    out.push_str("  }\n}\n");
    print!("{}", out);
}
