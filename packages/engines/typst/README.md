# @holi/engine-typst

Typst compiler orchestration and diagnostics for the browser, plus the canonical
`src/templates.v1.json` manifest shared with the native Holi Local renderer.
Browser adapters own WASM loading, network and storage. Holi Local 0.2 compiles
Typst natively and embeds the same template source, schemas and examples; it
does not load this package's JavaScript compiler adapter. That adapter remains
available to the explicit legacy MCP reference and its tests.

See `spec/document-template-v1.md` and `CHANGELOG.md` for the retained v1 data
contract and template changes.
