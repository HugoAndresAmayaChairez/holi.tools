# About Holi.tools Main Hub

The **Main Hub** is the central landing page for the Holi.tools ecosystem. It serves as the gateway to all the specialized tools available in this monorepo.

## Purpose

- Provide a unified user interface for tool discovery.
- Explain browser editing/preview/export and native PDF/QR automation as two
  independent ways to work. Holi Local is an optional MCP engine, not a desktop
  window or a requirement for the web tools.
- Provide setup guidance in all seven locales, with public downloads explicitly
  pending. Do not promise automatic file synchronization or native-job preview.
- Link only to real public tools; Image, Typst, QR, Metadata, and Labs are currently available.
- Organize discovery by user outcome (Create, Transform, Inspect, and Learn) with search and local recent shortcuts.
- Give each public product a short editorial landing at `/tools/<product>/`
  while keeping a direct “open tool” action in the catalog.
- Use a restrained color-and-animal identity as a decorative recognition cue;
  it never replaces the product name, description, or accessible iconography.
- Manage branding and common navigation elements.
- Serve as the primary entry point for the `holi.tools` domain.

## Tech Stack

- **Framework:** Astro (Static)
- **Styling:** Tailwind CSS (via `@holi/configs`)
- **Background:** Shared lightweight Astro/CSS presentation
- **UI Components:** Shared via `@holi/ui`

## Product identities

| Surface     | Accent      | Sketch detail |
| ----------- | ----------- | ------------- |
| Main        | Multicolor  | Hummingbird   |
| Image       | Rust        | Chameleon     |
| Typst       | Blue        | Owl           |
| QR          | Indigo      | Moth          |
| Metadata    | Green       | Lynx          |
| Labs        | Green       | Axolotl       |
| Labs Papers | Labs accent | Origami crane |

The PNG sketches have transparent backgrounds and remain low-contrast,
decorative details. Papers uses the crane as a category symbol; it is not a
separate product identity.
