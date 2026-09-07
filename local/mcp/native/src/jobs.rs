use crate::output::{LocalError, Result};
use serde_json::Value;
use std::{process::Stdio, time::Duration};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    process::Command,
};

/// A disposable native process allows hard cancellation of synchronous rendering.
/// Its stdout is private IPC; stderr never reaches the MCP client or a log.
pub async fn run(job: Value) -> Result<Value> {
    let executable = std::env::current_exe()
        .map_err(|_| LocalError("ENGINE_FAILED", "The rendering worker could not start"))?;
    let mut command = Command::new(executable);
    command
        .arg("--internal-worker")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    let mut child = command
        .spawn()
        .map_err(|_| LocalError("ENGINE_FAILED", "The rendering worker could not start"))?;
    let _limits = crate::limits::attach(&child).map_err(|_| {
        LocalError(
            "ENGINE_FAILED",
            "The rendering worker limits could not be installed",
        )
    })?;
    let mut input = child.stdin.take().unwrap();
    let output = child.stdout.take().unwrap();
    let payload = serde_json::to_vec(&job)
        .map_err(|_| LocalError("INVALID_INPUT", "Invalid render input"))?;
    let operation = async {
        input.write_all(&payload).await?;
        input.shutdown().await?;
        drop(input);
        let mut data = Vec::new();
        output
            .take(128 * 1024 * 1024 + 1)
            .read_to_end(&mut data)
            .await?;
        if data.len() > 128 * 1024 * 1024 {
            return Err(std::io::Error::other("output limit"));
        }
        if !child.wait().await?.success() {
            return Err(std::io::Error::other("worker failed"));
        }
        serde_json::from_slice(&data).map_err(std::io::Error::other)
    };
    match tokio::time::timeout(Duration::from_secs(60), operation).await {
        Ok(Ok(value)) => Ok(value),
        result => {
            let _ = child.kill().await;
            let _ = child.wait().await;
            if result.is_err() {
                Err(LocalError("TIMEOUT", "Rendering exceeded the time limit"))
            } else {
                Err(LocalError("ENGINE_FAILED", "The rendering worker failed"))
            }
        }
    }
}
