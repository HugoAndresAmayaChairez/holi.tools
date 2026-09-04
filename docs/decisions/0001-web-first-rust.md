# ADR 0001: Holi is web-first; Rust is selective infrastructure

Status: accepted — 2026-09-02

## Context

Maintaining a web suite, public Rust library, and terminal interface creates
three product surfaces. The terminal implementation only printed SVG for one QR
command and had no distribution or product integration.

## Decision

The web is the product. Remove the CLI/TUI. Keep tested Rust cores and thin WASM
adapters only for shipping web consumers with a measurable security,
performance, or reuse benefit.

## Consequences

The QR and narrow P2P cores remain. Production apps stop depending on the
monolithic `wasm-core`. Experimental crates can be retired independently after
their remaining Test consumers migrate. Git history preserves the removed TUI.
