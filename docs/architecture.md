# Architecture

## Repository map

```text
web/apps/                 Deployable Astro applications
web/packages/ui/          Stable shared layouts and UI primitives
web/packages/shared-configs/ Small catalogs and shared contracts
packages/engines/          Runtime-independent TypeScript engines (QR and Typst)
local/mcp/native/          Holi Local native Rust MCP executable
local/installer/           Offline per-user Windows/Ubuntu setup executable
local/mcp/                 Bundled fonts, skill packs and MCP test tooling
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

Rust remains internal infrastructure and powers the native Holi Local
executable. This explicitly approved local runtime shares the QR core with the
shipping browser consumer and compiles Typst natively. It does not create a
public Rust library or a standalone document-generation CLI.

| Area                                | Decision                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `holi-qr`, `wasm-qr`, `wasm-qr-svg` | Keep for the shipping QR engine.                                            |
| `holi-p2p`                          | Keep narrow for tested protocol primitives.                                 |
| `wasm-crypto`, `wasm-p2p`           | Keep on probation for Holi User; require browser and threat-model coverage. |
| `wasm-core`                         | No production consumers; retain only while Test experiments need migration. |
| `wasm-qr-lite`, `wasm-renderer`     | Retired under ADR 0003; no consumers.                                       |

New browser Rust work must have a named web consumer and a measured advantage
over strict TypeScript. Browser APIs, IndexedDB/OPFS, DOM state, and routine UI
logic default to TypeScript. Holi Local's native runtime is the explicit ADR
0003 exception: one executable replaces the Node/WASM runtime stack, retaining
the tested contracts and subprocess isolation. Performance claims require
measurements; language choice alone does not establish them.

## Shared engines and Holi Local

`@holi/engine-typst` owns browser compiler orchestration, virtual workspace mounting,
diagnostics and bundled report/letter templates. `@holi/engine-qr` owns portable
styles/layers, shape catalogs and the SVG render adapter. Neither package owns
DOM, disk or network access. Browser loaders, editor state, storage, translations
and WebGL/canvas remain in their apps. Engines ship compiled JavaScript and
types and source exports for the web bundler. The canonical
`packages/engines/typst/src/templates.v1.json` is consumed by the web engine and
embedded in the native server; template data schemas and source have one owner.

The `holi-mcp` crate in `local/mcp/native` embeds native Typst, `holi-qr`, fonts,
templates and skills in one executable; end users need no Node/npm installation
or browser WASM compiler. Optional Typst package WASM plugins run through
Typst's embedded interpreter inside the worker. The server supplies a memory-only Typst filesystem in disposable native
subprocesses. An explicit existing output root is mandatory; tool calls cannot
change it or overwrite files. Stdio is the default. Streamable HTTP binds only
loopback and requires token, Host and Origin validation. Typst package downloads
are disabled unless the operator opts in; the AI client's own network/privacy
behavior is outside the server's control. See `spec/mcp-tools-v1.md` and
`local/mcp/README.md` for limits and the complete flow. The prior TypeScript
server is retained only as an explicit migration reference and legacy test
target, not a distributed runtime. Its npm package is private development
tooling. Native artifacts carry license, font notices, skills and source details.

`holi-local-setup` embeds that complete archive and installs it into a versioned
per-user directory. It generates absolute MCP paths and, when a client is
explicitly selected, merges its Holi entry with a backup. The independent output
folder survives updates. The installer does not add a service, PATH entry,
network listener or browser bridge. See `spec/native-install-v1.md` for the
installation contract and `local/mcp/INSTALL.md` for client instructions.

`wasm-qr` builds `pkg/` for browsers and `pkg-node/` as an independent QR oracle
for integration tests and the legacy reference. Native QR calls `holi-qr`
directly. PNG rendering uses the existing resvg/tiny-skia stack; no second
rasterizer or QR implementation is introduced. Reusable vectors live in `spec/vectors/`.
The obsolete top-level `conductor/`, `papers/` and `vectors/` were retired;
published Papers content remains inside Labs. `wasm-core` stays until Test's
vault/webgpu imports are migrated.

## Deployment

Public Pages projects are `holi`, `typst-holi`, `qr-holi`, `metadata-holi`, `image-holi`,
`user-holi`, and `labs-holi`. The Test project is not part of a production
release. Typst places its large compiler WASM in R2 through its existing build
patch and Pages Function proxy; see `web/apps/typst/DEPLOY.md`.
