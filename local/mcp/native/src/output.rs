use same_file::Handle;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

#[derive(Debug)]
pub struct LocalError(pub &'static str, pub &'static str);
pub type Result<T> = std::result::Result<T, LocalError>;

impl LocalError {
    pub fn diagnostic(&self) -> Value {
        json!({"code":self.0,"severity":"error","message":self.1,"hints":[],"path":"","package":""})
    }
    pub fn response(&self) -> Value {
        json!({"v":1,"ok":false,"diagnostics":[self.diagnostic()]})
    }
}

pub fn validate_filename(name: &str, extension: &str) -> Result<()> {
    let lower = name.to_ascii_lowercase();
    let stem = lower.split('.').next().unwrap_or("");
    let reserved = matches!(stem, "con" | "prn" | "aux" | "nul")
        || ((stem.starts_with("com") || stem.starts_with("lpt"))
            && stem.len() == 4
            && stem.as_bytes()[3].is_ascii_digit());
    if name.is_empty()
        || name.len() > 120
        || !name.as_bytes()[0].is_ascii_alphanumeric()
        || !name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
        || reserved
        || !lower.ends_with(&format!(".{extension}"))
    {
        return Err(LocalError(
            "INVALID_OUTPUT",
            "Use a portable filename with the selected extension",
        ));
    }
    Ok(())
}

pub struct OutputFolder {
    pub root: PathBuf,
    identity: Handle,
}
impl OutputFolder {
    pub fn new(path: &str) -> Result<Self> {
        if !Path::new(path).is_absolute() || path.starts_with("\\\\") || path.starts_with("//") {
            return Err(LocalError(
                "INVALID_OUTPUT",
                "An existing absolute local output directory is required",
            ));
        }
        let root = fs::canonicalize(path).map_err(|_| {
            LocalError(
                "INVALID_OUTPUT",
                "The output folder does not exist or is not accessible",
            )
        })?;
        if !root.is_dir() {
            return Err(LocalError("INVALID_OUTPUT", "Output must be a directory"));
        }
        let identity = Handle::from_path(&root)
            .map_err(|_| LocalError("INVALID_OUTPUT", "The output folder is not accessible"))?;
        Ok(Self { root, identity })
    }
    pub fn display_root(&self) -> String {
        display_path(&self.root)
    }
    fn check_root(&self) -> Result<()> {
        let changed = || {
            LocalError(
                "OUTPUT_CHANGED",
                "The output directory changed; restart the server",
            )
        };
        let meta = fs::symlink_metadata(&self.root).map_err(|_| changed())?;
        if meta.file_type().is_symlink()
            || !meta.is_dir()
            || fs::canonicalize(&self.root).map_err(|_| changed())? != self.root
            || Handle::from_path(&self.root).map_err(|_| changed())? != self.identity
        {
            return Err(changed());
        }
        Ok(())
    }
    pub fn check(&self, name: &str, ext: &str) -> Result<()> {
        validate_filename(name, ext)?;
        self.check_root()?;
        match fs::symlink_metadata(self.root.join(name)) {
            Ok(_) => Err(LocalError(
                "OUTPUT_EXISTS",
                "The output filename already exists; choose a new name",
            )),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(_) => Err(LocalError(
                "OUTPUT_FAILED",
                "The output file cannot be accessed",
            )),
        }
    }
    pub fn write(&self, name: &str, ext: &str, bytes: &[u8], mime: &str) -> Result<Value> {
        self.check(name, ext)?;
        let path = self.root.join(name);
        let mut options = OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&path).map_err(|e| {
            if e.kind() == std::io::ErrorKind::AlreadyExists {
                LocalError(
                    "OUTPUT_EXISTS",
                    "The output filename already exists; choose a new name",
                )
            } else {
                LocalError("OUTPUT_FAILED", "The output file could not be created")
            }
        })?;
        let identity = file
            .try_clone()
            .ok()
            .and_then(|f| Handle::from_file(f).ok());
        if file.write_all(bytes).and_then(|_| file.sync_all()).is_err() {
            drop(file);
            if let (Some(created), Ok(current)) = (identity, Handle::from_path(&path)) {
                if created == current {
                    let _ = fs::remove_file(&path);
                }
            }
            return Err(LocalError(
                "OUTPUT_FAILED",
                "The output file could not be written",
            ));
        }
        let displayed = display_path(&path);
        let uri = url::Url::from_file_path(&displayed)
            .map_err(|_| LocalError("OUTPUT_FAILED", "The artifact path is not supported"))?;
        Ok(
            json!({"path":displayed,"uri":uri.as_str(),"mimeType":mime,"bytes":bytes.len(),"sha256":format!("{:x}",Sha256::digest(bytes))}),
        )
    }
}

fn display_path(path: &Path) -> String {
    let text = path.to_string_lossy();
    text.strip_prefix("\\\\?\\").unwrap_or(&text).to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn portable_vectors() {
        let vectors: Value =
            serde_json::from_str(include_str!("../../../../spec/vectors/mcp-tools-v1.json"))
                .unwrap();
        for v in vectors["valid"].as_array().unwrap() {
            assert!(validate_filename(v.as_str().unwrap(), "pdf").is_ok());
        }
        for v in vectors["invalid"].as_array().unwrap() {
            assert!(validate_filename(v.as_str().unwrap(), "pdf").is_err());
        }
    }
    #[test]
    fn exclusive_write_and_root_identity() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().join("output");
        fs::create_dir(&root).unwrap();
        let out = OutputFolder::new(root.to_str().unwrap()).unwrap();
        out.write("first.pdf", "pdf", b"keep", "application/pdf")
            .unwrap();
        assert_eq!(
            out.write("first.pdf", "pdf", b"replace", "application/pdf")
                .unwrap_err()
                .0,
            "OUTPUT_EXISTS"
        );
        assert_eq!(fs::read(root.join("first.pdf")).unwrap(), b"keep");
        fs::rename(&root, dir.path().join("old")).unwrap();
        fs::create_dir(&root).unwrap();
        assert_eq!(
            out.check("next.pdf", "pdf").unwrap_err().0,
            "OUTPUT_CHANGED"
        );
    }
}
