import type { VersionEntry } from "@holi/configs/changelogs";

export const typstChangelog: VersionEntry[] = [
  {version: "0.8.1", date: "2026-09-05", changes: ["PDF export and preview now use the same compilation and diagnostic contracts as Holi Local; browser workspace files and existing document behavior are preserved"]},
  {
    version: "0.8.0",
    date: "2026-09-04",
    changes: [
      "Compiler errors (and warnings, when the compiler reports them) are now readable messages with file, line, and column instead of a raw debug dump; they are underlined in the editor with a gutter marker, and each location jumps to the source, even in another project file",
      "Ctrl+S saves immediately and Ctrl+Shift+S exports the PDF; pending edits are written when the tab is hidden or closed and before switching files or workspaces, and the browser asks before leaving with unsaved changes",
      "Tab indents in the editor (Ctrl+M toggles tab focus mode for keyboard navigation), and the preview refits its width when the panes resize unless you zoomed by hand",
      "When the compiler cannot be loaded, the preview explains it in your language and offers a retry; the unclosed-math and PDF status messages are translated too",
      "Fixed the offline cache keeping a new copy of the app and the 28 MB compiler for every service-worker restart; caches are now versioned per release and old ones are removed",
    ],
  },
  {
    version: "0.7.2",
    date: "2026-09-02",
    changes: [
      "Added the transparent owl sketch as a quiet identity detail inside the Files workspace",
      "Kept the editor, PDF preview, controls, and local storage behavior unchanged",
      "Preserved the Typst-owned light and dark surface tokens for the shared utility dock",
    ],
  },
  {
    version: "0.7.1",
    date: "2026-09-02",
    changes: [
      "Matched the compact and expanded utility dock to Typst's blue-gray dark workspace surfaces",
      "Separated product dock backgrounds, tabs, cards, controls, and borders into palette-owned tokens",
      "Kept the existing light appearance and removed no-glow behavior unchanged",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-09-02",
    changes: [
      "Added complete editor, workspace, PDF, privacy, configuration, and error routes in all seven Holi languages",
      "Added RTL layout for Arabic while preserving Typst source direction and keyboard behavior",
      "Removed the unstable outer glow from the shared product dock",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-09-02",
    changes: [
      "Promoted each project to a top-level workspace folder and removed the redundant visible projects wrapper",
      "Migrated browser workspace indexes without deleting document contents and flattened legacy connected folders only in the editor view",
      "Rebuilt Files as a full-height animated sidebar that collapses to a narrow vertical rail",
      "Moved image import to the right side of the Files heading and added visible zoom controls to the PDF pane",
      "Added Ctrl-click navigation from the preview to the nearest source line with an explicit approximate-location label",
    ],
  },
  {
    version: "0.5.1",
    date: "2026-09-02",
    changes: [
      "Made the shared product dock derive its surface, text, borders, and accent from the active Typst palette",
      "Aligned shared card styling with explicit Holi light and dark theme choices",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-09-02",
    changes: [
      "Moved Configuration, Versions, and Privacy onto the shared Holi product dock",
      "Kept workspace details and local folder controls as a Typst-specific configuration section",
      "Unified local theme, language, navigation, donations, support, and Shadow Log behavior with the other Holi tools",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-02",
    changes: [
      "Moved writing and PDF actions into compact toolbars above the pane they affect",
      "Added persistent System, Light, and Dark appearance choices plus an English language setting",
      "Introduced one local workspace model backed by browser storage or an explicitly connected folder",
      "Added a multi-project structure with per-project image folders and compiler support for local assets",
      "Replaced large import cards with compact file, project, image, folder, and refresh actions",
      "Reduced the collapsed Configuration, Versions, and Privacy dock height and outer margin",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-02",
    changes: [
      "Replaced separate menus and drawers with one context dock that expands only upward",
      "Added live local-workspace context to Configuration",
      "Placed version history, donations, and support inside Versions",
      "Placed the privacy summary and Holi Typst overview together inside Privacy",
    ],
  },
  {
    version: "0.2.2",
    date: "2026-09-02",
    changes: [
      "Removed the leftover floating offset from the inline Version control",
      "Kept Configuration, Version, and Privacy centered in one unbroken dock row",
    ],
  },
  {
    version: "0.2.1",
    date: "2026-09-02",
    changes: [
      "Fixed the Privacy control shifting outside the bottom utility dock",
      "Changed Privacy into a full-height right sidebar that keeps the workspace visible",
      "Kept Configuration, Version, and Privacy aligned as one compact control group",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-02",
    changes: [
      "Grouped Configuration, Version, and Privacy in a compact bottom-right workspace dock",
      "Replaced the inherited high-contrast Typst syntax colors with a calmer, readable editor palette",
      "Redesigned the local Files panel with clearer import, file, rename, and delete controls",
      "Separated multi-page output into distinct sheets with spacing, paper backgrounds, and shadows",
      "Removed the unavailable Papers shortcut from Configuration",
      "Made the privacy summary expandable without requiring JavaScript",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-09-02",
    changes: [
      "Separated privacy and Version Log into matching floating controls",
      "Moved document privacy details into a dedicated glass drawer",
      "Removed the status bar from the editor workspace",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-09-02",
    changes: [
      "Made the privacy summary explicit about local document processing and Cloudflare connection metadata",
      "Made the current version and Shadow Log available on the editor and privacy pages",
      "Added shared donation and support access while keeping collaboration disabled by default",
    ],
  },
  {
    version: "0.0.1",
    date: "2026-09-02",
    changes: [
      "Added the first browser editor beta with local files and live Typst preview",
      "Added local source and PDF export",
      "Added a visible privacy summary for processing, storage, and hosting metadata",
    ],
  },
];
