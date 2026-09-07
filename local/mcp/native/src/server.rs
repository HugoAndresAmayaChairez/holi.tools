use crate::{
    jobs,
    output::{LocalError, OutputFolder, Result, validate_filename},
    qr, templates,
};
use base64::{Engine, engine::general_purpose::STANDARD};
use rmcp::{RoleServer, ServerHandler, model::*, service::RequestContext};
use serde_json::{Value, json};
use std::{
    collections::HashSet,
    sync::{Arc, OnceLock},
};
use tokio::sync::{Mutex, Semaphore};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
const PRIVACY: &str = "Holi Local renders natively on this device and writes only new files inside the operator's explicit output folder. No document uploads, account, telemetry or content logs. Output persists until you delete it; OS backup or sync software may copy files independently. Input -> disposable worker process memory -> explicit output folder -> optional Typst package requests -> packages.typst.org sees IP, timing, package identifiers and request metadata -> local MCP client receives diagnostics and artifact paths. Package downloads are disabled unless the operator starts with --allow-packages. Downloads stay in worker memory. Fonts and templates are bundled for offline use. Downloading a release contacts its hosting provider. Your AI client's provider may receive prompts, tool inputs and results; a local MCP server does not make a cloud assistant private.";
const LOG: &str = include_str!("../../CHANGELOG.md");
const DOCUMENT_SKILL: &str = include_str!("../../skills/holi-documents/SKILL.md");
const QR_SKILL: &str = include_str!("../../skills/holi-qr-batch/SKILL.md");

fn definitions() -> &'static Vec<Value> {
    static DEFS: OnceLock<Vec<Value>> = OnceLock::new();
    DEFS.get_or_init(|| {
        serde_json::from_str(include_str!("../../../../spec/mcp-tools-v1.schema.json"))
            .expect("bundled tool schemas")
    })
}

#[derive(Clone)]
pub struct Holi {
    pub output: Arc<OutputFolder>,
    pub allow_packages: bool,
    queue: Arc<Semaphore>,
    serial: Arc<Mutex<()>>,
}

impl Holi {
    pub fn new(output: OutputFolder, allow_packages: bool) -> Self {
        Self {
            output: Arc::new(output),
            allow_packages,
            queue: Arc::new(Semaphore::new(8)),
            serial: Arc::new(Mutex::new(())),
        }
    }
    fn info(&self) -> Value {
        json!({"v":1,"ok":true,"diagnostics":[],"name":"Holi Local","version":VERSION,"runtime":"rust-native",
            "privacy":PRIVACY,"shadowLog":LOG,"packageDownloads":self.allow_packages,"outputFolder":self.output.display_root(),
            "support":"https://github.com/HugoAndresAmayaChairez/holi.tools/issues","donate":"https://ko-fi.com/holitools",
            "limits":{"sourceBytes":1_048_576,"totalInputBytes":8_388_608,"files":100,"batch":100,"pngSize":[128,4096],"jobSeconds":60,"queue":8,
                "workerMemoryBytes":crate::limits::MEMORY_LIMIT_BYTES,"workerMemoryKind":if cfg!(windows){"committed"}else if cfg!(target_os="macos"){"address-space-growth"}else{"address-space"}}})
    }
    async fn compile(&self, mut args: Value) -> Result<Value> {
        validate_document(&args)?;
        let name = args["filename"].as_str().unwrap().to_owned();
        self.output.check(&name, "pdf")?;
        args["kind"] = json!("document");
        args["allowPackages"] = json!(self.allow_packages);
        let rendered = jobs::run(args).await?;
        let diagnostics = rendered["diagnostics"].clone();
        let Some(data) = rendered["data"].as_str() else {
            return Ok(json!({"v":1,"ok":false,"diagnostics":diagnostics}));
        };
        let bytes = STANDARD
            .decode(data)
            .map_err(|_| LocalError("ENGINE_FAILED", "Invalid worker output"))?;
        Ok(
            json!({"v":1,"ok":true,"diagnostics":diagnostics,"artifact":self.output.write(&name,"pdf",&bytes,"application/pdf")?}),
        )
    }
    async fn batch(&self, args: Value) -> Result<Value> {
        qr::validate_style(args.get("style")).map_err(|_| {
            LocalError(
                "UNSUPPORTED_STYLE",
                "Invalid or unsupported local QR style; see QR style v1",
            )
        })?;
        let format = args["format"].as_str().unwrap_or("png");
        let input = args["items"].as_array().unwrap();
        let mut names = HashSet::new();
        for item in input {
            let name = item["filename"].as_str().unwrap();
            validate_filename(name, format)?;
            if !names.insert(name.to_ascii_lowercase()) {
                return Err(LocalError(
                    "DUPLICATE_OUTPUT",
                    "Batch output names must be unique, ignoring case",
                ));
            }
        }
        let mut items = Vec::new();
        for (index, item) in input.iter().enumerate() {
            let name = item["filename"].as_str().unwrap();
            let render=async {
                self.output.check(name,format)?;
                if item["content"].as_str().unwrap().len()>2953 {return Err(LocalError("INVALID_INPUT","QR content exceeds UTF-8 capacity"));}
                let mut job=args.clone();job.as_object_mut().unwrap().remove("items");
                job["kind"]=json!("qr");job["content"]=item["content"].clone();
                let rendered=jobs::run(job).await?;
                let Some(data)=rendered["data"].as_str() else {return Ok(json!({"index":index,"ok":false,"diagnostics":rendered["diagnostics"]}));};
                let bytes=STANDARD.decode(data).map_err(|_|LocalError("ENGINE_FAILED","Invalid worker output"))?;
                let artifact=self.output.write(name,format,&bytes,if format=="png" {"image/png"} else {"image/svg+xml"})?;
                let mut value=json!({"index":index,"ok":true,"diagnostics":rendered["diagnostics"],"artifact":artifact});
                if args["verify"].as_bool().unwrap_or(true) {value["verified"]=json!(rendered["verified"].as_bool().unwrap_or(false));}
                Ok::<Value,LocalError>(value)
            }.await;
            items.push(render.unwrap_or_else(
                |e| json!({"index":index,"ok":false,"diagnostics":[e.diagnostic()]}),
            ));
        }
        Ok(json!({"v":1,"ok":items.iter().all(|v|v["ok"]==true),"diagnostics":[],"items":items}))
    }
    async fn execute(&self, name: &str, args: Value) -> Result<Value> {
        if name == "holi_info" {
            return Ok(self.info());
        }
        if name == "document_templates" {
            return Ok(
                json!({"v":1,"ok":true,"diagnostics":[],"templates":templates::document_templates()}),
            );
        }
        let _permit = self
            .queue
            .clone()
            .try_acquire_owned()
            .map_err(|_| LocalError("BUSY", "The local render queue is full; retry later"))?;
        let _serial = self.serial.lock().await;
        match name {
            "document_compile" => self.compile(args).await,
            "document_render" => {
                let mut job=templates::prepare_template(args["template"].as_str().unwrap(),&args["data"])
                    .map_err(|_|LocalError("INVALID_TEMPLATE_DATA","Unknown template or invalid data; inspect document_templates for the schema"))?;
                job["filename"] = args["filename"].clone();
                self.compile(job).await
            }
            "qr_batch" => self.batch(args).await,
            _ => Err(LocalError("INVALID_INPUT", "Unknown tool")),
        }
    }
}

impl ServerHandler for Holi {
    fn get_info(&self) -> ServerInfo {
        serde_json::from_value(json!({"protocolVersion":"2025-11-25","capabilities":{"tools":{},"resources":{}},
            "serverInfo":{"name":"@holi/mcp","version":VERSION},
            "instructions":"Render locally into the operator-selected output folder. Inspect holi_info and document_templates first. Return artifact paths. Do not enable network or overwrite files. A cloud AI client is not made private by a local MCP server."})).expect("server metadata")
    }
    async fn list_tools(
        &self,
        _: Option<PaginatedRequestParams>,
        _: RequestContext<RoleServer>,
    ) -> std::result::Result<ListToolsResult, ErrorData> {
        let tools = definitions()
            .iter()
            .map(|def| {
                let mut def = def.clone();
                if matches!(
                    def["name"].as_str(),
                    Some("document_compile" | "document_render")
                ) {
                    def["annotations"]["openWorldHint"] = json!(self.allow_packages);
                }
                serde_json::from_value(def).expect("bundled tool")
            })
            .collect();
        Ok(ListToolsResult::with_all_items(tools))
    }
    async fn call_tool(
        &self,
        request: CallToolRequestParams,
        context: RequestContext<RoleServer>,
    ) -> std::result::Result<CallToolResponse, ErrorData> {
        let def = definitions()
            .iter()
            .find(|d| d["name"] == request.name.as_ref())
            .ok_or_else(|| ErrorData::invalid_params("Unknown tool", None))?;
        let mut args = Value::Object(request.arguments.unwrap_or_default());
        if !normalize(&mut args, &def["inputSchema"]) {
            return Err(ErrorData::invalid_params(
                "Invalid tool arguments; inspect the tool schema",
                None,
            ));
        }
        let value = tokio::select! {
            result=self.execute(&request.name,args)=>result.unwrap_or_else(|e|e.response()),
            _=context.ct.cancelled()=>LocalError("CANCELLED","The local operation was cancelled").response(),
        };
        Ok(if value["ok"] == true {
            CallToolResult::structured(value)
        } else {
            CallToolResult::structured_error(value)
        }
        .into())
    }
    async fn list_resources(
        &self,
        _: Option<PaginatedRequestParams>,
        _: RequestContext<RoleServer>,
    ) -> std::result::Result<ListResourcesResult, ErrorData> {
        Ok(ListResourcesResult::with_all_items(
            resources()
                .iter()
                .map(|(uri, name, _, mime)| Resource::new(*uri, *name).with_mime_type(*mime))
                .collect(),
        ))
    }
    async fn read_resource(
        &self,
        request: ReadResourceRequestParams,
        _: RequestContext<RoleServer>,
    ) -> std::result::Result<ReadResourceResponse, ErrorData> {
        let all = resources();
        let (uri, _, text, mime) = all
            .iter()
            .find(|(uri, _, _, _)| *uri == request.uri)
            .ok_or_else(|| ErrorData::invalid_params("Unknown resource", None))?;
        let result: ReadResourceResult =
            serde_json::from_value(json!({"contents":[{"uri":uri,"text":text,"mimeType":mime}]}))
                .expect("resource result");
        Ok(result.into())
    }
}
fn resources() -> [(&'static str, &'static str, &'static str, &'static str); 4] {
    [
        ("holi://privacy", "privacy", PRIVACY, "text/plain"),
        ("holi://shadow-log", "shadow-log", LOG, "text/plain"),
        (
            "holi://skills/holi-documents",
            "holi-documents",
            DOCUMENT_SKILL,
            "text/markdown",
        ),
        (
            "holi://skills/holi-qr-batch",
            "holi-qr-batch",
            QR_SKILL,
            "text/markdown",
        ),
    ]
}

// Only the JSON Schema vocabulary in the checked-in v1 input contracts is used.
// Defaults are inserted before dispatch; errors never echo untrusted values.
fn normalize(value: &mut Value, rule: &Value) -> bool {
    if let Some(choices) = rule["enum"].as_array() {
        if !choices.contains(value) {
            return false;
        }
    }
    match rule["type"].as_str() {
        Some("string") => value.as_str().is_some_and(|s| {
            let n = s.encode_utf16().count() as u64;
            n >= rule["minLength"].as_u64().unwrap_or(0)
                && n <= rule["maxLength"].as_u64().unwrap_or(u64::MAX)
        }),
        Some("boolean") => value.is_boolean(),
        Some("number" | "integer") => {
            let Some(n) = value.as_f64() else {
                return false;
            };
            if !n.is_finite()
                || n < rule["minimum"].as_f64().unwrap_or(f64::NEG_INFINITY)
                || n > rule["maximum"].as_f64().unwrap_or(f64::INFINITY)
            {
                return false;
            }
            if rule["type"] == "integer" {
                if n.fract() != 0.0 {
                    return false;
                }
                *value = json!(n as i64);
            }
            true
        }
        Some("array") => {
            let Some(items) = value.as_array_mut() else {
                return false;
            };
            let n = items.len() as u64;
            n >= rule["minItems"].as_u64().unwrap_or(0)
                && n <= rule["maxItems"].as_u64().unwrap_or(u64::MAX)
                && items.iter_mut().all(|v| normalize(v, &rule["items"]))
        }
        Some("object") => {
            let Some(fields) = value.as_object_mut() else {
                return false;
            };
            if let Some(properties) = rule["properties"].as_object() {
                for (key, property) in properties {
                    if !fields.contains_key(key) {
                        if let Some(default) = property.get("default") {
                            fields.insert(key.clone(), default.clone());
                        }
                    }
                }
                if rule["required"].as_array().is_some_and(|keys| {
                    keys.iter()
                        .any(|k| !fields.contains_key(k.as_str().unwrap()))
                }) {
                    return false;
                }
                for (key, value) in fields.iter_mut() {
                    if let Some(property) = properties.get(key) {
                        if !normalize(value, property) {
                            return false;
                        }
                    } else if rule["additionalProperties"] == false {
                        return false;
                    }
                }
            }
            true
        }
        _ => true,
    }
}

fn valid_virtual(path: &str) -> bool {
    !path.is_empty()
        && path.encode_utf16().count() <= 240
        && !path.starts_with('/')
        && !path.contains(['\\', ':'])
        && !path.chars().any(|c| c < ' ')
        && path
            .split('/')
            .all(|p| !p.is_empty() && p != "." && p != "..")
}
fn validate_document(args: &Value) -> Result<()> {
    let invalid = || LocalError("INVALID_PATH", "Invalid or duplicate virtual document path");
    let limit = || LocalError("INPUT_LIMIT", "Document input limit exceeded");
    let main = args["mainPath"].as_str().unwrap_or("main.typ");
    if !valid_virtual(main) {
        return Err(invalid());
    }
    let source = args["source"].as_str().ok_or_else(limit)?;
    let mut total = source.len();
    if total > 1_048_576 {
        return Err(limit());
    }
    let mut names = HashSet::from([main]);
    if let Some(files) = args["files"].as_array() {
        if files.len() > 100 {
            return Err(limit());
        }
        for file in files {
            let path = file["path"].as_str().ok_or_else(invalid)?;
            if !valid_virtual(path) || !names.insert(path) {
                return Err(invalid());
            }
            let content = file["content"].as_str().ok_or_else(invalid)?;
            let bytes = if file["encoding"] == "base64" {
                STANDARD
                    .decode(content)
                    .map_err(|_| LocalError("INVALID_INPUT", "Invalid base64 virtual file"))?
                    .len()
            } else {
                content.len()
            };
            if file["kind"] == "typst" && bytes > 1_048_576 {
                return Err(limit());
            }
            total += bytes;
        }
    }
    if total > 8_388_608 {
        return Err(limit());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn integral_json_floats_match_javascript_numbers() {
        let rule = json!({"type":"integer","minimum":128,"maximum":4096});
        for raw in ["128.0", "1.28e2", "768"] {
            let mut value: Value = serde_json::from_str(raw).unwrap();
            assert!(normalize(&mut value, &rule));
            assert!(value.as_u64().is_some());
        }
        assert!(!normalize(&mut json!(128.5), &rule));
    }
}
