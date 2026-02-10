---
title: "QR Core Logic"
description: "Technical dive into high-performance QR generation in Rust."
tags: ["paper", "rust", "wasm"]
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: en
order: 2
---

An in-depth exploration of the `holi-qr` Rust crate, which powers the QR code generation across all Holi.tools applications.

## Architecture

The QR generation follows the **Core + Adapter** pattern:

1. **holi-qr** (Pure Rust): Contains all QR encoding logic
2. **wasm-qr** (WASM Adapter): Thin wrapper exposing the API to JavaScript

## Why Rust?

- **Performance**: 10x faster than pure JavaScript implementations
- **Safety**: Memory-safe without garbage collection overhead
- **Portability**: Same logic runs in CLI, WASM, and native apps
