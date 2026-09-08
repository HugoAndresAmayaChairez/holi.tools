---
name: holi-qr-batch
description: Generate batches of styled QR codes as local SVG or PNG files through a connected Holi Local MCP server, optionally reusing Holi QR saved styles.
---

Use `holi_info` for the output folder and limits. Call `qr_batch` with 1–100
items, each containing exact content and a unique filename matching `format`.
Holi Local runs as a native executable; no Node or npm runtime is needed.

If tools are unavailable, report the missing MCP connection. Installing this
skill does not create it. The default installer directory is
`%LOCALAPPDATA%/Programs/HoliLocal` on Windows or
`${XDG_DATA_HOME:-$HOME/.local/share}/holi-local` on Ubuntu; it contains
`mcp.json` and `INSTALLATION.md` with resolved paths. Default output is
`<user home>/Holi/Output`. Custom paths are valid: consult `holi_info` instead
of assuming these defaults. The client must load that MCP configuration.

Use portable ASCII basenames; keep Unicode in the QR content. Do not rewrite
URLs, credentials or other payloads without a task reason.

Omit `style` for defaults, or pass a QR style v1 JSON exported by Holi QR. Local
v1 supports Rust shapes, solid colors, linear/radial gradients and liquid
effects. Text frames, images, noise, other gradients, blending and custom color
opacity are rejected. If rejected, explain the unsupported setting before
altering an existing design.

Inspect every ordered item result: a batch can partially succeed. Retry only
failed items with unused filenames, since successful files persist and cannot
be overwritten. Return successful artifact paths and explain failures.

By default, each written item reports `verified`: the server decoded the rendered
bytes in memory before saving them; it does not reread the file on disk.
With `verify: false`, this field is omitted. When verification fails, tell the
user which items failed the check, and offer a simpler style (plain ink color,
standard shapes, ECC H or a larger
size) under new filenames instead of silently delivering them.

Scan final exports at the intended print/display size before distribution.
Local verification is evidence for one decoder, not proof for every camera.
Rendering is local; the assistant provider may still see tool inputs and results.
