# Holi.tools - Main App

The central hub of the Holi.tools ecosystem. This application serves as the gateway to all tools and experiments.

Version 0.9.0 presents two independent workflows: browser editing, live preview
and export; and native PDF/QR automation through Holi Local's MCP executable.
The seven-locale setup section explains build availability, output folders,
client configuration and the AI provider's privacy boundary. Public binary
downloads and automatic web/native synchronization are not advertised as ready.
`src/release.ts` owns the current version and localized Shadow Log entry,
using package.json and the app-local runtime catalog.

## Features

- **Tools Explorer**: Unified interface to access all deployed tools.
- **Sovereign Design**: Privacy-first approach with local-first processing.
- **Glassmorphism UI**: High-end aesthetic using the `@holi/ui` design system.
- **Internationalization**: Full support for multiple languages.

## Architecture

- built with **Astro** for performance.
- uses **@holi/ui** for shared components.
- centralized configuration via **@holi/configs**.
