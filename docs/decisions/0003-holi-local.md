# ADR 0003: Holi Local exposes the tested engines to AI assistants through MCP

Status: proposed — 2026-09-05

## Context

Paid document and QR generation services charge per document for
deterministic work: compile a template with data, render a code, rasterize a
page. Holi already runs those engines locally in the browser (Typst through
WebAssembly, QR through `holi-qr`) behind a truthful privacy contract, but the
engines live inside `web/apps/*`, so nothing outside a browser can reuse them.

AI assistants now integrate tools through the Model Context Protocol. Hosted MCP
servers for PDF generation charge for the same work, and Claude Cowork offers
local Office-document skills only inside Claude Desktop. Several crates without
a shipping consumer remain in the Cargo workspace, and `conductor/`, `papers/`,
and `vectors/` predate ADR 0001.

## Decision

- Add a second product surface, **Holi Local**: a Node-based MCP server
  (`@holi/mcp`, stdio and streamable HTTP), skill packs, and Typst document
  templates, installable with one command and running entirely on the device.
  Documents come first, QR batch second, metadata and image afterwards.
- Extract runtime-agnostic engines from the apps into `packages/engines/*`
  (TypeScript, no DOM). The web apps and the MCP server are the two real
  consumers that justify the shared packages.
- Make the shared contracts normative in `spec/` with test vectors: QR style
  v1 (already used by saved styles and style links), document template v1, and
  MCP tools v1 (inputs, outputs, diagnostics shape, output-folder rules).
- Keep Rust selective. `wasm-qr` gains a Node target and a PNG rasterizer
  because the MCP server is a shipping consumer. No public Rust library and no
  CLI; a desktop installer only after usage exists, wrapping the same server.
- Retire what has no consumer: `wasm-qr-lite`, `wasm-renderer`, `conductor/`,
  `papers/`, and `vectors/` (recreated as `spec/vectors/` when the first vector
  lands). `wasm-core` follows once the Test app stops importing it.

## Consequences

- Web apps keep their behavior and import the engines from packages.
- New workspace roots `packages/` and `local/`; CI adds Node WASM builds and
  MCP tests; each published package keeps its own version and Shadow Log.
- Privacy for the local product follows the standard flow: input → memory →
  disk in an explicit output folder → network only for Typst packages on demand
  and only when allowed → package provider observes technical metadata → local
  MCP client receives diagnostics and artifact paths. The assistant provider's
  handling of prompts and tool results is outside Holi Local's control.
- Out of scope: e-signature, cloud rendering, accounts. DOCX output is a
  separate decision.

## Gates before this becomes accepted

- npm scope confirmed (`@holi`, or a fallback name recorded here);
- contracts reviewed and covered by vectors;
- engine extraction leaves the QR and Typst builds and tests green;
- MCP v0.1 exercised from two clients (Claude Desktop and Claude Code) on
  Windows and macOS.

## Implementation and verification — 2026-09-05

The maintainer confirmed access to npm scope `@holi` and availability of the
two clients on both operating systems. The implementation uses that scope.
This confirms availability, not completion of the client acceptance tests.

- `packages/engines/typst` extracts compilation/diagnostics and provides v1
  report/letter templates; `packages/engines/qr` extracts portable styles,
  layers, shapes and SVG orchestration. Both web apps consume those packages.
- `local/mcp` implements five tools, stdio and authenticated loopback Streamable
  HTTP, explicit output-folder confinement, exclusive writes, disposable workers,
  bounded input/queue/time limits, bundled fonts and two distributable skill packs.
- Typst uses an in-memory filesystem. Package downloads are disabled by default.
  Opt-in imports are restricted to preview packages, including transitive imports,
  and packages remain in worker memory. A real CeTZ/oxifmt compilation passed;
  offline regression fixtures cover negative package caching between attempts.
- `wasm-qr` has web/Node outputs and a PNG rasterizer using the existing
  resvg/tiny-skia stack. Node PNG and SVG exports decode to the input content.
- Style, template and MCP contracts and shared vectors are in `spec/`.
- Retired the unused crates and root folders named above. `wasm-core` remains:
  Test still imports it in the vault and webgpu experiments.
- Package versions and Shadow Logs: engines/MCP 0.1.0, wasm-qr 0.2.0,
  QR web 1.0.3 and Typst web 0.8.1. CI now builds the Node WASM and includes
  Windows/macOS MCP jobs; those hosted jobs have not been run from this task.

Local Windows verification: all public app/server builds, JavaScript/generator
tests, workspace Rust tests and lint passed. Browser checks confirmed a QR
decoded by the local scanner, SVG export, Typst preview and PDF export. The
bundled report/letter PDFs were rendered and visually inspected. npm tarball
contents are checked separately from workspace imports, including Node's CJS
package scope, WASM binaries, fonts, licenses and skill resources.
An isolated installation of the four npm tarballs also passed offline PDF
generation, PNG QR decoding and retrieval of the bundled skill resource.

Independent review on Windows, 2026-09-05: the full suite (engines, MCP,
QR, lint, Rust, all app builds) passed; the same style JSON produced
byte-identical SVG in the browser and in Node (SHA-256 match for a default and
a gradient/liquid style); the MCP Inspector CLI, configured through a
Claude-Desktop-style `mcpServers` entry, listed the five tools, rendered a
report PDF and produced a QR. Review added `verify` to `qr_batch` (each written
item is read back with the local decoder and reports `verified`) and made the
startup error name its cause.

### Remaining acceptance evidence

| Client | Windows | macOS |
| --- | --- | --- |
| Claude Desktop | Pending real-client run | Pending real-client run |
| Claude Code | Pending real-client run | Pending real-client run |

Record client/OS versions, date and observed results using the procedure in
`local/mcp/README.md`. MCP SDK integration tests exercise both transports but
do not stand in for these four checks. This ADR remains proposed until the
maintainer reviews the contracts and the client matrix is complete. No npm
publication or production deployment has been performed by this implementation.
