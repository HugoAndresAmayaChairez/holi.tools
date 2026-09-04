# Holi Image

## Outcome

Process several images in one understandable workspace, compare the result, and export without uploading the originals.

## Product identity

- Active domain: https://image-holi.pages.dev
- Intended custom domain: https://image.holi.tools (Pages association exists; DNS CNAME is pending)
- Palette: warm paper, charcoal ink, and terracotta accent.
- Primary flow: choose images -> select an operation -> compare -> download one or a ZIP.

## Scope

- Current: optimize, resize, centered crop, JPEG/PNG/WebP conversion, clean pixel re-encoding, and batch ZIP download.
- Deferred: accounts, cloud storage, AI enhancement, animation preservation, and remote processing.

## Data flow

File input -> volatile browser memory -> Canvas decoding and encoding -> explicit browser download. No Holi endpoint receives files, names, previews, settings, or output. Cloudflare can process IP address, access time, requested path, traffic volume, routing, and security metadata while serving the app.
