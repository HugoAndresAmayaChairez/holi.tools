# Holi Local Shadow Log

## 0.1.0 — 2026-09-05

- Added local PDF compilation and bundled report/letter templates with JSON data.
- Added styled QR batches in SVG and PNG using the web app's Rust/WASM engine; every written item is read back with the local decoder and reports `verified`.
- Added stdio and authenticated loopback Streamable HTTP MCP transports.
- Require an explicit output folder; existing files are never overwritten.
- Bundle fonts for offline use. Typst package downloads require operator opt-in.
- Return structured diagnostics and artifact paths without logging document data.
- Metadata, image tools, DOCX, desktop installers and cloud rendering are not included.

Pre-publication: real Claude Desktop/Code acceptance on Windows and macOS is
tracked in ADR 0003. Installation from npm is available only after publishing.
