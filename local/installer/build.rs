use std::{env, fs, path::PathBuf};

fn main() {
    println!("cargo:rerun-if-env-changed=HOLI_INSTALL_BUNDLE");
    let source = if let Some(path) = env::var_os("HOLI_INSTALL_BUNDLE") {
        let path = fs::canonicalize(path).expect("installer bundle must exist");
        println!("cargo:rerun-if-changed={}", path.display());
        format!(
            "static BUNDLE: &[u8] = include_bytes!({:?});",
            path.to_str().unwrap()
        )
    } else {
        "static BUNDLE: &[u8] = &[];".into()
    };
    fs::write(
        PathBuf::from(env::var_os("OUT_DIR").unwrap()).join("bundle.rs"),
        source,
    )
    .unwrap();
}
