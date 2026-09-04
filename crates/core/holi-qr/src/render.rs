//! SVG rendering for QR codes

use crate::qr::QrCode;
use crate::shapes::{
    body_path, body_path_with_neighbors, eye_ball_path, eye_frame_path, BodyShape, EyeBallShape,
    EyeFrameShape, Neighbors,
};
use fast_qr::convert::svg::SvgBuilder;
use fast_qr::convert::Builder;
use std::fmt::Write;

#[derive(Debug, Clone)]
pub struct StyledSvgPaths {
    pub size: usize,
    pub margin: usize,
    pub total: usize,
    pub body_path: String,
    pub finder_frame_path: String,
    pub finder_ball_path: String,
}

/// Options for SVG rendering (basic)
#[derive(Debug, Clone)]
pub struct RenderOptions {
    /// Margin around the QR code (in modules)
    pub margin: usize,
    /// Dark module color (default: black)
    pub dark_color: String,
    /// Light module color (default: white)
    pub light_color: String,
}

impl Default for RenderOptions {
    fn default() -> Self {
        Self {
            margin: 4,
            dark_color: "#000000".to_string(),
            light_color: "#FFFFFF".to_string(),
        }
    }
}

/// Options for styled SVG rendering (with shapes)
#[derive(Debug, Clone)]
pub struct StyledRenderOptions {
    /// Margin around the QR code (in modules)
    pub margin: usize,
    /// Foreground color (dark modules)
    pub fg_color: String,
    /// Background color (light modules)
    pub bg_color: String,
    /// Shape for body modules
    pub body_shape: BodyShape,
    /// Shape for eye frames
    pub eye_frame_shape: EyeFrameShape,
    /// Shape for eye balls
    pub eye_ball_shape: EyeBallShape,
}

impl Default for StyledRenderOptions {
    fn default() -> Self {
        Self {
            margin: 4,
            fg_color: "#000000".to_string(),
            bg_color: "#FFFFFF".to_string(),
            body_shape: BodyShape::Square,
            eye_frame_shape: EyeFrameShape::Square,
            eye_ball_shape: EyeBallShape::Square,
        }
    }
}

/// Render a QR code to SVG string (basic, using fast_qr)
pub fn render_svg(qr: &QrCode) -> String {
    SvgBuilder::default().to_str(&qr.inner)
}

/// Render a QR code to SVG string with basic options
pub fn render_svg_with_options(qr: &QrCode, options: &RenderOptions) -> String {
    let mut builder = SvgBuilder::default();
    builder.margin(options.margin);
    builder.to_str(&qr.inner)
}

pub fn build_styled_svg_paths(qr: &QrCode, options: &StyledRenderOptions) -> StyledSvgPaths {
    let size = qr.size();
    let margin = options.margin;
    let total = size + margin * 2;

    // Get module data
    let modules = qr.get_modules();

    // Helper to check if module is dark
    let is_dark = |x: usize, y: usize| -> bool {
        if x >= size || y >= size {
            return false;
        }
        modules[y * size + x] == 1
    };

    // Check if position is in finder pattern zone (7x7 corners)
    let is_finder_zone = |x: usize, y: usize| -> bool {
        // Top-left
        if x < 7 && y < 7 {
            return true;
        }
        // Top-right
        if x >= size - 7 && y < 7 {
            return true;
        }
        // Bottom-left
        if x < 7 && y >= size - 7 {
            return true;
        }
        false
    };

    // Build body path (all data modules except finder zones)
    let mut body_path_str = String::new();
    for y in 0..size {
        for x in 0..size {
            if is_finder_zone(x, y) {
                continue;
            }
            if is_dark(x, y) {
                let px = (x + margin) as f64;
                let py = (y + margin) as f64;
                if matches!(
                    options.body_shape,
                    BodyShape::Capsule | BodyShape::Chain | BodyShape::Pixel | BodyShape::Water
                ) {
                    let n = Neighbors {
                        l: x > 0 && is_dark(x - 1, y),
                        r: x + 1 < size && is_dark(x + 1, y),
                        u: y > 0 && is_dark(x, y - 1),
                        d: y + 1 < size && is_dark(x, y + 1),
                        lu: x > 0 && y > 0 && is_dark(x - 1, y - 1),
                        ru: x + 1 < size && y > 0 && is_dark(x + 1, y - 1),
                        ld: x > 0 && y + 1 < size && is_dark(x - 1, y + 1),
                        rd: x + 1 < size && y + 1 < size && is_dark(x + 1, y + 1),
                    };
                    body_path_str.push_str(&body_path_with_neighbors(
                        options.body_shape,
                        px,
                        py,
                        n,
                    ));
                } else {
                    body_path_str.push_str(&body_path(options.body_shape, px, py));
                }
            }
        }
    }

    // Build finder patterns (eye frames + eye balls)
    let mut finder_frame_path_str = String::new();
    let mut finder_ball_path_str = String::new();

    // Finder pattern positions (top-left corner of each 7x7 pattern)
    let finder_positions = [
        (0, 0),        // Top-left
        (size - 7, 0), // Top-right
        (0, size - 7), // Bottom-left
    ];

    for (ox, oy) in finder_positions {
        let fx = (ox + margin) as f64;
        let fy = (oy + margin) as f64;

        // Eye frame (outer 7x7)
        finder_frame_path_str.push_str(&eye_frame_path(options.eye_frame_shape, fx, fy));

        // Eye ball (inner 3x3, offset by 2 from frame origin)
        let bx = fx + 2.0;
        let by = fy + 2.0;
        finder_ball_path_str.push_str(&eye_ball_path(options.eye_ball_shape, bx, by));
    }

    StyledSvgPaths {
        size,
        margin,
        total,
        body_path: body_path_str,
        finder_frame_path: finder_frame_path_str,
        finder_ball_path: finder_ball_path_str,
    }
}

/// Render a QR code to SVG string with styled shapes
///
/// This is the main rendering function that supports:
/// - Custom body shapes for data modules
/// - Custom eye frame shapes
/// - Custom eye ball shapes
/// - Custom colors
pub fn render_svg_styled(qr: &QrCode, options: &StyledRenderOptions) -> String {
    let paths = build_styled_svg_paths(qr, options);

    let mut svg = String::new();

    // SVG header
    write!(
        svg,
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {} {}">"#,
        paths.total, paths.total
    )
    .unwrap();

    // Background
    if options.bg_color != "transparent" {
        write!(
            svg,
            r#"<rect width="{}" height="{}" fill="{}"/>"#,
            paths.total, paths.total, options.bg_color
        )
        .unwrap();
    }

    // Render body
    if !paths.body_path.is_empty() {
        write!(
            svg,
            r#"<path d="{}" fill="{}"/>"#,
            paths.body_path, options.fg_color
        )
        .unwrap();
    }

    // Render finder pattern frames.
    // Frames include nested subpaths (outer ring + inner cutout) and require even-odd fill
    // for the cutout to work regardless of path winding direction.
    if !paths.finder_frame_path.is_empty() {
        write!(
            svg,
            r#"<path d="{}" fill="{}" fill-rule="evenodd"/>"#,
            paths.finder_frame_path, options.fg_color
        )
        .unwrap();
    }

    // Render finder pattern balls separately so ball shapes that rely on overlapping subpaths
    // (e.g. clover/flower) keep the default nonzero fill rule.
    if !paths.finder_ball_path.is_empty() {
        write!(
            svg,
            r#"<path d="{}" fill="{}"/>"#,
            paths.finder_ball_path, options.fg_color
        )
        .unwrap();
    }

    // Close SVG
    svg.push_str("</svg>");

    svg
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{generate_qr, ErrorCorrectionLevel};

    #[test]
    fn test_render_svg() {
        let qr = generate_qr("test", ErrorCorrectionLevel::Medium).unwrap();
        let svg = render_svg(&qr);

        assert!(svg.starts_with("<svg"));
        assert!(svg.contains("</svg>"));
    }

    #[test]
    fn test_render_with_options() {
        let qr = generate_qr("test", ErrorCorrectionLevel::Medium).unwrap();
        let options = RenderOptions {
            margin: 2,
            ..Default::default()
        };
        let svg = render_svg_with_options(&qr, &options);

        assert!(svg.starts_with("<svg"));
    }

    #[test]
    fn test_render_styled() {
        let qr = generate_qr("https://holi.tools", ErrorCorrectionLevel::Medium).unwrap();
        let options = StyledRenderOptions {
            body_shape: BodyShape::Dots,
            eye_frame_shape: EyeFrameShape::Rounded,
            eye_ball_shape: EyeBallShape::Circle,
            ..Default::default()
        };
        let svg = render_svg_styled(&qr, &options);

        assert!(svg.starts_with("<svg"));
        assert!(svg.contains("</svg>"));
        assert!(svg.contains("path")); // Should have paths for shapes
        assert!(svg.contains("fill-rule=\"evenodd\"")); // Finder frames must punch out inner cutout
    }

    #[test]
    fn test_all_body_shapes() {
        let qr = generate_qr("test", ErrorCorrectionLevel::Medium).unwrap();
        let shapes = [
            BodyShape::Square,
            BodyShape::Dots,
            BodyShape::Diamond,
            BodyShape::Star,
            BodyShape::Cross,
        ];

        for shape in shapes {
            let options = StyledRenderOptions {
                body_shape: shape,
                ..Default::default()
            };
            let svg = render_svg_styled(&qr, &options);
            assert!(svg.contains("<svg"), "Failed for shape {:?}", shape);
        }
    }
}
