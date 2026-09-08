use holi_local_setup::{Client, Defaults, Options, Result, install};
use std::{
    io::{self, IsTerminal, Write},
    path::PathBuf,
};
include!(concat!(env!("OUT_DIR"), "/bundle.rs"));

fn prompt(label: &str, default: &str) -> Result<String> {
    print!("{label} [{default}]: ");
    io::stdout().flush()?;
    let mut line = String::new();
    io::stdin().read_line(&mut line)?;
    Ok(if line.trim().is_empty() {
        default.to_owned()
    } else {
        line.trim().to_owned()
    })
}

fn run() -> Result<()> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args == ["--version"] {
        println!("{}", env!("CARGO_PKG_VERSION"));
        return Ok(());
    }
    if args.iter().any(|v| v == "--help" || v == "-h") {
        println!(
            "Holi Local Setup {}\n\nRun without arguments for interactive installation.\n  --yes                         Install without prompts\n  --client none|claude-code|claude-desktop\n  --install-dir <absolute path> Program directory\n  --output-dir <absolute path>  Document output directory\n  --client-config <path>        Custom client JSON configuration\n  --skills-dir <path>           Custom Claude Code skills directory\n  --replace-client              Replace an unrelated holi-local entry, with backup\n  --bundle <archive.tar.gz>      Local archive instead of embedded bundle\n  --print-defaults               Show defaults without installing\n\nNo administrator privileges, network access or PATH changes. Close the selected client before installation.\n",
            env!("CARGO_PKG_VERSION")
        );
        return Ok(());
    }
    let defaults = Defaults::from_env(cfg!(windows), |key| std::env::var_os(key))?;
    if args == ["--print-defaults"] {
        println!(
            "{}",
            serde_json::json!({"installDirectory":defaults.install,"outputDirectory":defaults.output,"claudeCodeConfig":defaults.code_config,"claudeCodeSkills":defaults.skills,"claudeDesktopConfig":defaults.desktop_config})
        );
        return Ok(());
    }
    let mut options = Options {
        install: defaults.install,
        output: defaults.output,
        client: Client::None,
        config: None,
        skills: defaults.skills,
        replace_client: false,
    };
    let mut yes = false;
    let mut bundle = None;
    let mut client_name = "none".to_owned();
    let mut custom_skills = false;
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--yes" => yes = true,
            "--replace-client" => options.replace_client = true,
            "--install-dir" | "--output-dir" | "--client" | "--bundle" | "--client-config"
            | "--skills-dir" => {
                let value = args
                    .get(i + 1)
                    .filter(|s| !s.starts_with("--"))
                    .ok_or("An option requires a value")?;
                match args[i].as_str() {
                    "--install-dir" => options.install = value.into(),
                    "--output-dir" => options.output = value.into(),
                    "--client" => client_name = value.clone(),
                    "--bundle" => bundle = Some(PathBuf::from(value)),
                    "--client-config" => options.config = Some(value.into()),
                    _ => {
                        options.skills = value.into();
                        custom_skills = true;
                    }
                }
                i += 1;
            }
            _ => return Err("Unknown option; use --help".into()),
        }
        i += 1;
    }
    if !yes {
        if !io::stdin().is_terminal() {
            return Err("Interactive input is unavailable; use --yes with explicit options".into());
        }
        println!(
            "Holi Local setup / Instalacion de Holi Local\nNo administrator permissions required. Close Claude before continuing.\n"
        );
        options.install = prompt(
            "Install directory / Carpeta del programa",
            options.install.to_str().ok_or("Invalid path")?,
        )?
        .into();
        options.output = prompt(
            "Output directory / Carpeta de documentos",
            options.output.to_str().ok_or("Invalid path")?,
        )?
        .into();
        client_name = prompt("Client: none, claude-code, claude-desktop", &client_name)?;
        if !["y", "s"].contains(
            &prompt("Install / Instalar? y/s/N", "N")?
                .to_lowercase()
                .as_str(),
        ) {
            println!("Cancelled. No installation performed.");
            return Ok(());
        }
    }
    options.client = match client_name.as_str() {
        "none" => Client::None,
        "claude-code" => Client::Code,
        "claude-desktop" => Client::Desktop,
        _ => return Err("Client must be none, claude-code or claude-desktop".into()),
    };
    if options.client == Client::Code
        && std::env::var_os("CLAUDE_CONFIG_DIR").is_some()
        && (options.config.is_none() || !custom_skills)
    {
        return Err("CLAUDE_CONFIG_DIR is customized: specify both --client-config and --skills-dir explicitly".into());
    }
    if options.config.is_none() {
        options.config = match options.client {
            Client::None => None,
            Client::Code => Some(defaults.code_config),
            Client::Desktop => defaults.desktop_config,
        };
    }
    let external;
    let payload = if let Some(path) = bundle {
        external = holi_local_setup::read_bundle(&std::path::absolute(path)?)?;
        external.as_slice()
    } else {
        BUNDLE
    };
    if payload.is_empty() {
        return Err("This development setup has no embedded bundle; use --bundle or build the release installer".into());
    }
    let record = install(payload, &options)?;
    println!("{}", serde_json::to_string_pretty(&record)?);
    println!(
        "\nInstalled. Restart your MCP client and ask it to call holi_info.\nRead INSTALLATION.md and TEST-PROMPT.md in the install directory.\n"
    );
    Ok(())
}

fn main() {
    let interactive = std::env::args().len() == 1 && io::stdin().is_terminal();
    let failed = match run() {
        Ok(()) => false,
        Err(error) => {
            eprintln!("Holi Local setup failed: {error}");
            true
        }
    };
    if interactive {
        let _ = prompt("Press Enter to close / Pulsa Enter para cerrar", "");
    }
    if failed {
        std::process::exit(1);
    }
}
