# Holi.tools

Holi.tools is a family of focused, local-first web tools. Files and document
contents stay on the device for core workflows; any connected feature must
explain what leaves the device and which service can observe it.

## Public products

| Product  | Package         | URL                            | Role                                                                                  |
| -------- | --------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| Hub      | `holi-main`     | <https://holi.tools>           | Product discovery and ecosystem entry point.                                          |
| Typst    | `holi-typst`    | <https://typst.holi.tools>     | Local browser editing, preview, and export.                                           |
| QR       | `holi-qr`       | <https://qr.holi.tools>        | Local QR generation, styling, and export.                                             |
| Metadata | `holi-metadata` | <https://metadata.holi.tools>  | Local inspection of privacy-sensitive file metadata.                                  |
| Image    | `holi-image`    | <https://image-holi.pages.dev> | Local image optimization, resize, crop, conversion, clean export, and batch download. |
| User     | `holi-user`     | <https://user.holi.tools>      | Experimental local identity and collaboration client.                                 |
| Labs     | `holi-labs`     | <https://labs.holi.tools>      | Research notes and technical experiments.                                             |

`web/apps/test` is an internal sandbox and is not a public product.

[Holi Local](local/mcp/README.md) exposes native Typst and the shared Rust QR
core to AI assistants through a native MCP executable. Version 0.2 includes
offline PDF templates, custom Typst compilation and SVG/PNG QR batches without
requiring a Node/npm installation or browser WASM compiler. Native distribution
and real-client acceptance are tracked in ADR 0003.

## Start locally

```bash
pnpm install
pnpm dev
```

Build shared engines with `pnpm build:engines` before a direct app build.
Build one web product with `pnpm --filter holi-<product> build`. Build Holi Local
with Rust 1.93+ using `cargo build -p holi-mcp --profile native` (also available
as `pnpm build:local`); the executable is in `target/native`.
The independent MCP acceptance client needs Node 22+ and a built QR WASM test
oracle (`pnpm --filter @holi/wasm-qr build:node`) before `pnpm test:local`.
Those test dependencies are not needed to run the native product. Run all
JavaScript/MCP tests with `pnpm test` and Rust workspace tests with
`cargo test --workspace --no-fail-fast`.

## Sources of truth

- [AGENTS.md](./AGENTS.md): concise repository rules for people and agents.
- [docs/product.md](./docs/product.md): product boundaries and priorities.
- [docs/architecture.md](./docs/architecture.md): applications, packages, Rust,
  and deployment boundaries.
- [docs/development.md](./docs/development.md): create, update, localize, verify,
  and release a product.
- [docs/privacy.md](./docs/privacy.md): privacy model and truthful copy rules.
- [docs/roadmap.md](./docs/roadmap.md): Now / Next / Later priorities.
- [spec/README.md](./spec/README.md): normative, testable contracts.

## Technology

The web product uses pnpm workspaces, Turborepo, Astro, shared UI/config
packages, and Cloudflare Pages. Browser Rust/WASM remains selective internal
infrastructure. Holi Local is the explicit native runtime: Rust owns the MCP
server and document/QR workers while the browser retains its existing UI stack.
