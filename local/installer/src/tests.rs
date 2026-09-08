use super::*;
use flate2::{Compression, write::GzEncoder};

fn archive(items: &[(&str, &[u8], tar::EntryType)]) -> Vec<u8> {
    let mut tar = tar::Builder::new(GzEncoder::new(Vec::new(), Compression::fast()));
    for (name, bytes, kind) in items {
        let mut header = tar::Header::new_gnu();
        header.set_size(bytes.len() as u64);
        header.set_mode(0o600);
        header.set_entry_type(*kind);
        if kind.is_symlink() {
            header.set_link_name("outside").unwrap();
        }
        header.set_cksum();
        tar.append_data(&mut header, name, *bytes).unwrap();
    }
    tar.into_inner().unwrap().finish().unwrap()
}

#[test]
fn defaults_respect_platform_home_and_xdg() {
    let temp = tempfile::tempdir().unwrap();
    let root = temp.path();
    let get = |key: &str| match key {
        "HOME" | "USERPROFILE" => Some(root.as_os_str().to_owned()),
        "LOCALAPPDATA" => Some(root.join("local").into_os_string()),
        "APPDATA" => Some(root.join("roaming").into_os_string()),
        _ => None,
    };
    let win = Defaults::from_env(true, get).unwrap();
    assert_eq!(win.install, root.join("local/Programs/HoliLocal"));
    assert_eq!(win.output, root.join("Holi/Output"));
    let linux = Defaults::from_env(false, get).unwrap();
    assert_eq!(linux.install, root.join(".local/share/holi-local"));
    let custom = Defaults::from_env(false, |key| {
        if key == "XDG_DATA_HOME" {
            Some(root.join("custom").into_os_string())
        } else {
            get(key)
        }
    })
    .unwrap();
    assert_eq!(custom.install, root.join("custom/holi-local"));
}

#[test]
fn client_merge_preserves_unknown_keys_and_requires_explicit_replacement() {
    let root = tempfile::tempdir().unwrap();
    let entry =
        json!({"command":root.path().join("versions/new/holi-mcp"),"args":["--output","chosen"]});
    let old = br#"{"preferences":{"keep":true},"mcpServers":{"another":{"command":"keep"},"holi-local":{"command":"elsewhere"}}}"#;
    assert!(merge_config(Some(old), entry.clone(), root.path(), false).is_err());
    let merged = merge_config(Some(old), entry.clone(), root.path(), true).unwrap();
    assert_eq!(merged["preferences"]["keep"], true);
    assert_eq!(merged["mcpServers"]["another"]["command"], "keep");
    assert_eq!(merged["mcpServers"]["holi-local"], entry);
    assert!(merge_config(Some(b"[]"), entry.clone(), root.path(), true).is_err());
    assert!(merge_config(Some(br#"{"mcpServers":null}"#), entry, root.path(), true).is_err());
}

#[test]
fn extraction_rejects_links_duplicates_and_multiple_roots() {
    let root = tempfile::tempdir().unwrap();
    for items in [
        vec![("holi-local-test/link", &b""[..], tar::EntryType::Symlink)],
        vec![
            ("holi-local-test/file", &b"one"[..], tar::EntryType::Regular),
            ("holi-local-test/FILE", &b"two"[..], tar::EntryType::Regular),
        ],
        vec![
            ("holi-local-one/file", &b""[..], tar::EntryType::Regular),
            ("holi-local-two/file", &b""[..], tar::EntryType::Regular),
        ],
    ] {
        let stage = tempfile::tempdir_in(root.path()).unwrap();
        assert!(unpack(&archive(&items), stage.path()).is_err());
    }
    assert!(unpack(b"bad gzip", root.path()).is_err());
}

#[test]
fn distribution_rejects_tampered_executable_and_wrong_platform() {
    let root = tempfile::tempdir().unwrap();
    let exe = if cfg!(windows) {
        "holi-mcp.exe"
    } else {
        "holi-mcp"
    };
    fs::write(root.path().join(exe), b"executable").unwrap();
    for skill in SKILLS {
        let path = root.path().join("skills").join(skill);
        fs::create_dir_all(&path).unwrap();
        fs::write(path.join("SKILL.md"), "skill").unwrap();
    }
    let mut manifest = json!({"version":"0.3.0","platform":platform(),"arch":architecture(),"runtime":"rust-native","executable":exe,"executableBytes":10,"executableSha256":hash(b"executable")});
    let path = root.path().join("manifest.json");
    fs::write(&path, json_bytes(&manifest).unwrap()).unwrap();
    assert!(validate_distribution(root.path()).is_ok());
    fs::write(root.path().join(exe), b"corruption").unwrap();
    assert!(validate_distribution(root.path()).is_err());
    manifest["platform"] = json!("other");
    fs::write(&path, json_bytes(&manifest).unwrap()).unwrap();
    assert!(validate_distribution(root.path()).is_err());
}

#[test]
fn atomic_replacement_and_backups_keep_original_bytes() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("client.json");
    atomic_write(&path, b"old\r\n").unwrap();
    let copy = backup(&path, &fs::read(&path).unwrap()).unwrap();
    atomic_write(&path, b"new\n").unwrap();
    assert_eq!(fs::read(copy).unwrap(), b"old\r\n");
    assert_eq!(fs::read(path).unwrap(), b"new\n");
}

#[cfg(unix)]
#[test]
fn symlink_ancestors_are_rejected() {
    let root = tempfile::tempdir().unwrap();
    let target = root.path().join("target");
    fs::create_dir(&target).unwrap();
    let link = root.path().join("link");
    std::os::unix::fs::symlink(target, &link).unwrap();
    assert!(validate_path(&link.join("settings.json")).is_err());
}
