//! The web engine and native runtime use the same bundled template manifest.
use serde_json::{Value, json};
use std::sync::LazyLock;

static TEMPLATES: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../packages/engines/typst/src/templates.v1.json"
    ))
    .expect("bundled template manifest must be valid JSON")
});

pub fn document_templates() -> Value {
    TEMPLATES.clone()
}

pub fn prepare_template(id: &str, data: &Value) -> Result<Value, String> {
    let template = TEMPLATES
        .as_array()
        .and_then(|items| items.iter().find(|item| item["id"] == id))
        .ok_or_else(|| "Unknown document template".to_owned())?;
    validate(data, &template["dataSchema"])?;
    Ok(json!({
        "source": template["source"],
        "mainPath": template["entrypoint"],
        "files": [{"path": "data.json", "kind": "data", "encoding": "utf8",
                   "content": serde_json::to_string(data).map_err(|_| "Invalid template data")?}]
    }))
}

fn validate(value: &Value, rule: &Value) -> Result<(), String> {
    let fail = || "Invalid template data; inspect document_templates for the schema".to_owned();
    match rule["type"].as_str() {
        Some("string") => {
            let text = value.as_str().ok_or_else(fail)?;
            // Keep the v1 JavaScript limit in UTF-16 code units, including emoji.
            if text.encode_utf16().count() > rule["maxLength"].as_u64().unwrap_or(0) as usize {
                return Err(fail());
            }
        }
        Some("array") => {
            let items = value.as_array().ok_or_else(fail)?;
            let min = rule["minItems"].as_u64().unwrap_or(0) as usize;
            let max = rule["maxItems"].as_u64().unwrap_or(0) as usize;
            if items.len() < min || items.len() > max {
                return Err(fail());
            }
            for item in items {
                validate(item, &rule["items"])?;
            }
        }
        Some("object") => {
            let object = value.as_object().ok_or_else(fail)?;
            let properties = rule["properties"].as_object().ok_or_else(fail)?;
            for key in rule["required"].as_array().ok_or_else(fail)? {
                if !object.contains_key(key.as_str().ok_or_else(fail)?) {
                    return Err(fail());
                }
            }
            for (key, item) in object {
                validate(item, properties.get(key).ok_or_else(fail)?)?;
            }
        }
        _ => return Err(fail()),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn templates_follow_shared_literal_and_invalid_vectors() {
        let vectors: Value = serde_json::from_str(include_str!(
            "../../../../spec/vectors/document-template-v1.json"
        ))
        .unwrap();
        let prepared = prepare_template("report", &vectors["literal"]).unwrap();
        let mounted: Value =
            serde_json::from_str(prepared["files"][0]["content"].as_str().unwrap()).unwrap();
        assert_eq!(mounted, vectors["literal"]);
        assert!(!prepared["source"].as_str().unwrap().contains("secret"));
        for invalid in vectors["invalidData"].as_array().unwrap() {
            assert!(prepare_template("report", invalid).is_err());
        }
    }

    #[test]
    fn validates_examples_and_rejects_unknown_templates_and_fields() {
        for template in document_templates().as_array().unwrap() {
            let id = template["id"].as_str().unwrap();
            assert!(prepare_template(id, &template["example"]).is_ok());
            let mut unknown = template["example"].clone();
            unknown["unexpected"] = json!(true);
            assert!(prepare_template(id, &unknown).is_err());
        }
        assert!(prepare_template("unknown", &json!({})).is_err());
    }

    #[test]
    fn bounds_nested_items_and_utf16_text_without_exposing_values() {
        let data = json!({"title": "🦀".repeat(50_001), "sections": [{"heading":"Heading", "body":"Body"}]});
        let error = prepare_template("report", &data).unwrap_err();
        assert!(!error.contains('🦀'));
        let data =
            json!({"title":"Report", "sections": vec![json!({"heading":"H", "body":"B"}); 101]});
        assert!(prepare_template("report", &data).is_err());
        assert!(
            prepare_template(
                "report",
                &json!({"title":"Report", "sections":[{"heading":"H", "body":"B", "extra":1}]})
            )
            .is_err()
        );
    }
}
