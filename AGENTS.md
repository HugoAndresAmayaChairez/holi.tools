# Holi.tools repository instructions

## Product intent

- Holi is web-first, local-first, and privacy legible.
- Core workflows must work without an account or remote storage.
- Never claim that a hosting or transport provider sees no metadata.
- `web/apps/test` and Labs experiments do not define production architecture.

## Read before editing

1. Read `docs/product.md` and `docs/architecture.md`.
2. Read the relevant `web/apps/<app>/about.md` or README.
3. Read `docs/development.md` for a public product change.
4. Read the relevant document in `spec/` before changing a protocol or shared
   user-facing contract.
5. Check the working tree and preserve unrelated changes.

## Repository boundaries

- `web/apps/<app>` owns product-specific pages, components, copy, state, and
  adapters.
- `web/packages/ui` owns stable components used by at least two real products.
- `web/packages/shared-configs` owns small cross-product contracts and catalogs;
  do not put product state there.
- `crates/core` contains tested pure Rust logic. `crates/wasm` contains thin
  browser adapters.
- `spec/` is normative. `docs/` explains current decisions. Avoid parallel
  planning systems or duplicated sources of truth.

## Required public shell

Every public product must provide:

- title, description, canonical URL, and only valid `hreflang` routes;
- keyboard focus, a skip link where appropriate, and useful error/empty states;
- shared configuration, donation, support, version, and Shadow Log surfaces;
- a visible privacy summary matching the current data flow;
- coherent favicon, robots, sitemap, and `llms.txt` metadata.

Reuse `@holi/ui` and the existing product layout before creating a new shell.
Keep each product's palette and work surface local to that app.

## Versions and Shadow Log

- Bump `web/apps/<app>/package.json` for every public release.
- Add the same version and date to that app's visible changelog.
- Describe user-visible behavior, privacy, compatibility, fixes, and removals;
  do not paste commit history.
- Update root `CHANGELOG.md` only as the ecosystem-level summary.
- App pages must obtain their displayed version and log from one app-level
  source, normally the app layout.

## Privacy and connected features

- Draw the flow: input -> memory -> storage -> network -> provider -> recipient.
- Opening a local file must not silently upload it.
- Disclose IP, timing, request, routing, and relay metadata where applicable.
- Do not log document content, filenames, capabilities, room keys, contact IDs,
  or message bodies.
- Direct WebRTC and relay modes have different privacy properties; label the
  active mode.
- Collaboration must remain optional. Local editing cannot depend on a room.

## Languages

- Publish only locales whose complete flow is translated.
- Menus, routes, canonical URLs, `hreflang`, and sitemap must use the same list.
- Interactive copy belongs in the app catalog when more than one locale exists.
- Review overflow, RTL, metadata, errors, privacy copy, and Shadow Log entries
  when adding a locale.

## Rust/WASM gate

Use TypeScript by default for browser APIs and UI. Add or expand Rust only when
there is a shipping web consumer, a measured security/performance/reuse benefit,
a pure tested core, a thin WASM adapter, and browser coverage. Do not create a
CLI, TUI, or public Rust library solely for architectural symmetry.

## Verification

- App build: `pnpm --filter <package> build`
- All builds: `pnpm build`
- JavaScript tests: `pnpm test`
- Generator tests: `pnpm test:generator`
- Rust: `cargo test --workspace --no-fail-fast`
- Lint: `pnpm lint`
- Before production: build/test locally, run a Wrangler dry run when supported,
  then deploy only the intended public Pages projects.

Do not deploy the Test app to production. Never publish a privacy or product
claim that is not implemented and verified.
