# About Holi Typst

Holi Typst is a local-first browser workspace for the Typst typesetting
language. It is designed for technical writing that starts quickly, keeps the
working copy on the device, and exports without requiring an account.

## What It Uses

- Astro for the application shell.
- Vanilla TypeScript and CodeMirror 6 for the editor workflow.
- Typst WebAssembly packages for compilation, preview, and PDF export.
- IndexedDB for the default browser workspace and editor preferences.
- Optional File System Access integration for a user-selected local folder;
  permission is requested by an explicit action and files are written directly
  to that folder.
- A consistent `<project>/` workspace structure with per-project assets in
  `images/`, without a redundant `projects/` wrapper.
- A full-height Files sidebar, PDF zoom controls, and approximate Ctrl-click
  navigation from the preview to the nearest source line.
- `@holi/ui` for shared Holi product components.
- The shared Holi product dock for configuration, releases, support, privacy,
  and product information, with an app-local workspace context section.

## Privacy Boundary

Document contents are processed locally in the current version. Cloudflare can
still process connection metadata when serving the site, including IP address,
request time, routing information, and traffic volume. Collaboration is planned
but is not enabled or advertised as available today.

See `src/pages/privacy.astro` for the user-facing disclosure and
`../../../spec/privacy-summary-v1.md` for the ecosystem contract.
