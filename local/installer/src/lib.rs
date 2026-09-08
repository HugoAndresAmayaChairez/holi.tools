use flate2::read::GzDecoder;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    ffi::OsString,
    fs::{self, OpenOptions},
    io::{self, Cursor, Read, Write},
    path::{Component, Path, PathBuf},
    process::Command,
};

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;
pub const OWNER: &str = "holi-local-installer-v1";
pub const SKILLS: [&str; 2] = ["holi-documents", "holi-qr-batch"];
const MAX_ARCHIVE: u64 = 128 * 1024 * 1024;
const MAX_EXPANDED: u64 = 1024 * 1024 * 1024;

#[cfg(test)]
mod tests;

#[derive(Clone, Debug)]
pub struct Defaults {
    pub home: PathBuf,
    pub install: PathBuf,
    pub output: PathBuf,
    pub code_config: PathBuf,
    pub skills: PathBuf,
    pub desktop_config: Option<PathBuf>,
}

impl Defaults {
    pub fn from_env(windows: bool, get: impl Fn(&str) -> Option<OsString>) -> Result<Self> {
        let home = PathBuf::from(
            get(if windows { "USERPROFILE" } else { "HOME" })
                .ok_or("User home is unavailable; set HOME/USERPROFILE")?,
        );
        let install = if windows {
            PathBuf::from(get("LOCALAPPDATA").ok_or("LOCALAPPDATA is unavailable")?)
                .join("Programs")
                .join("HoliLocal")
        } else {
            get("XDG_DATA_HOME")
                .filter(|v| !v.is_empty())
                .map(PathBuf::from)
                .unwrap_or_else(|| home.join(".local").join("share"))
                .join("holi-local")
        };
        let desktop_config = if windows {
            get("APPDATA")
                .map(PathBuf::from)
                .map(|p| p.join("Claude").join("claude_desktop_config.json"))
        } else {
            None
        };
        let result = Self {
            output: home.join("Holi").join("Output"),
            code_config: home.join(".claude.json"),
            skills: home.join(".claude").join("skills"),
            home,
            install,
            desktop_config,
        };
        validate_path(&result.home)?;
        validate_path(&result.install)?;
        Ok(result)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Client {
    None,
    Code,
    Desktop,
}

#[derive(Clone, Debug)]
pub struct Options {
    pub install: PathBuf,
    pub output: PathBuf,
    pub client: Client,
    pub config: Option<PathBuf>,
    pub skills: PathBuf,
    pub replace_client: bool,
}

pub fn platform() -> &'static str {
    if cfg!(windows) {
        "win32"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unsupported"
    }
}
pub fn architecture() -> &'static str {
    match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        other => other,
    }
}
pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

pub fn validate_path(path: &Path) -> Result<()> {
    if !path.is_absolute()
        || path.parent().is_none()
        || path
            .to_str()
            .is_none_or(|s| s.chars().any(char::is_control))
        || path
            .components()
            .any(|c| matches!(c, Component::ParentDir | Component::CurDir))
    {
        return Err(
            "Use an absolute UTF-8 directory path without traversal or control characters".into(),
        );
    }
    for ancestor in path.ancestors() {
        match fs::symlink_metadata(ancestor) {
            Ok(meta) => {
                #[cfg(windows)]
                let link = {
                    use std::os::windows::fs::MetadataExt;
                    meta.file_attributes() & 0x400 != 0
                };
                #[cfg(not(windows))]
                let link = meta.file_type().is_symlink();
                if link {
                    return Err("Choose a real path, not a symbolic link or reparse point".into());
                }
            }
            Err(e) if e.kind() == io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.into()),
        }
    }
    Ok(())
}

fn private_directory(path: &Path) -> Result<()> {
    validate_path(path)?;
    if !path.exists() {
        fs::create_dir_all(path)?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
        }
    }
    Ok(())
}

fn read_limited(path: &Path, limit: u64) -> Result<Vec<u8>> {
    validate_path(path)?;
    let mut bytes = Vec::new();
    fs::File::open(path)?
        .take(limit + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() as u64 > limit {
        return Err("File exceeds the installation size limit".into());
    }
    Ok(bytes)
}

pub fn read_bundle(path: &Path) -> Result<Vec<u8>> {
    read_limited(path, MAX_ARCHIVE)
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<()> {
    validate_path(path)?;
    let parent = path.parent().ok_or("Missing parent directory")?;
    private_directory(parent)?;
    let mut temp = tempfile::NamedTempFile::new_in(parent)?;
    temp.write_all(bytes)?;
    temp.as_file().sync_all()?;
    temp.persist(path).map_err(|e| e.error)?;
    Ok(())
}

fn json_bytes(value: &Value) -> Result<Vec<u8>> {
    let mut bytes = serde_json::to_vec_pretty(value)?;
    bytes.push(b'\n');
    Ok(bytes)
}

/// Preserve the original byte representation, including unknown client settings.
fn backup(path: &Path, bytes: &[u8]) -> Result<PathBuf> {
    let parent = path.parent().ok_or("Missing backup directory")?;
    let mut file = tempfile::Builder::new()
        .prefix("holi-backup-")
        .suffix(".json")
        .tempfile_in(parent)?;
    file.write_all(bytes)?;
    file.as_file().sync_all()?;
    Ok(file.keep().map_err(|e| e.error)?.1)
}

fn previous(path: &Path) -> Result<Option<Vec<u8>>> {
    validate_path(path)?;
    match read_limited(path, 16 * 1024 * 1024) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(error)
            if error
                .downcast_ref::<io::Error>()
                .is_some_and(|e| e.kind() == io::ErrorKind::NotFound) =>
        {
            Ok(None)
        }
        Err(error) => Err(error),
    }
}

pub fn merge_config(
    existing: Option<&[u8]>,
    entry: Value,
    install: &Path,
    replace: bool,
) -> Result<Value> {
    let mut config: Value = match existing {
        Some(bytes) => serde_json::from_slice(bytes)?,
        None => json!({}),
    };
    let object = config
        .as_object_mut()
        .ok_or("Client configuration must be a JSON object")?;
    let servers = object
        .entry("mcpServers")
        .or_insert_with(|| json!({}))
        .as_object_mut()
        .ok_or("Client mcpServers must be a JSON object")?;
    if let Some(old) = servers.get("holi-local") {
        let ours = old["command"]
            .as_str()
            .is_some_and(|s| Path::new(s).starts_with(install.join("versions")));
        if old != &entry && !ours && !replace {
            return Err("A different holi-local entry exists; use --replace-client to replace only that entry with a backup".into());
        }
    }
    servers.insert("holi-local".into(), entry);
    Ok(config)
}

fn unpack(bytes: &[u8], directory: &Path) -> Result<PathBuf> {
    if bytes.is_empty() || bytes.len() as u64 > MAX_ARCHIVE {
        return Err("Missing or oversized distribution bundle".into());
    }
    let mut archive = tar::Archive::new(GzDecoder::new(Cursor::new(bytes)));
    let mut prefix = None;
    let mut total = 0u64;
    let mut seen = HashSet::new();
    for (count, entry) in archive.entries()?.enumerate() {
        if count >= 20000 {
            return Err("Too many files in distribution".into());
        }
        let mut entry = entry?;
        let path = entry.path()?.into_owned();
        let text = path.to_str().ok_or("Non-UTF-8 archive path")?;
        if text.contains(['\\', ':'])
            || text.chars().any(char::is_control)
            || !path.components().all(|c| matches!(c, Component::Normal(_)))
        {
            return Err("Unsafe archive path".into());
        }
        let first = path
            .components()
            .next()
            .ok_or("Empty archive path")?
            .as_os_str()
            .to_owned();
        if !first.to_string_lossy().starts_with("holi-local-") {
            return Err("Unexpected bundle root".into());
        }
        if prefix.as_ref().is_some_and(|p| p != &first) {
            return Err("Multiple bundle roots".into());
        }
        prefix = Some(first);
        let target = directory.join(&path);
        let kind = entry.header().entry_type();
        if kind.is_dir() {
            fs::create_dir_all(&target)?;
            continue;
        }
        if !kind.is_file() || !seen.insert(text.to_lowercase()) {
            return Err("Links, special files and duplicate paths are not allowed".into());
        }
        total = total
            .checked_add(entry.size())
            .ok_or("Expanded size overflow")?;
        if total > MAX_EXPANDED {
            return Err("Expanded distribution is too large".into());
        }
        fs::create_dir_all(target.parent().unwrap())?;
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(target)?;
        io::copy(&mut entry, &mut file)?;
    }
    Ok(directory.join(prefix.ok_or("Empty distribution")?))
}

fn validate_distribution(directory: &Path) -> Result<Value> {
    let manifest: Value = serde_json::from_slice(&read_limited(
        &directory.join("manifest.json"),
        1024 * 1024,
    )?)?;
    let exe = if cfg!(windows) {
        "holi-mcp.exe"
    } else {
        "holi-mcp"
    };
    if manifest["platform"] != platform()
        || manifest["arch"] != architecture()
        || manifest["runtime"] != "rust-native"
        || manifest["executable"] != exe
    {
        return Err("The bundle does not match this operating system/architecture".into());
    }
    let version = manifest["version"].as_str().ok_or("Missing version")?;
    if version.is_empty()
        || version.len() > 40
        || !version
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || b".-".contains(&c))
    {
        return Err("Invalid bundle version".into());
    }
    let bytes = read_limited(&directory.join(exe), MAX_ARCHIVE)?;
    if manifest["executableBytes"].as_u64() != Some(bytes.len() as u64)
        || manifest["executableSha256"] != hash(&bytes)
    {
        return Err("Executable integrity check failed".into());
    }
    for skill in SKILLS {
        read_limited(
            &directory.join("skills").join(skill).join("SKILL.md"),
            1024 * 1024,
        )?;
    }
    Ok(manifest)
}

/// A stored ZIP needs no external archiver. One UTF-8 skill file, no executable content.
pub fn skill_zip(name: &str, bytes: &[u8]) -> Vec<u8> {
    let path = format!("{name}/SKILL.md");
    let mut out = Vec::new();
    fn word(out: &mut Vec<u8>, v: u16) {
        out.extend(v.to_le_bytes());
    }
    fn dword(out: &mut Vec<u8>, v: u32) {
        out.extend(v.to_le_bytes());
    }
    let crc = crc32fast::hash(bytes);
    dword(&mut out, 0x04034b50);
    for v in [20, 0x800, 0, 0, 33] {
        word(&mut out, v);
    }
    for v in [crc, bytes.len() as u32, bytes.len() as u32] {
        dword(&mut out, v);
    }
    word(&mut out, path.len() as u16);
    word(&mut out, 0);
    out.extend(path.bytes());
    out.extend(bytes);
    let offset = out.len() as u32;
    dword(&mut out, 0x02014b50);
    for v in [20, 20, 0x800, 0, 0, 33] {
        word(&mut out, v);
    }
    for v in [crc, bytes.len() as u32, bytes.len() as u32] {
        dword(&mut out, v);
    }
    for v in [path.len() as u16, 0, 0, 0, 0] {
        word(&mut out, v);
    }
    dword(&mut out, 0);
    dword(&mut out, 0);
    out.extend(path.bytes());
    let central = out.len() as u32 - offset;
    dword(&mut out, 0x06054b50);
    for v in [0, 0, 1, 1] {
        word(&mut out, v);
    }
    dword(&mut out, central);
    dword(&mut out, offset);
    word(&mut out, 0);
    out
}

pub fn install(bundle: &[u8], options: &Options) -> Result<Value> {
    if platform() == "unsupported" {
        return Err("This installer supports Windows and Ubuntu/Linux".into());
    }
    validate_path(&options.install)?;
    validate_path(&options.output)?;
    if options.output.starts_with(&options.install) || options.install.starts_with(&options.output)
    {
        return Err(
            "Keep the installation and output directories separate, with neither inside the other"
                .into(),
        );
    }
    if options.client != Client::None && options.config.is_none() {
        return Err("Client configuration path is unavailable".into());
    }
    if options.client == Client::Desktop && !cfg!(windows) {
        return Err(
            "Claude Desktop automatic setup is supported on Windows; use Claude Code on Ubuntu"
                .into(),
        );
    }
    if let Some(config) = &options.config {
        validate_path(config)?;
    }
    if options.client == Client::Code {
        validate_path(&options.skills)?;
    }
    let parent = options.install.parent().ok_or("Missing install parent")?;
    private_directory(parent)?;
    let marker = options.install.join("installation.json");
    if options.install.exists() && fs::read_dir(&options.install)?.next().is_some() {
        let old: Value = serde_json::from_slice(
            &read_limited(&marker, 1024 * 1024)
                .map_err(|_| "Destination contains files and is not a managed Holi installation")?,
        )?;
        if old["owner"] != OWNER {
            return Err("Destination is not a managed Holi installation".into());
        }
    }
    private_directory(&options.install)?;
    let lock_path = options.install.join(".install.lock");
    let lock_file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&lock_path)
        .map_err(
            |_| "Another installation is running (or .install.lock remains after interruption)",
        )?;
    struct Lock(PathBuf, Option<fs::File>);
    impl Drop for Lock {
        fn drop(&mut self) {
            drop(self.1.take());
            let _ = fs::remove_file(&self.0);
        }
    }
    let _lock = Lock(lock_path, Some(lock_file));
    let stage = tempfile::Builder::new()
        .prefix(".holi-stage-")
        .tempdir_in(&options.install)?;
    let unpacked = unpack(bundle, stage.path())?;
    let manifest = validate_distribution(&unpacked)?;
    let bundle_hash = hash(bundle);
    let version_dir = options.install.join("versions").join(format!(
        "{}-{}",
        manifest["version"].as_str().unwrap(),
        &bundle_hash[..12]
    ));
    let command = version_dir.join(manifest["executable"].as_str().unwrap());
    let entry = json!({"type":"stdio", "command":command, "args":["--output",options.output]});
    // Validate client JSON before installing any executable or changing settings.
    let client_write = if options.client != Client::None {
        let config = options.config.as_ref().unwrap();
        let before = previous(config)?;
        let merged = merge_config(
            before.as_deref(),
            entry.clone(),
            &options.install,
            options.replace_client,
        )?;
        Some((config, before, json_bytes(&merged)?))
    } else {
        None
    };
    // Reserve ownership before publishing files so an interrupted first install
    // can be retried. Never replace a completed installation record here.
    if !marker.exists() {
        atomic_write(
            &marker,
            &json_bytes(&json!({"owner":OWNER,"state":"installing"}))?,
        )?;
    }
    private_directory(version_dir.parent().unwrap())?;
    if version_dir.exists() {
        let existing = validate_distribution(&version_dir)?;
        if existing != manifest {
            return Err(
                "An existing version directory has changed; choose a new install location".into(),
            );
        }
    } else {
        fs::rename(&unpacked, &version_dir)?;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&command, fs::Permissions::from_mode(0o700))?;
    }
    let mut check = Command::new(&command);
    check.arg("--version");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        check.creation_flags(0x08000000);
    }
    let result = check.output()?;
    if !result.status.success()
        || String::from_utf8_lossy(&result.stdout).trim() != manifest["version"].as_str().unwrap()
    {
        return Err("The installed executable could not start; this bundle may require a newer operating system".into());
    }
    private_directory(&options.output)?;
    let mut backups = Vec::new();
    let skills_dir = options.install.join("skills");
    private_directory(&skills_dir)?;
    for skill in SKILLS {
        let content = read_limited(
            &version_dir.join("skills").join(skill).join("SKILL.md"),
            1024 * 1024,
        )?;
        atomic_write(&skills_dir.join(skill).join("SKILL.md"), &content)?;
        atomic_write(
            &skills_dir.join(format!("{skill}.zip")),
            &skill_zip(skill, &content),
        )?;
        if options.client == Client::Code {
            let path = options.skills.join(skill).join("SKILL.md");
            if let Some(old) = previous(&path)? {
                if old != content {
                    backups.push(backup(&path, &old)?);
                }
            }
            atomic_write(&path, &content)?;
        }
    }
    if let Some((config, before, after)) = client_write {
        private_directory(config.parent().unwrap())?;
        if previous(config)? != before {
            return Err(
                "Client settings changed during installation; close the client and retry".into(),
            );
        }
        if before.as_deref() != Some(after.as_slice()) {
            if let Some(bytes) = &before {
                backups.push(backup(config, bytes)?);
            }
            atomic_write(config, &after)?;
        }
    }
    let snippet = json!({"mcpServers":{"holi-local":entry}});
    atomic_write(&options.install.join("mcp.json"), &json_bytes(&snippet)?)?;
    let record = json!({"owner":OWNER,"state":"installed","version":manifest["version"],"bundleSha256":bundle_hash,
        "installDirectory":options.install,"executable":command,"outputDirectory":options.output,
        "mcpConfig":options.install.join("mcp.json"),"client":format!("{:?}",options.client),
        "clientConfig":options.config,"skillsDirectory":skills_dir,"backups":backups});
    atomic_write(&marker, &json_bytes(&record)?)?;
    let instructions = format!(
        "# Holi Local {}\n\nInstalled executable: `{}`\n\nOutput directory: `{}`\n\nRestart your MCP client, then call holi_info and confirm this output directory.\n\nMCP configuration (merge mcpServers; preserve other entries):\n\n```json\n{}\n```\n\nClaude Code: personal skills are installed only with --client claude-code. Invoke /holi-documents or /holi-qr-batch. Project/local MCP entries may override this user entry.\n\nClaude Desktop: optionally upload skills/holi-documents.zip and skills/holi-qr-batch.zip under Customize > Skills. A skill does not create an MCP connection.\n\nRead TEST-PROMPT.md for an end-to-end check, INSTALL.md / INSTALL.es.md for setup, updates and removal. Previous versions and backups remain on disk; output documents are never removed.\n",
        manifest["version"].as_str().unwrap(),
        command.display(),
        options.output.display(),
        serde_json::to_string_pretty(&snippet)?
    );
    atomic_write(
        &options.install.join("INSTALLATION.md"),
        instructions.as_bytes(),
    )?;
    for doc in ["INSTALL.md", "INSTALL.es.md", "TEST-PROMPT.md"] {
        if let Ok(bytes) = read_limited(&version_dir.join(doc), 1024 * 1024) {
            atomic_write(&options.install.join(doc), &bytes)?;
        }
    }
    Ok(record)
}
