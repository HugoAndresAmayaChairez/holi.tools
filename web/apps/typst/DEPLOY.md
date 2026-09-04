# Holi Typst – Cloudflare Pages (WASM > 25 MiB)

Cloudflare Pages rejects any **single file > 25 MiB**. The Typst compiler WASM
(`typst_ts_web_compiler_bg.wasm`) is ~28 MiB, so it **cannot** be deployed as a
Pages static asset.

## What the build does

`pnpm -C web/apps/typst build` runs a post-build patch:

- Rewrites the built JS to load the compiler from `/wasm/typst_ts_web_compiler_bg.wasm`
  (or `TYPST_COMPILER_WASM_URL` if set at build time).
- Removes the large `dist/_astro/typst_ts_web_compiler_bg.*.wasm` file so Pages deploy succeeds.

## What you must provide in production

Serve the compiler WASM at:

- `/wasm/typst_ts_web_compiler_bg.wasm` (recommended, same-origin)

or build with:

- `TYPST_COMPILER_WASM_URL="https://your-host/path/to/typst_ts_web_compiler_bg.wasm"`

## R2 + Pages Functions (recommended)

This repo includes a Pages Function at `functions/wasm/[name].ts` that serves
`/wasm/<name>` from an R2 bucket bound as `HOLI_WASM`.

Wrangler config: `wrangler.toml` binds `HOLI_WASM` to bucket `holi-wasm`.

Upload the compiler WASM to R2 (remote):

```bash
wrangler r2 bucket create holi-wasm
wrangler r2 object put holi-wasm/typst_ts_web_compiler_bg.wasm \
  --file node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm \
  --content-type application/wasm \
  --remote
```

## Suggested hosting options

- **Cloudflare Worker + R2**: store the `.wasm` in R2 and serve it from a Worker route
  at `/wasm/typst_ts_web_compiler_bg.wasm` (keeps it same-origin so the service worker can cache it).
- **External static host/CDN**: set `TYPST_COMPILER_WASM_URL` during build.
