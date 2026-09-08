# ADR 0003: Holi Local exposes the tested engines to AI assistants through MCP

Status: proposed — 2026-09-05; native-runtime decision updated 2026-09-06

## Context

Paid document and QR generation services charge per document for
deterministic work: compile a template with data, render a code, rasterize a
page. Holi already runs those engines locally in the browser (Typst through
WebAssembly, QR through `holi-qr`) behind a truthful privacy contract, but the
engines live inside `web/apps/*`, so nothing outside a browser can reuse them.

AI assistants now integrate tools through the Model Context Protocol. Hosted MCP
servers for PDF generation charge for the same work, and Claude Cowork offers
local Office-document skills only inside Claude Desktop. Several crates without
a shipping consumer remain in the Cargo workspace, and `conductor/`, `papers/`,
and `vectors/` predate ADR 0001.

## Decision

- Add a second product surface, **Holi Local**: a native Rust MCP executable
  (`holi-mcp`, stdio and Streamable HTTP), skill packs, and Typst document
  templates, running entirely on the device without a Node/npm installation
  or the browser WASM compiler.
  Documents come first, QR batch second, metadata and image afterwards.
- Extract runtime-agnostic engines from the apps into `packages/engines/*`
  (TypeScript, no DOM). These support the browser apps and provided the tested
  Node reference for v0.1. Native v0.2 shares the Rust QR core directly with the
  browser WASM build and embeds the same canonical template manifest used by
  the web engine.
- Make the shared contracts normative in `spec/` with test vectors: QR style
  v1 (already used by saved styles and style links), document template v1, and
  MCP tools v1 (inputs, outputs, diagnostics shape, output-folder rules).
- Keep browser Rust selective. The maintainer explicitly approved a native
  local runtime: `local/mcp/native` uses the official Rust MCP SDK, native Typst
  and `holi-qr`, with disposable subprocesses for bounded rendering. This is an
  intentional exception to the browser-only Rust gate, justified by eliminating
  the Node/browser-WASM compiler requirement. No public Rust library or standalone
  document CLI; a desktop installer can wrap the same MCP executable later.
- Retire what has no consumer: `wasm-qr-lite`, `wasm-renderer`, `conductor/`,
  `papers/`, and `vectors/` (recreated as `spec/vectors/` when the first vector
  lands). `wasm-core` follows once the Test app stops importing it.

## Consequences

- Web apps keep their behavior and import the engines from packages.
- New workspace roots `packages/` and `local/`; CI adds native executable builds,
  Rust tests and MCP SDK acceptance on Linux, Windows and macOS. Node/WASM is
  retained for the browser and independent test oracles. The native product
  keeps its own version and Shadow Log; its npm workspace becomes private
  development tooling and the Node server remains an explicit legacy reference.
- Privacy for the local product follows the standard flow: input → memory →
  disk in an explicit output folder → network only for Typst packages on demand
  and only when allowed → package provider observes technical metadata → local
  MCP client receives diagnostics and artifact paths. The assistant provider's
  handling of prompts and tool results is outside Holi Local's control.
- Out of scope: e-signature, cloud rendering, accounts. DOCX output is a
  separate decision.

## Gates before this becomes accepted

- native platform archives contain the executable, licenses, font notices,
  skills and accurate source information, and pass executable acceptance;
- contracts reviewed and covered by vectors;
- engine extraction leaves the QR and Typst builds and tests green;
- native MCP v0.2 exercised from two clients (Claude Desktop and Claude Code)
  on Windows and macOS. The old npm-scope gate was confirmed for v0.1 and is
  superseded by native distribution; no npm runtime is published for v0.2.

## Implementation and verification — 2026-09-05

The maintainer confirmed access to npm scope `@holi` and availability of the
two clients on both operating systems. The implementation uses that scope.
This confirms availability, not completion of the client acceptance tests.

- `packages/engines/typst` extracts compilation/diagnostics and provides v1
  report/letter templates; `packages/engines/qr` extracts portable styles,
  layers, shapes and SVG orchestration. Both web apps consume those packages.
- `local/mcp` implements five tools, stdio and authenticated loopback Streamable
  HTTP, explicit output-folder confinement, exclusive writes, disposable workers,
  bounded input/queue/time limits, bundled fonts and two distributable skill packs.
- Typst uses an in-memory filesystem. Package downloads are disabled by default.
  Opt-in imports are restricted to preview packages, including transitive imports,
  and packages remain in worker memory. A real CeTZ/oxifmt compilation passed;
  offline regression fixtures cover negative package caching between attempts.
- `wasm-qr` has web/Node outputs and a PNG rasterizer using the existing
  resvg/tiny-skia stack. Node PNG and SVG exports decode to the input content.
- Style, template and MCP contracts and shared vectors are in `spec/`.
- Retired the unused crates and root folders named above. `wasm-core` remains:
  Test still imports it in the vault and webgpu experiments.
- Package versions and Shadow Logs: engines/MCP 0.1.0, wasm-qr 0.2.0,
  QR web 1.0.3 and Typst web 0.8.1. CI now builds the Node WASM and includes
  Windows/macOS MCP jobs; those hosted jobs have not been run from this task.

Local Windows verification: all public app/server builds, JavaScript/generator
tests, workspace Rust tests and lint passed. Browser checks confirmed a QR
decoded by the local scanner, SVG export, Typst preview and PDF export. The
bundled report/letter PDFs were rendered and visually inspected. npm tarball
contents are checked separately from workspace imports, including Node's CJS
package scope, WASM binaries, fonts, licenses and skill resources.
An isolated installation of the four npm tarballs also passed offline PDF
generation, PNG QR decoding and retrieval of the bundled skill resource.

Independent review on Windows, 2026-09-05: the full suite (engines, MCP,
QR, lint, Rust, all app builds) passed; the same style JSON produced
byte-identical SVG in the browser and in Node (SHA-256 match for a default and
a gradient/liquid style); the MCP Inspector CLI, configured through a
Claude-Desktop-style `mcpServers` entry, listed the five tools, rendered a
report PDF and produced a QR. Review added `verify` to `qr_batch` (rendered bytes
are decoded in worker memory before writing and report `verified`) and made the
startup error name its cause.

Pre-publication follow-up, 2026-09-06: startup diagnostics now select fixed
messages for known errors instead of printing raw parser/filesystem errors,
which could expose arguments or paths. QR verification documentation now
describes the implemented check in memory; it does not claim to reread disk.
The maintainer initially deferred real Claude client acceptance and requested
continuing with release preparation; the subsequent Windows report is below.
The follow-up passed 71 local engine/MCP tests and lint. Fresh tarballs for all
four packages were inspected, installed together offline in an isolated folder,
and exercised for PDF, verified PNG, skill resources, overwrite rejection and
startup-error privacy. No Claude model calls were needed for those checks.

### Maintainer-supplied Claude Windows run — 2026-09-06

The maintainer supplied a successful real-session report for run `rt0906a-`,
using the project `.mcp.json` configuration and the built working tree after
`b9c6e9e`. The report records direct calls to all five tools, reading the privacy
resource, both PDF templates, literal code-like template data, invalid Typst
diagnostics followed by successful compilation with a virtual include, and
three PNG QR codes plus one SVG with `verified: true`. Package downloads were
disabled. It also reports independent disk QR decoding, PDF inspection and
unchanged before/after PDF hashes after expected `OUTPUT_EXISTS` errors.

A follow-up filesystem check confirmed all seven output files and their
reported sizes. The current full SHA-256 hashes of the report and letter match
the supplied abbreviated hashes. This check corroborates the saved artifacts;
it does not independently replay or observe the reported Claude tool calls or
the before/after comparison. The exact Claude client and client/Windows versions
were not included in the supplied report. Attribute this successful Windows
session to the appropriate matrix row once those details are confirmed; do not
count one session as both clients. macOS has no supplied real-client evidence.

### Historical v0.1 acceptance evidence

| Client         | Windows                                                                | macOS                   |
| -------------- | ---------------------------------------------------------------------- | ----------------------- |
| Claude Desktop | Successful Windows report awaits client attribution; otherwise pending | Pending real-client run |
| Claude Code    | Successful Windows report awaits client attribution; otherwise pending | Pending real-client run |

The table above concerns the Node v0.1 implementation. Keep the supplied
evidence, without attributing it to both clients or to the native replacement.

## Native-runtime implementation — 2026-09-06

After reviewing the local runtime, the maintainer requested and approved
migrating the server to Rust before distribution. `local/mcp/native` owns the
`holi-mcp` 0.2.0 executable, using Rust 1.93+, the official Rust MCP SDK,
native Typst and the existing `holi-qr` core. Fonts, template data, resources
and skills are embedded. The product requires no Node/npm installation or
browser WASM compiler. Optional Typst package WASM plugins use native Typst's
embedded interpreter inside the disposable worker and virtual workspace.
The intended benefit is a directly runnable native artifact; no measured speed
or memory improvement is claimed merely from changing languages.

The five tools, MCP resources, artifact shape and v1 template/style contracts
remain compatible. The web engine and native renderer now consume one
`packages/engines/typst/src/templates.v1.json` manifest. The native runtime
retains memory-only document access, opt-in bounded package fetching, exclusive
output creation, output-root identity checks, fixed private startup messages,
authenticated loopback HTTP and bounded work. Disposable native child processes
replace Node workers so a synchronous render can be killed after 60 seconds.
Before reading document data, workers receive a 1 GiB committed-memory limit
through a Windows Job Object, a 2 GiB virtual-address-space limit on Linux,
or 2 GiB of virtual-address-space growth above startup mappings on macOS.
The macOS allowance accounts for its large mapped shared region. Failure to
install limits aborts the job. Unix also disables core dumps.
These platform-specific measures are not interchangeable RSS limits, and native
Linux/macOS behavior requires platform execution rather than inference from
the Windows v0.1 report.
The output folder and its ancestors still require operator control; another
process with the same OS permissions can race filesystem operations.

`cargo build -p holi-mcp --profile native` produces `target/native/holi-mcp`
(`.exe` on Windows). `scripts/package-local.mjs` prepares platform archives
under `dist/local/` with licenses, notices, skills and source information.
The prior TypeScript implementation is retained in `local/mcp/src` only for
explicit legacy tests and migration comparisons. CI configures native builds,
Rust tests, SDK acceptance and artifact collection on Linux, Windows and macOS.
Configuration alone does not prove hosted jobs or artifact publication passed.

The native SDK harness exercises all five tools and four resources, both PDF
templates, literal data, diagnostics and fresh-workspace recovery, host-read
and default package denial, byte bounds, portable output vectors, racing
exclusive writes, replaced roots and junctions, saved-file QR decoding, unreadable
style reporting, authenticated HTTP and body bounds, and actual timeout/queue
recovery. Node is the external MCP test client and the existing QR WASM decoder
is an independent saved-file oracle; neither executes inside the native server.
Successful native runs must be recorded after execution, separately from the
historical Node checks above.

### Verified native Windows build — 2026-09-06

The optimized `target/native/holi-mcp.exe` built with Rust 1.93.1 from the
working tree after `b9c6e9e` passed all **23 native SDK acceptance cases** on
Windows NT 10.0.26200.0 x64. The SDK client was `@modelcontextprotocol/sdk`
1.30.0 on Node 24.13.1, driven by Vitest. The final run took 68.91 seconds;
its actual timeout and queue-recovery case took 60.298 seconds. This is an independently invoked
MCP test client, not a Claude acceptance run.

The suite discovered all five tools and four resources; rendered both templates
and virtual Typst documents; checked artifact paths, sizes and SHA-256 against
saved bytes; decoded saved PNG and SVG QR exports; exercised literal data,
diagnostics/recovery, schema and byte limits, forbidden host reads, default
package denial, output collisions, racing exclusive writes, junctions and root
replacement. A copied executable rendered PDF and PNG in an otherwise empty
working directory with PATH empty. This confirms embedded rendering assets
and independence from the repository and a Node installation at runtime.

MCP cancellation was observed on the wire with the matching request ID. The
corresponding native worker exited and a fresh PDF completed immediately;
process inspection excluded Windows' unrelated console helper. The 60-second
timeout also killed its job, kept discovery responsive, rejected excess queued
work and recovered. HTTP initialized and rendered through the SDK, rejected
invalid bearer/Host/Origin/type/routes, enforced both declared and chunked
12 MiB body bounds, and preserved a wire-level integer value written as
`128.0` when rendering a 128-pixel PNG. Startup diagnostics passed all eight
privacy cases. These automated PDF checks do not establish visual layout QA.

A separate native demonstration generated three one-page PDFs (custom document,
report and letter) and four QR files (three PNG, one SVG). The PDFs were rendered
and visually inspected, Spanish text extracted correctly, and QR content was
decoded independently both from saved exports and from a rendered PDF page.
Its checks and artifacts are recorded in the ignored local
`local/mcp/test-output/native-validation-1788754566165/resultados/evidencia.json`.

The project's `.mcp.json` now invokes `target/native/holi-mcp.exe` with the
existing configured output folder. An independent SDK launch through that
configuration confirmed version 0.2.0, runtime `rust-native`, all five tools and
`packageDownloads: false`. Evidence is in that validation folder's
`configured-server.json`; `mcp-node.before.json` preserves the old Node setting.
This confirms the project configuration, not a new Claude model/client run.

Verified executable: 50,740,736 bytes; SHA-256
`38d196b2eeee32eca0bbf13589e1f3cc5cce47742f27911bbd91af0fae73c8af`.
The final suite compared its complete embedded Shadow Log and skill resources
against the current source files, and confirmed the privacy resource matches
the information tool. All 23 acceptance cases refer to this final executable.
Hosted CI for commit `b04af29564496d6ac5af6ff564742adaf15eb1ec` subsequently
passed on Linux, Windows and macOS, including the native Rust tests, MCP SDK
acceptance and packaging jobs. The complete run also passed all web builds,
WASM builds, JavaScript tests, Rust workspace tests and lint:
[CI run 34085592716](https://github.com/HugoAndresAmayaChairez/holi.tools/actions/runs/34085592716).
The result was checked on 2026-09-07. These hosted SDK runs do not establish
real Claude Desktop/Code acceptance or public release availability.

A separate local comparison used three fresh server processes per runtime,
identical JSON input and timings including child-process startup. Median
milliseconds were native Rust / legacy Node-WASM: initialization **25 / 364**,
PDF **39 / 264**, and QR **47 / 207**. These are observations on this Windows
machine, not general performance guarantees: native Typst is 0.15.1 while the
legacy browser compiler differs, and memory was not measured. Raw samples are
in the ignored local artifact
`local/mcp/test-output/native-validation-1788754566165/benchmark.json`.

The Windows archive `dist/local/holi-local-0.2.0-win32-x64.tar.gz` was
created and independently extracted: 28,774,507 bytes, SHA-256
`69a2a39e62986460777e28325d2a210f082bbf06a23bc9263e97c931b2bfe761`.
Its executable matches the tested hash above. The extracted copy started with
PATH empty, returned the exact bundled Shadow Log, and generated a PDF and
verified PNG with matching saved-file hashes. It includes corresponding source,
font licenses, dependency notices and pinned notice provenance. Verification is
recorded in that validation folder's `archive-evidence.json`; this local package
has not been published.

### Native installer candidate 0.3.0 — 2026-09-07

The per-user installer is specified in `spec/native-install-v1.md`; setup and
client/skill instructions live in `local/mcp/INSTALL.md` and `INSTALL.es.md`.
Windows acceptance used isolated user homes, never the maintainer's real
Claude configuration. It passed default/custom Unicode paths, configuration
preservation and byte-for-byte backups, repeat installation, invalid JSON,
replacement guards, unrelated-folder rejection, output retention and MCP
PDF/QR generation from the installed executable with PATH empty. A separate
update between two distinct bundle hashes retained the previous executable
and documents, updated the client and backed up an edited personal skill.
The interactive console flow was exercised through a terminal, including
Spanish confirmation. This does not constitute real Claude application testing.

Local evidence is retained under the ignored paths
`local/mcp/test-output/installer-u0u8nc/evidence.json`,
`local/mcp/test-output/installer-SpqPl1/update-evidence.json` and
`local/mcp/test-output/installer-interactive/`. Both skill ZIPs were also opened
with Python's independent ZIP reader: layout, CRC and SKILL.md bytes matched.
Five installer Rust tests, both skill validations, 23 native MCP SDK tests,
Main's 43-page build and lint passed locally.

The tested Windows installer is 29,356,544 bytes, SHA-256
`e28aa66bf2e1a2c5cfb5aea0312aaa5b4ee825864f1df92d0305ff64b39bda50`.
The native 0.3.0 engine is 50,747,904 bytes, SHA-256
`1e02bdd6677841da5e2226259026e4b49263eceb4070916e0f131cfa958da3fc`.
These are unsigned local candidates, not published releases.

Ubuntu 24.04 x64 passed the installer Rust tests, all native MCP SDK acceptance
cases, self-contained packaging and default/custom installation acceptance in
[CI run 34174549992](https://github.com/HugoAndresAmayaChairez/holi.tools/actions/runs/34174549992)
for commit `90eb490`. The downloaded setup artifact is 30,912,008 bytes,
SHA-256 `2d574e0813528de7182c238bf2b08ad0b2cbad24a521926a07ae485f687cd827`;
the downloaded bytes matched its checksum. Artifacts are retained by CI for
14 days and are also saved locally under `dist/local/`. This is installer/SDK
acceptance on Ubuntu, not a Claude Code conversation or a public release.
The same run also passed Windows installer acceptance and macOS native/portable
acceptance, plus all web builds, JavaScript tests, WASM, Rust workspace and lint.

### Remaining native client acceptance evidence

| Client         | Windows                 | macOS                   |
| -------------- | ----------------------- | ----------------------- |
| Claude Desktop | Pending native v0.2 run | Pending native v0.2 run |
| Claude Code    | Pending native v0.2 run | Pending native v0.2 run |

Record native/client/OS versions, date and observed results using the procedure
in `local/mcp/README.md`. SDK integration tests do not substitute for these
client checks. This ADR remains proposed until the maintainer reviews the
contracts and the native client matrix is complete. No native release, npm
publication or production deployment is implied by this implementation.
