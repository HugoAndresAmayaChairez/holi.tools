# Holi.tools

Holi.tools is a family of focused, local-first web tools. Files and document
contents stay on the device for core workflows; any connected feature must
explain what leaves the device and which service can observe it.

## Public products

| Product | Package | URL | Role |
| --- | --- | --- | --- |
| Hub | `holi-main` | <https://holi.tools> | Product discovery and ecosystem entry point. |
| Typst | `holi-typst` | <https://typst.holi.tools> | Local browser editing, preview, and export. |
| QR | `holi-qr` | <https://qr.holi.tools> | Local QR generation, styling, and export. |
| Metadata | `holi-metadata` | <https://metadata.holi.tools> | Local inspection of privacy-sensitive file metadata. |
| Image | `holi-image` | <https://image-holi.pages.dev> | Local image optimization, resize, crop, conversion, clean export, and batch download. |
| User | `holi-user` | <https://user.holi.tools> | Experimental local identity and collaboration client. |
| Labs | `holi-labs` | <https://labs.holi.tools> | Research notes and technical experiments. |

`web/apps/test` is an internal sandbox and is not a public product.

## Start locally

```bash
pnpm install
pnpm dev
```

Build one product with `pnpm --filter holi-<product> build`. Run JavaScript
tests with `pnpm test` and Rust tests with
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
packages, and Cloudflare Pages. Rust/WASM is selective internal infrastructure,
not a separate Holi product or a default implementation requirement.
