# Holi Local Shadow Log

## 0.3.0 — 2026-09-07

- Added a self-contained native installer for Windows and Ubuntu with default
  per-user paths, custom program/output folders and an interactive console.
- Explicit Claude client integration preserves unrelated settings and backs up
  previous configuration. Claude Code skills install automatically when selected;
  Desktop skills are supplied as ZIPs for optional upload.
- Added Spanish/English installation guides and a five-tool acceptance prompt.
  Skills discover configured paths through holi_info. Upgrades retain prior
  versions and documents. Installation is offline, with no PATH or service changes.
- Public download release remains pending; installer candidates are local/CI artifacts.

## 0.2.0 — 2026-09-06

- Replaced the distributed Node/TypeScript server with a native Rust executable for Windows, macOS and Linux. Running Holi Local no longer needs a Node/npm installation or the browser WASM compiler.
- Compile documents with native Typst and render QR through the same Rust core used by the web app. Fonts, templates and skill resources are embedded for offline use.
- Preserve all five MCP tools, resources, template schemas, portable QR styles, structured diagnostics and artifact hashes under the v1 contracts.
- Run each render in a disposable native subprocess with a 60-second bound, retaining serialized work, responsive transports and bounded inputs.
- Add OS worker memory bounds: 1 GiB committed memory on Windows, 2 GiB virtual address space on Linux and 2 GiB virtual-address-space growth above startup mappings on macOS. Workers abort if limits cannot be installed; platform acceptance remains explicit.
- Retain explicit output-folder confinement, exclusive new-file writes, output identity checks, private startup diagnostics and opt-in package downloads.
- Optional Typst package WASM plugins run through Typst's embedded interpreter in the disposable worker; package downloads remain an operator opt-in.
- Share one template manifest with the web engine. Keep the old TypeScript server as a development migration reference with an explicit legacy test command.
- Prepare platform archives with the executable, licenses, font notices, skills and source information. Native release publication and real-client acceptance remain tracked in ADR 0003; prior 0.1.0 client evidence does not certify this replacement.

## 0.1.0 — 2026-09-05

- Added local PDF compilation and bundled report/letter templates with JSON data.
- Added styled QR batches in SVG and PNG using the web app's Rust/WASM engine; by default, rendered bytes are decoded in memory before writing and report `verified`.
- Added stdio and authenticated loopback Streamable HTTP MCP transports.
- Require an explicit output folder; existing files are never overwritten.
- Bundle fonts for offline use. Typst package downloads require operator opt-in.
- Return structured diagnostics and artifact paths without logging document data.
- Explain startup failures without exposing paths, raw arguments or token values.
- Metadata, image tools, DOCX, desktop installers and cloud rendering are not included.

Historical Node candidate: real Claude Desktop/Code acceptance on Windows and
macOS is tracked in ADR 0003. The npm candidate was not published and is replaced
by the native distribution in 0.2.0.
