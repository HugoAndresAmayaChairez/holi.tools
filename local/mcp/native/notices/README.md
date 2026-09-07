# Supplemental dependency notices

`scripts/package-local.mjs` collects license and notice files shipped in the
non-development Cargo dependency graph of `holi-mcp` for the native host. The
files here fill gaps in published crates. They are packaging inputs, not runtime
resources.

`index.json` and `extra-manifest.json` bind each supplement to its crate name,
version, Cargo.lock archive checksum and, where available, the exact commit from
`.cargo_vcs_info.json`. Each preserved file has an origin and SHA-256. Packaging
verifies those values and refuses uncovered dependencies or changed texts.
Upstream license files retain their original bytes.

The two explicit exceptions are glidesort and simd_helpers: their published
revisions declare a license but omit a standalone license text. Their original
declarations accompany the complete selected standard license text. No copyright
holder or year is invented. The older encoding-index crates have no VCS metadata;
their source-header notices and Cargo declarations are preserved against the
locked archive checksum with the complete CC0 text.

To check coverage without building an archive:

```sh
node scripts/package-local.mjs --check-notices
node scripts/package-local.mjs --check-notices=x86_64-unknown-linux-gnu
node scripts/package-local.mjs --check-notices=aarch64-apple-darwin
```

These target checks inspect dependency metadata; they do not compile or run that
platform. `cargo fetch --locked` supplies registry metadata before offline checks.
