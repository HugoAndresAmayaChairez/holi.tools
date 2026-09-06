# Holi QR

Local-first QR workspace: generate, style, verify, and export QR codes in the
browser. Content and images never leave the device; Cloudflare only serves the
static app. Live at <https://qr.holi.tools>.

## What it does

- Content types: URL, text, phone, email, SMS, vCard, WiFi, location, event,
  Bitcoin, Facebook, X, YouTube, App Store, Play Store, plus a local scanner.
- Style: ink, paper, and background layers; gradients; module, eye-frame, and
  eye-ball shapes previewed with the exact renderer geometry; liquid and noise
  effects; textures and logos; an optional text frame ("Scan me").
- Saved styles (browser-local) with JSON import/export, and style links that
  encode the style in the URL fragment only.
- Live scannability check with the local decoder.
- Export PNG, JPG, WebP, PDF (raster) and SVG (vector) at 512–4096 px, or copy
  the PNG to the clipboard.

## Layout

`src/components/QrWorkspace.astro` composes the shell:

| Area | Component | Notes |
| --- | --- | --- |
| Toolbar | `workspace/WorkspaceToolbar.astro` | status pill (`#btn-verify`), copy, style link, download menu |
| Rail | `workspace/ContentRail.astro` | content types, forms (`ContentForms.astro`), saved styles |
| Stage | `workspace/Stage.astro` | empty state, `#qr-output` render target, preview background, frame |
| Inspector | `workspace/Inspector.astro` | docked tabs hosting `panels/*.astro`; bottom sheet under 900px |

`src/lib/boot.ts` is the client entry: icons → `qr-controller` → content types
→ `lib/workspace/shell.ts` (collapse, tabs, hero, status, presets, links,
shortcuts). `@holi/engine-qr` owns the portable style shape while
`lib/workspace/style.ts` adapts it to the browser;
`lib/workspace/frame.ts` renders and exports the text frame.

## Engine

- `crates/core/holi-qr` — pure Rust: matrix, shape geometry, styled SVG,
  optional `verify` feature (rxing + resvg).
- `crates/wasm/wasm-qr` — browser and Node adapter; also rasterises the body-shape atlas
  and eye mask the WebGL preview samples, so preview and export share geometry.
- `src/lib/webgl-liquid-renderer.ts` — WebGL preview and high-resolution capture.
- `src/lib/wasm-svg-renderer.ts` — vector export.

Shape thumbnails come from `src/lib/constants/shape-previews.json`, emitted by
`cargo run --release --example shape_previews` inside `crates/core/holi-qr`.
`cargo run --release --features verify --example verify_shapes` decodes every
body/frame/ball combination with the local verifier.

## Develop

```bash
pnpm --filter @holi/wasm-qr build   # wasm-pack (needs the wasm32 target)
pnpm build:engines
pnpm --filter holi-qr dev
pnpm --filter holi-qr build
pnpm --filter holi-qr test
```

Bump `package.json` and add the version to `qrAppChangelog` in
`web/packages/shared-configs/src/changelogs.ts` for every public release.
