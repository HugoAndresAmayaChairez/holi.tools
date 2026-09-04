# Architecture

## Repository map

```text
web/apps/                 Deployable Astro applications
web/packages/ui/          Stable shared layouts and UI primitives
web/packages/shared-configs/ Small catalogs and shared contracts
crates/core/              Pure Rust logic with host tests
crates/wasm/              Thin browser adapters and experiments
spec/                     Normative, testable contracts
docs/                     Current product and engineering guidance
scripts/                  Maintained repository automation
```

pnpm workspaces and Turborepo coordinate the JavaScript applications. Cloudflare
Pages serves each public app as a separate project. Connected collaboration may
later use a Worker and Durable Object, but the static/local workflow must not
depend on those services.

## Application ownership

Product-specific state, translations, pages, adapters, and styles stay inside
`web/apps/<app>`. Shared packages must not become a shortcut for coupling every
app to one implementation. A component moves to `@holi/ui` only after two real
consumers demonstrate a stable API.

`ProductUtilityDock` is the public-shell owner for Configuration, Versions, and
Privacy. It keeps theme and language preferences browser-local, renders the
app's visible Shadow Log and privacy facts, and exposes donation/support entry
points. Apps may add a configuration slot for domain context, but the shared
component must not read or own product state. Its visual tokens derive from the
active product palette. Each palette can refine compact, expanded, tab, card,
control, and border surfaces through the `--color-dock-*` contract while text
and accents continue to inherit `--color-text` and `--color-accent`. The dock
does not maintain an independent product skin.

Metadata currently uses React for its complex inspector surface; this is an
explicit product-local exception, not the default for new apps. Astro remains
the shell and deployment unit.

Holi Typst exposes one app-local workspace contract. IndexedDB backs the default
browser workspace; an explicitly selected File System Access directory can
replace that backing store without changing the editor or compiler flow. Both
modes use `<project>/` roots and per-project `images/` folders. Legacy
connected folders that still contain a `projects/` wrapper are presented as a
flat workspace without silently moving or deleting files on disk. Directory
handles remain local in IndexedDB, permissions are checked on return, and a
missing permission falls back to the browser workspace rather than blocking the
editor.

## Rust and WASM

Rust is internal web infrastructure, not an independent Holi product.

| Area | Decision |
| --- | --- |
| `holi-qr`, `wasm-qr`, `wasm-qr-svg` | Keep for the shipping QR engine. |
| `holi-p2p` | Keep narrow for tested protocol primitives. |
| `wasm-crypto`, `wasm-p2p` | Keep on probation for Holi User; require browser and threat-model coverage. |
| `wasm-core` | No production consumers; retain only while Test experiments need migration. |
| `wasm-qr-lite` | Quarantined until mutable-static warnings and test coverage are resolved. |
| `wasm-renderer` | Paused experiment without a shipping consumer. |

New Rust work must have a named web consumer and a measured advantage over
strict TypeScript. Browser APIs, IndexedDB/OPFS, DOM state, and routine UI logic
default to TypeScript.

## Deployment

Public Pages projects are `holi`, `typst-holi`, `qr-holi`, `metadata-holi`, `image-holi`,
`user-holi`, and `labs-holi`. The Test project is not part of a production
release. Typst places its large compiler WASM in R2 through its existing build
patch and Pages Function proxy; see `web/apps/typst/DEPLOY.md`.
