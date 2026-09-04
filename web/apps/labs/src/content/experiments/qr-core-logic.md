---
title: "Why Holi QR keeps a small Rust core"
description: "A decision guide for placing tested QR logic in Rust while keeping browser behavior and UI in TypeScript."
summary: "Rust earns its place when one pure, tested encoder has a shipping web consumer; browser APIs and product state remain in TypeScript."
tags: ["qr", "rust", "wasm"]
category: "QR"
format: "paper"
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: en
order: 20
---

Holi QR has a real web consumer for its encoding core, so a small Rust module can be justified. That does not mean the whole application should move to Rust.

## Architecture

The useful boundary is **pure core + thin adapter**:

1. **Core:** deterministic encoding and matrix generation with unit tests.
2. **WASM adapter:** converts browser-friendly values and returns compact output.
3. **TypeScript:** files, clipboard, canvas composition, state, accessibility, and UI.

## The gate for keeping Rust

Keep the core only while it provides a measured benefit, stays small, and has browser coverage. Do not claim a speedup without a reproducible benchmark on current browsers and hardware.

## What should not grow around it

A CLI, TUI, or public Rust package is not automatically valuable. Building those surfaces only for architectural symmetry adds release work without improving the web product.

## Verification checklist

- Compare output against known QR fixtures.
- Test the WASM boundary in the browser, not only native Rust.
- Measure bundle and initialization cost alongside encode time.
- Keep error messages meaningful after crossing the adapter.
- Confirm the TypeScript fallback or failure state remains usable.
