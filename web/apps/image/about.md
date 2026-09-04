# About Holi Image

Holi Image combines the image operations people normally repeat across several sites into one local browser workspace. It accepts JPEG, PNG, and WebP files, keeps a multi-image queue, previews the processed result, and exports one file or a batch ZIP.

## Shared shell

- Astro and vanilla TypeScript
- @holi/ui components and BaseLayout
- @holi/configs contracts

## Interface contract

- On desktop, the primary workspace fits the viewport instead of placing the
  controls below an editorial page scroll.
- Long queues and narrow-screen layouts scroll inside the workspace while a
  dedicated bottom clearance keeps the shared utility dock away from actions.

## Privacy boundary

- Input: explicit file picker or drop.
- Memory: source files, previews, settings, and encoded output remain in volatile tab memory.
- Storage: image data is not persisted; the shared Holi theme and language preferences may be stored locally.
- Network: no image processing request is made. Cloudflare serves static assets and may process ordinary request and routing metadata.
- Output: downloads are explicit. Canvas creates a new encoded image without copying source metadata blocks.
