# Holi Local

Holi's document and QR engines as a local MCP server for AI assistants.
Node 22+, Windows/macOS/Linux. No account. This checkout contains v0.1.0;
publication and real-client acceptance gates are tracked in
[ADR 0003](../../docs/decisions/0003-holi-local.md).

## Start from this repository

Install Node, pnpm, Rust with `wasm32-unknown-unknown`, and wasm-pack, then run
`pnpm install && pnpm build:local` at the repository root. These build tools are
only needed to build from source; a published package includes compiled WASM.

Create an output directory yourself and start the MCP server:

```powershell
node local/mcp/dist/main.js --output "C:\Users\you\Documents\Holi Output"
```

```sh
node local/mcp/dist/main.js --output "/Users/you/Documents/Holi Output"
```

Stdio waits for an MCP client; it is not a document-generation command line.
Once the version is published, the equivalent single-command entrypoint is:

```sh
npx -y @holi/mcp@0.1.0 --output "/absolute/existing/output-folder"
```

## Connect clients

For **Claude Desktop**, add this server to the existing `mcpServers` object in
its MCP configuration and restart the app. Substitute absolute paths, preserve
other servers, and use an existing output folder. Use `/Users/...` paths on
macOS. For source builds, this avoids shell quoting and Windows npx wrappers:

```json
{
  "mcpServers": {
    "holi-local": {
      "command": "node",
      "args": [
        "C:/path/to/holi.tools/local/mcp/dist/main.js",
        "--output", "C:/Users/you/Documents/Holi Output"
      ]
    }
  }
}
```

For **Claude Code**, register the same source build:

```sh
claude mcp add --transport stdio holi-local -- node /absolute/path/to/holi.tools/local/mcp/dist/main.js --output /absolute/existing/output-folder
```

The server also exposes `holi://skills/holi-documents` and
`holi://skills/holi-qr-batch` as MCP resources. The same self-contained
`skills/*/SKILL.md` folders ship in the npm package; copy the desired folder to
your client's skills directory if it supports skills. No client settings are
modified by installing or starting Holi Local.

## Tools

| Tool | Use |
| --- | --- |
| `holi_info` | Inspect version, configured output folder, privacy, limits, support and Shadow Log. |
| `document_templates` | Read the report/letter schemas, examples and Typst source. |
| `document_render` | Supply template ID, JSON data and a new `.pdf` basename. |
| `document_compile` | Supply Typst source, optional virtual files and a new `.pdf` basename. |
| `qr_batch` | Supply up to 100 content/filename pairs, SVG or PNG, size and optional QR style v1. Each file is read back with the local decoder and reports `verified`. |

Example `document_render` arguments:

```json
{
  "template": "report",
  "data": {
    "title": "Project report",
    "sections": [{"heading": "Findings", "body": "The verified results go here."}]
  },
  "filename": "project-report.pdf"
}
```

`document_compile.files` entries have `path`, `content`, `kind`
(`typst`, `image`, `data`) and `encoding` (`utf8`, `base64`). These are virtual
files; the compiler cannot open host paths. `mainPath` defaults to `main.typ`.
Template strings are passed as JSON text, not interpolated as Typst code.

Outputs include path, file URI, MIME type, byte count, SHA-256 and diagnostics.
Existing files, traversal, reserved Windows filenames and batch name collisions
are rejected. Batches may partially succeed; retry only failed items under new
names. An interrupted write may leave a partial **new** file. Keep the output
folder and its ancestors under your control; Node cannot exclude a hostile
process concurrently changing the filesystem with the same OS privileges.

QR defaults are black on white, ECC M. Size is 128–4096 pixels for PNG.
Portable saved styles from Holi QR retain version 1. Local rendering supports
Rust shapes, solid colors, linear/radial gradients and liquid effects. Text
frames, images, noise, other gradients, custom opacity and blending are rejected.
Every written item is decoded again locally; `verified: false` plus a warning
means the style is too aggressive for the local decoder at that size, and the
file is kept so you can adjust the style. Pass `verify: false` to skip that
check. Scan final exports at the intended size before distribution.

## Streamable HTTP

Set `HOLI_MCP_TOKEN` to a secret of at least 32 non-whitespace characters in the
server environment. Start with `--transport http --port 8788` and the same
`--output` argument. Connect to `http://127.0.0.1:8788/mcp` with
`Authorization: Bearer <token>`. Use a client that supports custom headers.

HTTP binds only loopback, checks Host and Origin, has no CORS or file-serving
route, and prints no token or request data. Stdio needs no token. Rendering runs
in disposable workers with a 60-second limit; one queue allows eight pending
operations. Installation and compilation do not start a background server.

## Privacy

Input -> worker memory -> an explicit output folder -> optional Typst package
requests -> package provider -> local MCP client receives diagnostics and paths.
No Holi rendering service, document uploads, account, telemetry or content logs.
Your assistant provider can still receive prompts, tool inputs and results.
OS backup/sync software can copy files independently of Holi Local.

Fonts and templates are bundled for offline use after installation. The default
blocks package downloads. The operator can opt in with `--allow-packages`;
only missing `@preview` packages from `packages.typst.org` are fetched, including
transitive dependencies, with archive limits and no redirects. Downloads stay
in worker memory. The provider sees IP, timing, package names/versions and
request metadata, never document content from this server. npm installation
also uses the network. Delete output files yourself when no longer needed.

Metadata/image tools, DOCX, e-signatures and desktop installers are deferred.

## Verify and publish

Run `pnpm build:local`, `pnpm test:local`, `pnpm test`, `pnpm lint`, and
`cargo test --workspace --no-fail-fast`.

To drive the server with the MCP Inspector CLI, describe it in a config file
(the CLI drops dashed arguments such as `--output` from a command line, but
passes them from `args`, the same shape Claude Desktop uses):

```json
{ "mcpServers": { "holi-local": { "command": "node",
  "args": ["/absolute/path/to/local/mcp/dist/main.js", "--output", "/absolute/existing/output-folder"] } } }
```

```sh
npx -y @modelcontextprotocol/inspector --cli --config holi.json --server holi-local --method tools/list
``` CI builds the Node WASM target and tests
the server on Windows and macOS as well as Linux (configured jobs; hosted runs
are still pending). SDK tests are automated;
actual Claude Desktop/Code checks are a separate ADR acceptance gate.

For each of those clients on each OS: discover the five tools, read the privacy
resource, render a report, compile an invalid document and recover, generate and
scan a PNG batch, then retry an existing filename and confirm its bytes remain
unchanged. Record client versions, OS, results and date in ADR 0003.

Before publishing, pack and inspect `@holi/wasm-qr`, both engine packages and
`@holi/mcp` from their own directories using `pnpm pack`. Publish dependencies
before `@holi/mcp`; each has its own version and Shadow Log. Scope ownership
was confirmed by the maintainer. Do not mark client gates passed without those
real tests or advertise npm availability before publication.

[Shadow Log](CHANGELOG.md) · [Support](https://github.com/HugoAndresAmayaChairez/holi.tools/issues)
· [Donate](https://ko-fi.com/holitools) · [MCP contract](../../spec/mcp-tools-v1.md)

Implementation references: [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/server),
[typst.ts](https://github.com/Myriad-Dreamin/typst.ts),
[Claude Code MCP setup](https://code.claude.com/docs/en/mcp),
[bundled font source and notices](fonts/sources.json).
