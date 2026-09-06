---
name: holi-qr-batch
description: Generate batches of styled QR codes as local SVG or PNG files through a connected Holi Local MCP server, optionally reusing Holi QR saved styles.
---

Use `holi_info` for the output folder and limits. Call `qr_batch` with 1–100
items, each containing exact content and a unique filename matching `format`.
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

Each written item reports `verified`: the server read the file back with its
local decoder. When it is false, tell the user which items failed the check,
and offer a simpler style (plain ink color, standard shapes, ECC H or a larger
size) under new filenames instead of silently delivering them.

Scan final exports at the intended print/display size before distribution.
Local verification is evidence for one decoder, not proof for every camera.
Rendering is local; the assistant provider may still see tool inputs and results.
