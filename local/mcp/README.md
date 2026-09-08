# Holi Local

Holi's document and QR engines as a native MCP server for AI assistants.
Version 0.3.0 is a Rust executable for Windows, macOS and Linux. It embeds
Typst, the shared `holi-qr` core, fonts, templates and skill resources; running
it requires no Node.js/npm installation or browser WASM compiler. Release availability and
real-client acceptance are tracked in [ADR 0003](../../docs/decisions/0003-holi-local.md).
The source implementation does not imply that downloadable releases are published.

## Install without developer tools

Use the self-contained Windows or Ubuntu setup executable: it includes the
engine, offers default/custom paths and can configure your selected Claude
client. See [English instructions](INSTALL.md), [instrucciones en español](INSTALL.es.md)
and the [five-tool test prompt](TEST-PROMPT.md). Public downloads are pending;
local and CI candidates are not a published release.

## Build and start

Building from source requires Rust 1.93 or newer:

```sh
cargo build -p holi-mcp --profile native
```

Create an output folder, then start the executable with its existing absolute
path. Stdio is the default and waits for an MCP client; this is not a standalone
document-generation CLI or a desktop window.

```powershell
.\target\native\holi-mcp.exe --output "C:\Users\you\Documents\Holi Output"
```

```sh
./target/native/holi-mcp --output "/Users/you/Documents/Holi Output"
```

The `native` Cargo profile builds the distributable executable. A normal
`cargo build -p holi-mcp` creates a development binary in `target/debug`.
Move the executable wherever you want to run it; assets required for rendering
are embedded. Distributed archives also include the licenses, font notices,
skill files and source information that accompany the executable.

## Connect clients

For **Claude Desktop**, add this entry to the existing `mcpServers` object
in its MCP configuration and restart the app. Use absolute paths and preserve
other configured servers. macOS and Linux use a path without `.exe`.

```json
{
  "mcpServers": {
    "holi-local": {
      "command": "C:/path/to/holi-mcp.exe",
      "args": ["--output", "C:/Users/you/Documents/Holi Output"]
    }
  }
}
```

For **Claude Code**, register the same executable:

```sh
claude mcp add --transport stdio holi-local -- /absolute/path/to/holi-mcp --output /absolute/existing/output-folder
```

The server exposes `holi://skills/holi-documents` and
`holi://skills/holi-qr-batch` as MCP resources. The same self-contained
`skills/*/SKILL.md` folders accompany release archives; copy a desired folder
to your client's skills directory if it supports skills. Starting Holi Local
does not change client settings or install a background service.

## Tools

| Tool                 | Use                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `holi_info`          | Inspect version, output folder, privacy, limits, support and Shadow Log.                                                                                   |
| `document_templates` | Read report/letter schemas, examples and Typst source.                                                                                                     |
| `document_render`    | Supply a template ID, JSON data and a new `.pdf` basename.                                                                                                 |
| `document_compile`   | Supply Typst source, optional virtual files/mainPath and a new `.pdf` basename.                                                                            |
| `qr_batch`           | Supply 1–100 content/filename pairs, SVG or PNG, size and optional QR style v1. Rendered bytes are decoded in memory before writing and report `verified`. |

Example `document_render` arguments:

```json
{
  "template": "report",
  "data": {
    "title": "Project report",
    "sections": [
      { "heading": "Findings", "body": "The verified results go here." }
    ]
  },
  "filename": "project-report.pdf"
}
```

`document_compile.files` entries have `path`, `content`, `kind`
(`typst`, `image`, `data`) and `encoding` (`utf8`, `base64`). These are virtual
files; the compiler cannot open host paths. `mainPath` defaults to `main.typ`.
Template strings are JSON text, never interpolated as Typst code. The web
engine and native server share `packages/engines/typst/src/templates.v1.json`.

Results retain the MCP tools v1 contract: structured diagnostics and artifacts
with absolute path, file URI, MIME type, byte count and SHA-256. Existing files,
traversal, reserved Windows filenames and case-insensitive batch collisions are
rejected. A batch may partially succeed; retry only failed items with new names.
An interrupted process can leave an incomplete **new** file. Keep the output
folder and its ancestors under your control: another process with the same OS
permissions can still race filesystem changes. Rust does not remove that risk.

QR defaults are black on white, ECC M. PNG size is 128–4096 pixels. Local
rendering supports Rust shapes, solid colors, linear/radial gradients and
liquid effects from portable QR style v1. Text frames, images, noise, other
gradients, custom opacity and blending are rejected. `verified: false` plus
a warning means the rendered bytes could not be decoded at that size; the file
is kept so you can adjust the style. `verify: false` omits the check and field.
The server checks in memory and does not reread the saved file. Scan final
exports at their intended size before distribution.

## Streamable HTTP and limits

Set `HOLI_MCP_TOKEN` to at least 32 non-whitespace characters in the server's
environment. Start with `--transport http --port 8788` and the same `--output`
argument. Connect to `http://127.0.0.1:8788/mcp` with
`Authorization: Bearer <token>` using a client that supports custom headers.
Stdio needs no token.

HTTP binds only loopback, checks Host and Origin, accepts no file-serving
route and provides no CORS or request logging. JSON bodies are bounded to
12 MiB. Input permits 1 MiB per source, 8 MiB total decoded data and 100 virtual
files. Work is serialized through a queue bounded to eight operations.
Each render runs in a disposable native subprocess, killed after 60 seconds;
the transport remains responsive while synchronous rendering runs. Startup
errors explain known failures without printing paths, raw arguments or tokens.

Workers receive OS memory bounds before reading document input: a Windows Job
Object limits committed process memory to 1 GiB; Linux limits virtual address
space to 2 GiB. macOS allows 2 GiB of virtual-address-space growth above the
worker's measured startup mappings, which include its large shared region.
These measure different things and are not an RSS guarantee. Stricter inherited Unix limits remain in
effect. Failing to install the controls aborts the job. Unix workers disable
core dumps; Windows job handles also terminate workers when their owner exits.
Native Linux/macOS behavior still requires the configured platform checks and
real-client acceptance; the Windows v0.1 report does not establish these controls.

## Privacy

Input -> native worker memory -> explicit output folder -> optional Typst
package requests -> package provider -> local MCP client receives diagnostics
and paths. No Holi rendering service, document uploads, account, telemetry or
content logs. Your assistant provider can still receive prompts, tool inputs
and results. OS backup/sync software can copy output files independently.

Embedded fonts and templates work offline. Package downloads are disabled
unless the operator opts in with `--allow-packages`. Only missing `@preview`
packages from `packages.typst.org` may be fetched, including transitive
dependencies, with archive limits and no redirects. Downloads stay in worker
memory. That provider sees IP, timing, package names/versions and request
metadata; Holi Local does not send it document content. Acquiring the executable
or source dependencies separately contacts their hosting/package providers.
Delete output files yourself when no longer needed.

An explicitly enabled Typst package may include a WASM plugin. Native Typst
executes those plugins through its embedded interpreter inside the disposable
worker and virtual workspace; this does not load the browser WASM compiler or
require users to install a separate runtime.

Metadata/image tools, DOCX, e-signatures and desktop installers are deferred.

## Verification and distribution

```sh
cargo test -p holi-mcp
pnpm test:local
pnpm lint
```

The SDK acceptance harness needs Node 22+, installed pnpm dependencies and the
QR Node WASM test oracle built with `pnpm --filter @holi/wasm-qr build:node`
(CI obtains this oracle from the WASM build job). It uses Node as an independent
MCP client and the existing QR WASM decoder as a test oracle. These are development/test tools,
not dependencies of the native server. `pnpm test:local` builds and exercises
the native executable. To test a particular built or packaged executable, set
`HOLI_NATIVE_BINARY` to its absolute path and run:

```sh
pnpm --filter @holi/mcp exec vitest run test/native.test.ts
```

CI configures native builds and SDK checks on Linux, Windows and macOS,
and collects platform-specific archives with the executable, licenses,
notices and skills. A configured CI job is not evidence of a successful run.
The packaging command is `node scripts/package-local.mjs` after the
`--profile native` build; it writes under `dist/local/`. No npm runtime is
published for 0.2.0. `local/mcp/package.json` is private development tooling.
The prior TypeScript server remains in `src/` as a migration reference;
`test:legacy` explicitly exercises that implementation.

Actual Claude Desktop/Code acceptance is separate: for each client on each
OS, discover all five tools, read privacy, render both templates, compile an
invalid document and recover using virtual files, generate and decode saved
PNG/SVG QR files, retry an existing output and compare its bytes. Record the
native version, client/OS versions, date and results in ADR 0003. The supplied
Windows 0.1.0 report remains historical evidence for the old runtime; it does
not certify the native replacement.

[Shadow Log](CHANGELOG.md) · [Support](https://github.com/HugoAndresAmayaChairez/holi.tools/issues)
· [Donate](https://ko-fi.com/holitools) · [MCP contract](../../spec/mcp-tools-v1.md)

Implementation references: [MCP Rust SDK](https://github.com/modelcontextprotocol/rust-sdk),
[Typst](https://github.com/typst/typst),
[Claude Code MCP setup](https://code.claude.com/docs/en/mcp),
[bundled font source and notices](fonts/sources.json).
