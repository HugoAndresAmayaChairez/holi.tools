# Holi Typst (`typst.holi.tools`)

> A local-first Typst workspace for writing, previewing, and exporting technical
> documents in the browser.

## Product Philosophy

- **Local by default:** document compilation, preview, persistence, and export
  happen on the device.
- **No account required:** the current editor does not require signup or cloud
  document storage.
- **Honest boundaries:** the product distinguishes document content from the
  connection metadata visible to its hosting provider.
- **Collaboration later:** encrypted, session-based collaboration is a planned
  beta, not a current product claim.
- **Sustainable public tool:** core writing remains accessible; donations support
  hosting and continued development.

## Current Product

- CodeMirror Typst editor with syntax support, undo/redo, and soft wrap.
- Live SVG preview and PDF export through Typst WASM.
- Multiple local projects, compact file and image actions, rename, delete, and local autosave.
- One workspace model backed by browser storage or an explicitly connected
  local folder, with the same `projects/<name>/images/` structure in both.
- Downloadable `.typ` source and PDF output.
- Installable PWA shell and offline continuation after resources have loaded.
- A visible privacy summary and detailed disclosure.
- A unified bottom-right context dock that expands upward for workspace details,
  release history, donations, support, privacy, and product information.

The current release is English-only. Additional languages are not listed until
the complete editor workflow, metadata, and error states are translated.

## Privacy Model Today

Opening, editing, previewing, and exporting do not upload document contents to
Holi. Projects live in browser storage on the current device unless a person
explicitly connects a local folder, in which case project files are read from
and written to that folder. Loading the app or opening external documentation requires a network, and Cloudflare can process
technical metadata such as IP address, request time, routing data, and traffic
volume.

## Collaboration Beta Direction

The first collaborative release will use local projects plus ephemeral sharing
sessions. A Worker and one Durable Object per room will coordinate encrypted
messages without receiving document keys. Direct WebRTC will favor speed; an
optional TURN relay mode will prevent peers from seeing one another's network
address. Contacts will start as local aliases for verified public keys rather
than a global friend graph.

This feature cannot ship until its threat model, retention rules, end-to-end key
flow, direct/relay labels, and browser tests are complete.

## Technical Architecture

- Astro app shell with vanilla TypeScript and CodeMirror 6.
- `@myriaddreamin/typst.ts` compiler and renderer in WebAssembly.
- IndexedDB/browser storage for the default workspace and File System Access
  handles for optional local-folder workspaces.
- `@holi/ui` for the shared shell, overlays, changelog, and privacy summary.
- No React runtime.

## Success Signals

- A person completes and exports a real document.
- The editor recovers local work reliably after reloads or connection loss.
- Returning users and voluntary support grow without introducing accounts first.
- Collaboration sessions complete without exposing plaintext to coordination
  infrastructure.
