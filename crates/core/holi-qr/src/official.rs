//! Official SVG composition shared by the browser WASM adapter and native Holi Local.
//! Host adapters validate untrusted colors and image inputs before calling this renderer.

use crate::{
    build_styled_svg_paths, eye_frame_outer_path, generate_qr, BodyShape, ErrorCorrectionLevel,
    EyeBallShape, EyeFrameShape, QrError, StyledRenderOptions, StyledSvgPaths,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SvgOfficialConfig {
    // Colors
    #[serde(default)]
    pub fg_color: Option<String>,
    #[serde(default)]
    pub bg_color: Option<String>,
    #[serde(default)]
    pub base_color: Option<String>,

    // Background image (under paper/complement)
    #[serde(default)]
    pub art_image: Option<String>,
    #[serde(default)]
    pub art_bounds_scale: Option<f64>,
    #[serde(default)]
    pub art_opacity: Option<f64>,
    #[serde(default)]
    pub art_fit: Option<String>, // "cover" | "contain" | "fill"
    #[serde(default)]
    pub art_rotation: Option<f64>, // degrees
    #[serde(default)]
    pub art_scale: Option<f64>, // 1.0 = 100%
    #[serde(default)]
    pub art_offset_x: Option<f64>, // -1..1
    #[serde(default)]
    pub art_offset_y: Option<f64>, // -1..1
    #[serde(default)]
    pub art_blend_mode: Option<String>, // Used to blend ink against the underlay (matches WebGL)

    // Paper / ink texture fills (masked per layer)
    #[serde(default)]
    pub paper_image: Option<String>,
    #[serde(default)]
    pub paper_bounds_scale: Option<f64>,
    #[serde(default)]
    pub paper_opacity: Option<f64>,
    #[serde(default)]
    pub paper_fit: Option<String>,
    #[serde(default)]
    pub paper_rotation: Option<f64>,
    #[serde(default)]
    pub paper_scale: Option<f64>,
    #[serde(default)]
    pub paper_offset_x: Option<f64>,
    #[serde(default)]
    pub paper_offset_y: Option<f64>,
    #[serde(default)]
    pub ink_image: Option<String>,
    #[serde(default)]
    pub ink_opacity: Option<f64>,
    #[serde(default)]
    pub ink_fit: Option<String>,
    #[serde(default)]
    pub ink_rotation: Option<f64>,
    #[serde(default)]
    pub ink_scale: Option<f64>,
    #[serde(default)]
    pub ink_offset_x: Option<f64>,
    #[serde(default)]
    pub ink_offset_y: Option<f64>,

    // Gradient (SVG only supports linear/radial in current pipeline)
    #[serde(default)]
    pub gradient_enabled: Option<bool>,
    #[serde(default)]
    pub gradient_type: Option<String>, // "linear" | "radial"
    #[serde(default)]
    pub gradient_colors: Option<Vec<String>>, // [start, end]
    #[serde(default)]
    pub gradient_angle: Option<f64>, // radians

    // Shapes
    #[serde(default)]
    pub body_shape: Option<String>,
    #[serde(default)]
    pub eye_frame_shape: Option<String>,
    #[serde(default)]
    pub eye_ball_shape: Option<String>,

    // Logo
    #[serde(default)]
    pub logo: Option<String>,
    #[serde(default)]
    pub logo_size: Option<f64>,
    #[serde(default)]
    pub logo_opacity: Option<f64>,
    #[serde(default)]
    pub logo_fit: Option<String>,

    // Effects
    #[serde(default)]
    pub effect_liquid: Option<bool>,
    #[serde(default)]
    pub effect_blur: Option<f64>,
    #[serde(default)]
    pub effect_crystalize: Option<f64>,
    #[serde(default)]
    pub ink_enabled: Option<bool>,

    // Data config
    #[serde(default)]
    pub ecc: Option<String>,
    #[serde(default)]
    pub mask: Option<i32>,
}

fn to_svg_color(c: &str) -> String {
    // Normalize #RRGGBBAA to rgba(r,g,b,a) (some SVG/CSS pipelines are picky).
    let hex = c.trim();
    if let Some(rest) = hex.strip_prefix('#') {
        if rest.len() == 8 {
            let r = u8::from_str_radix(&rest[0..2], 16);
            let g = u8::from_str_radix(&rest[2..4], 16);
            let b = u8::from_str_radix(&rest[4..6], 16);
            let a = u8::from_str_radix(&rest[6..8], 16);
            if let (Ok(r), Ok(g), Ok(b), Ok(a)) = (r, g, b, a) {
                let af = (a as f64) / 255.0;
                return format!("rgba({}, {}, {}, {:.3})", r, g, b, af);
            }
        }
    }
    hex.to_string()
}

fn clamp01(x: f64) -> f64 {
    if x < 0.0 {
        0.0
    } else if x > 1.0 {
        1.0
    } else {
        x
    }
}

fn preserve_aspect_ratio_for_fit(fit: Option<&str>) -> &'static str {
    match fit.unwrap_or("cover") {
        "contain" => "xMidYMid meet",
        "fill" => "none",
        _ => "xMidYMid slice", // cover (default)
    }
}

fn safe_mix_blend_mode(mode: Option<&str>) -> Option<&'static str> {
    match mode.unwrap_or("normal") {
        "multiply" => Some("multiply"),
        "overlay" => Some("overlay"),
        "screen" => Some("screen"),
        "darken" => Some("darken"),
        _ => None,
    }
}

fn build_image_transform(
    view_box_size: usize,
    rotation_deg: f64,
    scale: f64,
    offset_x: f64,
    offset_y: f64,
) -> String {
    let size = view_box_size as f64;
    let cx = size / 2.0;
    let cy = size / 2.0;

    let rot = if rotation_deg.is_finite() {
        rotation_deg
    } else {
        0.0
    };
    let sc = if scale.is_finite() && scale > 0.01 {
        scale
    } else {
        1.0
    };
    let ox = if offset_x.is_finite() { offset_x } else { 0.0 };
    let oy = if offset_y.is_finite() { offset_y } else { 0.0 };

    // No-op fast path to keep output stable (and smaller).
    if rot.abs() < 1e-6 && (sc - 1.0).abs() < 1e-6 && ox.abs() < 1e-6 && oy.abs() < 1e-6 {
        return String::new();
    }

    // NOTE: This mirrors the WebGL composite shader's UV transform semantics:
    // translate(center) * rotate(-deg) * scale(scale) * translate(offset*size) * translate(-center)
    let dx = ox * size;
    let dy = oy * size;
    format!(
        " transform=\"translate({:.3} {:.3}) rotate({:.3}) scale({:.6}) translate({:.3} {:.3}) translate({:.3} {:.3})\"",
        cx,
        cy,
        -rot,
        sc,
        dx,
        dy,
        -cx,
        -cy,
    )
}

fn layer_bounds(view_box_size: usize, bounds_scale: f64) -> (f64, f64, f64) {
    let total = view_box_size as f64;
    let ink_size = (total - 8.0).max(1.0);
    let scale = if bounds_scale.is_finite() {
        bounds_scale.max(1.0)
    } else {
        1.0
    };
    let size = ink_size * scale;
    let xy = (total - size) / 2.0;
    (xy, xy, size)
}

fn build_finder_corner_cutout_paths(shape: EyeFrameShape, size: usize, margin: usize) -> String {
    let finder_positions = [(0, 0), (size - 7, 0), (0, size - 7)];
    let mut paths = String::new();
    for (ox, oy) in finder_positions {
        let fx = (ox + margin) as f64;
        let fy = (oy + margin) as f64;
        let outer = eye_frame_outer_path(shape, fx, fy);
        paths.push_str(&format!(
            "<path d=\"M{fx},{fy} h7 v7 h-7 z {outer}\" fill-rule=\"evenodd\"/>"
        ));
    }
    paths
}

/// Generate the shared official SVG (vector, layers and filters).
///
/// The web UI passes a JSON `SvgOfficialConfig`. This function returns a fully composed SVG string
/// (no TS-side post-processing required).
pub fn render_official_svg(text: &str, config_json: &str) -> Result<String, QrError> {
    let cfg: SvgOfficialConfig = serde_json::from_str(config_json)
        .map_err(|e| QrError::GenerationFailed(format!("Invalid config JSON: {}", e)))?;

    // Data config
    let ecl = match cfg.ecc.as_deref().unwrap_or("M").to_uppercase().as_str() {
        "L" => ErrorCorrectionLevel::Low,
        "M" => ErrorCorrectionLevel::Medium,
        "Q" => ErrorCorrectionLevel::Quartile,
        "H" => ErrorCorrectionLevel::High,
        _ => ErrorCorrectionLevel::Medium,
    };

    // Generate QR
    let qr = generate_qr(text, ecl)
        .map_err(|e| QrError::GenerationFailed(format!("QR generation failed: {:?}", e)))?;

    // Shapes & base colors (ink/paper are handled as layers below)
    let styled_opts = StyledRenderOptions {
        // Match the WebGL preview padding (quiet zone) = 4 modules.
        margin: 4,
        fg_color: cfg
            .fg_color
            .clone()
            .unwrap_or_else(|| "#000000".to_string()),
        bg_color: "transparent".to_string(),
        body_shape: BodyShape::from_str(cfg.body_shape.as_deref().unwrap_or("square")),
        eye_frame_shape: EyeFrameShape::from_str(
            cfg.eye_frame_shape.as_deref().unwrap_or("square"),
        ),
        eye_ball_shape: EyeBallShape::from_str(cfg.eye_ball_shape.as_deref().unwrap_or("square")),
    };

    let paths: StyledSvgPaths = build_styled_svg_paths(&qr, &styled_opts);
    let view_box_size = paths.total;
    // Build defs (filters + gradient + masks)
    let mut defs = String::new();
    let use_liquid = cfg.effect_liquid.unwrap_or(false);
    let filter_id = "qr-goo-filter";

    if use_liquid {
        // Math mirrors TS: (10 / 512) * viewBoxSize, then * 1.5 boost.
        let calibration_factor = (10.0 / 512.0) * (view_box_size as f64);
        let raw_blur = cfg.effect_blur.unwrap_or(0.35);
        let calibrated_blur = raw_blur * calibration_factor * 1.5;
        let thresh = cfg.effect_crystalize.unwrap_or(6.0);
        defs.push_str(&format!(
            "<filter id=\"{filter_id}\">\
              <feGaussianBlur id=\"qr-blur-el\" in=\"SourceGraphic\" stdDeviation=\"{blur}\" result=\"blur\" />\
              <feColorMatrix id=\"qr-matrix-el\" in=\"blur\" mode=\"matrix\" values=\"1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -{thresh}\" result=\"goo\" />\
              <feComposite in=\"SourceGraphic\" in2=\"goo\" operator=\"atop\"/>\
            </filter>",
            blur = format!("{:.3}", calibrated_blur),
            thresh = format!("{:.3}", thresh),
        ));
    }

    // Fill (ink): color or gradient
    let mut fill_attr = "fill=\"currentColor\"".to_string();
    if cfg.gradient_enabled.unwrap_or(false) {
        if let (Some(ty), Some(colors)) =
            (cfg.gradient_type.as_deref(), cfg.gradient_colors.as_ref())
        {
            if colors.len() == 2 && (ty == "linear" || ty == "radial") {
                // Stable ID keeps DOM updates predictable and avoids reflow churn.
                let gid = "qr-grad".to_string();
                let c1 = to_svg_color(&colors[0]);
                let c2 = to_svg_color(&colors[1]);
                let size = view_box_size as f64;
                let cx = size / 2.0;
                let cy = size / 2.0;
                let ang = cfg.gradient_angle.unwrap_or(0.0);
                // WebGL gradients use vUv where Y grows upward; SVG Y grows downward → negate.
                let rot_deg = if ang.is_finite() {
                    -(ang * 180.0 / std::f64::consts::PI)
                } else {
                    0.0
                };
                if ty == "linear" {
                    defs.push_str(&format!(
                        "<linearGradient id=\"{gid}\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"{cy:.3}\" x2=\"{size:.3}\" y2=\"{cy:.3}\" gradientTransform=\"rotate({rot_deg:.3} {cx:.3} {cy:.3})\">\
                          <stop offset=\"0%\" stop-color=\"{c1}\"/>\
                          <stop offset=\"100%\" stop-color=\"{c2}\"/>\
                        </linearGradient>",
                    ));
                } else {
                    defs.push_str(&format!(
                        "<radialGradient id=\"{gid}\" gradientUnits=\"userSpaceOnUse\" cx=\"{cx:.3}\" cy=\"{cy:.3}\" r=\"{r:.3}\">\
                          <stop offset=\"0%\" stop-color=\"{c1}\"/>\
                          <stop offset=\"100%\" stop-color=\"{c2}\"/>\
                        </radialGradient>",
                        r = size * 0.70,
                    ));
                }
                fill_attr = format!("fill=\"url(#{})\"", gid);
            }
        }
    }
    if !cfg.gradient_enabled.unwrap_or(false) {
        if let Some(fg) = cfg.fg_color.as_deref() {
            fill_attr = format!("fill=\"{}\"", to_svg_color(fg));
        }
    }

    // Ink elements (vector paths). Keep eye frame even-odd.
    let filter_attr = if use_liquid {
        format!(" filter=\"url(#{})\"", filter_id)
    } else {
        String::new()
    };
    let body_el = if paths.body_path.is_empty() {
        String::new()
    } else {
        format!(
            "<path id=\"qr-body\" d=\"{}\" {}{}/>",
            paths.body_path, fill_attr, filter_attr
        )
    };
    let eye_frame_el = if paths.finder_frame_path.is_empty() {
        String::new()
    } else {
        format!(
            "<path id=\"qr-eye-frame\" d=\"{}\" {} fill-rule=\"evenodd\"{}/>",
            paths.finder_frame_path, fill_attr, filter_attr
        )
    };
    let eye_ball_el = if paths.finder_ball_path.is_empty() {
        String::new()
    } else {
        format!(
            "<path id=\"qr-eye-ball\" d=\"{}\" {}{}/>",
            paths.finder_ball_path, fill_attr, filter_attr
        )
    };
    let ink_enabled = cfg.ink_enabled.unwrap_or(true);
    let ink_content = format!("{}{}{}", body_el, eye_frame_el, eye_ball_el);

    // Masks (module cutout + ink mask)
    let vb = view_box_size;
    let has_paper_color = cfg
        .bg_color
        .as_deref()
        .map(|c| c != "transparent")
        .unwrap_or(false);
    let has_paper_image = cfg.paper_image.is_some();
    let has_ink_image = cfg.ink_image.is_some();
    let needs_paper = has_paper_color || has_paper_image;
    let has_distinct_base = match (cfg.base_color.as_deref(), cfg.bg_color.as_deref()) {
        (Some(base), Some(bg)) => base != "transparent" && base != bg,
        (Some(base), None) => base != "transparent",
        _ => false,
    };

    let finder_corner_cutouts = if cfg.art_image.is_some() || has_distinct_base {
        build_finder_corner_cutout_paths(
            styled_opts.eye_frame_shape,
            paths.size,
            styled_opts.margin,
        )
    } else {
        String::new()
    };
    let ink_mask_paths = format!(
        "<path d=\"{}\"/>\
         <path d=\"{}\" fill-rule=\"evenodd\"/>\
         <path d=\"{}\"/>\
         {}",
        paths.body_path, paths.finder_frame_path, paths.finder_ball_path, finder_corner_cutouts
    );

    // Paper/complement is cut out by the styled ink plus finder corners outside the eye silhouette.
    // This keeps round/leaf/orbit finder eyes from leaving square paper boxes.
    if needs_paper && !ink_mask_paths.is_empty() {
        let cutout_id = "qr-module-cutout";
        let mask_filter_attr = if use_liquid {
            format!(" filter=\"url(#{})\"", filter_id)
        } else {
            String::new()
        };
        defs.push_str(&format!(
            "<mask id=\"{cutout_id}\" maskUnits=\"userSpaceOnUse\" maskContentUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"{vb}\" height=\"{vb}\">\
               <rect x=\"0\" y=\"0\" width=\"{vb}\" height=\"{vb}\" fill=\"white\"/>\
               <g{mask_filter_attr} fill=\"black\">{ink_mask_paths}</g>\
             </mask>"
        ));
    }

    // Ink texture uses the *ink* alpha mask (optionally gooey-filtered) so it matches the preview.
    if has_ink_image {
        let ink_mask_id = "qr-ink-mask";
        let mask_filter_attr = if use_liquid {
            format!(" filter=\"url(#{})\"", filter_id)
        } else {
            String::new()
        };
        let mut mask_paths = String::new();
        if !paths.body_path.is_empty() {
            mask_paths.push_str(&format!(
                "<path d=\"{}\" fill=\"white\"{}/>",
                paths.body_path, mask_filter_attr
            ));
        }
        if !paths.finder_frame_path.is_empty() {
            mask_paths.push_str(&format!(
                "<path d=\"{}\" fill=\"white\" fill-rule=\"evenodd\"{}/>",
                paths.finder_frame_path, mask_filter_attr
            ));
        }
        if !paths.finder_ball_path.is_empty() {
            mask_paths.push_str(&format!(
                "<path d=\"{}\" fill=\"white\"{}/>",
                paths.finder_ball_path, mask_filter_attr
            ));
        }

        defs.push_str(&format!(
            "<mask id=\"{ink_mask_id}\" maskUnits=\"userSpaceOnUse\" maskContentUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"{vb}\" height=\"{vb}\">\
               <rect x=\"0\" y=\"0\" width=\"{vb}\" height=\"{vb}\" fill=\"black\"/>\
               {mask_paths}\
             </mask>"
        ));
    }

    // Compose final SVG
    let mut svg = String::new();
    svg.push_str(&format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {s} {s}\" width=\"100%\" height=\"100%\" overflow=\"hidden\">",
        s = view_box_size
    ));

    if !defs.is_empty() {
        svg.push_str("<defs>");
        svg.push_str(&defs);
        svg.push_str("</defs>");
    }

    // Bottom-most: base color
    let (art_x, art_y, art_size) =
        layer_bounds(view_box_size, cfg.art_bounds_scale.unwrap_or(1.25));
    let (paper_x, paper_y, paper_size) =
        layer_bounds(view_box_size, cfg.paper_bounds_scale.unwrap_or(1.10));

    if let Some(base) = cfg.base_color.as_deref() {
        if base != "transparent" {
            svg.push_str(&format!(
                "<rect x=\"{x:.3}\" y=\"{y:.3}\" width=\"{s:.3}\" height=\"{s:.3}\" fill=\"{c}\"/>",
                x = art_x,
                y = art_y,
                s = art_size,
                c = to_svg_color(base),
            ));
        }
    }

    // Background image above base
    if let Some(img) = cfg.art_image.as_deref() {
        let op = clamp01(cfg.art_opacity.unwrap_or(1.0));
        let par = preserve_aspect_ratio_for_fit(cfg.art_fit.as_deref());
        let transform = build_image_transform(
            view_box_size,
            cfg.art_rotation.unwrap_or(0.0),
            cfg.art_scale.unwrap_or(1.0),
            cfg.art_offset_x.unwrap_or(0.0),
            cfg.art_offset_y.unwrap_or(0.0),
        );
        let op_attr = if op < 0.999 {
            format!(" opacity=\"{:.3}\"", op)
        } else {
            String::new()
        };
        svg.push_str(&format!(
            "<image href=\"{img}\" x=\"{x:.3}\" y=\"{y:.3}\" width=\"{s:.3}\" height=\"{s:.3}\" preserveAspectRatio=\"{par}\"{op_attr}{transform}/>",
            img = img,
            x = art_x,
            y = art_y,
            s = art_size,
            par = par,
            op_attr = op_attr,
            transform = transform,
        ));
    }

    // Paper/complement above BG, cut out by module mask
    if needs_paper {
        let cutout_ref = "url(#qr-module-cutout)";
        if has_paper_image {
            // If we have both a paper color and a paper texture, tint the texture by drawing
            // the color under it and multiplying the texture on top (matches WebGL's paper.rgb *= tex.rgb).
            svg.push_str(&format!("<g mask=\"{cutout_ref}\">"));

            if let Some(bg) = cfg.bg_color.as_deref() {
                if bg != "transparent" {
                    svg.push_str(&format!(
                        "<rect x=\"{x:.3}\" y=\"{y:.3}\" width=\"{s:.3}\" height=\"{s:.3}\" fill=\"{c}\"/>",
                        x = paper_x,
                        y = paper_y,
                        s = paper_size,
                        c = to_svg_color(bg),
                    ));
                }
            }

            if let Some(img) = cfg.paper_image.as_deref() {
                let par = preserve_aspect_ratio_for_fit(cfg.paper_fit.as_deref());
                let transform = build_image_transform(
                    view_box_size,
                    cfg.paper_rotation.unwrap_or(0.0),
                    cfg.paper_scale.unwrap_or(1.0),
                    cfg.paper_offset_x.unwrap_or(0.0),
                    cfg.paper_offset_y.unwrap_or(0.0),
                );

                // Avoid double-applying opacity: the paper alpha usually already lives in `bg_color`.
                let op = clamp01(cfg.paper_opacity.unwrap_or(1.0));
                let op_attr = if !has_paper_color && op < 0.999 {
                    format!(" opacity=\"{:.3}\"", op)
                } else {
                    String::new()
                };

                let blend_attr = if has_paper_color {
                    " style=\"mix-blend-mode:multiply\""
                } else {
                    ""
                };

                svg.push_str(&format!(
                    "<image href=\"{img}\" x=\"{x:.3}\" y=\"{y:.3}\" width=\"{s:.3}\" height=\"{s:.3}\" preserveAspectRatio=\"{par}\"{op_attr}{transform}{blend_attr}/>",
                    img = img,
                    x = paper_x,
                    y = paper_y,
                    s = paper_size,
                    par = par,
                    op_attr = op_attr,
                    transform = transform,
                    blend_attr = blend_attr,
                ));
            }

            svg.push_str("</g>");
        } else if let Some(bg) = cfg.bg_color.as_deref() {
            if bg != "transparent" {
                svg.push_str(&format!(
                    "<rect x=\"{x:.3}\" y=\"{y:.3}\" width=\"{s:.3}\" height=\"{s:.3}\" fill=\"{c}\" mask=\"url(#qr-module-cutout)\"/>",
                    x = paper_x,
                    y = paper_y,
                    s = paper_size,
                    c = to_svg_color(bg),
                ));
            }
        }
    }

    // Ink on top (optional)
    if ink_enabled {
        let blend_attr = safe_mix_blend_mode(cfg.art_blend_mode.as_deref())
            .map(|m| format!(" style=\"mix-blend-mode:{}\"", m))
            .unwrap_or_default();
        if let Some(img) = cfg.ink_image.as_deref() {
            let op = clamp01(cfg.ink_opacity.unwrap_or(1.0));
            let op_attr = if op < 0.999 {
                format!(" opacity=\"{:.3}\"", op)
            } else {
                String::new()
            };
            let par = preserve_aspect_ratio_for_fit(cfg.ink_fit.as_deref());
            let transform = build_image_transform(
                view_box_size,
                cfg.ink_rotation.unwrap_or(0.0),
                cfg.ink_scale.unwrap_or(1.0),
                cfg.ink_offset_x.unwrap_or(0.0),
                cfg.ink_offset_y.unwrap_or(0.0),
            );
            svg.push_str(&format!(
                "<image href=\"{img}\" x=\"0\" y=\"0\" width=\"{s}\" height=\"{s}\" preserveAspectRatio=\"{par}\" mask=\"url(#qr-ink-mask)\"{op_attr}{transform}{blend_attr}/>",
                img = img,
                s = view_box_size,
                par = par,
                op_attr = op_attr,
                transform = transform,
                blend_attr = blend_attr,
            ));
        } else {
            svg.push_str(&format!("<g id=\"qr-ink\"{blend_attr}>{}</g>", ink_content));
        }
    }

    // Logo injection (top)
    if let Some(logo) = cfg.logo.as_deref() {
        let size = view_box_size as f64;
        let logo_size = cfg.logo_size.unwrap_or(0.2).clamp(0.0, 1.0) * size;
        let xy = (size - logo_size) / 2.0;
        let op = clamp01(cfg.logo_opacity.unwrap_or(1.0));
        let op_attr = if op < 0.999 {
            format!(" opacity=\"{:.3}\"", op)
        } else {
            String::new()
        };
        svg.push_str(&format!(
            "<image href=\"{}\" x=\"{:.3}\" y=\"{:.3}\" width=\"{:.3}\" height=\"{:.3}\" preserveAspectRatio=\"{}\"{}/>",
            logo,
            xy,
            xy,
            logo_size,
            logo_size,
            preserve_aspect_ratio_for_fit(cfg.logo_fit.as_deref().or(Some("contain"))),
            op_attr
        ));
    }

    svg.push_str("</svg>");
    Ok(svg)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_svg_matches_pre_migration_wasm_bytes() {
        // Fingerprints were captured from the existing pkg-node WASM before extraction.
        // FNV is a deterministic fixture checksum, not a security boundary.
        let fixtures: serde_json::Value =
            serde_json::from_str(include_str!("../test-data/official-parity.json")).unwrap();
        for fixture in fixtures.as_array().unwrap() {
            let svg = render_official_svg(
                fixture["content"].as_str().unwrap(),
                &fixture["config"].to_string(),
            )
            .unwrap();
            let hash = svg.bytes().fold(0xcbf29ce484222325_u64, |hash, byte| {
                (hash ^ u64::from(byte)).wrapping_mul(0x100000001b3)
            });
            assert_eq!(
                svg.len() as u64,
                fixture["svgBytes"].as_u64().unwrap(),
                "{}",
                fixture["name"]
            );
            assert_eq!(
                format!("{hash:016x}"),
                fixture["svgFnv64"].as_str().unwrap(),
                "{}",
                fixture["name"]
            );
        }
    }

    #[test]
    fn finder_corner_cutout_path_uses_outer_eye_silhouette() {
        let cutout = build_finder_corner_cutout_paths(EyeFrameShape::Circle, 25, 4);

        assert!(cutout.contains("M4,4 h7 v7 h-7 z M7.5,4 A3.5,3.5"));
        assert!(cutout.contains("M22,4 h7 v7 h-7 z M25.5,4 A3.5,3.5"));
        assert!(cutout.contains("fill-rule=\"evenodd\""));
    }

    #[test]
    fn official_svg_adds_finder_corner_cutout_only_when_underlay_can_show_through() {
        let cfg_with_art = r##"{
            "fgColor":"#000000",
            "bgColor":"#ffffff",
            "baseColor":"#1d4ed8",
            "artImage":"data:image/svg+xml;base64,PHN2Zy8+",
            "bodyShape":"rounded",
            "eyeFrameShape":"circle",
            "eyeBallShape":"circle"
        }"##;
        let svg_with_art = render_official_svg("https://holi.tools/qr-test", cfg_with_art)
            .expect("official SVG should render with art layer");

        assert!(svg_with_art.contains("qr-module-cutout"));
        assert!(svg_with_art.contains("M4,4 h7 v7 h-7 z M7.5,4 A3.5,3.5"));

        let plain_cfg = r##"{
            "fgColor":"#000000",
            "bgColor":"#ffffff",
            "baseColor":"#ffffff",
            "bodyShape":"rounded",
            "eyeFrameShape":"circle",
            "eyeBallShape":"circle"
        }"##;
        let plain_svg = render_official_svg("https://holi.tools/qr-test", plain_cfg)
            .expect("official SVG should render without art layer");

        assert!(plain_svg.contains("qr-module-cutout"));
        assert!(!plain_svg.contains("M4,4 h7 v7 h-7 z M7.5,4 A3.5,3.5"));
    }

    #[test]
    fn official_svg_uses_layer_bounds_and_logo_fit() {
        let cfg = r##"{
            "fgColor":"#000000",
            "bgColor":"#ffffff",
            "baseColor":"#f8fafc",
            "artImage":"data:image/svg+xml;base64,PHN2Zy8+",
            "artBoundsScale":1.25,
            "paperImage":"data:image/svg+xml;base64,PHN2Zy8+",
            "paperBoundsScale":1.1,
            "logo":"data:image/svg+xml;base64,PHN2Zy8+",
            "logoFit":"contain"
        }"##;
        let svg = render_official_svg("https://holi.tools/qr-test", cfg)
            .expect("official SVG should render bounded layers");

        assert!(svg.contains("preserveAspectRatio=\"xMidYMid meet\""));

        let (_, _, art_size) = layer_bounds(29, 1.25);
        let (_, _, paper_size) = layer_bounds(29, 1.10);
        assert!((art_size - 26.25).abs() < 1e-6);
        assert!((paper_size - 23.1).abs() < 1e-6);
    }
}
