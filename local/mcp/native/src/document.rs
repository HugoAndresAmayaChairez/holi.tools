//! Native Typst compilation with an exclusively in-memory document filesystem.
//!
//! The parent process supplies validated jobs and owns output writes and timeouts.
//! No document path is ever translated to a host filesystem path here.
use base64::{Engine, engine::general_purpose::STANDARD};
use flate2::read::GzDecoder;
use serde_json::{Value, json};
use std::{
    collections::{HashMap, HashSet},
    io::Read,
    sync::{LazyLock, Mutex},
    time::Duration as Timeout,
};
use typst::{
    Library, LibraryExt, World, WorldExt,
    diag::{FileError, FileResult, Severity, SourceDiagnostic},
    foundations::{Bytes, Datetime, Duration},
    syntax::{FileId, RootedPath, Source, VirtualPath, VirtualRoot, package::PackageSpec},
    text::{Font, FontBook},
    utils::LazyHash,
};
use typst_layout::PagedDocument;

const SOURCE_LIMIT: usize = 1_048_576;
const INPUT_LIMIT: usize = 8_388_608;
const ARCHIVE_LIMIT: usize = 10 * 1024 * 1024;
const PACKAGE_MEMORY_LIMIT: usize = 32 * 1024 * 1024;
const PACKAGE_COUNT_LIMIT: usize = 16;

static FONTS: LazyLock<Vec<Font>> = LazyLock::new(|| {
    let files: &[&'static [u8]] = &[
        include_bytes!("../../fonts/LibertinusSerif-Regular.otf"),
        include_bytes!("../../fonts/LibertinusSerif-Italic.otf"),
        include_bytes!("../../fonts/LibertinusSerif-Bold.otf"),
        include_bytes!("../../fonts/LibertinusSerif-BoldItalic.otf"),
        include_bytes!("../../fonts/NewCM10-Regular.otf"),
        include_bytes!("../../fonts/NewCM10-Italic.otf"),
        include_bytes!("../../fonts/NewCM10-Bold.otf"),
        include_bytes!("../../fonts/NewCM10-BoldItalic.otf"),
        include_bytes!("../../fonts/NewCMMath-Regular.otf"),
        include_bytes!("../../fonts/DejaVuSansMono.ttf"),
    ];
    files
        .iter()
        .flat_map(|bytes| Font::iter(Bytes::new(*bytes)))
        .collect()
});

struct MemoryWorld {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    main: FileId,
    files: HashMap<FileId, Bytes>,
    sources: Mutex<HashMap<FileId, FileResult<Source>>>,
    packages: Mutex<Packages>,
    now: time::OffsetDateTime,
    local_offset: time::UtcOffset,
}

impl MemoryWorld {
    fn new(job: &Value) -> Result<Self, &'static str> {
        let source = job["source"].as_str().ok_or("Invalid document source")?;
        let main_path = job["mainPath"].as_str().unwrap_or("main.typ");
        if !workspace_path(main_path) {
            return Err("Invalid virtual document path");
        }
        let main = project_file(main_path)?;
        let mut files = HashMap::new();
        let mut paths = HashSet::new();
        paths.insert(main_path.to_owned());
        let mut total = source.len();
        if source.len() > SOURCE_LIMIT {
            return Err("Document input limit exceeded");
        }
        files.insert(main, Bytes::new(source.as_bytes().to_vec()));
        if let Some(virtual_files) = job.get("files") {
            let virtual_files = virtual_files.as_array().ok_or("Invalid virtual files")?;
            if virtual_files.len() > 100 {
                return Err("Document input limit exceeded");
            }
            for file in virtual_files {
                let path = file["path"].as_str().ok_or("Invalid virtual file path")?;
                if !workspace_path(path) || !paths.insert(path.to_owned()) {
                    return Err("Invalid or duplicate virtual file path");
                }
                let content = file["content"]
                    .as_str()
                    .ok_or("Invalid virtual file content")?;
                let bytes = match file["encoding"].as_str().unwrap_or("utf8") {
                    "utf8" => content.as_bytes().to_vec(),
                    "base64" => STANDARD
                        .decode(content)
                        .map_err(|_| "Invalid base64 virtual file")?,
                    _ => return Err("Invalid virtual file encoding"),
                };
                if file["kind"] == "typst" && bytes.len() > SOURCE_LIMIT {
                    return Err("Document input limit exceeded");
                }
                total = total
                    .checked_add(bytes.len())
                    .ok_or("Document input limit exceeded")?;
                if total > INPUT_LIMIT {
                    return Err("Document input limit exceeded");
                }
                files.insert(project_file(path)?, Bytes::new(bytes));
            }
        }
        let now = time::OffsetDateTime::now_utc();
        let local_offset = time::UtcOffset::local_offset_at(now).unwrap_or(time::UtcOffset::UTC);
        Ok(Self {
            library: LazyHash::new(Library::default()),
            book: LazyHash::new(FontBook::from_fonts(FONTS.iter())),
            main,
            files,
            sources: Mutex::new(HashMap::new()),
            packages: Mutex::new(Packages::new(
                job["allowPackages"].as_bool().unwrap_or(false),
            )),
            now,
            local_offset,
        })
    }
}

fn project_file(path: &str) -> Result<FileId, &'static str> {
    let path = VirtualPath::new(path).map_err(|_| "Invalid virtual file path")?;
    Ok(RootedPath::new(VirtualRoot::Project, path).intern())
}

fn workspace_path(path: &str) -> bool {
    !path.is_empty()
        && path.encode_utf16().count() <= 240
        && !path.chars().any(|ch| ch < ' ' || ch == '\\' || ch == ':')
        && !path
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
}

impl World for MemoryWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    fn main(&self) -> FileId {
        self.main
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if let Some(source) = self
            .sources
            .lock()
            .map_err(|_| FileError::AccessDenied)?
            .get(&id)
        {
            return source.clone();
        }
        let source = self.file(id).and_then(|bytes| {
            let text = std::str::from_utf8(&bytes).map_err(|_| FileError::InvalidUtf8)?;
            Ok(Source::new(
                id,
                text.trim_start_matches('\u{feff}').to_owned(),
            ))
        });
        self.sources
            .lock()
            .map_err(|_| FileError::AccessDenied)?
            .insert(id, source.clone());
        source
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        match id.root() {
            VirtualRoot::Project => self
                .files
                .get(&id)
                .cloned()
                .ok_or_else(|| FileError::NotFound(id.vpath().get_without_slash().into())),
            VirtualRoot::Package(spec) => self
                .packages
                .lock()
                .map_err(|_| FileError::AccessDenied)?
                .file(spec, id),
        }
    }

    fn font(&self, index: usize) -> Option<Font> {
        FONTS.get(index).cloned()
    }

    fn today(&self, offset: Option<Duration>) -> Option<Datetime> {
        let date = match offset {
            Some(offset) => self
                .now
                .checked_add(time::Duration::saturating_seconds_f64(offset.seconds()))?,
            None => self.now.to_offset(self.local_offset),
        };
        Datetime::from_ymd(date.year(), date.month() as u8, date.day())
    }
}

struct Packages {
    allowed: bool,
    fetched: HashSet<PackageSpec>,
    failures: HashMap<PackageSpec, FileError>,
    files: HashMap<FileId, Bytes>,
    downloaded: usize,
}

impl Packages {
    fn new(allowed: bool) -> Self {
        Self {
            allowed,
            fetched: HashSet::new(),
            failures: HashMap::new(),
            files: HashMap::new(),
            downloaded: 0,
        }
    }

    fn file(&mut self, spec: &PackageSpec, id: FileId) -> FileResult<Bytes> {
        if !valid_package(spec) {
            return Err(package_error("Only bounded preview packages are supported"));
        }
        if !self.allowed {
            return Err(package_error(
                "Typst package downloads are disabled. The operator can opt in with --allow-packages.",
            ));
        }
        if let Some(error) = self.failures.get(spec) {
            return Err(error.clone());
        }
        if !self.fetched.contains(spec) {
            if let Err(error) = self.fetch(spec) {
                self.failures.insert(spec.clone(), error.clone());
                return Err(error);
            }
        }
        self.files
            .get(&id)
            .cloned()
            .ok_or_else(|| FileError::NotFound(id.vpath().get_without_slash().into()))
    }

    fn fetch(&mut self, spec: &PackageSpec) -> FileResult<()> {
        if self.fetched.len() + self.failures.len() >= PACKAGE_COUNT_LIMIT {
            return Err(package_error("Package count limit exceeded"));
        }
        let client = reqwest::blocking::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Timeout::from_secs(15))
            .build()
            .map_err(|_| package_error("Package download failed"))?;
        // The URL contains only the previously validated package name/version.
        // Document data, host paths, custom headers and arbitrary URLs are excluded.
        let url = format!(
            "https://packages.typst.org/preview/{}-{}.tar.gz",
            spec.name, spec.version
        );
        let response = client
            .get(url)
            .send()
            .map_err(|_| package_error("Package download failed"))?;
        if !response.status().is_success() {
            return Err(package_error("Package download failed"));
        }
        let remaining = PACKAGE_MEMORY_LIMIT.saturating_sub(self.downloaded);
        let compressed = read_bounded(response, ARCHIVE_LIMIT.min(remaining))?;
        self.downloaded += compressed.len();
        let entries = unpack_package(&compressed)?;
        for (path, bytes) in entries {
            let path =
                VirtualPath::new(&path).map_err(|_| package_error("Invalid package archive"))?;
            let id = RootedPath::new(VirtualRoot::Package(spec.clone()), path).intern();
            self.files.insert(id, Bytes::new(bytes));
        }
        self.fetched.insert(spec.clone());
        Ok(())
    }
}

fn package_error(message: &'static str) -> FileError {
    FileError::Other(Some(message.into()))
}

fn valid_package(spec: &PackageSpec) -> bool {
    let name = spec.name.as_str();
    spec.namespace == "preview"
        && !name.is_empty()
        && name.len() <= 64
        && name.as_bytes()[0].is_ascii_alphanumeric()
        && name
            .bytes()
            .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == b'-')
        && spec.version.to_string().split('.').count() == 3
        && spec.version.to_string().split('.').all(|part| {
            !part.is_empty() && part.len() <= 5 && part.bytes().all(|ch| ch.is_ascii_digit())
        })
}

fn read_bounded(reader: impl Read, limit: usize) -> FileResult<Vec<u8>> {
    let mut bytes = Vec::new();
    reader
        .take(limit as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| package_error("Package download or archive read failed"))?;
    if bytes.len() > limit {
        return Err(package_error("Package size limit exceeded"));
    }
    Ok(bytes)
}

fn unpack_package(compressed: &[u8]) -> FileResult<Vec<(String, Vec<u8>)>> {
    // Bound decompression before tar processing, including metadata and padding.
    let decompressed = read_bounded(GzDecoder::new(compressed), PACKAGE_MEMORY_LIMIT)?;
    let mut archive = tar::Archive::new(decompressed.as_slice());
    let entries = archive
        .entries()
        .map_err(|_| package_error("Invalid package archive"))?;
    let mut files = Vec::new();
    let mut seen = HashSet::new();
    for (index, entry) in entries.enumerate() {
        if index >= 2000 {
            return Err(package_error("Package entry limit exceeded"));
        }
        let entry = entry.map_err(|_| package_error("Invalid package archive"))?;
        let raw_path = entry.path_bytes();
        let raw_path =
            std::str::from_utf8(&raw_path).map_err(|_| package_error("Invalid package archive"))?;
        let clean = raw_path.strip_prefix("./").unwrap_or(raw_path);
        let clean = if entry.header().entry_type().is_dir() {
            clean.trim_end_matches('/')
        } else {
            clean
        };
        // Upstream preview archives commonly contain a root directory named
        // "." (or "./"). It adds no file or path and is safe to ignore.
        if (clean.is_empty() || clean == ".") && entry.header().entry_type().is_dir() {
            continue;
        }
        if clean.is_empty()
            || clean.chars().any(|ch| ch < ' ' || ch == '\\' || ch == ':')
            || clean
                .split('/')
                .any(|part| part.is_empty() || part == "." || part == "..")
        {
            return Err(package_error("Invalid package archive"));
        }
        if entry.header().entry_type().is_dir() {
            continue;
        }
        // Archive links and special files never enter the virtual filesystem.
        if !entry.header().entry_type().is_file() || !seen.insert(clean.to_owned()) {
            return Err(package_error("Invalid package archive"));
        }
        let path = clean.to_owned();
        let bytes = read_bounded(entry, PACKAGE_MEMORY_LIMIT)?;
        files.push((path, bytes));
    }
    Ok(files)
}

fn diagnostic(world: &MemoryWorld, item: &SourceDiagnostic) -> Value {
    let mut hints: Vec<String> = item.hints.iter().map(|hint| hint.v.to_string()).collect();
    hints.extend(item.trace.iter().map(|trace| trace.v.to_string()));
    let mut output = json!({
        "severity": match item.severity { Severity::Error => "error", Severity::Warning => "warning" },
        "message": item.message.to_string(), "hints": hints, "path": "", "package": ""
    });
    if let Some(id) = item.span.id() {
        output["path"] = json!(id.vpath().get_without_slash());
        if let VirtualRoot::Package(spec) = id.root() {
            output["package"] = json!(spec.to_string());
        }
        if let (Some(range), Ok(source)) = (world.range(item.span), world.source(id)) {
            if let (Some(start), Some(end)) =
                (position(&source, range.start), position(&source, range.end))
            {
                output["start"] = start;
                output["end"] = end;
            }
        }
    }
    output
}

fn position(source: &Source, byte: usize) -> Option<Value> {
    let lines = source.lines();
    let line = lines.byte_to_line(byte)?;
    let start = lines.line_to_byte(line)?;
    let column = lines.byte_to_utf16(byte)? - lines.byte_to_utf16(start)?;
    Some(json!({"line": line + 1, "column": column + 1}))
}

pub fn render(job: &Value) -> Value {
    // Typst layout needs more stack than Windows' default, and blocking package
    // requests must run outside the parent's async runtime. The parent still
    // owns the disposable process and can terminate all of this job's threads.
    std::thread::scope(|scope| {
        match std::thread::Builder::new()
            .name("holi-typst".into())
            .stack_size(32 * 1024 * 1024)
            .spawn_scoped(scope, || render_document(job))
        {
            Ok(worker) => worker.join().unwrap_or_else(|_| render_failed()),
            Err(_) => render_failed(),
        }
    })
}

fn render_failed() -> Value {
    json!({"diagnostics": [{"severity":"error", "message":"Rendering failed; check input, package availability and supported options.", "hints":[], "path":"", "package":""}]})
}

fn render_document(job: &Value) -> Value {
    let world = match MemoryWorld::new(job) {
        Ok(world) => world,
        Err(message) => {
            return json!({"diagnostics": [{"severity":"error", "message": message, "hints":[], "path":"", "package":""}]});
        }
    };
    let compiled = typst::compile::<PagedDocument>(&world);
    let mut diagnostics: Vec<Value> = compiled
        .warnings
        .iter()
        .map(|item| diagnostic(&world, item))
        .collect();
    let document = match compiled.output {
        Ok(document) => document,
        Err(errors) => {
            diagnostics.extend(errors.iter().map(|item| diagnostic(&world, item)));
            return json!({"diagnostics": diagnostics});
        }
    };
    match typst_pdf::pdf(&document, &typst_pdf::PdfOptions::default()) {
        Ok(pdf) => json!({"data": STANDARD.encode(pdf), "diagnostics": diagnostics}),
        Err(errors) => {
            diagnostics.extend(errors.iter().map(|item| diagnostic(&world, item)));
            json!({"diagnostics": diagnostics})
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn job(source: &str) -> Value {
        json!({"source":source, "files":[], "mainPath":"main.typ", "allowPackages":false})
    }

    fn assert_pdf(result: &Value) {
        assert!(result["data"].is_string(), "{result}");
        assert!(
            STANDARD
                .decode(result["data"].as_str().unwrap())
                .unwrap()
                .starts_with(b"%PDF-")
        );
    }

    #[test]
    fn renders_both_shared_templates_offline_with_literal_data() {
        for template in crate::templates::document_templates().as_array().unwrap() {
            let prepared = crate::templates::prepare_template(
                template["id"].as_str().unwrap(),
                &template["example"],
            )
            .unwrap();
            assert_pdf(&render(&prepared));
        }
        let prepared = crate::templates::prepare_template("report", &json!({"title":"Español ñ ü", "sections":[{"heading":"Literal", "body":"#panic(\"not executable\") $x^2$"}]})).unwrap();
        assert_pdf(&render(&prepared));
    }

    #[test]
    fn resolves_virtual_includes_and_base64_data() {
        let mut input = job("#include \"section.typ\"\n#read(\"data.txt\")");
        input["files"] = json!([
            {"path":"section.typ", "kind":"typst", "content":"= Included ñ"},
            {"path":"data.txt", "encoding":"base64", "content":STANDARD.encode("Only memory")}
        ]);
        assert_pdf(&render(&input));
    }

    #[test]
    fn reports_source_range_and_recovers_after_compile_failure() {
        let failure = render(&job("#variable_inexistente_holi"));
        assert!(failure.get("data").is_none());
        let error = failure["diagnostics"]
            .as_array()
            .unwrap()
            .iter()
            .find(|d| d["severity"] == "error")
            .unwrap();
        assert_eq!(error["path"], "main.typ");
        assert_eq!(error["start"], json!({"line":1,"column":2}));
        assert!(
            error["message"]
                .as_str()
                .unwrap()
                .contains("unknown variable")
        );
        assert_pdf(&render(&job("= Recovered")));
    }

    #[test]
    fn positions_preserve_utf16_columns_and_typst_line_breaks() {
        let source = Source::new(
            project_file("main.typ").unwrap(),
            "First\r\n🦀 #unknown".into(),
        );
        assert_eq!(
            position(&source, "First\r\n🦀 #".len()),
            Some(json!({"line":2, "column":5}))
        );
        assert!(position(&source, 9).is_none()); // Inside the emoji's UTF-8 bytes.
    }

    #[test]
    fn never_reads_host_files_or_downloads_packages_by_default() {
        for source in [
            "#read(\"/etc/passwd\")",
            "#read(\"C:/Windows/win.ini\")",
            "#read(\"../../Cargo.toml\")",
        ] {
            let result = render(&job(source));
            assert!(result.get("data").is_none(), "{source}");
        }
        let result = render(&job("#import \"@preview/cetz:0.3.4\""));
        assert!(result.get("data").is_none());
        assert!(
            result["diagnostics"]
                .to_string()
                .contains("downloads are disabled")
        );
    }

    #[test]
    fn rejects_traversal_duplicates_invalid_base64_and_large_sources() {
        let vectors: Value = serde_json::from_str(include_str!(
            "../../../../spec/vectors/document-template-v1.json"
        ))
        .unwrap();
        for path in vectors["paths"]["invalid"].as_array().unwrap() {
            let mut input = job("Hello");
            input["mainPath"] = path.clone();
            assert!(MemoryWorld::new(&input).is_err(), "{path}");
        }
        let mut input = job("Hello");
        input["files"] = json!([{"path":"main.typ","content":"Duplicate"}]);
        assert!(MemoryWorld::new(&input).is_err());
        input["files"] = json!([{"path":"data.txt","encoding":"base64","content":"not base64!"}]);
        assert!(MemoryWorld::new(&input).is_err());
        assert!(MemoryWorld::new(&job(&"a".repeat(SOURCE_LIMIT + 1))).is_err());
    }

    fn archive(path: &str, kind: tar::EntryType, bytes: &[u8]) -> Vec<u8> {
        let mut builder = tar::Builder::new(Vec::new());
        let mut header = tar::Header::new_gnu();
        header.set_size(bytes.len() as u64);
        header.set_mode(0o644);
        header.set_entry_type(kind);
        // Set raw names so the fixture can exercise traversal rejected by tar's builder.
        header.as_mut_bytes()[..100].fill(0);
        header.as_mut_bytes()[..path.len()].copy_from_slice(path.as_bytes());
        if kind.is_symlink() {
            header.set_link_name("elsewhere").unwrap();
        }
        header.set_cksum();
        builder.append(&header, bytes).unwrap();
        let data = builder.into_inner().unwrap();
        let mut gzip = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        gzip.write_all(&data).unwrap();
        gzip.finish().unwrap()
    }

    #[test]
    fn unpacks_packages_only_into_memory_and_rejects_archive_links_and_traversal() {
        for root in [".", "./"] {
            assert!(
                unpack_package(&archive(root, tar::EntryType::Directory, b""))
                    .unwrap()
                    .is_empty()
            );
        }
        let regular = archive("./lib.typ", tar::EntryType::Regular, b"#let value = 42");
        assert_eq!(
            unpack_package(&regular).unwrap()[0],
            ("lib.typ".into(), b"#let value = 42".to_vec())
        );
        for path in ["../escape", "/absolute", "C:/drive", "a\\b", "a/../b"] {
            assert!(
                unpack_package(&archive(path, tar::EntryType::Regular, b"x")).is_err(),
                "{path}"
            );
        }
        assert!(unpack_package(&archive("link", tar::EntryType::Symlink, b"")).is_err());
        assert!(read_bounded(&b"12345"[..], 4).is_err());
        assert!(unpack_package(b"not an archive").is_err());
    }

    #[test]
    fn package_policy_rejects_arbitrary_namespaces_and_large_versions() {
        assert!(valid_package(&"@preview/cetz:0.3.4".parse().unwrap()));
        assert!(!valid_package(&"@local/cetz:0.3.4".parse().unwrap()));
        assert!(!valid_package(&"@preview/cetz:100000.0.0".parse().unwrap()));
    }

    #[test]
    fn resolves_a_package_manifest_and_sources_from_memory_without_network() {
        std::thread::Builder::new()
            .stack_size(32 * 1024 * 1024)
            .spawn(|| {
                let mut input = job("#import \"@preview/holi-fixture:0.0.1\": message\n#message");
                input["allowPackages"] = json!(true);
                let world = MemoryWorld::new(&input).unwrap();
                let spec: PackageSpec = "@preview/holi-fixture:0.0.1".parse().unwrap();
                let mut packages = world.packages.lock().unwrap();
                packages.fetched.insert(spec.clone());
                for (path, text) in [
                    ("typst.toml", "[package]\nname = \"holi-fixture\"\nversion = \"0.0.1\"\nentrypoint = \"lib.typ\"\n"),
                    ("lib.typ", "#let message = [Package in memory ñ]"),
                ] {
                    let id = RootedPath::new(VirtualRoot::Package(spec.clone()), VirtualPath::new(path).unwrap()).intern();
                    packages.files.insert(id, Bytes::new(text.as_bytes().to_vec()));
                }
                drop(packages);
                let output = typst::compile::<PagedDocument>(&world);
                assert!(output.output.is_ok(), "{:?}", output.output.err());
                assert_eq!(world.packages.lock().unwrap().downloaded, 0);
            })
            .unwrap()
            .join()
            .unwrap();
    }
}
