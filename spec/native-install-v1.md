# Holi Local native installation v1

Status: implemented candidate; platform tests are recorded in ADR 0003.
Owner: Holi Local

The per-user `holi-local-setup` executable installs a bundled, platform-matched
Holi Local distribution without downloading code or requesting administrator
privileges. The Windows artifact is an `.exe`; Ubuntu uses a native executable.
No Node, Python, Rust toolchain, service, PATH change or open network port is
required on the user's machine.

## Paths

Windows defaults to `%LOCALAPPDATA%\Programs\HoliLocal`. Ubuntu defaults to
`${XDG_DATA_HOME:-$HOME/.local/share}/holi-local`. The default output directory
on both systems is `<user home>/Holi/Output`. `--install-dir` and `--output-dir`
accept absolute custom paths. The output directory remains independent of the
installation; a skill must call `holi_info` to discover the actual output root.

Distribution files are stored in immutable `versions/<version>-<bundle hash>`
directories. `installation.json` and `mcp.json` contain the actual absolute
executable and output paths. Changing installation location requires running
the installer again for that location and updating the desired client.
Older version directories and all user documents are retained on upgrade.

## Client integration

`--client none` generates configuration and instructions only. Explicit
`--client claude-code` merges only `mcpServers.holi-local` in the user-scoped
Claude Code JSON file and installs the two skills in its personal skills folder.
Explicit `--client claude-desktop` merges that entry in Claude Desktop's Windows
configuration; Desktop skills are supplied as ZIP files for optional upload.
Existing configuration is backed up, unrelated keys are preserved, malformed
JSON is rejected, and client processes must be stopped while editing settings.
An existing Holi entry outside this installation requires `--replace-client`.
Skill files with local edits are backed up before an explicit client install.
No security allowlists, tool approvals or account settings are changed.

The interactive executable asks for paths, client and confirmation. `--yes`
uses defaults or supplied options without prompting. `--print-defaults` reports
paths without writes. `--bundle` supplies a local distribution archive for
development/offline use; release setup executables embed that archive.

## Integrity and persistence

Reject unsupported platforms, links, traversal and excessive archive size or
entry counts. Verify the embedded manifest, executable hash and version before
configuring a client. The hash detects corruption; authenticity of the setup
executable depends on obtaining it from a trusted release source.

Use an installation marker and a lock to distinguish an existing Holi install
from unrelated user folders and prevent concurrent installers. Never delete
the output folder, unrelated files, previous versions or backups. Write
configuration atomically and reject unexpected symlink/reparse-point targets.
Unix installation metadata and configuration backups are private to the user.

Input -> installer memory -> local install/output directories and explicitly
chosen client configuration. The offline installer has no network operations
or telemetry. Acquiring it contacts the release host; the connected assistant
provider may receive prompts, tool inputs and results. Installing a skill does
not install an MCP server or grant its tools permission.
