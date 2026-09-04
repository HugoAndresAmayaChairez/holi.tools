# About Holi Metadata

Holi Metadata is a local-first inspector for file metadata. It is designed to
help people understand what a file reveals before they share it.

## Purpose
- Inspect file metadata in the browser without uploading files.
- Highlight privacy-sensitive signals such as GPS, author fields, timestamps,
  creation software, and Office document organization fields.
- Export normalized reports as JSON or CSV.

## Current Support
- Images: JPEG EXIF/XMP, PNG text/iTXt metadata, dimensions and preview.
- Documents: PDF info/XMP and DOCX core/app properties.
- Media: MP3 ID3, audio/video duration and basic dimensions.
- Forensics: SHA-256 for selected files.

## Tech Stack
- Astro
- React
- Tailwind CSS via `@holi/configs`
- Shared Holi UI via `@holi/ui`

## Interface contract
- The first screen exposes the file and folder actions without requiring an
  account, tutorial, or remote workspace.
- Metadata has its own green light/dark palette while shared configuration,
  version, donation, support, and privacy surfaces come from `@holi/ui`.
- Multilingual Noto Sans files are bundled by Holi; the page does not contact a
  third-party font service.
- Files, folder handles, filenames, extracted metadata, and reports live only in
  the active tab. Reloading or returning later starts an empty workspace; Holi
  Metadata does not keep a recent-file or recent-folder history.
