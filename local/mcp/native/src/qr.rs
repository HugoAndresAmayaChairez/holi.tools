//! Native QR worker. Portable styles retain the browser's v1 defaults and limits.

use base64::{Engine, engine::general_purpose::STANDARD};
use serde_json::{Value, json};

const BODY_SHAPES: &[&str] = &[
    "square",
    "dots",
    "rounded",
    "diamond",
    "star",
    "clover",
    "tiny-dots",
    "capsule",
    "chain",
    "pixel",
    "water",
    "mini-square",
    "blob",
    "classy",
    "classy-rounded",
    "fluid",
    "mosaic",
    "vertical-lines",
    "horizontal-lines",
];
const EYE_FRAMES: &[&str] = &[
    "square",
    "rounded",
    "circle",
    "diamond",
    "cushion",
    "leaf",
    "clover-frame",
    "bevel",
    "orbit",
    "flux",
    "pointed",
    "dotted",
    "fancy",
    "dots-square",
    "shield",
    "double",
    "heavy-rounded",
];
const EYE_BALLS: &[&str] = &[
    "square",
    "rounded",
    "circle",
    "diamond",
    "star",
    "heart",
    "hexagon",
    "dots-grid",
    "bars-h",
    "bars-v",
    "clover",
    "cushion",
    "octagon",
    "leaf",
    "shield",
];

fn default_style() -> Value {
    json!({
        "v": 1, "app": "holi-qr",
        "config": {
            "bodyShape": "square", "eyeFrameShape": "square", "eyeBallShape": "square",
            "ecc": "M", "logoSize": 0.2, "logoBgEnabled": true, "logoBgColor": "#ffffff",
            "logoBgShape": "rounded", "logoPadding": 0, "logoCornerRadius": 10
        },
        "layers": {
            "version": 1,
            "bg": {"enabled": true, "color": "#ffffff", "opacity": 1, "boundsScale": 1.25,
                "blendMode": "normal", "fit": "cover", "rotation": 0, "scale": 1,
                "offsetX": 0, "offsetY": 0},
            "paper": {"enabled": true, "color": "#ffffff", "opacity": 1, "boundsScale": 1.1,
                "fit": "cover", "rotation": 0, "scale": 1, "offsetX": 0, "offsetY": 0},
            "ink": {"enabled": true, "color": "#000000", "opacity": 1,
                "fit": "cover", "rotation": 0, "scale": 1, "offsetX": 0, "offsetY": 0,
                "liquid": {"enabled": false, "blur": 0.35, "thresh": 6},
                "noise": {"enabled": false, "amount": 0.3, "scale": 100},
                "gradient": {"type": 0, "color2": "#000000", "angle": 0}},
            "logo": {"enabled": true, "opacity": 1, "fit": "contain"}
        },
        "frame": {"enabled": false, "text": "", "bg": "#24211d", "fg": "#ffffff"}
    })
}

fn safe_value(value: &Value, depth: usize) -> bool {
    if depth > 20 {
        return false;
    }
    match value {
        Value::Object(fields) => fields.iter().all(|(key, value)| {
            !["__proto__", "constructor", "prototype"].contains(&key.as_str())
                && safe_value(value, depth + 1)
        }),
        Value::Array(values) => values.iter().all(|value| safe_value(value, depth + 1)),
        Value::Number(number) => number.as_f64().is_some_and(f64::is_finite),
        _ => true,
    }
}

fn has_image(value: &Value) -> bool {
    match value {
        Value::Object(fields) => fields
            .iter()
            .any(|(key, value)| key == "image" || has_image(value)),
        Value::Array(values) => values.iter().any(has_image),
        _ => false,
    }
}

fn matches_known_fields(value: &Value, defaults: &Value) -> bool {
    match (value, defaults) {
        (Value::Object(fields), Value::Object(expected)) => fields.iter().all(|(key, value)| {
            expected
                .get(key)
                .is_none_or(|default| matches_known_fields(value, default))
        }),
        (Value::String(_), Value::String(_))
        | (Value::Bool(_), Value::Bool(_))
        | (Value::Number(_), Value::Number(_)) => true,
        _ => false,
    }
}

fn merge(target: &mut Value, patch: &Value) {
    if let (Some(target), Some(patch)) = (target.as_object_mut(), patch.as_object()) {
        for (key, value) in patch {
            if value.is_object() && target.get(key).is_some_and(Value::is_object) {
                merge(target.get_mut(key).expect("existing field"), value);
            } else {
                target.insert(key.clone(), value.clone());
            }
        }
    }
}

fn is_style(value: &Value, defaults: &Value) -> bool {
    if !safe_value(value, 0)
        || !value.is_object()
        || value["app"] != "holi-qr"
        || value["v"].as_f64() != Some(1.0)
        || !value["config"].is_object()
        || !value["layers"].is_object()
        || !matches_known_fields(value, defaults)
    {
        return false;
    }
    let config = &value["config"];
    if !["bodyShape", "eyeFrameShape", "eyeBallShape"]
        .iter()
        .all(|key| config[key].is_string())
        || !["L", "M", "Q", "H"].contains(&config["ecc"].as_str().unwrap_or(""))
        || config.get("mask").is_some_and(|mask| {
            !mask
                .as_f64()
                .is_some_and(|mask| mask.fract() == 0.0 && (-1.0..=7.0).contains(&mask))
        })
        || value.get("name").is_some_and(|name| !name.is_string())
        || !["bg", "paper", "ink", "logo"]
            .iter()
            .all(|key| value["layers"][key].is_object())
    {
        return false;
    }
    value.get("frame").is_none_or(|frame| {
        frame.is_object()
            && frame["enabled"].is_boolean()
            && ["text", "bg", "fg"]
                .iter()
                .all(|key| frame[key].is_string())
    })
}

fn color(value: &Value) -> Result<String, String> {
    let text = value
        .as_str()
        .ok_or("Unsupported QR color; use hex or transparent")?;
    if text.eq_ignore_ascii_case("transparent")
        || text.strip_prefix('#').is_some_and(|hex| {
            [3, 6, 8].contains(&hex.len()) && hex.bytes().all(|byte| byte.is_ascii_hexdigit())
        })
    {
        Ok(text.to_owned())
    } else {
        Err("Unsupported QR color; use hex or transparent".into())
    }
}

fn local_config(value: Option<&Value>) -> Result<Value, String> {
    let mut style = default_style();
    if let Some(value) = value {
        if !is_style(value, &style) {
            return Err("Invalid QR style v1".into());
        }
        if has_image(value) {
            return Err("Images are not supported in local QR styles".into());
        }
        merge(&mut style, value);
    }
    let config = &style["config"];
    let layers = &style["layers"];
    let ink = &layers["ink"];
    if style["frame"]["enabled"] == true
        || ink["noise"]["enabled"] == true
        || ![0.0, 1.0, 2.0].contains(&ink["gradient"]["type"].as_f64().unwrap_or(-1.0))
        || layers["bg"]["blendMode"] != "normal"
        || ["ink", "paper", "bg"]
            .iter()
            .any(|key| layers[key]["opacity"].as_f64() != Some(1.0))
    {
        return Err("Local QR v1 does not support text frames, noise, this gradient, blending or color opacity".into());
    }
    for (key, catalog) in [
        ("bodyShape", BODY_SHAPES),
        ("eyeFrameShape", EYE_FRAMES),
        ("eyeBallShape", EYE_BALLS),
    ] {
        if !catalog.contains(&config[key].as_str().unwrap_or("")) {
            return Err("Unsupported QR shape".into());
        }
    }
    if !["bg", "paper", "ink", "logo"]
        .iter()
        .all(|key| layers[key]["enabled"].is_boolean())
    {
        return Err("Invalid QR layer toggle".into());
    }
    if !ink["liquid"]["enabled"].is_boolean()
        || !ink["liquid"]["blur"]
            .as_f64()
            .is_some_and(|value| (0.0..=3.0).contains(&value))
        || !ink["liquid"]["thresh"]
            .as_f64()
            .is_some_and(|value| value.abs() <= 20.0)
        || !ink["gradient"]["angle"]
            .as_f64()
            .is_some_and(f64::is_finite)
        || ["bg", "paper"].iter().any(|key| {
            !layers[key]["boundsScale"]
                .as_f64()
                .is_some_and(|value| (1.0..=3.0).contains(&value))
        })
    {
        return Err("Invalid QR effect or layer bounds".into());
    }
    let gradient_type = ink["gradient"]["type"].as_f64().unwrap_or(0.0);
    let mut result = json!({
        "bodyShape": config["bodyShape"], "eyeFrameShape": config["eyeFrameShape"],
        "eyeBallShape": config["eyeBallShape"], "ecc": config["ecc"],
        "fgColor": color(&ink["color"])?,
        "bgColor": if layers["paper"]["enabled"] == true { color(&layers["paper"]["color"])? } else { "transparent".into() },
        "baseColor": if layers["bg"]["enabled"] == true { color(&layers["bg"]["color"])? } else { "transparent".into() },
        "inkEnabled": ink["enabled"], "paperBoundsScale": layers["paper"]["boundsScale"],
        "artBoundsScale": layers["bg"]["boundsScale"],
        "gradientEnabled": gradient_type != 0.0,
        "gradientType": if gradient_type == 2.0 { "radial" } else { "linear" },
        "gradientColors": [color(&ink["color"])?, color(&ink["gradient"]["color2"])?],
        "gradientAngle": ink["gradient"]["angle"], "effectLiquid": ink["liquid"]["enabled"],
        "effectBlur": ink["liquid"]["blur"], "effectCrystalize": ink["liquid"]["thresh"]
    });
    if let Some(mask) = config.get("mask") {
        // JSON numbers such as 3.0 are integers in the v1 JavaScript contract.
        result["mask"] = json!(mask.as_f64().expect("validated mask") as i32);
    }
    Ok(result)
}

pub fn validate_style(style: Option<&Value>) -> Result<(), String> {
    local_config(style).map(|_| ())
}

fn diagnostic(severity: &str, message: &str, hints: &[&str]) -> Value {
    json!({"severity": severity, "message": message, "hints": hints, "path": "", "package": ""})
}

fn render_inner(job: &Value) -> Result<Value, String> {
    let content = job["content"]
        .as_str()
        .ok_or("QR content must be a string")?;
    if content.is_empty() || content.len() > 2953 {
        return Err("QR content must contain 1–2953 UTF-8 bytes".into());
    }
    let config = local_config(job.get("style"))?;
    let format = job
        .get("format")
        .map_or(Some("png"), Value::as_str)
        .ok_or("Invalid QR format")?;
    if !["png", "svg"].contains(&format) {
        return Err("Invalid QR format".into());
    }
    let size = job
        .get("size")
        .map_or(Some(1024), Value::as_u64)
        .ok_or("Invalid QR size")?;
    if !(128..=4096).contains(&size) {
        return Err("QR size must be 128–4096 pixels".into());
    }
    let verify = job
        .get("verify")
        .map_or(Some(true), Value::as_bool)
        .ok_or("Invalid QR verification toggle")?;
    let svg = holi_qr::render_official_svg(content, &config.to_string())
        .map_err(|_| "QR generation failed; check content capacity and supported options")?;
    let data = if format == "png" {
        holi_qr::rasterize_svg_png(&svg, size as u32).map_err(|_| "QR rasterization failed")?
    } else {
        svg.as_bytes().to_vec()
    };
    let mut result = json!({"data": STANDARD.encode(&data), "diagnostics": []});
    if verify {
        // Decode rendered bytes in worker memory; the server writes them after this returns.
        let decoded = if format == "png" {
            holi_qr::decode_image(&data)
        } else {
            holi_qr::verify_svg(&svg)
        };
        let verified = decoded.is_ok_and(|decoded| decoded == content);
        result["verified"] = json!(verified);
        if !verified {
            result["diagnostics"] = json!([diagnostic(
                "warning",
                "The local decoder could not read this QR as rendered; the file was still written.",
                &[
                    "Use a simpler shape or effect, a plain ink color, a higher error correction level or a larger size, then scan the final export."
                ]
            )]);
        }
    }
    Ok(result)
}

pub fn render(job: &Value) -> Value {
    render_inner(job)
        .unwrap_or_else(|message| json!({"diagnostics": [diagnostic("error", &message, &[])]}))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn portable_defaults_and_rejections_match_shared_vectors() {
        let vectors: Value =
            serde_json::from_str(include_str!("../../../../spec/vectors/qr-style-v1.json"))
                .unwrap();
        assert_eq!(default_style(), vectors["default"]);
        assert!(validate_style(None).is_ok());
        assert!(validate_style(Some(&vectors["unicode"])).is_ok());
        for key in ["invalidPatches", "unsupportedPatches"] {
            for patch in vectors[key].as_array().unwrap() {
                let mut style = default_style();
                merge(&mut style, patch);
                assert!(validate_style(Some(&style)).is_err(), "accepted {patch}");
            }
        }
    }

    #[test]
    fn dangerous_keys_images_colors_and_limits_are_rejected() {
        for patch in [
            json!({"constructor": {}}),
            json!({"extra": {"image": null}}),
            json!({"layers": {"ink": {"color": "url(file:///private)"}}}),
            json!({"layers": {"ink": {"liquid": {"blur": 3.1}}}}),
            json!({"layers": {"paper": {"boundsScale": 0.9}}}),
            json!({"config": {"bodyShape": "unknown"}}),
            json!({"config": {"mask": 8}}),
            json!({"config": {"mask": 0.5}}),
            json!({"layers": {"ink": {"enabled": null}}}),
        ] {
            let mut style = default_style();
            merge(&mut style, &patch);
            assert!(validate_style(Some(&style)).is_err(), "accepted {patch}");
        }
        assert!(validate_style(Some(&Value::Null)).is_err());
        let mut style = default_style();
        style["config"]["mask"] = json!(3.0);
        assert!(validate_style(Some(&style)).is_ok());
        assert_eq!(local_config(Some(&style)).unwrap()["mask"], 3);
    }

    #[test]
    fn native_svg_and_png_decode_unicode_from_returned_bytes() {
        let content = "Holi Local: español, ñ y acentos";
        for format in ["svg", "png"] {
            let result =
                render(&json!({"kind": "qr", "content": content, "format": format, "size": 768}));
            assert_eq!(result["verified"], true, "{result}");
            assert_eq!(result["diagnostics"], json!([]));
            let bytes = STANDARD.decode(result["data"].as_str().unwrap()).unwrap();
            let decoded = if format == "svg" {
                holi_qr::verify_svg(std::str::from_utf8(&bytes).unwrap()).unwrap()
            } else {
                assert_eq!(&bytes[0..8], b"\x89PNG\r\n\x1a\n");
                assert_eq!(u32::from_be_bytes(bytes[16..20].try_into().unwrap()), 768);
                assert_eq!(u32::from_be_bytes(bytes[20..24].try_into().unwrap()), 768);
                holi_qr::decode_image(&bytes).unwrap()
            };
            assert_eq!(decoded, content);
        }
    }

    #[test]
    fn verification_can_be_skipped_or_warn_without_discarding_output() {
        let mut style = default_style();
        style["layers"]["ink"]["enabled"] = json!(false);
        let result = render(&json!({"content": "Holi", "format": "svg", "style": style}));
        assert!(result["data"].is_string());
        assert_eq!(result["verified"], false);
        assert_eq!(result["diagnostics"][0]["severity"], "warning");
        let result = render(&json!({"content": "Holi", "format": "svg", "verify": false}));
        assert!(result["data"].is_string());
        assert!(result.get("verified").is_none());
    }

    #[test]
    fn invalid_or_over_capacity_jobs_return_diagnostics_without_data() {
        for job in [
            json!({"content": ""}),
            json!({"content": "ñ".repeat(1477)}),
            json!({"content": "Holi", "size": 4097}),
            json!({"content": "Holi", "format": "jpeg"}),
            json!({"content": "Holi", "verify": "true"}),
        ] {
            let result = render(&job);
            assert!(result.get("data").is_none());
            assert_eq!(result["diagnostics"][0]["severity"], "error");
        }
    }
}
