# About Holi QR

Holi QR is a local-first QR generator with styling, images, scanning, and
multiple export formats.

## Purpose
- Generate and style QR content in the browser without uploading the entered
  content or selected images to Holi.
- Keep the tested Rust QR core behind thin WASM adapters used by the web app.
- Explain that Cloudflare can still process connection metadata while serving
  the application.
- Use the explicit Holi theme as the single source of truth for controls,
  panels, brand marks, native form widgets, and the shared product dock.

## Tech Stack
- Astro
- Tailwind CSS via @holi/configs
- Components via @holi/ui
- Rust/WASM via `holi-qr`, `wasm-qr`, and `wasm-qr-svg`
