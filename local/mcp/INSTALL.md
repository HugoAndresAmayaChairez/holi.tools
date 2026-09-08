# Install Holi Local 0.3

See [the complete Spanish guide](INSTALL.es.md) for illustrated command examples,
client integration, custom paths, skills, upgrades and removal.

The self-contained installer bundles the Rust engine, fonts, templates, skills,
licenses and corresponding source. End users need no Node, npm, Python or Rust.
Targets: Windows x64 and Ubuntu 24.04 x64. macOS retains a portable archive.
This is a local/CI candidate: **0.3.0 public downloads are not published yet**.
Obtain the matching setup artifact and checksum from the project maintainer or
the CI run for the revision you intend to test. These commands use that file.

Close Claude first. On Windows, double-click the EXE for an interactive console
installer, or run from its download directory in PowerShell:

```powershell
.\holi-local-setup-0.3.0-win32-x64.exe --yes --client claude-desktop
```

For Claude Code, select `--client claude-code`. Ubuntu:

```sh
chmod +x ./holi-local-setup-0.3.0-linux-x64 && ./holi-local-setup-0.3.0-linux-x64 --yes --client claude-code
```

Do not use sudo. Omit `--yes` for prompts. `--client none` (default) only creates
the program, skills and configuration snippet; it does not change client files.

| Path | Windows | Ubuntu |
| --- | --- | --- |
| Install | `%LOCALAPPDATA%\Programs\HoliLocal` | `${XDG_DATA_HOME:-$HOME/.local/share}/holi-local` |
| Output | `%USERPROFILE%\Holi\Output` | `$HOME/Holi/Output` |
| Code JSON | `%USERPROFILE%\.claude.json` | `$HOME/.claude.json` |
| Code skills | `%USERPROFILE%\.claude\skills` | `$HOME/.claude/skills` |
| Desktop JSON | `%APPDATA%\Claude\claude_desktop_config.json` | No automatic integration |

Use `--print-defaults` to inspect paths without writes. `--install-dir` and
`--output-dir` select custom absolute paths, including spaces and Unicode.
Keep them separate; neither may contain the other. Choose a real directory,
without symlinks/junctions, empty or already managed by this installer.

```sh
./holi-local-setup-0.3.0-linux-x64 --yes --client claude-code --install-dir "$HOME/Apps/Holi" --output-dir "$HOME/Documents/Holi"
```

`installation.json`, `mcp.json` and `INSTALLATION.md` in the install directory
record the actual absolute executable and output paths. The executable lives
in `versions/<version>-<bundle hash>/holi-mcp[.exe]`; no PATH change is needed.
Use `--client-config` and `--skills-dir` for custom Claude Code settings; both
must be explicit when `CLAUDE_CONFIG_DIR` is set.

Explicit client selection merges only `mcpServers.holi-local`, preserving other
settings and backing up original bytes as `holi-backup-*.json`. Malformed JSON
is rejected. An unrelated existing Holi entry requires `--replace-client`.
Restart Claude and check `/mcp` in Code or local developer settings in Desktop.
Project/local MCP settings can override the user entry; inspect old `.mcp.json`
files if the connected server reports a different path.

Claude Code selection also installs personal `/holi-documents` and
`/holi-qr-batch` skills. In Claude Desktop, optionally upload the two ZIPs from
the installation's `skills` folder under Customize → Skills, if your account
supports custom skills. Each contains `<skill-name>/SKILL.md`. Skills provide
instructions; they do not create an MCP connection or grant tool permissions.
Other clients can merge the generated `mcp.json` entry and read the MCP skill
resources. Every skill calls `holi_info` to discover the real output folder.
Use [TEST-PROMPT.md](TEST-PROMPT.md) for an end-to-end check without skills.

To update, run the new installer with the same directory and client. Previous
versions, documents and backups remain. Modified personal skills are backed up.
To relocate, install again and use `--replace-client`; do not just move the EXE.
Changing `--output-dir` does not move previous documents. To remove, close the
client, remove only its holi-local entry and the two personal skills, then
delete the exact install directory recorded in installation.json. Keep your
output folder. No services, ports or PATH entries need removal. Remove a stale
`.install.lock` only after confirming no installer is running.

The candidate Windows installer is unsigned. Verify its trusted source and the
accompanying SHA-256; a checksum detects corruption, not an untrusted publisher.
The installer is offline and has no telemetry. Downloads contact the host;
cloud assistants may receive prompts, tool inputs and results. Remote Typst
packages are disabled by default. Web applications and native jobs do not sync.

Build the artifacts with Rust 1.93+ and Node (developer tools only):

```sh
cargo build -p holi-mcp --profile native --locked
cargo fetch --locked
node scripts/package-local.mjs
node scripts/package-local-installer.mjs
node scripts/test-local-installer.mjs
```

The setup build embeds the archive using HOLI_INSTALL_BUNDLE. A development
setup without it can accept `--bundle /absolute/archive.tar.gz`. Corresponding
source and dependency notices for both executables are inside the bundle.

References: [Code MCP](https://code.claude.com/docs/en/mcp),
[Code skills](https://code.claude.com/docs/en/skills),
[Claude custom skills](https://support.claude.com/en/articles/12512180-use-skills-in-claude).
