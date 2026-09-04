# Changelog

## 0.16.0 - 2026-09-04

### Added

- [Holi QR] 1.0.0: a workspace layout with a content rail, live stage, and docked style tabs (Colors, Shapes, Effects, Image, Frame, Advanced); a bottom sheet replaces the floating panels on phones.
- [Holi QR] Saved styles kept in the browser with JSON import/export, style links that carry the style in the URL fragment only, and an optional text frame included in every export format.
- [Holi QR] Light, dark, and transparent preview backgrounds, zoom, and keyboard shortcuts for download, copy, and tabs.

### Changed

- [Holi QR] Adopted the warm Holi editorial palette and Noto Sans; the shared dock inherits the new QR palette.
- [Holi QR] Redrew the Capsule, Chain, Water, and Pixel modules, the Diamond and Clover eye frames, and the Grid, Star, and Diamond eye balls so each matches its label and keeps the finder ratio readable; shape tiles preview the exact renderer geometry.

### Privacy

- [Holi QR] The privacy summary now states that style links live in the URL fragment, which browsers do not send to servers, and never include the QR content.

### Removed

- [Holi QR] The draggable floating panels, the legacy sidebar, and the unused HUD stylesheet.

## 0.15.2 - 2026-09-02

### Changed

- [Holi Image] Reworked the main screen as a viewport-sized application with a compact introduction and internally scrolling panels.
- [Holi Image] Reserved a stable bottom clearance so the shared Configuration, Versions, and Privacy dock does not cover workspace controls.

## 0.15.1 - 2026-09-02

### Fixed

- [Holi Metadata] Opening the first file or folder no longer crashes the interface.
- [Holi Metadata] The details inspector remains available for a single file or a small folder.

### Privacy

- [Holi Metadata] The workspace remains volatile: reloading keeps no file, folder, handle, filename, extracted metadata, or recent-item history.

## 0.15.0 - 2026-09-02

### Changed

- Redesigned Holi Metadata as a direct editorial inspector with a dedicated green palette and a clearer first action.
- Replaced Main's loose JavaScript-generated recent links with a labeled, accessible shortcut rail.
- Self-hosted the multilingual Noto Sans families used by Main and Metadata through the Holi build.

### Privacy

- Main still stores only recent tool identifiers in local browser storage.
- Metadata files remain in browser memory and are not uploaded when selected or dropped.
- Main and Metadata no longer need third-party font requests; Cloudflare can still observe ordinary page-request metadata.

## 0.14.0 - 2026-09-02

### Added

- Added localized editorial landings for Image, Typst, QR, Metadata, and Labs while preserving direct tool-opening actions in Main.
- Added transparent graphite sketch identities: hummingbird, chameleon, owl, moth, lynx, and axolotl, plus an origami crane for the Labs Papers category.
- Added Tutorials, Field notes, Experiments, and Papers format filters to the seven-language Labs library.

### Changed

- Redesigned Main as a warm editorial catalog while preserving Holi's multicolor identity, search, categories, keyboard opening, and local recents.
- Defined Papers as a format and collection inside Holi Labs, not an independent product.
- Removed the long explanatory sections from Holi Image so the product opens directly into its local workspace.

### Compatibility

- Legacy Holi QR paper URLs redirect to the matching localized Labs collection or article and are no longer advertised in QR's sitemap.

### Privacy

- The new product identities are bundled decorative PNG assets; they do not add analytics, remote media requests, accounts, or document uploads.

## 0.13.0 - 2026-09-02

### Added

- Added Holi Image 0.1.0 as one local workspace for image optimization, resize, centered crop, JPEG/PNG/WebP conversion, clean re-encoding, comparison, and batch ZIP export.
- Added complete Holi Image routes, metadata, privacy disclosures, and Shadow Log entries in all seven ecosystem languages.
- Added category filters, tool search, Ctrl/Command K quick opening, and local recent-tool shortcuts to Holi Main.

### Changed

- Reorganized the Main tool library around Create, Transform, Inspect, and Learn instead of an unstructured growing grid.
- Extended the shared palette contract with a warm light/dark identity for Holi Image.

### Privacy

- Image bytes, filenames, previews, and settings stay in volatile browser memory; Canvas exports new pixel encodings without copying source metadata blocks.
- Main stores only the identifiers of recently opened tools in local browser storage.

## 0.12.1 - 2026-09-02

### Changed

- The shared product palette contract now owns separate utility-dock surfaces for compact, expanded, tab, card, control, and border states.
- [Holi Typst] Dark-mode utility surfaces now use the editor's blue-gray material family instead of the shared neutral-gray mixture.

### Fixed

- [Holi Typst] The compact dock bar and expanded panel now visually match the dark workspace while preserving the existing light appearance and shadow-free behavior.

## 0.12.0 - 2026-09-02

### Added

- Added complete shared-shell translations for English, Spanish, Chinese, Hindi, Arabic, Bengali, and Portuguese.
- Added seven-locale product flows to Holi Typst and Holi Metadata, and real translated interface catalogs to Holi User.
- Extended the Holi Labs library shell, privacy labels, search, filters, and article routing to the ecosystem locale set.

### Changed

- Main, QR, Metadata, Typst, Labs, and User now localize their visible privacy summaries instead of falling back to English or Spanish.
- QR engineering papers publish and advertise complete editions in all seven supported languages.

### Fixed

- Removed the shared product dock's unstable outer glow while retaining theme-derived borders, surfaces, and selected-state accents.

## 0.11.0 - 2026-09-02

### Added

- [Holi Typst] Added visible PDF zoom controls and Ctrl-click navigation from the preview to the nearest source line.

### Changed

- [Holi Typst] Replaced the header-attached file panel with a full-height animated sidebar that collapses to a narrow vertical Files rail.
- [Holi Typst] Promoted project folders to the workspace root, kept per-project `images/` directories, and moved image import to the Files heading.

### Compatibility

- Existing browser workspaces are re-indexed without deleting their stored content. Connected folders using the legacy `projects/` wrapper appear flat in Holi Typst while their on-disk layout remains untouched until the user explicitly changes a file.

## 0.10.0 - 2026-09-02

### Added

- [Holi Labs] Added a bilingual practical library with seven tutorials, guides, and engineering notes, plus featured reading, search, category filters, and reading-time labels.

### Changed

- The shared product dock and glass cards now derive their surfaces, text, borders, shadows, and accent from each product's active light or dark palette.
- [Holi Main] Marked Typst as available in the public tool explorer.
- [Holi Labs] Replaced the experimental showcase with an editorial reading experience and limited public routes to fully translated English and Spanish content.

### Fixed

- [Holi QR] Fixed invisible brand marks, Generate icon, panel labels, selects, and menus when Holi's light theme differs from the operating-system theme.

## 0.9.0 - 2026-09-02

### Added

- Added a reusable `ProductUtilityDock` in `@holi/ui` with local theme and language preferences, navigation, donations, support, Shadow Log, and privacy facts.
- Added a configuration slot so each product can expose local context without forking the shared shell; Holi Typst now uses it for workspace and storage controls.

### Changed

- Main, Typst, QR, Metadata, User, and Labs now use the same bottom-right Configuration → Versions → Privacy interaction.
- The dock keeps a compact collapsed footprint and expands only upward with equal top and bottom margins.

## 0.8.0 - 2026-09-02

### Added

- [Holi Typst] Added a storage-neutral local workspace that uses browser storage by default and can write through to an explicitly connected local folder.
- [Holi Typst] Added multi-project scaffolding with per-project image folders and Typst compiler access to local project files and assets.
- [Holi Typst] Added persistent System, Light, and Dark appearance choices and a language setting limited to complete translations.

### Changed

- [Holi Typst] Moved code and PDF actions above their respective panes, replaced large import cards with compact file/project/image/folder actions, and reduced the context dock footprint.

## 0.7.0 - 2026-09-02

### Changed

- [Holi Typst] Replaced separate Configuration, Versions, and Privacy surfaces with one fixed-width context dock that expands upward.
- [Holi Typst] Added local workspace context, donation/support links, and product information to the corresponding dock panels.

## 0.6.4 - 2026-09-02

### Fixed

- [Holi Typst] Kept the Version control vertically aligned inside the bottom utility dock.

## 0.6.3 - 2026-09-02

### Fixed
- [Holi Typst] Fixed the Privacy control layout and opened its details in a full-height right sidebar.

## 0.6.2 - 2026-09-02

### Changed

- [Holi Typst] Grouped Configuration, Version, and Privacy into a compact workspace dock.
- [Holi Typst] Refined editor syntax colors and redesigned the local Files panel.
- [Holi Typst] Added visible spacing and individual paper surfaces to multi-page output.

## 0.6.1 - 2026-09-02

### Changed

- Replaced the full-width privacy/version footer with two compact floating controls.
- Privacy now opens from the left into a dedicated details drawer; Version Log opens from the right.
- Synchronized patch versions and visible Shadow Logs across every public Holi product.

## 0.6.0 - 2026-09-02

### Added

- Added visible, expandable privacy summaries across Main, Typst, QR, Metadata, User, and Labs.
- Added a concise `AGENTS.md` contract and maintained product, architecture, development, privacy, roadmap, and decision documentation.
- Added shared donation and support surfaces to the public product shell.

### Changed

- Refocused Holi as a web-first product family with selective Rust/WASM infrastructure.
- Synchronized package versions and visible Shadow Logs for every public product release.
- Clarified that local document processing does not hide IP, time, traffic, or routing metadata from Cloudflare and connected providers.

### Removed

- Removed the Conductor planning framework and obsolete `.agent` workflow after migrating their useful guidance.
- Removed the Holi CLI/TUI product surface while retaining the shipping Rust QR core.

## 0.5.0 - 2026-05-31

### Added

- [Holi QR] Added BG, Paper, Ink, and Logo image controls with clearer default bounds, thumbnails, quick remove actions, and logo fit modes.
- [Holi QR] Added PNG, JPEG, WEBP, SVG, and PDF download options with selectable export sizes.
- [Holi QR] Added a permission-safe copy fallback that shows the generated PNG when the browser blocks image clipboard writes.
- [Holi QR] Added cleaner LLM-facing project context files and release documentation for the QR app.

### Changed

- [Holi QR] Improved QR style presets, liquid/blur filters, color controls, and gradient behavior.
- [Holi QR] Rebuilt brand logos from deterministic SVG path data with high-resolution WebGL textures and clean contain/reset behavior.
- [Holi QR] Updated Paper and Background layer sizing so Paper frames the ink area and Background uses a larger outer composition frame.

### Fixed

- [Holi QR] Fixed styled QR copy/export so PNG output preserves the visible image, shapes, layers, and WebGL effects.
- [Holi QR] Fixed BG visibility, Paper sizing, logo container toggling, conic gradient seams, and brand logo preview pixelation.

## 0.0.1 - 2026-01-17

- migracion a i18 y soporte de espanol e ingles
