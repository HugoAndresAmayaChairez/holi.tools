# Spec: Document template v1

Status: active (implementation review pending ADR 0003 acceptance)
Owner: Holi Local / Typst
Last updated: 2026-09-05

## Inputs

A template manifest has `v: 1`, a lowercase `id`, `name`, `description`,
`entrypoint: "main.typ"`, and a JSON Schema `dataSchema`. Templates ship with
their source. v1 includes `report` and `letter`; their schemas reject unknown
fields. Callers supply JSON data, never text substitutions into Typst code.

`prepareTemplate` validates data and mounts UTF-8 JSON at `data.json` beside
`main.typ`. Templates read it with `json("data.json")`. Strings remain text,
including quotes, backslashes, Unicode and Typst markup characters.

The compiler accepts source plus virtual workspace files. Paths are portable,
relative, slash-separated, and unique; no parent segments, drive letters, UNC,
NUL, or host filesystem access. Local v1 accepts at most 100 files, 1 MiB per
source and 8 MiB total decoded input. Templates are bundled and need no network.

## Outputs and diagnostics

Compilation yields PDF bytes or a null result with diagnostics. Diagnostics
have `severity` (error/warning/info), `message`, `hints`, workspace-relative
`path`, `package`, and optional `start`/`end` with 1-based `line` and `column`.
Compiler hint/trace entries attach to the preceding diagnostic. Source content
may occur in diagnostics: return them to the requesting client, never log them.

## Privacy and limits

The runtime owns fonts, package loading and storage. Holi Local bundles fonts,
uses a memory-only filesystem, and disables package downloads by default.
Only the operator can enable downloads, with `--allow-packages`; a tool cannot
enable them. Missing preview packages are fetched on demand from
`https://packages.typst.org`, kept in memory for that job and never sent document
data. The provider sees IP, timing, package name/version and request metadata.
Other namespaces, redirects, arbitrary URLs and archive traversal are rejected.
Compilation runs in a disposable worker with a time limit. No DOCX output.

## Test vectors

`vectors/document-template-v1.json` covers literal text, rejected fields,
virtual paths, and diagnostics. MCP integration tests compile the templates,
reject host-file reads, exercise failure/recovery and verify an offline PDF.
