# Holi Specs

This directory is for normative, testable specifications. Use it for behavior
that must survive refactors, alternate implementations, or new frontends.

## What Belongs Here

- Data formats and versioning rules.
- Security and privacy constraints.
- Protocol state machines.
- Export/import behavior.
- Compatibility requirements across Rust, WASM, and web apps.
- Test vectors or links to `vectors/`.

## What Does Not Belong Here

- Product vision and boundaries: use `docs/product.md`.
- Project ownership and commands: use `docs/architecture.md` and `AGENTS.md`.
- Product lifecycle and release checks: use `docs/development.md`.
- Current priorities: use `docs/roadmap.md`.
- Durable architecture choices: use `docs/decisions/`.

## Current Spec Map

| Topic | Current Location | Notes |
| --- | --- | --- |
| QR styling and export behavior | Not yet extracted | Add a focused normative spec when changing stable export/render contracts. |
| User/Vault identity and P2P | Not yet extracted | Security-sensitive; add protocol specs before expanding connected infrastructure. |
| Typst editor and collaboration | `docs/decisions/0002-private-collaboration.md` | Move protocol details here only after the threat model is accepted. |
| Cross-implementation vectors | `vectors/` | Store reusable examples for Rust/WASM/web parity. |
| Product privacy summaries | `spec/privacy-summary-v1.md` | Required facts and wording invariants for every public tool. |

## Spec Template

Use this structure for new specs:

```md
# Spec: <name>

Status: draft | active | stable
Owner: <app/crate/track>
Last updated: YYYY-MM-DD

## Purpose

## Inputs

## Outputs

## Invariants

## Security And Privacy

## Edge Cases

## Test Vectors
```
