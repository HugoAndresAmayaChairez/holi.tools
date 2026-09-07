mod document;
mod http;
mod jobs;
mod limits;
mod output;
mod qr;
mod server;
mod templates;

use output::{LocalError, OutputFolder};
use rmcp::ServiceExt;
use std::io::{Read, Write};

fn main() {
    // Panics and compiler internals must never disclose content through MCP stderr.
    std::panic::set_hook(Box::new(|_| {}));
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args == ["--internal-worker"] {
        worker();
        return;
    }
    if let Err(error) = start(args) {
        eprintln!(
            "Holi Local could not start: {}\nRun with --help for usage; the output folder must exist and be an absolute local path.",
            error.1
        );
        std::process::exit(1);
    }
}

fn worker() {
    if limits::configure_worker().is_err() {
        std::process::exit(1);
    }
    let result = (|| {
        let mut input = Vec::new();
        std::io::stdin()
            .take(12 * 1024 * 1024 + 1)
            .read_to_end(&mut input)
            .ok()?;
        if input.len() > 12 * 1024 * 1024 {
            return None;
        }
        let job: serde_json::Value = serde_json::from_slice(&input).ok()?;
        let result = match job["kind"].as_str() {
            Some("document") => document::render(&job),
            Some("qr") => qr::render(&job),
            _ => return None,
        };
        let bytes = serde_json::to_vec(&result).ok()?;
        if bytes.len() > 128 * 1024 * 1024 {
            return None;
        }
        std::io::stdout().write_all(&bytes).ok()?;
        Some(())
    })();
    if result.is_none() {
        std::process::exit(1);
    }
}

fn start(args: Vec<String>) -> output::Result<()> {
    let mut output = None;
    let mut transport = "stdio".to_owned();
    let mut port = "8788".to_owned();
    let mut packages = false;
    let mut help = false;
    let mut version = false;
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--help" => help = true,
            "--version" => version = true,
            "--allow-packages" => packages = true,
            "--output" | "--transport" | "--port" => {
                if i + 1 >= args.len() || args[i + 1].starts_with("--") {
                    return Err(LocalError(
                        "STARTUP",
                        "An option has a missing or invalid value",
                    ));
                }
                match args[i].as_str() {
                    "--output" => output = Some(args[i + 1].clone()),
                    "--transport" => transport = args[i + 1].clone(),
                    _ => port = args[i + 1].clone(),
                };
                i += 1;
            }
            other if other.starts_with('-') => return Err(LocalError("STARTUP", "Unknown option")),
            _ => {
                return Err(LocalError(
                    "STARTUP",
                    "Positional arguments are not supported",
                ));
            }
        }
        i += 1;
    }
    if version {
        println!("{}", server::VERSION);
        return Ok(());
    }
    if help {
        println!(
            "Holi Local native MCP server\nUsage: holi-mcp --output <existing absolute folder> [--transport stdio|http] [--port 8788] [--allow-packages]\nHTTP requires HOLI_MCP_TOKEN (32+ characters) and binds only 127.0.0.1."
        );
        return Ok(());
    }
    let output = output.ok_or(LocalError("STARTUP", "An output folder is required"))?;
    if transport != "stdio" && transport != "http" {
        return Err(LocalError("STARTUP", "Invalid transport"));
    }
    let output = OutputFolder::new(&output)?;
    let port = if !port.bytes().all(|b| b.is_ascii_digit()) {
        None
    } else {
        port.parse::<u16>().ok().filter(|v| *v > 0)
    };
    if transport == "http" && port.is_none() {
        return Err(LocalError("STARTUP", "Invalid port"));
    }
    let service = server::Holi::new(output, packages);
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
        .map_err(|_| LocalError("STARTUP", "Could not initialize the local runtime"))?;
    runtime.block_on(async {
        if transport == "http" {
            http::serve(service, port.unwrap()).await
        } else {
            let running = service
                .serve((BoundedStdin::new(), tokio::io::stdout()))
                .await
                .map_err(|_| LocalError("PROTOCOL", "The MCP connection could not initialize"))?;
            running
                .waiting()
                .await
                .map_err(|_| LocalError("PROTOCOL", "The MCP connection stopped"))?;
            Ok(())
        }
    })
}

/// Bound each newline-delimited JSON-RPC message before SDK buffering.
struct BoundedStdin {
    inner: tokio::io::Stdin,
    count: usize,
}
impl BoundedStdin {
    fn new() -> Self {
        Self {
            inner: tokio::io::stdin(),
            count: 0,
        }
    }
}
impl tokio::io::AsyncRead for BoundedStdin {
    fn poll_read(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
        buf: &mut tokio::io::ReadBuf<'_>,
    ) -> std::task::Poll<std::io::Result<()>> {
        let start = buf.filled().len();
        match std::pin::Pin::new(&mut self.inner).poll_read(cx, buf) {
            std::task::Poll::Ready(Ok(())) => {
                for byte in &buf.filled()[start..] {
                    if *byte == b'\n' {
                        self.count = 0;
                    } else {
                        self.count += 1;
                    }
                    if self.count > 12 * 1024 * 1024 {
                        return std::task::Poll::Ready(std::result::Result::Err(
                            std::io::Error::other("MCP input limit exceeded"),
                        ));
                    }
                }
                std::task::Poll::Ready(Ok(()))
            }
            other => other,
        }
    }
}
